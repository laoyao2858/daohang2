// src/worker.js

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. 拦截 API 请求
    // 如果请求路径以 /api/ 开头，在这里处理逻辑
    if (url.pathname.startsWith('/api/')) {
      return handleApiRequest(request, env);
    }

    // 2. 处理静态资源 (前端页面)
    // 对于非 API 请求，直接返回 public 目录下的静态文件
    // env.ASSETS 是你在 wrangler.jsonc 中配置的 binding
    return env.ASSETS.fetch(request);
  },
};

// 这里需要你把原本 functions/api/[[catchall]].js 里的逻辑搬过来
// 这是一个简化的示例处理函数
async function handleApiRequest(request, env) {
  const url = new URL(request.url);
  
  // 示例：获取设置 (对应 GET /api/settings)
  if (url.pathname === '/api/settings' && request.method === 'GET') {
    try {
      const { results } = await env.DB.prepare('SELECT * FROM settings').all();
      // 将数据库结果转换为前端需要的键值对格式
      const settings = {};
      results.forEach(row => settings[row.key] = row.value);
      return Response.json(settings);
    } catch (e) {
      return Response.json({ error: e.message }, { status: 500 });
    }
  }

  // 示例：获取音乐 (对应 GET /api/custom-music)
  if (url.pathname === '/api/custom-music' && request.method === 'GET') {
     const { results } = await env.DB.prepare('SELECT * FROM custom_music WHERE enabled = 1 ORDER BY display_order').all();
     return Response.json(results);
  }

  // 如果没有匹配的 API
  return new Response('API Not Found', { status: 404 });
}
