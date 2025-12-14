/**
 * 扩展 API 处理程序
 * 支持：音乐管理、数据统计、多背景图、私密站点
 */

const jsonResponse = (data, status = 200) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
};

// 简易鉴权中间件 - 生产环境建议使用更安全的 Token 机制
const checkAuth = (request) => {
  const auth = request.headers.get('Authorization');
  // 注意：请在环境变量中设置 ADMIN_PASSWORD，否则默认为 'admin'
  // 返回的 Token 这里硬编码为 'admin-token-secret'，实际应用请生成动态 Token
  return auth && auth === 'admin-token-secret'; 
};

async function handleApiRequest(request, env) {
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  const resource = pathParts[1]; // api/{resource}

  try {
    // --- 身份验证接口 ---
    if (resource === 'verify' && request.method === 'POST') {
      const { password } = await request.json();
      // 检查密码 (优先使用环境变量)
      if (password === (env.ADMIN_PASSWORD || 'admin')) {
        return jsonResponse({ token: 'admin-token-secret' });
      }
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    // --- 设置接口 (更新默认值为中文) ---
    if (resource === 'settings') {
      if (request.method === 'GET') {
        const { results } = await env.DB.prepare('SELECT * FROM settings').all();
        const settings = results.reduce((acc, row) => {
          acc[row.key] = row.value;
          return acc;
        }, {});
        
        // 如果没有设置，返回默认中文欢迎语
        if (!settings.welcome_message) settings.welcome_message = '欢迎访问我的导航站';
        
        return jsonResponse(settings);
      }
      if (request.method === 'POST') {
        if (!checkAuth(request)) return jsonResponse({ error: 'Unauthorized' }, 401);
        const data = await request.json();
        const stmt = env.DB.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
        const batch = [];
        
        if (data.welcome_message) batch.push(stmt.bind('welcome_message', data.welcome_message));
        if (data.site_icon) batch.push(stmt.bind('site_icon', data.site_icon));
        if (data.background_images) batch.push(stmt.bind('background_images', data.background_images));
        
        await env.DB.batch(batch);
        return jsonResponse({ success: true });
      }
    }

    // --- 音乐接口 ---
    if (resource === 'music') {
      if (request.method === 'GET') {
        const { results } = await env.DB.prepare('SELECT * FROM music ORDER BY id DESC').all();
        return jsonResponse(results || []);
      }
      if (request.method === 'POST') {
        if (!checkAuth(request)) return jsonResponse({ error: 'Unauthorized' }, 401);
        const { name, url, cover } = await request.json();
        await env.DB.prepare('INSERT INTO music (name, url, cover) VALUES (?, ?, ?)').bind(name, url, cover || '').run();
        return jsonResponse({ success: true });
      }
      if (request.method === 'DELETE') {
        if (!checkAuth(request)) return jsonResponse({ error: 'Unauthorized' }, 401);
        const id = url.searchParams.get('id');
        await env.DB.prepare('DELETE FROM music WHERE id = ?').bind(id).run();
        return jsonResponse({ success: true });
      }
    }

    // --- 站点接口 (支持私密过滤) ---
    if (resource === 'sites') {
      if (request.method === 'GET') {
        const isPrivateRequest = url.searchParams.get('private') === 'true';
        
        if (isPrivateRequest) {
          // 获取私密站点，必须验证
          if (!checkAuth(request)) return jsonResponse({ error: 'Unauthorized' }, 401);
          const { results } = await env.DB.prepare('SELECT * FROM sites WHERE is_private = 1 ORDER BY display_order').all();
          return jsonResponse(results);
        } else {
          // 获取公开站点 (排除私密)
          const { results } = await env.DB.prepare('SELECT * FROM sites WHERE is_private = 0 OR is_private IS NULL ORDER BY display_order').all();
          return jsonResponse(results);
        }
      }
    }

    // --- 分类接口 ---
    if (resource === 'categories') {
        if (request.method === 'GET') {
            const { results } = await env.DB.prepare('SELECT * FROM categories ORDER BY displayOrder').all();
            return jsonResponse(results);
        }
    }

    // --- 统计接口 ---
    if (resource === 'stats') {
      if (!checkAuth(request)) return jsonResponse({ error: 'Unauthorized' }, 401);
      
      const totalRes = await env.DB.prepare('SELECT SUM(visit_count) as total FROM sites').first();
      const topRes = await env.DB.prepare('SELECT name, visit_count FROM sites ORDER BY visit_count DESC LIMIT 10').all();
      const popularRes = await env.DB.prepare('SELECT name FROM sites ORDER BY visit_count DESC LIMIT 1').first();
      
      return jsonResponse({
        totalVisits: totalRes.total || 0,
        popular: popularRes,
        topSites: topRes.results
      });
    }

    // --- 访问计数 ---
    if (resource === 'visit') {
        const id = pathParts[2]; // /api/visit/ID
        if(id) {
            await env.DB.prepare('UPDATE sites SET visit_count = visit_count + 1 WHERE id = ?').bind(id).run();
        }
        return jsonResponse({ok:true});
    }

    return jsonResponse({ error: 'Not Found' }, 404);

  } catch (e) {
    return jsonResponse({ error: e.message }, 500);
  }
}

export const onRequest = async (context) => {
  return handleApiRequest(context.request, context.env);
};
