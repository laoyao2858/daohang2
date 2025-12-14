/**
 * Cloudflare Pages Functions - REST API Worker for Navigation Site
 * 包含：音乐管理、访问统计、个性化设置等功能
 */

const jsonResponse = (data, status = 200) => {
  return new Response(JSON.stringify(data), {
    status: status,
    headers: { 'Content-Type': 'application/json' },
  });
};

// 获取客户端IP地址
function getClientIP(request) {
  const headers = request.headers;
  const cfConnectingIP = headers.get('cf-connecting-ip');
  const xRealIP = headers.get('x-real-ip');
  const xForwardedFor = headers.get('x-forwarded-for');
  
  return cfConnectingIP || xRealIP || xForwardedFor || '未知IP';
}

// 获取地理位置信息
async function getLocationInfo(ip, env) {
  if (!ip || ip === '未知IP') return { country: '未知', city: '未知' };
  
  try {
    const response = await fetch(`https://ipapi.co/${ip}/json/`);
    if (response.ok) {
      const data = await response.json();
      return {
        country: data.country_name || '未知',
        city: data.city || '未知'
      };
    }
  } catch (error) {
    console.error('Failed to get location:', error);
  }
  
  return { country: '未知', city: '未知' };
}

async function handleApiRequest(request, env) {
  const { pathname, searchParams } = new URL(request.url);
  const pathParts = pathname.split('/').filter(Boolean);

  if (pathParts[0] !== 'api') {
    return jsonResponse({ error: 'Invalid API route' }, 404);
  }

  const resource = pathParts[1];
  const id = pathParts[2];
  const action = pathParts[3];

  try {
    // 访问统计接口
    if (resource === 'visitor' && request.method === 'POST') {
      const clientIP = getClientIP(request);
      const userAgent = request.headers.get('user-agent') || '未知';
      const referrer = request.headers.get('referer') || '直接访问';
      const sessionId = searchParams.get('sessionId') || crypto.randomUUID();
      
      // 获取地理位置
      const location = await getLocationInfo(clientIP, env);
      
      // 更新或插入访问记录
      const existingStmt = env.DB.prepare(
        'SELECT * FROM visitor_stats WHERE ip_address = ? AND session_id = ? ORDER BY visit_time DESC LIMIT 1'
      ).bind(clientIP, sessionId);
      
      const { results } = await existingStmt.all();
      
      if (results.length > 0) {
        // 更新现有记录
        await env.DB.prepare(
          'UPDATE visitor_stats SET page_views = page_views + 1, last_active = CURRENT_TIMESTAMP WHERE id = ?'
        ).bind(results[0].id).run();
      } else {
        // 插入新记录
        await env.DB.prepare(
          'INSERT INTO visitor_stats (ip_address, user_agent, referrer, country, city, session_id) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind(clientIP, userAgent, referrer, location.country, location.city, sessionId).run();
      }
      
      // 获取统计数据
      const todayStart = new Date().toISOString().split('T')[0];
      
      const [totalVisits, todayVisits, onlineUsers, locations] = await Promise.all([
        env.DB.prepare('SELECT COUNT(*) as count FROM visitor_stats').all(),
        env.DB.prepare('SELECT COUNT(*) as count FROM visitor_stats WHERE DATE(visit_time) = DATE(?)').bind(todayStart).all(),
        env.DB.prepare('SELECT COUNT(*) as count FROM visitor_stats WHERE last_active > datetime("now", "-5 minutes")').all(),
        env.DB.prepare('SELECT country, city, COUNT(*) as count FROM visitor_stats GROUP BY country, city ORDER BY count DESC LIMIT 10').all()
      ]);
      
      return jsonResponse({
        success: true,
        stats: {
          total: totalVisits.results[0].count,
          today: todayVisits.results[0].count,
          online: onlineUsers.results[0].count,
          locations: locations.results,
          sessionId: sessionId
        }
      });
    }

    // 获取访问统计
    if (resource === 'visitor' && request.method === 'GET') {
      const todayStart = new Date().toISOString().split('T')[0];
      
      const [totalVisits, todayVisits, onlineUsers, locations, recentVisits] = await Promise.all([
        env.DB.prepare('SELECT COUNT(*) as count FROM visitor_stats').all(),
        env.DB.prepare('SELECT COUNT(*) as count FROM visitor_stats WHERE DATE(visit_time) = DATE(?)').bind(todayStart).all(),
        env.DB.prepare('SELECT COUNT(*) as count FROM visitor_stats WHERE last_active > datetime("now", "-5 minutes")').all(),
        env.DB.prepare('SELECT country, city, COUNT(*) as count FROM visitor_stats GROUP BY country, city ORDER BY count DESC LIMIT 10').all(),
        env.DB.prepare('SELECT ip_address, country, city, visit_time FROM visitor_stats ORDER BY visit_time DESC LIMIT 20').all()
      ]);
      
      return jsonResponse({
        total: totalVisits.results[0].count,
        today: todayVisits.results[0].count,
        online: onlineUsers.results[0].count,
        locations: locations.results,
        recent: recentVisits.results
      });
    }

    // 自定义音乐管理
    if (resource === 'custom-music') {
      if (request.method === 'GET') {
        const { results } = await env.DB.prepare('SELECT * FROM custom_music WHERE enabled = 1 ORDER BY display_order, created_at').all();
        return jsonResponse(results || []);
      }
      
      if (request.method === 'POST' && !id) {
        const { title, artist, url, cover } = await request.json();
        if (!title || !url) return jsonResponse({ error: 'Missing required fields' }, 400);
        
        const { results } = await env.DB.prepare('SELECT MAX(display_order) as maxOrder FROM custom_music').all();
        const newOrder = (results[0].maxOrder || 0) + 1;
        
        const stmt = env.DB.prepare(
          'INSERT INTO custom_music (title, artist, url, cover, display_order) VALUES (?, ?, ?, ?, ?)'
        ).bind(title, artist || '', url, cover || '', newOrder);
        
        const { meta } = await stmt.run();
        return jsonResponse({ success: true, id: meta.last_row_id });
      }
      
      if (request.method === 'PUT' && id) {
        const { title, artist, url, cover, enabled } = await request.json();
        const stmt = env.DB.prepare(
          'UPDATE custom_music SET title = ?, artist = ?, url = ?, cover = ?, enabled = ? WHERE id = ?'
        ).bind(title || '', artist || '', url || '', cover || '', enabled !== undefined ? enabled : 1, id);
        
        await stmt.run();
        return jsonResponse({ success: true });
      }
      
      if (request.method === 'POST' && id === 'order') {
        const { orderedIds } = await request.json();
        if (!Array.isArray(orderedIds)) {
          return jsonResponse({ error: 'Invalid data format' }, 400);
        }
        
        const statements = orderedIds.map((id, index) => {
          return env.DB.prepare('UPDATE custom_music SET display_order = ? WHERE id = ?').bind(index, id);
        });
        
        await env.DB.batch(statements);
        return jsonResponse({ success: true });
      }
      
      if (request.method === 'DELETE' && id) {
        await env.DB.prepare('DELETE FROM custom_music WHERE id = ?').bind(id).run();
        return jsonResponse({ success: true });
      }
    }

    // 站点设置管理（扩展原有settings接口）
    if (resource === 'settings') {
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
          statements.push(env.DB.prepare(
            'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)'
          ).bind(key, value));
        }
        
        await env.DB.batch(statements);
        return jsonResponse({ success: true });
      }
    }

    // 原有API接口保持以下不变...
    switch (resource) {
      // ... 保持原有的 categories, sites, site-groups, user-preferences, import 接口代码 ...
      // 这里应该包含您原有的所有API代码
      
      default:
        return jsonResponse({ error: 'Resource not found' }, 404);
    }
    
  } catch (e) {
    console.error('API Error:', e);
    return jsonResponse({ error: 'Internal Server Error', details: e.message }, 500);
  }
}

export const onRequest = async ({ request, env }) => {
  return await handleApiRequest(request, env);
};
