export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "*",
          "Access-Control-Allow-Headers": "*"
        }
      });
    }
    if (url.pathname.startsWith('/api/')) {
      try {
        return await handleApi(request, env);
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
      }
    }
    return env.ASSETS ? env.ASSETS.fetch(request) : new Response("Frontend missing", { status: 404 });
  }
};

const json = (d) => new Response(JSON.stringify(d), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });

async function handleApi(req, env) {
  const url = new URL(req.url), method = req.method;
  const path = url.pathname.split('/').filter(Boolean); // ['api', 'sites', '1']
  const res = path[1], id = path[2];

  // 1. 设置接口
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

  // 2. 分类接口 (关键：处理 is_private)
  if (res === 'categories') {
    if (method === 'GET') return json((await env.DB.prepare('SELECT * FROM categories ORDER BY displayOrder').all()).results);
    if (method === 'POST') {
      const { name, is_private } = await req.json();
      const priv = (is_private === true || is_private === 'true' || is_private === 1) ? 1 : 0;
      await env.DB.prepare('INSERT INTO categories (name, is_private, displayOrder) VALUES (?, ?, 0)').bind(name, priv).run();
      return json({ ok: true });
    }
    if (method === 'DELETE') {
      await env.DB.prepare('DELETE FROM categories WHERE id = ?').bind(id).run();
      return json({ ok: true });
    }
  }

  // 3. 网站接口
  if (res === 'sites') {
    if (method === 'GET') return json((await env.DB.prepare('SELECT * FROM sites ORDER BY id DESC').all()).results);
    if (method === 'POST') {
      const d = await req.json();
      await env.DB.prepare('INSERT INTO sites (categoryId, name, url, icon) VALUES (?, ?, ?, ?)').bind(d.categoryId, d.name, d.url, d.icon).run();
      return json({ ok: true });
    }
    if (method === 'DELETE') {
      await env.DB.prepare('DELETE FROM sites WHERE id = ?').bind(id).run();
      return json({ ok: true });
    }
  }

  // 4. 音乐接口
  if (res === 'custom-music') {
    if (method === 'GET') return json((await env.DB.prepare('SELECT * FROM custom_music ORDER BY id DESC').all()).results);
    if (method === 'POST') {
      const d = await req.json();
      await env.DB.prepare('INSERT INTO custom_music (title, url) VALUES (?, ?)').bind(d.title, d.url).run();
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
       const ip = req.headers.get('cf-connecting-ip') || 'unknown';
       await env.DB.prepare('INSERT INTO visitor_stats (ip_address, visit_time) VALUES (?, CURRENT_TIMESTAMP)').bind(ip).run();
       return json({ ok: true });
    }
    if (method === 'GET') {
       const total = await env.DB.prepare('SELECT COUNT(*) as c FROM visitor_stats').first();
       const today = await env.DB.prepare("SELECT COUNT(*) as c FROM visitor_stats WHERE date(visit_time) = date('now')").first();
       const recent = await env.DB.prepare('SELECT ip_address, visit_time FROM visitor_stats ORDER BY id DESC LIMIT 10').all();
       return json({ total: total.c, today: today.c, recent: recent.results });
    }
  }

  return json({ error: 'Not found' }, 404);
}
