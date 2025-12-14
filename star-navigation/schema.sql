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
    is_favorite BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 用户表（可选）
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE,
    preferences TEXT DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 访问统计表
CREATE TABLE IF NOT EXISTS analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE DEFAULT CURRENT_DATE,
    visits INTEGER DEFAULT 0,
    unique_visitors INTEGER DEFAULT 0,
    page_views INTEGER DEFAULT 0
);

-- 插入示例数据
INSERT OR IGNORE INTO sites (name, url, category, icon, description, visits) VALUES
('GitHub', 'https://github.com', '开发', 'fab fa-github', '全球开发者社区', 1500),
('ChatGPT', 'https://chat.openai.com', 'AI', 'fas fa-robot', 'AI对话助手', 1200),
('YouTube', 'https://youtube.com', '娱乐', 'fab fa-youtube', '视频分享平台', 1000),
('知乎', 'https://zhihu.com', '社区', 'fab fa-zhihu', '问答社区', 800),
('Tailwind CSS', 'https://tailwindcss.com', '前端', 'fas fa-palette', 'CSS框架', 600),
('Cloudflare', 'https://cloudflare.com', '云服务', 'fas fa-cloud', '网络性能与安全', 500),
('MDN Web Docs', 'https://developer.mozilla.org', '文档', 'fab fa-mdn', 'Web开发文档', 400),
('Vercel', 'https://vercel.com', '部署', 'fas fa-bolt', '前端部署平台', 300);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_sites_category ON sites(category);
CREATE INDEX IF NOT EXISTS idx_sites_visits ON sites(visits DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_date ON analytics(date);