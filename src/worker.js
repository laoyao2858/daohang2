// src/worker.js - 整合版完整后端逻辑

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 处理跨域预检请求 (Options)
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    // --- settings (站点设置接口) ---
    if (res === 'settings') {
      // 获取设置
      if (method === 'GET') {
        const { results } = await env.DB.prepare('SELECT * FROM settings').all();
        const s = {}; 
        results.forEach(r => s[r.key] = r.value);
        return json(s);
      }
      // 保存设置
      if (method === 'POST') {
        const d = await req.json();
        // 批量保存所有设置项
        const stmts = Object.entries(d).map(([k, v]) => 
            env.DB.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').bind(k, String(v))
        );
        await env.DB.batch(stmts);
        return json({ ok: true });
      }
    }
    // 2. 处理静态资源 (HTML, CSS, JS)
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }
    
    return new Response("Frontend not found. (env.ASSETS missing)", { status: 404 });
  }
};

// 辅助函数：统一返回 JSON
const jsonResponse = (data, status = 200) => {
  return new Response(JSON.stringify(data), {
    status: status,
    headers: { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*' 
    },
  });
};

// 核心 API 处理逻辑
async function handleApiRequest(request, env) {
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/').filter(Boolean); // ['api', 'settings']
  const resource = pathParts[1]; 
  const id = pathParts[2];
  const method = request.method;

  // --- 1. 设置管理 (Settings) ---
  if (resource === 'settings') {
    if (method === 'GET') {
      const { results } = await env.DB.prepare('SELECT * FROM settings').all();
      const settings = {};
      results.forEach(row => { settings[row.key] = row.value; });
      return jsonResponse(settings);
    }
    if (method === 'POST') {
      const updates = await request.json();
      const stmts = Object.entries(updates).map(([key, value]) => 
        env.DB.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').bind(key, String(value))
      );
      await env.DB.batch(stmts);
      return jsonResponse({ success: true });
    }
  }

  // --- 2. 网站管理 (Sites) ---
  if (resource === 'sites') {
    if (method === 'GET') {
      if (id === 'frequent') {
        const { results } = await env.DB.prepare('SELECT * FROM sites ORDER BY visit_count DESC LIMIT 10').all();
        return jsonResponse(results || []);
      }
      const { results } = await env.DB.prepare('SELECT * FROM sites ORDER BY categoryId, display_order, id').all();
      return jsonResponse(results || []);
    }
    if (method === 'POST' && !id) {
      const data = await request.json();
      const { results } = await env.DB.prepare('SELECT MAX(display_order) as maxOrder FROM sites WHERE categoryId = ?').bind(data.categoryId).all();
      const newOrder = (results[0].maxOrder || 0) + 1;
      
      const stmt = env.DB.prepare(
        'INSERT INTO sites (categoryId, name, url, icon, description, tags, group_id, visit_count, display_order) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)'
      ).bind(data.categoryId, data.name, data.url, data.icon||'', data.description||'', data.tags||'', data.group_id||null, newOrder);
      const { meta } = await stmt.run();
      return jsonResponse({ success: true, id: meta.last_row_id });
    }
    if (method === 'PUT' && id) {
      const data = await request.json();
      await env.DB.prepare(
        'UPDATE sites SET categoryId=?, name=?, url=?, icon=?, description=?, tags=?, group_id=?, updated_at=CURRENT_TIMESTAMP WHERE id=?'
      ).bind(data.categoryId, data.name, data.url, data.icon||'', data.description||'', data.tags||'', data.group_id||null, id).run();
      return jsonResponse({ success: true });
    }
    if (method === 'DELETE' && id) {
      await env.DB.prepare('DELETE FROM sites WHERE id = ?').bind(id).run();
      return jsonResponse({ success: true });
    }
    // 记录访问
    if (method === 'POST' && pathParts[3] === 'visit') {
       await env.DB.prepare('UPDATE sites SET visit_count = visit_count + 1 WHERE id = ?').bind(id).run();
       return jsonResponse({ success: true });
    }
    // 排序
    if (method === 'POST' && id === 'order') {
       const { categoryId, orderedIds } = await request.json();
       const stmts = orderedIds.map((sid, idx) => 
         env.DB.prepare('UPDATE sites SET display_order = ? WHERE id = ? AND categoryId = ?').bind(idx, sid, categoryId)
       );
       await env.DB.batch(stmts);
       return jsonResponse({ success: true });
    }
  }

  // --- 3. 分类管理 (Categories) ---
  if (resource === 'categories') {
    if (method === 'GET') {
      const { results } = await env.DB.prepare('SELECT * FROM categories ORDER BY displayOrder, id').all();
      return jsonResponse(results || []);
    }
    if (method === 'POST' && !id) {
      const { name, type } = await request.json();
      const { results } = await env.DB.prepare('SELECT MAX(displayOrder) as maxOrder FROM categories').all();
      const newOrder = (results[0].maxOrder || 0) + 1;
      const { meta } = await env.DB.prepare('INSERT INTO categories (name, type, displayOrder) VALUES (?, ?, ?)').bind(name, type, newOrder).run();
      return jsonResponse({ success: true, id: meta.last_row_id });
    }
    if (method === 'DELETE' && id) {
      await env.DB.prepare('DELETE FROM categories WHERE id = ?').bind(id).run();
      return jsonResponse({ success: true });
    }
    if (method === 'POST' && id === 'update-all') {
       const { updates } = await request.json();
       const stmts = updates.map(u => env.DB.prepare('UPDATE categories SET type=?, displayOrder=? WHERE id=?').bind(u.type, u.displayOrder, u.id));
       await env.DB.batch(stmts);
       return jsonResponse({ success: true });
    }
  }

  // --- 4. 音乐管理 (Custom Music) ---
  if (resource === 'custom-music') {
    if (method === 'GET') {
      const { results } = await env.DB.prepare('SELECT * FROM custom_music WHERE enabled = 1 ORDER BY display_order').all();
      return jsonResponse(results || []);
    }
    if (method === 'POST' && !id) {
      const data = await request.json();
      const { results } = await env.DB.prepare('SELECT MAX(display_order) as maxOrder FROM custom_music').all();
      const newOrder = (results[0].maxOrder || 0) + 1;
      const { meta } = await env.DB.prepare('INSERT INTO custom_music (title, artist, url, cover, display_order) VALUES (?, ?, ?, ?, ?)').bind(data.title, data.artist||'', data.url, data.cover||'', newOrder).run();
      return jsonResponse({ success: true, id: meta.last_row_id });
    }
    if (method === 'DELETE' && id) {
      await env.DB.prepare('DELETE FROM custom_music WHERE id = ?').bind(id).run();
      return jsonResponse({ success: true });
    }
  }

  // --- 5. 访客统计 (Visitor Stats) ---
  if (resource === 'visitor') {
    if (method === 'POST') {
       // 简易记录，防止阻塞
       const ip = request.headers.get('cf-connecting-ip') || '127.0.0.1';
       await env.DB.prepare('INSERT INTO visitor_stats (ip_address, visit_time, last_active) VALUES (?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)').bind(ip).run();
       return jsonResponse({ success: true });
    }
    if (method === 'GET') {
       const total = await env.DB.prepare('SELECT COUNT(*) as c FROM visitor_stats').first();
       return jsonResponse({ total: total.c, today: 0, online: 0, unique: 0 }); // 简化返回防止前端报错
    }
  }
  
  // --- 6. 用户偏好 ---
  if (resource === 'user-preferences') {
     if (method === 'GET') {
         const { results } = await env.DB.prepare('SELECT * FROM user_preferences').all();
         const p = {}; results.forEach(r => p[r.key] = r.value);
         return jsonResponse(p);
     }
  }

  return jsonResponse({ error: 'Endpoint not found' }, 404);
}
