-- 网站表
CREATE TABLE IF NOT EXISTS sites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    category TEXT DEFAULT '未分类',
    icon TEXT DEFAULT 'fas fa-globe',
    description TEXT,
    tags TEXT,
    visits INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 插入示例数据
INSERT OR IGNORE INTO sites (name, url, category, icon) VALUES
('GitHub', 'https://github.com', '开发', 'fab fa-github'),
('ChatGPT', 'https://chat.openai.com', 'AI', 'fas fa-robot');
