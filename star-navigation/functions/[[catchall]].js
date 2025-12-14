// Cloudflare Pages Functions API
export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // --- 核心修复：在一切开始前，将根路径请求交还给静态文件 ---
    if (path === '/' || path === '/index.html') {
        // 确保请求静态资源处理器
        return env.ASSETS.fetch(request);
    }

    // Helper function for JSON responses
    const jsonResponse = (data, status = 200) => {
        return new Response(JSON.stringify(data), {
            status,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            }
        });
    };

    // Handle CORS preflight
    if (method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            }
        });
    }

    // Check for D1 database availability
    const hasD1 = !!(env && env.DB);

    try {
        // API Routes
        switch (true) {
            // Health check
            case path === '/api/health' && method === 'GET':
                return jsonResponse({
                    status: 'ok',
                    timestamp: new Date().toISOString(),
                    environment: env.ENVIRONMENT || 'development',
                    hasDatabase: hasD1
                });

            // Get all sites
            case path === '/api/sites' && method === 'GET':
                if (hasD1) {
                    const result = await env.DB.prepare(`
                        SELECT * FROM sites 
                        ORDER BY visits DESC, created_at DESC
                    `).all();
                    return jsonResponse(result.results || []);
                } else {
                    // Return mock data for testing
                    return jsonResponse([
                        {
                            id: 1,
                            name: 'GitHub',
                            url: 'https://github.com',
                            category: '开发',
                            icon: 'fab fa-github',
                            description: '代码托管平台',
                            visits: 1500,
                            created_at: new Date().toISOString()
                        },
                        {
                            id: 2,
                            name: 'ChatGPT',
                            url: 'https://chat.openai.com',
                            category: 'AI',
                            icon: 'fas fa-robot',
                            description: 'AI对话助手',
                            visits: 1200,
                            created_at: new Date().toISOString()
                        }
                    ]);
                }

            // Add new site
            case path === '/api/sites' && method === 'POST':
                try {
                    const data = await request.json();
                    const { name, url, category, icon, description } = data;

                    if (!name || !url) {
                        return jsonResponse({ error: '名称和URL是必填项' }, 400);
                    }

                    if (hasD1) {
                        const result = await env.DB.prepare(`
                            INSERT INTO sites (name, url, category, icon, description, visits)
                            VALUES (?, ?, ?, ?, ?, 0)
                        `).bind(name, url, category || '未分类', icon || 'fas fa-globe', description || '')
                          .run();

                        return jsonResponse({
                            success: true,
                            id: result.meta.last_row_id,
                            message: '网站添加成功'
                        });
                    } else {
                        return jsonResponse({
                            success: true,
                            id: Date.now(),
                            message: '测试模式：网站已记录（无数据库）'
                        });
                    }
                } catch (error) {
                    return jsonResponse({ error: '数据格式错误' }, 400);
                }

            // Record visit
            case path === '/api/visit' && method === 'POST':
                try {
                    const data = await request.json();
                    const { siteId } = data;

                    if (hasD1 && siteId) {
                        await env.DB.prepare(`
                            UPDATE sites 
                            SET visits = visits + 1 
                            WHERE id = ?
                        `).bind(siteId).run();
                    }

                    // Also store in KV for analytics
                    if (env.NAV_ANALYTICS) {
                        const key = `visits:${new Date().toISOString().split('T')[0]}`;
                        await env.NAV_ANALYTICS.put(key, 
                            (parseInt(await env.NAV_ANALYTICS.get(key) || '0') + 1).toString()
                        );
                    }

                    return jsonResponse({ success: true });
                } catch (error) {
                    return jsonResponse({ error: '记录访问失败' }, 500);
                }

            // Get analytics
            case path === '/api/analytics' && method === 'GET':
                let totalVisits = 0;
                let popularSites = [];

                if (hasD1) {
                    const visitsResult = await env.DB.prepare(`
                        SELECT SUM(visits) as total FROM sites
                    `).first();

                    const popularResult = await env.DB.prepare(`
                        SELECT name, url, visits 
                        FROM sites 
                        ORDER BY visits DESC 
                        LIMIT 5
                    `).all();

                    totalVisits = visitsResult?.total || 0;
                    popularSites = popularResult.results || [];
                }

                return jsonResponse({
                    totalVisits,
                    popularSites,
                    timestamp: new Date().toISOString()
                });

            // Get categories
            case path === '/api/categories' && method === 'GET':
                if (hasD1) {
                    const result = await env.DB.prepare(`
                        SELECT category, COUNT(*) as count 
                        FROM sites 
                        GROUP BY category 
                        ORDER BY count DESC
                    `).all();

                    return jsonResponse(result.results || []);
                } else {
                    return jsonResponse([
                        { category: '开发', count: 5 },
                        { category: 'AI', count: 3 },
                        { category: '设计', count: 2 }
                    ]);
                }

            // Backup/Export data
            case path === '/api/export' && method === 'GET':
                if (hasD1) {
                    const sites = await env.DB.prepare(`SELECT * FROM sites`).all();
                    const categories = await env.DB.prepare(`
                        SELECT category, COUNT(*) as count 
                        FROM sites 
                        GROUP BY category
                    `).all();

                    const backupData = {
                        sites: sites.results || [],
                        categories: categories.results || [],
                        exportDate: new Date().toISOString(),
                        version: '1.0'
                    };

                    return jsonResponse(backupData);
                } else {
                    return jsonResponse({ error: '数据库不可用' }, 503);
                }

            // Import data
            case path === '/api/import' && method === 'POST':
                if (!hasD1) {
                    return jsonResponse({ error: '数据库不可用' }, 503);
                }

                try {
                    const data = await request.json();

                    // Clear existing data
                    await env.DB.prepare(`DELETE FROM sites`).run();

                    // Import new data
                    if (data.sites && Array.isArray(data.sites)) {
                        for (const site of data.sites) {
                            await env.DB.prepare(`
                                INSERT INTO sites (name, url, category, icon, description, visits)
                                VALUES (?, ?, ?, ?, ?, ?)
                            `).bind(
                                site.name,
                                site.url,
                                site.category || '未分类',
                                site.icon || 'fas fa-globe',
                                site.description || '',
                                site.visits || 0
                            ).run();
                        }
                    }

                    return jsonResponse({
                        success: true,
                        imported: data.sites?.length || 0
                    });
                } catch (error) {
                    return jsonResponse({ error: '导入失败', details: error.message }, 400);
                }

            // Weather proxy (to avoid CORS)
            case path === '/api/weather' && method === 'GET':
                try {
                    const lat = url.searchParams.get('lat') || '31.23';
                    const lon = url.searchParams.get('lon') || '121.47';
                    
                    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=auto`;
                    
                    const response = await fetch(weatherUrl);
                    const data = await response.json();
                    
                    return jsonResponse(data);
                } catch (error) {
                    return jsonResponse({
                        current_weather: {
                            temperature: 24,
                            weathercode: 0,
                            time: new Date().toISOString()
                        }
                    });
                }

            // AI chat endpoint
            case path === '/api/chat' && method === 'POST':
                try {
                    const data = await request.json();
                    const { message } = data;

                    // Simple AI responses
                    const responses = {
                        '你好': '你好！我是星海导航AI助手，很高兴为你服务！',
                        '帮助': '我可以帮你：\n• 搜索网站\n• 添加收藏\n• 天气查询\n• 网站推荐\n• 更多功能...',
                        '天气': '正在获取天气信息...',
                        '搜索': '请在搜索框输入关键词，或告诉我你想找什么？',
                        '时间': `现在是 ${new Date().toLocaleTimeString('zh-CN')}`,
                        '默认': '我还在学习中，这个问题我暂时无法回答。'
                    };

                    let response = responses.默认;
                    for (const [key, value] of Object.entries(responses)) {
                        if (message.includes(key)) {
                            response = value;
                            break;
                        }
                    }

                    // Simulate AI thinking
                    await new Promise(resolve => setTimeout(resolve, 500));

                    return jsonResponse({
                        response,
                        timestamp: new Date().toISOString()
                    });
                } catch (error) {
                    return jsonResponse({ error: 'AI服务暂时不可用' }, 500);
                }

            // 404 - Not Found
            default:
                return jsonResponse({ 
                    error: '路由不存在', 
                    path: path,
                    method: method 
                }, 404);
        }
    } catch (error) {
        console.error('API Error:', error);
        return jsonResponse({ 
            error: '服务器内部错误',
            message: error.message 
        }, 500);
    }
}