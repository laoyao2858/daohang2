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

// 获取地理位置信息（简化版，实际可使用IP地理定位服务）
async function getLocationInfo(ip) {
  if (!ip || ip === '未知IP' || ip === '127.0.0.1' || ip.startsWith('192.168.')) {
    return { country: '本地', city: '本地' };
  }
  
  // 这里可以集成IP地理定位API，如ipapi.co、ipinfo.io等
  // 由于免费API有限制，这里使用简化版本
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
      const location = await getLocationInfo(clientIP);
      
      // 检查是否存在相同session的活跃记录（5分钟内）
      const existingActiveStmt = env.DB.prepare(
        'SELECT id FROM visitor_stats WHERE session_id = ? AND last_active > datetime("now", "-5 minutes")'
      ).bind(sessionId);
      const existingActive = await existingActiveStmt.all();
      
      if (existingActive.results.length > 0) {
        // 更新现有活跃记录
        await env.DB.prepare(
          'UPDATE visitor_stats SET page_views = page_views + 1, last_active = CURRENT_TIMESTAMP WHERE id = ?'
        ).bind(existingActive.results[0].id).run();
      } else {
        // 检查是否存在相同IP和session的较旧记录
        const existingStmt = env.DB.prepare(
          'SELECT id FROM visitor_stats WHERE ip_address = ? AND session_id = ? ORDER BY visit_time DESC LIMIT 1'
        ).bind(clientIP, sessionId);
        const existing = await existingStmt.all();
        
        if (existing.results.length > 0) {
          // 更新现有记录
          await env.DB.prepare(
            'UPDATE visitor_stats SET page_views = page_views + 1, last_active = CURRENT_TIMESTAMP, visit_time = CURRENT_TIMESTAMP WHERE id = ?'
          ).bind(existing.results[0].id).run();
        } else {
          // 插入新记录
          await env.DB.prepare(
            'INSERT INTO visitor_stats (ip_address, user_agent, referrer, country, city, session_id) VALUES (?, ?, ?, ?, ?, ?)'
          ).bind(clientIP, userAgent, referrer, location.country, location.city, sessionId).run();
        }
      }
      
      // 获取统计数据
      const todayStart = new Date().toISOString().split('T')[0];
      
      const [totalVisits, todayVisits, onlineUsers, uniqueVisitors, locations] = await Promise.all([
        env.DB.prepare('SELECT COUNT(*) as count FROM visitor_stats').all(),
        env.DB.prepare('SELECT COUNT(*) as count FROM visitor_stats WHERE DATE(visit_time) = DATE(?)').bind(todayStart).all(),
        env.DB.prepare('SELECT COUNT(DISTINCT session_id) as count FROM visitor_stats WHERE last_active > datetime("now", "-5 minutes")').all(),
        env.DB.prepare('SELECT COUNT(DISTINCT session_id) as count FROM visitor_stats').all(),
        env.DB.prepare('SELECT country, city, COUNT(*) as count FROM visitor_stats GROUP BY country, city ORDER BY count DESC LIMIT 10').all()
      ]);
      
      return jsonResponse({
        success: true,
        stats: {
          total: totalVisits.results[0].count,
          today: todayVisits.results[0].count,
          online: onlineUsers.results[0].count,
          unique: uniqueVisitors.results[0].count,
          locations: locations.results,
          sessionId: sessionId,
          ip: clientIP
        }
      });
    }

    // 获取访问统计
    if (resource === 'visitor' && request.method === 'GET') {
      const todayStart = new Date().toISOString().split('T')[0];
      
      const [totalVisits, todayVisits, onlineUsers, uniqueVisitors, locations, recentVisits] = await Promise.all([
        env.DB.prepare('SELECT COUNT(*) as count FROM visitor_stats').all(),
        env.DB.prepare('SELECT COUNT(*) as count FROM visitor_stats WHERE DATE(visit_time) = DATE(?)').bind(todayStart).all(),
        env.DB.prepare('SELECT COUNT(DISTINCT session_id) as count FROM visitor_stats WHERE last_active > datetime("now", "-5 minutes")').all(),
        env.DB.prepare('SELECT COUNT(DISTINCT session_id) as count FROM visitor_stats').all(),
        env.DB.prepare('SELECT country, city, COUNT(*) as count FROM visitor_stats GROUP BY country, city ORDER BY count DESC LIMIT 10').all(),
        env.DB.prepare('SELECT ip_address, country, city, visit_time, user_agent FROM visitor_stats ORDER BY visit_time DESC LIMIT 50').all()
      ]);
      
      return jsonResponse({
        total: totalVisits.results[0].count,
        today: todayVisits.results[0].count,
        online: onlineUsers.results[0].count,
        unique: uniqueVisitors.results[0].count,
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

    // 站点设置管理
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

    // 原有API接口
    switch (resource) {
      case 'settings':
        if (request.method === 'GET') {
          const stmt = env.DB.prepare('SELECT * FROM settings WHERE key = ?').bind('backgroundUrl');
          const { results } = await stmt.all();
          return jsonResponse(results[0] || { key: 'backgroundUrl', value: '' });
        }
        break;

      case 'categories':
        if (request.method === 'GET') {
          const { results } = await env.DB.prepare('SELECT * FROM categories ORDER BY displayOrder, id').all();
          return jsonResponse(results || []);
        }
        if (request.method === 'POST' && !pathParts[2]) {
          const { name, type } = await request.json();
          if (!name || !type) return jsonResponse({ error: 'Missing fields' }, 400);
          
          const { results } = await env.DB.prepare('SELECT MAX(displayOrder) as maxOrder FROM categories').all();
          const newOrder = (results[0].maxOrder || 0) + 1;

          const stmt = env.DB.prepare('INSERT INTO categories (name, type, displayOrder) VALUES (?, ?, ?)')
            .bind(name, type, newOrder);
          const { meta } = await stmt.run();
          return jsonResponse({ success: true, id: meta.last_row_id }, 201);
        }
        if (request.method === 'DELETE' && id) {
          await env.DB.prepare('DELETE FROM categories WHERE id = ?').bind(id).run();
          return jsonResponse({ success: true });
        }
        if (request.method === 'POST' && pathParts[2] === 'order') {
            const { orderedIds } = await request.json();
            if (!Array.isArray(orderedIds)) {
                return jsonResponse({ error: 'Invalid data format, expected orderedIds array' }, 400);
            }

            const statements = orderedIds.map((id, index) => {
                return env.DB.prepare('UPDATE categories SET displayOrder = ? WHERE id = ?').bind(index, id);
            });

            await env.DB.batch(statements);
            return jsonResponse({ success: true });
        }
        if (request.method === 'POST' && pathParts[2] === 'update-all') {
            const { updates } = await request.json();
            if (!Array.isArray(updates)) {
                return jsonResponse({ error: 'Invalid data format, expected updates array' }, 400);
            }

            const statements = updates.map(update => {
                return env.DB.prepare(
                    'UPDATE categories SET type = ?, displayOrder = ? WHERE id = ?'
                ).bind(update.type, update.displayOrder, update.id);
            });

            await env.DB.batch(statements);
            return jsonResponse({ success: true });
        }
        break;

      case 'sites':
        if (request.method === 'GET' && !pathParts[2]) {
          const { results } = await env.DB.prepare('SELECT * FROM sites ORDER BY categoryId, display_order, id').all();
          return jsonResponse(results || []);
        }
        if (request.method === 'GET' && pathParts[2] === 'frequent') {
          const { results } = await env.DB.prepare(
            'SELECT * FROM sites ORDER BY visit_count DESC LIMIT 10'
          ).all();
          return jsonResponse(results || []);
        }
        if (request.method === 'POST' && !pathParts[2]) {
          const { categoryId, name, url, icon, description, tags, group_id } = await request.json();
          if (!categoryId || !name || !url) return jsonResponse({ error: 'Missing fields' }, 400);
          
          const { results } = await env.DB.prepare(
            'SELECT MAX(display_order) as maxOrder FROM sites WHERE categoryId = ?'
          ).bind(categoryId).all();
          const newOrder = (results[0].maxOrder || 0) + 1;
          
          const stmt = env.DB.prepare(
            'INSERT INTO sites (categoryId, name, url, icon, description, tags, group_id, visit_count, display_order) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)'
          ).bind(categoryId, name, url, icon || '', description || '', tags || '', group_id || null, newOrder);
          const { meta } = await stmt.run();
          return jsonResponse({ success: true, id: meta.last_row_id });
        }
        if (request.method === 'POST' && pathParts[3] === 'visit') {
          const siteId = pathParts[2];
          if (!siteId) return jsonResponse({ error: 'Site ID required' }, 400);
          
          await env.DB.prepare(
            'UPDATE sites SET visit_count = visit_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
          ).bind(siteId).run();
          
          await env.DB.prepare(
            'INSERT INTO site_visits (site_id, visit_count, last_visit) VALUES (?, 1, CURRENT_TIMESTAMP) ON CONFLICT(site_id) DO UPDATE SET visit_count = visit_count + 1, last_visit = CURRENT_TIMESTAMP'
          ).bind(siteId).run();
          
          return jsonResponse({ success: true });
        }
        if (request.method === 'PUT' && id) {
            const { categoryId, name, url, icon, description, tags, group_id } = await request.json();
            if (!categoryId || !name || !url) return jsonResponse({ error: 'Missing fields' }, 400);
            const stmt = env.DB.prepare(
                'UPDATE sites SET categoryId = ?, name = ?, url = ?, icon = ?, description = ?, tags = ?, group_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
            ).bind(categoryId, name, url, icon || '', description || '', tags || '', group_id || null, id);
            await stmt.run();
            return jsonResponse({ success: true });
        }
        if (request.method === 'POST' && pathParts[2] === 'order') {
          const { categoryId, orderedIds } = await request.json();
          if (!categoryId || !Array.isArray(orderedIds)) {
            return jsonResponse({ error: 'Invalid data format' }, 400);
          }
          
          const statements = orderedIds.map((id, index) => {
            return env.DB.prepare(
              'UPDATE sites SET display_order = ? WHERE id = ? AND categoryId = ?'
            ).bind(index, id, categoryId);
          });
          
          await env.DB.batch(statements);
          return jsonResponse({ success: true });
        }
        if (request.method === 'DELETE' && id) {
          await env.DB.prepare('DELETE FROM sites WHERE id = ?').bind(id).run();
          return jsonResponse({ success: true });
        }
        break;
        
      case 'site-groups':
        if (request.method === 'GET') {
          const { results } = await env.DB.prepare('SELECT * FROM site_groups ORDER BY display_order').all();
          return jsonResponse(results || []);
        }
        if (request.method === 'POST') {
          const { name, color, icon } = await request.json();
          if (!name) return jsonResponse({ error: 'Name required' }, 400);
          
          const { results } = await env.DB.prepare('SELECT MAX(display_order) as maxOrder FROM site_groups').all();
          const newOrder = (results[0].maxOrder || 0) + 1;
          
          const stmt = env.DB.prepare('INSERT INTO site_groups (name, color, icon, display_order) VALUES (?, ?, ?, ?)')
            .bind(name, color || '', icon || '', newOrder);
          const { meta } = await stmt.run();
          return jsonResponse({ success: true, id: meta.last_row_id });
        }
        break;
        
      case 'user-preferences':
        if (request.method === 'GET') {
          const { results } = await env.DB.prepare('SELECT * FROM user_preferences').all();
          const prefs = {};
          results.forEach(row => { prefs[row.key] = row.value; });
          return jsonResponse(prefs);
        }
        if (request.method === 'POST') {
          const preferences = await request.json();
          const statements = [];
          for (const [key, value] of Object.entries(preferences)) {
            statements.push(env.DB.prepare(
              'INSERT OR REPLACE INTO user_preferences (key, value) VALUES (?, ?)'
            ).bind(key, value));
          }
          await env.DB.batch(statements);
          return jsonResponse({ success: true });
        }
        break;
        
      case 'import':
        if (request.method === 'POST') {
          const data = await request.json();
          
          const statements = [];
          
          if (data.categories) {
            statements.push(env.DB.prepare('DELETE FROM categories'));
            data.categories.forEach(cat => {
              statements.push(env.DB.prepare(
                'INSERT INTO categories (id, name, type, displayOrder) VALUES (?, ?, ?, ?)'
              ).bind(cat.id, cat.name, cat.type, cat.displayOrder || 0));
            });
          }
          
          if (data.sites) {
            statements.push(env.DB.prepare('DELETE FROM sites'));
            data.sites.forEach(site => {
              statements.push(env.DB.prepare(
                'INSERT INTO sites (id, categoryId, name, url, icon, description, tags, group_id, visit_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
              ).bind(site.id, site.categoryId, site.name, site.url, site.icon || '', site.description || '', site.tags || '', site.group_id || null, site.visit_count || 0));
            });
          }
          
          if (data.siteGroups) {
            statements.push(env.DB.prepare('DELETE FROM site_groups'));
            data.siteGroups.forEach(group => {
              statements.push(env.DB.prepare(
                'INSERT INTO site_groups (id, name, color, icon, display_order) VALUES (?, ?, ?, ?, ?)'
              ).bind(group.id, group.name, group.color || '', group.icon || '', group.display_order || 0));
            });
          }
          
          if (data.customMusic) {
            statements.push(env.DB.prepare('DELETE FROM custom_music'));
            data.customMusic.forEach(music => {
              statements.push(env.DB.prepare(
                'INSERT INTO custom_music (id, title, artist, url, cover, enabled, display_order) VALUES (?, ?, ?, ?, ?, ?, ?)'
              ).bind(music.id, music.title, music.artist || '', music.url, music.cover || '', music.enabled || 1, music.display_order || 0));
            });
          }
          
          if (data.visitorStats) {
            statements.push(env.DB.prepare('DELETE FROM visitor_stats'));
            data.visitorStats.forEach(visitor => {
              statements.push(env.DB.prepare(
                'INSERT INTO visitor_stats (id, ip_address, user_agent, referrer, country, city, visit_time, session_id, page_views, last_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
              ).bind(visitor.id, visitor.ip_address, visitor.user_agent, visitor.referrer, visitor.country, visitor.city, visitor.visit_time, visitor.session_id, visitor.page_views || 1, visitor.last_active || visitor.visit_time));
            });
          }
          
          if (data.userPreferences) {
            for (const [key, value] of Object.entries(data.userPreferences)) {
              statements.push(env.DB.prepare(
                'INSERT OR REPLACE INTO user_preferences (key, value) VALUES (?, ?)'
              ).bind(key, value));
            }
          }
          
          if (data.settings) {
            for (const [key, value] of Object.entries(data.settings)) {
              statements.push(env.DB.prepare(
                'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)'
              ).bind(key, value));
            }
          }
          
          await env.DB.batch(statements);
          return jsonResponse({ success: true });
        }
        break;

      default:
        return jsonResponse({ error: 'Resource not found' }, 404);
    }
    
    return jsonResponse({ error: `Method ${request.method} not allowed` }, 405);

  } catch (e) {
    console.error('API Error:', e);
    return jsonResponse({ error: 'Internal Server Error', details: e.message }, 500);
  }
}

export const onRequest = async ({ request, env }) => {
  return await handleApiRequest(request, env);
};
