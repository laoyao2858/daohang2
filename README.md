# 现代化导航站系统

## 🚀 最新功能

### 版本 2.0.0 新增功能
1. **自定义音乐播放器** - 后台可自由添加、删除音乐，支持自动播放
2. **网站个性化设置** - 可设置网站头像、背景、欢迎语等
3. **访客统计系统** - 实时显示访问数据、在线人数、IP统计
4. **樱花特效移除** - 更专注于核心功能体验
5. **现代化UI设计** - 全新的玻璃拟态设计风格

## 📋 部署步骤

### 1. 创建数据库
在 Cloudflare D1 控制台执行 `/d1-setup.sql` 中的SQL语句

### 2. 上传文件
将以下文件上传到 Cloudflare Pages：
- `/public/index.html` - 主页面文件
- `/functions/api/[[catchall]].js` - API后端
- 其他配置文件

### 3. 配置绑定
在 Cloudflare Pages 设置中：
- 构建命令：留空
- 输出目录：`public`
- 环境变量：绑定D1数据库到 `DB`

### 4. 访问网站
部署完成后访问分配的域名，默认管理员密码：`Qq110110.`

## 🛠️ 配置说明

### 数据库表结构
- `settings` - 站点设置表
- `categories` - 分类表
- `sites` - 网站表
- `site_groups` - 网站分组表
- `custom_music` - 自定义音乐表
- `visitor_stats` - 访客统计表
- `user_preferences` - 用户偏好表

### API 接口
- `GET /api/settings` - 获取设置
- `POST /api/settings` - 更新设置
- `GET /api/custom-music` - 获取音乐列表
- `POST /api/custom-music` - 添加音乐
- `GET /api/visitor` - 获取访客统计
- `POST /api/visitor` - 记录访问

## 🎯 功能特点

### 前台功能
- 现代化响应式设计
- 多语言支持（中英双语）
- 深色/浅色主题切换
- 智能搜索（支持拼音）
- 常用网站快捷访问
- 实时访客统计显示
- 背景音乐播放器

### 后台功能
- 完整的网站管理
- 分类拖拽排序
- 自定义音乐管理
- 访客数据查看
- 个性化设置
- 数据导入导出

## 🔧 自定义配置

### 修改管理员密码
在 `/public/index.html` 中搜索 `ADMIN_PASSWORD` 修改默认密码

### 修改默认设置
在 `/d1-setup.sql` 中修改默认的网站设置

### 添加搜索引擎
在 `/public/index.html` 的 `searchEngines` 对象中添加新的搜索引擎

## 📞 技术支持

如果遇到问题：
1. 检查浏览器控制台（F12）的错误信息
2. 确保数据库表结构已正确创建
3. 确认API接口可以正常访问
4. 查看Cloudflare Workers日志

## 📄 许可证

本项目基于MIT许可证开源，可自由使用和修改。

## 🙏 致谢

感谢所有贡献者和用户的支持！
