export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // 允许跨域 (方便调试)
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        }
      });
    }

    if (url.pathname.startsWith('/api/')) {
      try {
        return await handleApi(request, env);
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }
    }
    
    // 静态资源处理
    return env.ASSETS ? env.ASSETS.fetch(request) : new Response("Frontend missing", { status: 404 });
  }
};

const json = (d) => new Response(JSON.stringify(d), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });

async function handleApi(req, env) {
  const url = new URL(req.url), method = req.method;
  const path = url.pathname.split('/').filter(Boolean); // ['api', 'sites', '1']
  const res = path[1], id = path[2];

  // 1. 设置接口 (支持多背景图JSON)
  if (res === 'settings') {
    if (method === 'GET') {
      const { results } = await env.DB.prepare('SELECT * FROM settings').all();
      const s = {}; results.forEach(r => s[r.key] = r.value);
      return json(s);
    }
    if (method === 'POST') {
      const d = await req.json();
      const stmts = Object.entries(d).map(([k, v]) => 
        env.DB.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').bind(k, String(v))
      );
      await env.DB.batch(stmts);
      return json({ ok: true });
    }
  }

  // 2. 分类接口 (支持私密属性 is_private)
  if (res === 'categories') {
    if (method === 'GET') return json((await env.DB.prepare('SELECT * FROM categories ORDER BY displayOrder').all()).results);
    if (method === 'POST') {
      const { name, is_private } = await req.json();
      // 兼容旧表结构：如果 is_private 字段不存在可能会报错，建议运行 d1-setup.sql 更新表
      try {
          await env.DB.prepare('INSERT INTO categories (name, is_private, displayOrder) VALUES (?, ?, 0)').bind(name, is_private ? 1 : 0).run();
      } catch (e) {
          // 如果插入失败，尝试不带 is_private 插入（兼容旧表）
          await env.DB.prepare('INSERT INTO categories (name, displayOrder) VALUES (?, 0)').bind(name).run();
      }
      return json({ ok: true });
    }
    if (method === 'DELETE') {
      await env.DB.prepare('DELETE FROM categories WHERE id = ?').bind(id).run();
      return json({ ok: true });
    }
  }

  // 3. 网站接口
  if (res === 'sites') {
    if (method === 'GET') return json((await env.DB.prepare('SELECT * FROM sites ORDER BY display_order DESC, id DESC').all()).results);
    if (method === 'POST') {
      const d = await req.json();
      try {
        await env.DB.prepare('INSERT INTO sites (categoryId, name, url, icon, description) VALUES (?, ?, ?, ?, ?)').bind(d.categoryId, d.name, d.url, d.icon, d.description).run();
      } catch (e) {
         // 兼容旧表
         await env.DB.prepare('INSERT INTO sites (categoryId, name, url, description) VALUES (?, ?, ?, ?)').bind(d.categoryId, d.name, d.url, d.description).run();
      }
      return json({ ok: true });
    }
    if (method === 'DELETE') {
      await env.DB.prepare('DELETE FROM sites WHERE id = ?').bind(id).run();
      return json({ ok: true });
    }
  }

  // 4. 音乐接口
  if (res === 'custom-music') {
    if (method === 'GET') {
        try {
            return json((await env.DB.prepare('SELECT * FROM custom_music ORDER BY id DESC').all()).results);
        } catch (e) { return json([]); } // 表不存在时不报错
    }
    if (method === 'POST') {
      const d = await req.json();
      await env.DB.prepare('INSERT INTO custom_music (title, url, artist) VALUES (?, ?, ?)').bind(d.title, d.url, d.artist||'').run();
      return json({ ok: true });
    }
    if (method === 'DELETE') {
      await env.DB.prepare('DELETE FROM custom_music WHERE id = ?').bind(id).run();
      return json({ ok: true });
    }
  }

  // 5. 访客统计
  if (res === 'visitor') {
    if (method === 'POST') {
       try {
           const ip = req.headers.get('cf-connecting-ip') || 'unknown';
           await env.DB.prepare('INSERT INTO visitor_stats (ip_address, visit_time) VALUES (?, CURRENT_TIMESTAMP)').bind(ip).run();
       } catch (e) {} // 忽略统计错误
       return json({ ok: true });
    }
    if (method === 'GET') {
       try {
           const total = await env.DB.prepare('SELECT COUNT(*) as c FROM visitor_stats').first();
           const today = await env.DB.prepare("SELECT COUNT(*) as c FROM visitor_stats WHERE date(visit_time) = date('now')").first();
           return json({ total: total.c, today: today.c });
       } catch (e) { return json({ total: 0, today: 0 }); }
    }
  }

  return json({ error: 'Not found' }, 404);
}
