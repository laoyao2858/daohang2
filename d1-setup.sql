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
  ('backgroundUrl', 'https://iili.io/FSa7FDB.gif'),
  ('avatarUrl', 'https://iili.io/FSa7FDB.gif'),
  ('welcomeMessage', '欢迎使用导航站！'),
  ('autoPlayMusic', 'true'),
  ('showVisitorStats', 'true'),
  ('siteTitle', '我的导航站'),
  ('siteDescription', '一个简洁高效的导航网站');

-- 10. 插入默认用户偏好
INSERT OR IGNORE INTO user_preferences (key, value) VALUES 
  ('show_frequent_sites', 'true'),
  ('frequent_sites_count', '8'),
  ('enable_shortcuts', 'true'),
  ('enable_pinyin_search', 'true');

-- 11. 插入示例音乐（可选）
INSERT OR IGNORE INTO custom_music (title, artist, url, cover) VALUES 
  ('示例音乐1', '未知艺术家', 'https://example.com/music1.mp3', 'https://iili.io/FSa7FDB.gif'),
  ('示例音乐2', '未知艺术家', 'https://example.com/music2.mp3', 'https://iili.io/FSa7FDB.gif');

-- 12. 更新现有数据
UPDATE sites SET display_order = id WHERE display_order = 0 OR display_order IS NULL;
