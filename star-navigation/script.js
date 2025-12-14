// 星海导航 - 核心脚本 (简化功能示例版)
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 星海导航启动...');

    // 初始化星际背景
    function initSpaceBackground() {
        const canvas = document.getElementById('space-background');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        let stars = [];
        function initStars() { /* 星星初始化逻辑 */ }
        function animate() { /* 动画逻辑 */ }
        window.addEventListener('resize', () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; initStars(); });
        initStars(); animate();
    }
    initSpaceBackground();

    // 示例数据
    const sampleSites = [
        { name: 'GitHub', url: 'https://github.com', icon: 'fab fa-github', category: '开发', desc: '代码托管平台' },
        { name: 'ChatGPT', url: 'https://chat.openai.com', icon: 'fas fa-robot', category: 'AI', desc: 'AI对话助手' },
        { name: 'YouTube', url: 'https://youtube.com', icon: 'fab fa-youtube', category: '娱乐', desc: '视频分享平台' },
        { name: '知乎', url: 'https://zhihu.com', icon: 'fab fa-zhihu', category: '社区', desc: '问答社区' }
    ];

    // 渲染网站卡片
    function renderSites() {
        const container = document.getElementById('sites-grid');
        if (!container) return;
        container.innerHTML = sampleSites.map(site => `
            <div class="site-card p-5">
                <div class="flex items-start mb-4">
                    <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center text-2xl mr-4">
                        <i class="${site.icon}"></i>
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-lg">${site.name}</h3>
                        <div class="category-tag text-xs mt-2">${site.category}</div>
                    </div>
                </div>
                <p class="text-gray-400 text-sm mb-4">${site.desc}</p>
                <a href="${site.url}" target="_blank" class="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg text-sm font-semibold hover:opacity-90 transition flex items-center w-fit">
                    <i class="fas fa-external-link-alt mr-2"></i>访问网站
                </a>
            </div>
        `).join('');
    }
    renderSites();

    // 快速访问按钮
    const quickActions = ['快速搜索', '添加网站', '夜间模式', '刷新数据', '导出数据', '帮助文档'];
    const quickContainer = document.getElementById('quick-access');
    if (quickContainer) {
        quickContainer.innerHTML = quickActions.map(action => `
            <button class="quick-link p-4 rounded-xl bg-slate-900/50 hover:bg-slate-800 transition-all text-center" data-action="${action}">
                <i class="fas fa-${getIcon(action)} text-2xl mb-2"></i><div class="text-sm font-medium">${action}</div>
            </button>
        `).join('');
    }

    // 基础事件监听
    document.getElementById('quick-search')?.addEventListener('click', () => {
        const query = document.getElementById('global-search').value;
        if (query) alert(`执行搜索: ${query}`);
    });
    document.getElementById('theme-toggle')?.addEventListener('click', () => {
        document.documentElement.classList.toggle('light');
        alert('主题切换功能 (示例)');
    });
    document.getElementById('ai-toggle')?.addEventListener('click', () => {
        document.getElementById('ai-chat').classList.toggle('hidden');
    });

    // 更新访客数
    document.getElementById('visitor-count').textContent = Math.floor(Math.random() * 1000) + 500;

    // 工具函数
    function getIcon(action) {
        const map = { '快速搜索':'search', '添加网站':'plus', '夜间模式':'moon', '刷新数据':'sync', '导出数据':'download', '帮助文档':'question-circle' };
        return map[action] || 'circle';
    }
});
