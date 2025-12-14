export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. 处理 API 请求
    if (url.pathname.startsWith('/api/')) {
      return handleApi(request, env);
    }

    // 2. 处理静态资源 (HTML, CSS, JS)
    // 如果 ASSETS 绑定不存在，说明本地开发环境可能未正确配置
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }
    
    return new Response("Frontend not found", { status: 404 });
  }
};

async function handleApi(request, env) {
  const url = new URL(request.url);
  const method = request.method;

  // 辅助函数：统一返回 JSON
  const jsonResponse = (data) => new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });

  try {
    // --- 接口 1: 获取全局设置 ---
    if (url.pathname === '/api/settings' && method === 'GET') {
      const { results } = await env.DB.prepare('SELECT key, value FROM settings').all();
      // 转换成前端需要的 { key: value } 格式
      const settings = {};
      if (results) results.forEach(row => settings[row.key] = row.value);
      return jsonResponse(settings);
    }

    // --- 接口 2: 获取所有数据 (Categories + Sites) ---
    // 很多导航站前端会请求这个聚合接口，或者分别请求
    if (url.pathname === '/api/data' || url.pathname === '/api/sites') {
       // 获取分类
       const categories = await env.DB.prepare('SELECT * FROM categories ORDER BY displayOrder').all();
       // 获取站点
       const sites = await env.DB.prepare('SELECT * FROM sites ORDER BY display_order').all();
       
       return jsonResponse({
         categories: categories.results,
         sites: sites.results
       });
    }

    // --- 接口 3: 获取音乐列表 ---
    if (url.pathname === '/api/custom-music' && method === 'GET') {
      const { results } = await env.DB.prepare('SELECT * FROM custom_music WHERE enabled = 1 ORDER BY display_order DESC').all();
      return jsonResponse(results || []);
    }

    // --- 接口 4: 访客统计 (简单版) ---
    if (url.pathname === '/api/visitor' && method === 'POST') {
      // 简单插入，不阻塞返回
      const stmt = env.DB.prepare('INSERT INTO visitor_stats (user_agent, visit_time) VALUES (?, CURRENT_TIMESTAMP)');
      await stmt.bind(request.headers.get('User-Agent')).run();
      return jsonResponse({ success: true });
    }
    
    // --- 接口 5: 获取访客数据 ---
    if (url.pathname === '/api/visitor' && method === 'GET') {
       const total = await env.DB.prepare('SELECT COUNT(*) as count FROM visitor_stats').first();
       return jsonResponse({ total_visits: total.count });
    }

    return new Response('API Endpoint Not Found', { status: 404 });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json'} });
  }
}
