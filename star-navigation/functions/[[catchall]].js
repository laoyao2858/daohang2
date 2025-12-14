export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const path = url.pathname;

    // 1. 将对根路径和静态文件的请求直接交还给 Pages 的静态资源处理器
    if (path === '/' || path.startsWith('/index') || /\.(css|js|json|ico|png|svg)$/.test(path)) {
        return env.ASSETS.fetch(request);
    }

    // 2. 仅处理 /api/ 开头的请求
    if (path.startsWith('/api/')) {
        const method = request.method;
        // 健康检查端点
        if (path === '/api/health' && method === 'GET') {
            const hasDB = !!(env && env.DB);
            return new Response(JSON.stringify({
                status: 'ok',
                timestamp: new Date().toISOString(),
                hasDatabase: hasDB
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        // 其他API端点可以在此扩展...
    }

    // 3. 未匹配的请求返回404
    return new Response(JSON.stringify({ error: 'Not Found', path: path }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
    });
}
