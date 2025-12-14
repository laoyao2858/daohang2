-- 完整的 D1 数据库初始化脚本
-- 可以一次性执行所有命令

-- 1. 创建设置表
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- 2. 创建分类表
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('sidebar', 'topbar')),
  displayOrder INTEGER
);

-- 3. 创建网站分组表
CREATE TABLE IF NOT EXISTS site_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  color TEXT,
  icon TEXT,
  display_order INTEGER DEFAULT 0
);

-- 4. 创建网站表
CREATE TABLE IF NOT EXISTS sites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  categoryId INTEGER NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  icon TEXT,
  description TEXT,
  visit_count INTEGER DEFAULT 0,
  tags TEXT,
  group_id INTEGER,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES site_groups(id)
);

-- 5. 创建网站访问统计表
CREATE TABLE IF NOT EXISTS site_visits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id INTEGER NOT NULL,
  visit_count INTEGER DEFAULT 0,
  last_visit TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);

-- 6. 创建用户偏好设置表
CREATE TABLE IF NOT EXISTS user_preferences (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- 7. 创建自定义音乐播放列表表
CREATE TABLE IF NOT EXISTS custom_music (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  artist TEXT,
  url TEXT NOT NULL,
  cover TEXT,
  enabled BOOLEAN DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  display_order INTEGER DEFAULT 0
);

-- 8. 创建访客统计表
CREATE TABLE IF NOT EXISTS visitor_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip_address TEXT,
  user_agent TEXT,
  referrer TEXT,
  country TEXT,
  city TEXT,
  visit_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  session_id TEXT,
  page_views INTEGER DEFAULT 1,
  last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. 插入默认设置
INSERT OR IGNORE INTO settings (key, value) VALUES 
  ('backgroundUrl', 'https://images.unsplash.com/photo-1534796636918-6a8c0be14515?w=1920&q=80'),
  ('avatarUrl', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=400&fit=crop&crop=faces'),
  ('welcomeMessage', '欢迎使用导航站！\n您可以在这里快速访问常用网站和工具'),
  ('autoPlayMusic', 'true'),
  ('showVisitorStats', 'true'),
  ('siteTitle', '我的导航站'),
  ('siteDescription', '一个简洁高效的导航网站'),
  ('welcomeTitle', '欢迎访问导航站'),
  ('welcomeText', '发现更多精彩内容');

-- 10. 插入默认用户偏好
INSERT OR IGNORE INTO user_preferences (key, value) VALUES 
  ('show_frequent_sites', 'true'),
  ('frequent_sites_count', '8'),
  ('enable_shortcuts', 'true'),
  ('enable_pinyin_search', 'true');

-- 11. 插入示例音乐（可选）
INSERT OR IGNORE INTO custom_music (title, artist, url, cover) VALUES 
  ('Example Music 1', 'Artist 1', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop'),
  ('Example Music 2', 'Artist 2', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&h=400&fit=crop'),
  ('Example Music 3', 'Artist 3', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=400&h=400&fit=crop');

-- 12. 更新现有数据
UPDATE sites SET display_order = id WHERE display_order = 0 OR display_order IS NULL;

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_sites_category ON sites(categoryId);
CREATE INDEX IF NOT EXISTS idx_sites_display_order ON sites(display_order);
CREATE INDEX IF NOT EXISTS idx_visitor_stats_time ON visitor_stats(visit_time);
CREATE INDEX IF NOT EXISTS idx_visitor_stats_ip ON visitor_stats(ip_address);
CREATE INDEX IF NOT EXISTS idx_visitor_stats_session ON visitor_stats(session_id);
CREATE INDEX IF NOT EXISTS idx_visitor_stats_active ON visitor_stats(last_active);
