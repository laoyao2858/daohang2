// 星海导航 - 核心脚本
class StarNavigation {
    constructor() {
        this.state = {
            sites: [],
            categories: [],
            favorites: [],
            searchEngine: 'google',
            theme: 'dark',
            user: null,
            aiEnabled: true,
            weatherData: null
        };
        
        this.init();
    }
    
    async init() {
        console.log('🚀 星海导航启动中...');
        
        // 初始化组件
        this.initSpaceBackground();
        this.initEventListeners();
        this.initAI();
        this.initWeather();
        
        // 加载数据
        await this.loadData();
        
        // 渲染界面
        this.renderCategories();
        this.renderSites();
        this.renderQuickAccess();
        
        // 更新访客计数
        this.updateVisitorCount();
        
        console.log('✅ 星海导航已就绪');
    }
    
    // 初始化星际背景
    initSpaceBackground() {
        const canvas = document.getElementById('space-background');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        let stars = [];
        
        // 调整画布大小
        function resizeCanvas() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            initStars();
        }
        
        // 创建星星
        function initStars() {
            stars = [];
            const starCount = Math.floor((canvas.width * canvas.height) / 10000);
            
            for (let i = 0; i < starCount; i++) {
                stars.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    size: Math.random() * 2 + 0.5,
                    speed: Math.random() * 0.5 + 0.2,
                    twinkleSpeed: Math.random() * 0.05 + 0.02,
                    opacity: Math.random() * 0.5 + 0.3
                });
            }
        }
        
        // 动画循环
        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // 绘制星星
            stars.forEach(star => {
                // 闪烁效果
                star.opacity = 0.3 + Math.sin(Date.now() * star.twinkleSpeed) * 0.2;
                
                // 移动
                star.y += star.speed;
                if (star.y > canvas.height) {
                    star.y = 0;
                    star.x = Math.random() * canvas.width;
                }
                
                // 绘制
                ctx.beginPath();
                ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
                ctx.fill();
                
                // 添加星光
                if (star.size > 1) {
                    const gradient = ctx.createRadialGradient(
                        star.x, star.y, 0,
                        star.x, star.y, star.size * 3
                    );
                    gradient.addColorStop(0, `rgba(255, 255, 255, ${star.opacity * 0.5})`);
                    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
                    
                    ctx.beginPath();
                    ctx.arc(star.x, star.y, star.size * 3, 0, Math.PI * 2);
                    ctx.fillStyle = gradient;
                    ctx.fill();
                }
            });
            
            // 绘制星云
            drawNebula();
            
            requestAnimationFrame(animate);
        }
        
        function drawNebula() {
            // 随机星云颜色
            const colors = [
                'rgba(124, 58, 237, 0.1)',
                'rgba(59, 130, 246, 0.1)',
                'rgba(16, 185, 129, 0.1)',
                'rgba(236, 72, 153, 0.1)'
            ];
            
            // 创建多个模糊圆形模拟星云
            for (let i = 0; i < 3; i++) {
                const x = (canvas.width / 4) * (i + 1) + Math.sin(Date.now() * 0.0001 * (i + 1)) * 50;
                const y = canvas.height * 0.3 + Math.cos(Date.now() * 0.0001 * (i + 1)) * 30;
                const radius = 100 + Math.sin(Date.now() * 0.0002 * (i + 1)) * 20;
                
                const gradient = ctx.createRadialGradient(
                    x, y, 0,
                    x, y, radius
                );
                gradient.addColorStop(0, colors[i]);
                gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
                
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                ctx.fillStyle = gradient;
                ctx.fill();
            }
        }
        
        // 初始化和启动
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();
        animate();
    }
    
    // 初始化事件监听
    initEventListeners() {
        // 搜索功能
        const searchInput = document.getElementById('global-search');
        const searchBtn = document.getElementById('quick-search');
        
        searchBtn?.addEventListener('click', () => this.performSearch());
        searchInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.performSearch();
        });
        
        // 主题切换
        document.getElementById('theme-toggle')?.addEventListener('click', () => {
            this.toggleTheme();
        });
        
        // 管理面板
        document.getElementById('admin-btn')?.addEventListener('click', () => {
            this.openAdminPanel();
        });
        
        document.getElementById('close-admin')?.addEventListener('click', () => {
            document.getElementById('admin-modal').classList.add('hidden');
        });
        
        // AI助手
        document.getElementById('ai-toggle')?.addEventListener('click', () => {
            this.toggleAIChat();
        });
        
        document.getElementById('ai-send')?.addEventListener('click', () => {
            this.sendAIMessage();
        });
        
        document.getElementById('ai-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendAIMessage();
        });
        
        // 点击外部关闭AI聊天
        document.addEventListener('click', (e) => {
            const aiChat = document.getElementById('ai-chat');
            const aiToggle = document.getElementById('ai-toggle');
            
            if (aiChat && !aiChat.contains(e.target) && !aiToggle.contains(e.target)) {
                aiChat.classList.add('hidden');
            }
        });
    }
    
    // 初始化AI助手
    initAI() {
        // 预定义AI回复
        this.aiResponses = {
            '你好': '你好！我是星海AI助手，随时为你服务！',
            '帮助': '我可以帮你：\n1. 搜索网站\n2. 添加新网站\n3. 管理分类\n4. 天气查询\n5. 更多功能...',
            '搜索': '请在顶部搜索框输入关键词，或告诉我你想找什么类型的网站？',
            '天气': '正在获取天气信息...',
            '默认': '我还在学习中，这个问题我暂时无法回答。你可以尝试搜索或查看帮助。'
        };
    }
    
    // 初始化天气
    async initWeather() {
        try {
            // 使用免费天气API
            const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=31.23&longitude=121.47&current_weather=true');
            const data = await response.json();
            
            if (data.current_weather) {
                this.state.weatherData = data.current_weather;
                this.updateWeatherDisplay();
            }
        } catch (error) {
            console.log('天气信息获取失败，使用默认数据');
            this.state.weatherData = {
                temperature: 24,
                weathercode: 0,
                time: new Date().toLocaleTimeString()
            };
            this.updateWeatherDisplay();
        }
    }
    
    // 更新天气显示
    updateWeatherDisplay() {
        const tempEl = document.getElementById('weather-temp');
        const locationEl = document.getElementById('weather-location');
        
        if (tempEl && this.state.weatherData) {
            tempEl.textContent = `${this.state.weatherData.temperature}°C`;
            
            // 简单模拟位置
            const locations = ['上海', '北京', '深圳', '纽约', '伦敦', '东京'];
            const randomLocation = locations[Math.floor(Math.random() * locations.length)];
            locationEl.textContent = randomLocation;
        }
    }
    
    // 加载数据
    async loadData() {
        try {
            // 从本地存储加载数据
            const savedData = localStorage.getItem('starNavigationData');
            
            if (savedData) {
                const data = JSON.parse(savedData);
                this.state.sites = data.sites || this.getDefaultSites();
                this.state.categories = data.categories || this.getDefaultCategories();
                this.state.favorites = data.favorites || [];
            } else {
                // 使用默认数据
                this.state.sites = this.getDefaultSites();
                this.state.categories = this.getDefaultCategories();
                this.state.favorites = [];
                this.saveData();
            }
            
            // 显示加载完成
            document.getElementById('loading-indicator')?.classList.add('hidden');
            
        } catch (error) {
            console.error('数据加载失败:', error);
            // 使用默认数据
            this.state.sites = this.getDefaultSites();
            this.state.categories = this.getDefaultCategories();
        }
    }
    
    // 获取默认网站数据
    getDefaultSites() {
        return [
            {
                id: 1,
                name: 'GitHub',
                url: 'https://github.com',
                icon: 'fab fa-github',
                category: '开发工具',
                description: '全球开发者社区',
                tags: ['编程', '开源', '代码']
            },
            {
                id: 2,
                name: 'ChatGPT',
                url: 'https://chat.openai.com',
                icon: 'fas fa-robot',
                category: 'AI工具',
                description: 'AI对话助手',
                tags: ['人工智能', '对话']
            },
            {
                id: 3,
                name: 'YouTube',
                url: 'https://youtube.com',
                icon: 'fab fa-youtube',
                category: '娱乐媒体',
                description: '视频分享平台',
                tags: ['视频', '娱乐']
            },
            {
                id: 4,
                name: '知乎',
                url: 'https://zhihu.com',
                icon: 'fab fa-zhihu',
                category: '知识社区',
                description: '问答社区',
                tags: ['问答', '知识']
            },
            {
                id: 5,
                name: 'Tailwind CSS',
                url: 'https://tailwindcss.com',
                icon: 'fas fa-palette',
                category: '前端开发',
                description: 'CSS框架',
                tags: ['CSS', '框架']
            },
            {
                id: 6,
                name: 'Cloudflare',
                url: 'https://cloudflare.com',
                icon: 'fas fa-cloud',
                category: '云服务',
                description: '网络性能与安全',
                tags: ['云服务', 'CDN']
            },
            {
                id: 7,
                name: 'MDN Web Docs',
                url: 'https://developer.mozilla.org',
                icon: 'fab fa-mdn',
                category: '技术文档',
                description: 'Web开发文档',
                tags: ['文档', 'Web开发']
            },
            {
                id: 8,
                name: 'Vercel',
                url: 'https://vercel.com',
                icon: 'fas fa-bolt',
                category: '部署平台',
                description: '前端部署平台',
                tags: ['部署', '前端']
            }
        ];
    }
    
    // 获取默认分类
    getDefaultCategories() {
        return [
            { id: 1, name: '开发工具', icon: 'fas fa-code', color: 'from-blue-500 to-cyan-500' },
            { id: 2, name: 'AI工具', icon: 'fas fa-brain', color: 'from-purple-500 to-pink-500' },
            { id: 3, name: '设计资源', icon: 'fas fa-paint-brush', color: 'from-green-500 to-emerald-500' },
            { id: 4, name: '学习平台', icon: 'fas fa-graduation-cap', color: 'from-yellow-500 to-orange-500' },
            { id: 5, name: '效率工具', icon: 'fas fa-rocket', color: 'from-red-500 to-rose-500' },
            { id: 6, name: '娱乐媒体', icon: 'fas fa-film', color: 'from-indigo-500 to-violet-500' }
        ];
    }
    
    // 渲染分类
    renderCategories() {
        const container = document.getElementById('categories');
        if (!container) return;
        
        container.innerHTML = this.state.categories.map(category => `
            <button class="category-tag px-6 py-3 rounded-full bg-gradient-to-r ${category.color} hover:opacity-90 transition-all flex items-center" 
                    data-category="${category.name}">
                <i class="${category.icon} mr-2"></i>
                ${category.name}
                <span class="ml-2 text-xs bg-white/20 px-2 py-1 rounded-full">
                    ${this.state.sites.filter(s => s.category === category.name).length}
                </span>
            </button>
        `).join('');
        
        // 添加点击事件
        container.querySelectorAll('.category-tag').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const category = e.currentTarget.dataset.category;
                this.filterSitesByCategory(category);
            });
        });
    }
    
    // 渲染网站
    renderSites(filteredSites = null) {
        const container = document.getElementById('sites-grid');
        if (!container) return;
        
        const sites = filteredSites || this.state.sites;
        
        container.innerHTML = sites.map(site => `
            <div class="site-card p-5 hover:shadow-2xl transition-all duration-300 relative group">
                <div class="hologram-effect"></div>
                <div class="flex items-start mb-4">
                    <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center text-2xl mr-4">
                        <i class="${site.icon}"></i>
                    </div>
                    <div class="flex-1">
                        <div class="flex justify-between items-start">
                            <h3 class="font-bold text-lg">${site.name}</h3>
                            <button class="favorite-btn p-2 hover:bg-slate-800 rounded-lg transition" data-id="${site.id}">
                                <i class="fas fa-star ${this.state.favorites.includes(site.id) ? 'text-yellow-400' : 'text-gray-500'}"></i>
                            </button>
                        </div>
                        <div class="category-tag text-xs mt-2">${site.category}</div>
                    </div>
                </div>
                <p class="text-gray-400 text-sm mb-4">${site.description}</p>
                <div class="flex flex-wrap gap-2 mb-4">
                    ${site.tags.map(tag => `
                        <span class="text-xs px-3 py-1 bg-slate-800/50 rounded-full">${tag}</span>
                    `).join('')}
                </div>
                <div class="flex justify-between items-center">
                    <a href="${site.url}" target="_blank" 
                       class="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg text-sm font-semibold hover:opacity-90 transition flex items-center">
                        <i class="fas fa-external-link-alt mr-2"></i>
                        访问网站
                    </a>
                    <div class="text-xs text-gray-500">
                        <i class="fas fa-eye mr-1"></i>
                        ${Math.floor(Math.random() * 1000)}
                    </div>
                </div>
            </div>
        `).join('');
        
        // 添加收藏功能
        container.querySelectorAll('.favorite-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const siteId = parseInt(e.currentTarget.dataset.id);
                this.toggleFavorite(siteId);
            });
        });
        
        // 添加网站点击统计
        container.querySelectorAll('a[href]').forEach(link => {
            link.addEventListener('click', () => {
                this.recordVisit(link.href);
            });
        });
    }
    
    // 渲染快速访问
    renderQuickAccess() {
        const container = document.getElementById('quick-access');
        if (!container) return;
        
        const quickLinks = [
            { name: '快速搜索', icon: 'fas fa-search', action: 'search' },
            { name: '添加网站', icon: 'fas fa-plus', action: 'add-site' },
            { name: '夜间模式', icon: 'fas fa-moon', action: 'toggle-theme' },
            { name: '刷新数据', icon: 'fas fa-sync', action: 'refresh' },
            { name: '导出数据', icon: 'fas fa-download', action: 'export' },
            { name: '帮助文档', icon: 'fas fa-question-circle', action: 'help' }
        ];
        
        container.innerHTML = quickLinks.map(link => `
            <button class="quick-link p-4 rounded-xl bg-slate-900/50 hover:bg-slate-800 transition-all text-center"
                    data-action="${link.action}">
                <i class="${link.icon} text-2xl mb-2"></i>
                <div class="text-sm font-medium">${link.name}</div>
            </button>
        `).join('');
        
        // 添加点击事件
        container.querySelectorAll('.quick-link').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                this.handleQuickAction(action);
            });
        });
    }
    
    // 处理快速操作
    handleQuickAction(action) {
        switch(action) {
            case 'search':
                document.getElementById('global-search').focus();
                break;
            case 'add-site':
                this.openAddSiteModal();
                break;
            case 'toggle-theme':
                this.toggleTheme();
                break;
            case 'refresh':
                this.loadData();
                break;
            case 'export':
                this.exportData();
                break;
            case 'help':
                this.showHelp();
                break;
        }
    }
    
    // 搜索功能
    performSearch() {
        const searchInput = document.getElementById('global-search');
        const query = searchInput.value.trim();
        
        if (!query) return;
        
        // 检查是否是URL
        if (query.includes('.') && !query.includes(' ')) {
            // 可能是URL，直接跳转
            const url = query.startsWith('http') ? query : `https://${query}`;
            window.open(url, '_blank');
            this.recordVisit(url);
        } else {
            // 网站内搜索
            const results = this.state.sites.filter(site => 
                site.name.toLowerCase().includes(query.toLowerCase()) ||
                site.description.toLowerCase().includes(query.toLowerCase()) ||
                site.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
            );
            
            this.renderSites(results);
            
            // 如果没有结果，显示提示
            if (results.length === 0) {
                const container = document.getElementById('sites-grid');
                if (container) {
                    container.innerHTML = `
                        <div class="col-span-full text-center py-12">
                            <i class="fas fa-search text-4xl text-gray-600 mb-4"></i>
                            <h3 class="text-xl font-bold mb-2">未找到相关网站</h3>
                            <p class="text-gray-500 mb-4">尝试其他关键词或添加新网站</p>
                            <button class="px-6 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-lg font-semibold hover:opacity-90 transition"
                                    onclick="window.navigation.openAddSiteModal()">
                                添加网站
                            </button>
                        </div>
                    `;
                }
            }
        }
        
        searchInput.value = '';
    }
    
    // 按分类过滤
    filterSitesByCategory(category) {
        const filtered = category === 'all' 
            ? this.state.sites 
            : this.state.sites.filter(site => site.category === category);
        
        this.renderSites(filtered);
        
        // 更新分类高亮
        document.querySelectorAll('.category-tag').forEach(btn => {
            const isActive = btn.dataset.category === category;
            btn.classList.toggle('ring-2', isActive);
            btn.classList.toggle('ring-cyan-400', isActive);
        });
    }
    
    // 切换收藏
    toggleFavorite(siteId) {
        const index = this.state.favorites.indexOf(siteId);
        
        if (index > -1) {
            this.state.favorites.splice(index, 1);
        } else {
            this.state.favorites.push(siteId);
        }
        
        this.saveData();
        this.renderSites();
    }
    
    // 切换主题
    toggleTheme() {
        this.state.theme = this.state.theme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', this.state.theme);
        
        // 更新按钮图标
        const themeBtn = document.getElementById('theme-toggle');
        if (themeBtn) {
            const icon = themeBtn.querySelector('i');
            icon.className = this.state.theme === 'dark' 
                ? 'fas fa-moon' 
                : 'fas fa-sun';
        }
        
        this.saveData();
    }
    
    // 切换AI聊天
    toggleAIChat() {
        const chat = document.getElementById('ai-chat');
        chat?.classList.toggle('hidden');
        
        if (!chat?.classList.contains('hidden')) {
            document.getElementById('ai-input')?.focus();
        }
    }
    
    // 发送AI消息
    sendAIMessage() {
        const input = document.getElementById('ai-input');
        const messages = document.getElementById('ai-messages');
        const message = input.value.trim();
        
        if (!message) return;
        
        // 添加用户消息
        messages.innerHTML += `
            <div class="ai-message bg-blue-900/30 p-3 rounded-lg ml-8">
                <div class="text-xs text-gray-400 mb-1">你</div>
                <div>${message}</div>
            </div>
        `;
        
        input.value = '';
        
        // 模拟AI思考
        setTimeout(() => {
            this.addAIResponse(message);
            messages.scrollTop = messages.scrollHeight;
        }, 500);
    }
    
    // 添加AI回复
    addAIResponse(userMessage) {
        const messages = document.getElementById('ai-messages');
        let response = this.aiResponses.默认;
        
        // 匹配预定义回复
        for (const [key, value] of Object.entries(this.aiResponses)) {
            if (userMessage.includes(key)) {
                response = value;
                break;
            }
        }
        
        // 添加AI回复
        messages.innerHTML += `
            <div class="ai-message bg-slate-800/50 p-3 rounded-lg">
                <div class="text-xs text-gray-400 mb-1">星海 AI</div>
                <div>${response}</div>
            </div>
        `;
    }
    
    // 打开管理面板
    openAdminPanel() {
        const modal = document.getElementById('admin-modal');
        const content = document.getElementById('admin-content');
        
        modal.classList.remove('hidden');
        
        // 生成管理面板内容
        content.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <!-- 数据统计 -->
                <div class="col-span-full bg-slate-800/50 rounded-xl p-6">
                    <h3 class="text-xl font-bold mb-4">数据概览</h3>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div class="stat-card p-4 bg-gradient-to-br from-blue-900/30 to-cyan-900/30 rounded-lg">
                            <div class="text-3xl font-bold">${this.state.sites.length}</div>
                            <div class="text-sm text-gray-400">网站数量</div>
                        </div>
                        <div class="stat-card p-4 bg-gradient-to-br from-purple-900/30 to-pink-900/30 rounded-lg">
                            <div class="text-3xl font-bold">${this.state.categories.length}</div>
                            <div class="text-sm text-gray-400">分类数量</div>
                        </div>
                        <div class="stat-card p-4 bg-gradient-to-br from-green-900/30 to-emerald-900/30 rounded-lg">
                            <div class="text-3xl font-bold">${this.state.favorites.length}</div>
                            <div class="text-sm text-gray-400">收藏数量</div>
                        </div>
                        <div class="stat-card p-4 bg-gradient-to-br from-yellow-900/30 to-orange-900/30 rounded-lg">
                            <div class="text-3xl font-bold" id="visitor-count-admin">0</div>
                            <div class="text-sm text-gray-400">访客数量</div>
                        </div>
                    </div>
                </div>
                
                <!-- 网站管理 -->
                <div class="col-span-2 bg-slate-800/50 rounded-xl p-6">
                    <h3 class="text-xl font-bold mb-4">网站管理</h3>
                    <div class="space-y-4 max-h-80 overflow-y-auto">
                        ${this.state.sites.map(site => `
                            <div class="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                                <div class="flex items-center">
                                    <i class="${site.icon} text-xl mr-3"></i>
                                    <div>
                                        <div class="font-medium">${site.name}</div>
                                        <div class="text-sm text-gray-400">${site.url}</div>
                                    </div>
                                </div>
                                <div class="flex space-x-2">
                                    <button class="p-2 hover:bg-slate-800 rounded" onclick="window.navigation.editSite(${site.id})">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="p-2 hover:bg-red-900/30 rounded" onclick="window.navigation.deleteSite(${site.id})">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <button class="w-full mt-4 p-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg font-semibold hover:opacity-90 transition"
                            onclick="window.navigation.openAddSiteModal()">
                        <i class="fas fa-plus mr-2"></i>
                        添加新网站
                    </button>
                </div>
                
                <!-- 系统设置 -->
                <div class="bg-slate-800/50 rounded-xl p-6">
                    <h3 class="text-xl font-bold mb-4">系统设置</h3>
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium mb-2">AI助手</label>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" ${this.state.aiEnabled ? 'checked' : ''} 
                                       class="sr-only peer" id="ai-toggle-setting">
                                <div class="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r from-cyan-600 to-blue-600"></div>
                                <span class="ml-3 text-sm">${this.state.aiEnabled ? '启用' : '禁用'}</span>
                            </label>
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-2">默认搜索引擎</label>
                            <select class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2">
                                <option value="google">Google</option>
                                <option value="bing">Bing</option>
                                <option value="baidu">百度</option>
                                <option value="duckduckgo">DuckDuckGo</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-2">主题模式</label>
                            <select class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2" 
                                    onchange="window.navigation.changeTheme(this.value)">
                                <option value="auto">自动</option>
                                <option value="dark" ${this.state.theme === 'dark' ? 'selected' : ''}>深色</option>
                                <option value="light" ${this.state.theme === 'light' ? 'selected' : ''}>浅色</option>
                            </select>
                        </div>
                        <button class="w-full p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg font-semibold hover:opacity-90 transition">
                            保存设置
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // 更新访客计数
        document.getElementById('visitor-count-admin').textContent = 
            document.getElementById('visitor-count').textContent;
        
        // 添加设置切换事件
        document.getElementById('ai-toggle-setting')?.addEventListener('change', (e) => {
            this.state.aiEnabled = e.target.checked;
            this.saveData();
        });
    }
    
    // 打开添加网站模态框
    openAddSiteModal() {
        // 创建模态框
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4';
        modal.innerHTML = `
            <div class="bg-slate-900 rounded-2xl w-full max-w-lg border border-slate-700">
                <div class="p-6 border-b border-slate-800">
                    <h3 class="text-xl font-bold flex items-center">
                        <i class="fas fa-plus-circle mr-3 text-green-400"></i>
                        添加新网站
                    </h3>
                </div>
                <div class="p-6">
                    <form id="add-site-form" class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium mb-2">网站名称</label>
                            <input type="text" required 
                                   class="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 outline-none focus:border-cyan-500 transition">
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-2">网站URL</label>
                            <input type="url" required 
                                   class="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 outline-none focus:border-cyan-500 transition"
                                   placeholder="https://example.com">
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-2">选择分类</label>
                            <select class="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 outline-none">
                                ${this.state.categories.map(cat => 
                                    `<option value="${cat.name}">${cat.name}</option>`
                                ).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-2">图标 (Font Awesome)</label>
                            <input type="text" 
                                   class="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 outline-none focus:border-cyan-500 transition"
                                   placeholder="fab fa-github">
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-2">描述</label>
                            <textarea class="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 outline-none focus:border-cyan-500 transition"
                                      rows="3"></textarea>
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-2">标签 (用逗号分隔)</label>
                            <input type="text" 
                                   class="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 outline-none focus:border-cyan-500 transition"
                                   placeholder="工具, 开发, 编程">
                        </div>
                    </form>
                </div>
                <div class="p-6 border-t border-slate-800 flex justify-end space-x-3">
                    <button class="px-6 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg font-semibold transition"
                            onclick="this.closest('.fixed').remove()">
                        取消
                    </button>
                    <button class="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg font-semibold hover:opacity-90 transition"
                            onclick="window.navigation.addNewSite(this)">
                        添加网站
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 点击外部关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
    
    // 添加新网站
    addNewSite(button) {
        const form = button.closest('.fixed').querySelector('#add-site-form');
        const inputs = form.querySelectorAll('input, select, textarea');
        
        const newSite = {
            id: Date.now(),
            name: inputs[0].value,
            url: inputs[1].value,
            category: inputs[2].value,
            icon: inputs[3].value || 'fas fa-globe',
            description: inputs[4].value,
            tags: inputs[5].value.split(',').map(tag => tag.trim()).filter(tag => tag)
        };
        
        this.state.sites.push(newSite);
        this.saveData();
        this.renderSites();
        
        button.closest('.fixed').remove();
        
        // 显示成功消息
        this.showMessage('网站添加成功！', 'success');
    }
    
    // 编辑网站
    editSite(siteId) {
        const site = this.state.sites.find(s => s.id === siteId);
        if (!site) return;
        
        // 打开编辑模态框（简化版）
        alert(`编辑网站: ${site.name}\n\n此功能正在开发中...`);
    }
    
    // 删除网站
    deleteSite(siteId) {
        if (confirm('确定要删除这个网站吗？')) {
            this.state.sites = this.state.sites.filter(s => s.id !== siteId);
            this.state.favorites = this.state.favorites.filter(id => id !== siteId);
            this.saveData();
            this.renderSites();
            this.showMessage('网站已删除', 'success');
        }
    }
    
    // 显示消息
    showMessage(text, type = 'info') {
        const message = document.createElement('div');
        message.className = `fixed top-6 right-6 px-6 py-3 rounded-lg z-50 shadow-lg ${
            type === 'success' ? 'bg-gradient-to-r from-green-600 to-emerald-600' :
            type === 'error' ? 'bg-gradient-to-r from-red-600 to-rose-600' :
            'bg-gradient-to-r from-blue-600 to-cyan-600'
        }`;
        message.innerHTML = `
            <div class="flex items-center">
                <i class="fas fa-${type === 'success' ? 'check-circle' : 'info-circle'} mr-3"></i>
                <div>${text}</div>
            </div>
        `;
        
        document.body.appendChild(message);
        
        // 3秒后自动消失
        setTimeout(() => {
            message.style.opacity = '0';
            message.style.transform = 'translateX(100%)';
            setTimeout(() => message.remove(), 300);
        }, 3000);
    }
    
    // 记录访问
    recordVisit(url) {
        let visits = JSON.parse(localStorage.getItem('siteVisits') || '{}');
        visits[url] = (visits[url] || 0) + 1;
        localStorage.setItem('siteVisits', JSON.stringify(visits));
        
        // 更新总访问次数
        this.updateVisitorCount();
    }
    
    // 更新访客计数
    updateVisitorCount() {
        const countEl = document.getElementById('visitor-count');
        if (!countEl) return;
        
        const visits = JSON.parse(localStorage.getItem('siteVisits') || '{}');
        const totalVisits = Object.values(visits).reduce((sum, count) => sum + count, 0);
        
        // 如果没有数据，使用随机数
        countEl.textContent = totalVisits > 0 ? totalVisits : Math.floor(Math.random() * 1000) + 500;
    }
    
    // 保存数据到本地存储
    saveData() {
        const data = {
            sites: this.state.sites,
            categories: this.state.categories,
            favorites: this.state.favorites,
            theme: this.state.theme,
            aiEnabled: this.state.aiEnabled,
            lastUpdated: new Date().toISOString()
        };
        
        localStorage.setItem('starNavigationData', JSON.stringify(data));
    }
    
    // 导出数据
    exportData() {
        const data = {
            sites: this.state.sites,
            categories: this.state.categories,
            exportDate: new Date().toISOString(),
            version: '1.0'
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `星海导航备份_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.showMessage('数据导出成功！', 'success');
    }
    
    // 显示帮助
    showHelp() {
        const helpText = `
星海导航使用指南：

🌟 主要功能：
1. 快速搜索：直接在搜索框输入网站名称或URL
2. 分类浏览：点击分类标签筛选网站
3. 收藏功能：点击星星图标收藏常用网站
4. AI助手：右下角AI按钮开启智能助手
5. 管理面板：设置按钮打开控制中心

📱 快捷键：
• Ctrl + /：快速聚焦搜索框
• Esc：关闭所有弹窗
• F5：刷新数据

⚙️ 设置选项：
• 主题切换：深色/浅色模式
• AI助手开关
• 数据导入导出

更多功能持续开发中...
        `;
        
        alert(helpText);
    }
    
    // 切换主题
    changeTheme(theme) {
        this.state.theme = theme;
        if (theme === 'auto') {
            // 根据系统偏好自动切换
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
        } else {
            document.documentElement.setAttribute('data-theme', theme);
        }
        this.saveData();
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    window.navigation = new StarNavigation();
});

// 全局快捷键
document.addEventListener('keydown', (e) => {
    // Ctrl + / 聚焦搜索框
    if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        document.getElementById('global-search')?.focus();
    }
    
    // Esc 关闭弹窗
    if (e.key === 'Escape') {
        document.querySelectorAll('.fixed').forEach(el => {
            if (el.id !== 'admin-modal' || !el.classList.contains('hidden')) {
                el.remove();
            }
        });
        document.getElementById('ai-chat')?.classList.add('hidden');
        document.getElementById('admin-modal')?.classList.add('hidden');
    }
});

// 主题初始化
document.documentElement.setAttribute('data-theme', 
    localStorage.getItem('theme') || 
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
);