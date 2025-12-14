-- 如果有旧版本数据库，可以运行此脚本来更新表结构
ALTER TABLE sites ADD COLUMN tags TEXT;
ALTER TABLE sites ADD COLUMN group_id INTEGER;
ALTER TABLE sites ADD COLUMN display_order INTEGER DEFAULT 0;
ALTER TABLE sites ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE sites ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 创建新表
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

-- 更新设置表
INSERT OR IGNORE INTO settings (key, value) VALUES 
  ('avatarUrl', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=400&fit=crop&crop=faces'),
  ('welcomeMessage', '欢迎使用导航站！\n您可以在这里快速访问常用网站和工具'),
  ('autoPlayMusic', 'true'),
  ('showVisitorStats', 'true'),
  ('siteTitle', '我的导航站'),
  ('siteDescription', '一个简洁高效的导航网站'),
  ('welcomeTitle', '欢迎访问导航站'),
  ('welcomeText', '发现更多精彩内容');
