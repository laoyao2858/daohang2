-- 1. 设置表 (存储背景图JSON、说明语等)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- 2. 分类表 (增加 is_private 字段用于私密空间)
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'main', 
  is_private BOOLEAN DEFAULT 0, -- 新增：是否为私密分类
  displayOrder INTEGER DEFAULT 0
);

-- 3. 网站表 (增加图标自定义存储)
CREATE TABLE IF NOT EXISTS sites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  categoryId INTEGER NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  icon TEXT, -- 存储自定义图标URL
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

-- 6. 插入一些默认设置 (防止报错)
INSERT OR IGNORE INTO settings (key, value) VALUES 
  ('siteTitle', '我的导航站'),
  ('welcomeMessage', '欢迎来到我的专属空间'),
  ('backgroundUrls', '["https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1920"]');
