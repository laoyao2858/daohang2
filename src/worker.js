// Cloudflare Worker 后端逻辑 - 修复设置保存和 IP 获取

const jsonResponse = (data, status = 200) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
};

async function handleApiRequest(request, env) {
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/').filter(Boolean); // [api, resource, id]
  const resource = pathParts[1];
  const id = pathParts[2];

  try {
    switch (resource) {
      // --- 1. 设置接口 (修复：支持保存 Logo、公告、多背景等所有设置) ---
      case 'settings':
        if (request.method === 'GET') {
          const { results } = await env.DB.prepare('SELECT * FROM settings').all();
          const settings = {};
          // 将数据库的 key-value 行转换为对象 { key: value }
          results.forEach(row => { settings[row.key] = row.value; });
          return jsonResponse(settings);
        }
        if (request.method === 'POST') {
          // 接收前端传来的所有设置项
          const data = await request.json();
          const statements = [];
          
          for (const [key, value] of Object.entries(data)) {
            // 将值转换为字符串存入数据库 (包括 JSON 数组)
            const valStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
            statements.push(
              env.DB.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
                .bind(key, valStr)
            );
          }
          
          if (statements.length > 0) {
            await env.DB.batch(statements);
          }
          return jsonResponse({ success: true });
        }
        break;

      // --- 2. 访问统计 (修复：记录真实 IP) ---
      case 'visit': 
        if (request.method === 'POST' && id) {
          const ip = request.headers.get('CF-Connecting-IP') || 'Unknown';
          const ua = request.headers.get('User-Agent') || '';
          
          await env.DB.batch([
            env.DB.prepare('UPDATE sites SET visit_count = visit_count + 1 WHERE id = ?').bind(id),
            env.DB.prepare('INSERT INTO access_logs (site_id, ip_address, user_agent) VALUES (?, ?, ?)').bind(id, ip, ua)
          ]);
          
          return jsonResponse({ success: true });
        }
        break;

      // --- 3. 日志获取 (修复：后台显示 IP) ---
      case 'logs':
        if (request.method === 'GET') {
          const { results } = await env.DB.prepare(`
            SELECT l.created_at, l.ip_address, s.name as site_name 
            FROM access_logs l 
            LEFT JOIN sites s ON l.site_id = s.id 
            ORDER BY l.id DESC LIMIT 50
          `).all();
          return jsonResponse(results || []);
        }
        break;

      // --- 4. 分类管理 ---
      case 'categories':
        if (request.method === 'GET') {
          const { results } = await env.DB.prepare('SELECT * FROM categories ORDER BY displayOrder, id').all();
          return jsonResponse(results || []);
        }
        if (request.method === 'POST') {
          const { name, type } = await request.json();
          const { results } = await env.DB.prepare('SELECT MAX(displayOrder) as maxO FROM categories').all();
          const nextOrder = (results[0].maxO || 0) + 1;
          const { meta } = await env.DB.prepare('INSERT INTO categories (name, type, displayOrder) VALUES (?, ?, ?)').bind(name, type, nextOrder).run();
          return jsonResponse({ success: true, id: meta.last_row_id });
        }
        if (request.method === 'DELETE' && id) {
          await env.DB.prepare('DELETE FROM categories WHERE id = ?').bind(id).run();
          return jsonResponse({ success: true });
        }
        break;

      // --- 5. 网站管理 ---
      case 'sites':
        if (request.method === 'GET') {
          const { results } = await env.DB.prepare('SELECT * FROM sites ORDER BY display_order ASC').all();
          return jsonResponse(results || []);
        }
        if (request.method === 'POST') {
          const body = await request.json();
          const { results } = await env.DB.prepare('SELECT MAX(display_order) as maxO FROM sites WHERE categoryId = ?').bind(body.categoryId).all();
          const nextOrder = (results[0].maxO || 0) + 1;
          const { meta } = await env.DB.prepare(`
            INSERT INTO sites (categoryId, name, url, icon, description, tags, display_order) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).bind(body.categoryId, body.name, body.url, body.icon, body.description, body.tags, nextOrder).run();
          return jsonResponse({ success: true, id: meta.last_row_id });
        }
        if (request.method === 'PUT' && id) {
          const body = await request.json();
          await env.DB.prepare(`
            UPDATE sites SET categoryId=?, name=?, url=?, icon=?, description=?, tags=? WHERE id=?
          `).bind(body.categoryId, body.name, body.url, body.icon, body.description, body.tags, id).run();
          return jsonResponse({ success: true });
        }
        if (request.method === 'DELETE' && id) {
          await env.DB.prepare('DELETE FROM sites WHERE id = ?').bind(id).run();
          return jsonResponse({ success: true });
        }
        break;

      default:
        return jsonResponse({ error: 'Not Found' }, 404);
    }
  } catch (e) {
    return jsonResponse({ error: e.message }, 500);
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api')) {
      return handleApiRequest(request, env);
    }
    try {
      return await env.ASSETS.fetch(request);
    } catch (e) {
      return new Response("Not Found", { status: 404 });
    }
  }
};
