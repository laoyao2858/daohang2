-- 1. 确保设置表存在
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- 2. 重建分类表（增加 is_private 字段）
-- 注意：如果表已存在且有数据，请先备份数据或手动添加字段。
-- 这里为了确保功能正常，建议运行以下命令重建（会清空分类）：
DROP TABLE IF EXISTS categories;
CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'main',
  is_private BOOLEAN DEFAULT 0, -- 0=公开, 1=私密
  displayOrder INTEGER DEFAULT 0
);

-- 3. 重建网站表（增加 icon 字段）
DROP TABLE IF EXISTS sites;
CREATE TABLE sites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  categoryId INTEGER NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  icon TEXT, 
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

-- 5. 访客统计
CREATE TABLE IF NOT EXISTS visitor_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip_address TEXT,
  visit_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 写入默认设置 (防止白屏)
INSERT OR IGNORE INTO settings (key, value) VALUES 
  ('siteTitle', '我的导航'),
  ('welcomeMessage', '探索无限可能'),
  ('backgroundUrls', '["https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1920"]');
