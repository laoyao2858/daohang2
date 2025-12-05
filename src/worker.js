// src/worker.js
// Cloudflare Worker 后端逻辑 - 支持单站加密版

const jsonResponse = (data, status = 200) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
};

// 🔒 后台管理鉴权 (用于添加/修改/删除)
const checkAuth = (request, env) => {
  const authHeader = request.headers.get('Authorization');
  // 务必在 Cloudflare 后台设置变量 ADMIN_PASSWORD
  const adminPassword = env.ADMIN_PASSWORD || "admin"; 
  if (authHeader !== adminPassword) {
    throw new Error("Unauthorized");
  }
};

async function handleApiRequest(request, env) {
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  const resource = pathParts[1]; // api/resource
  const id = pathParts[2];

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      }
    });
  }

  try {
    // === 公开接口 ===

    // 1. 后台登录验证
    if (resource === 'login' && request.method === 'POST') {
      const { password } = await request.json();
      if (password === (env.ADMIN_PASSWORD || "admin")) {
        return jsonResponse({ success: true });
      }
      return jsonResponse({ error: "后台密码错误" }, 401);
    }

    // 2. 访问统计
    if (resource === 'sites' && pathParts[3] === 'visit') {
       await env.DB.prepare('UPDATE sites SET visit_count = visit_count + 1 WHERE id = ?').bind(pathParts[2]).run();
       return jsonResponse({ success: true });
    }

    // 3. 解锁单个加密网站 (核心逻辑)
    if (resource === 'unlock-site' && request.method === 'POST') {
        const { id, password } = await request.json();
        // 查询该网站的真实密码和URL
        const stmt = env.DB.prepare('SELECT url, password FROM sites WHERE id = ?').bind(id);
        const { results } = await stmt.all();
        
        if (!results || results.length === 0) return jsonResponse({ error: 'Site not found' }, 404);
        const site = results[0];

        // 验证密码
        if (site.password && site.password === password) {
            // 密码正确，返回真实 URL
            return jsonResponse({ success: true, url: site.url });
        } else {
            return jsonResponse({ error: '访问密码错误' }, 401);
        }
    }

    // === 权限拦截 ===
    // 任何修改操作 (POST/PUT/DELETE) 且非上述公开接口，必须验证后台密码
    if (['POST', 'PUT', 'DELETE'].includes(request.method)) {
        // 排除掉 unlock-site 和 login (因为它们是 POST 但对公众开放)
        if (resource !== 'unlock-site' && resource !== 'login') {
            checkAuth(request, env);
        }
    }

    // === 业务逻辑 ===

    switch (resource) {
      case 'sites':
        // GET: 获取所有网站 (公开)
        if (request.method === 'GET') {
           const { results } = await env.DB.prepare('SELECT * FROM sites ORDER BY categoryId, display_order, id').all();
           
           // 🔒 安全过滤：如果网站设置了密码，绝不返回真实 URL 和密码
           const safeResults = results.map(site => {
               if (site.password && site.password.trim() !== '') {
                   return {
                       ...site,
                       url: '',        // 隐藏 URL
                       password: null, // 隐藏密码
                       is_locked: true // 标记为锁定状态
                   };
               }
               return site;
           });
           return jsonResponse(safeResults);
        }
        // POST: 添加网站 (需后台权限)
        if (request.method === 'POST') {
           const body = await request.json();
           const { results } = await env.DB.prepare('SELECT MAX(display_order) as maxOrder FROM sites WHERE categoryId = ?').bind(body.categoryId).all();
           const newOrder = (results[0].maxOrder || 0) + 1;
           
           // 插入数据，包括 password 字段
           const stmt = env.DB.prepare('INSERT INTO sites (categoryId, name, url, icon, description, tags, password, display_order, visit_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)')
             .bind(body.categoryId, body.name, body.url, body.icon||'', body.description||'', body.tags||'', body.password||null, newOrder);
           const { meta } = await stmt.run();
           return jsonResponse({ success: true, id: meta.last_row_id });
        }
        // DELETE: 删除网站 (需后台权限)
        if (request.method === 'DELETE' && id) {
            await env.DB.prepare('DELETE FROM sites WHERE id = ?').bind(id).run();
            return jsonResponse({ success: true });
        }
        break;

      // ... 其他接口 (Categories, Music, Settings) 保持标准逻辑 ...
      
      case 'settings':
        if (request.method === 'GET') {
            const { results } = await env.DB.prepare('SELECT * FROM settings').all();
            const settings = {};
            results.forEach(row => { settings[row.key] = row.value; });
            return jsonResponse(settings);
        }
        if (request.method === 'POST') {
            const updates = await request.json();
            const statements = [];
            for (const [key, value] of Object.entries(updates)) {
                const valToStore = typeof value === 'object' ? JSON.stringify(value) : String(value);
                statements.push(env.DB.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').bind(key, valToStore));
            }
            await env.DB.batch(statements);
            return jsonResponse({ success: true });
        }
        break;

      case 'categories':
        if (request.method === 'GET') {
            const { results } = await env.DB.prepare('SELECT * FROM categories ORDER BY displayOrder, id').all();
            return jsonResponse(results || []);
        }
        if (request.method === 'POST') {
            const { name, type } = await request.json();
            const { results } = await env.DB.prepare('SELECT MAX(displayOrder) as maxOrder FROM categories').all();
            const newOrder = (results[0].maxOrder || 0) + 1;
            const stmt = env.DB.prepare('INSERT INTO categories (name, type, displayOrder) VALUES (?, ?, ?)').bind(name, type, newOrder);
            const { meta } = await stmt.run();
            return jsonResponse({ success: true, id: meta.last_row_id });
        }
        if (request.method === 'DELETE' && id) {
            await env.DB.prepare('DELETE FROM categories WHERE id = ?').bind(id).run();
            return jsonResponse({ success: true });
        }
        break;

      case 'music':
        if (request.method === 'GET') {
            const { results } = await env.DB.prepare('SELECT * FROM music_playlist ORDER BY display_order DESC, id DESC').all();
            return jsonResponse(results || []);
        }
        if (request.method === 'POST') {
            const { title, artist, url, cover } = await request.json();
            const stmt = env.DB.prepare('INSERT INTO music_playlist (title, artist, url, cover) VALUES (?, ?, ?, ?)').bind(title, artist || 'Unknown', url, cover || '');
            const { meta } = await stmt.run();
            return jsonResponse({ success: true, id: meta.last_row_id });
        }
        if (request.method === 'DELETE' && id) {
            await env.DB.prepare('DELETE FROM music_playlist WHERE id = ?').bind(id).run();
            return jsonResponse({ success: true });
        }
        break;
        
      default: return jsonResponse({ error: 'Not Found' }, 404);
    }
    return jsonResponse({ error: 'Method Not Allowed' }, 405);
  } catch (e) {
    if (e.message === 'Unauthorized') return jsonResponse({ error: '需要登录' }, 401);
    return jsonResponse({ error: e.message }, 500);
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api')) {
      return handleApiRequest(request, env);
    }
    return env.ASSETS.fetch(request);
  }
};
