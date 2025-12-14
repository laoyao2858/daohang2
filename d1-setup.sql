-- 1. 设置表 (存储背景图列表、欢迎语等)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- 2. 分类表 (新增 is_private 字段用于私密空间)
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'main',
  is_private BOOLEAN DEFAULT 0, -- 0=公开, 1=私密
  displayOrder INTEGER DEFAULT 0
);

-- 3. 网站表 (增加 icon 字段用于自定义图标)
CREATE TABLE IF NOT EXISTS sites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  categoryId INTEGER NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  icon TEXT, -- 自定义图标URL
  description TEXT,
  visit_count INTEGER DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. 音乐表
CREATE TABLE IF NOT EXISTS custom_music (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  artist TEXT,
  cover TEXT,
  enabled BOOLEAN DEFAULT 1,
  display_order INTEGER DEFAULT 0
);

-- 5. 访客统计表
CREATE TABLE IF NOT EXISTS visitor_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip_address TEXT,
  visit_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 初始化默认设置 (防止第一次加载报错)
INSERT OR IGNORE INTO settings (key, value) VALUES 
  ('siteTitle', '我的空间'),
  ('welcomeMessage', '欢迎来到我的专属导航站'),
  ('backgroundUrls', '["https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1920"]');
