# Edward 的个人博客

基于 **Astro + TailwindCSS** 构建的现代化静态博客。

## 🚀 技术栈

- **框架**: Astro 4.x
- **样式**: TailwindCSS 3.x
- **部署**: Cloudflare Pages
- **内容**: Markdown / MDX

## 📦 安装

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建生产版本
npm run build

# 预览生产版本
npm run preview
```

## 📁 项目结构

```
personal-blog/
├── src/
│   ├── pages/          # 页面文件
│   │   ├── index.astro      # 首页
│   │   ├── blog.astro       # 文章列表
│   │   ├── projects.astro   # 项目展示
│   │   ├── about.astro      # 关于页面
│   │   └── blog/            # 文章详情页
│   ├── layouts/          # 布局组件
│   │   └── Layout.astro
│   ├── components/       # 可复用组件
│   └── content/          # 内容集合
│       └── blog/
├── public/             # 静态资源
│   └── favicon.svg
├── astro.config.mjs    # Astro 配置
├── tailwind.config.mjs # Tailwind 配置
├── tsconfig.json       # TypeScript 配置
└── package.json
```

## 🎨 设计特点

- **极简主义**: 干净的布局和排版
- **响应式**: 完美支持移动端
- **高性能**: 静态生成，零 JavaScript 输出
- **SEO 友好**: 语义化 HTML，结构化数据
- **类型安全**: TypeScript 支持

## 📝 博客文章同步

博客文章源统一维护在 Obsidian 05-Blog 对应的仓库：

```bash
git@github.com:eddysaynun/edward-obsidian-blog.git
```

本项目的 `src/content/blog/` 是本地同步目标目录，不作为文章源直接维护，也不提交到 `git@github.com:eddysaynun/edwardchen.com.git`。

本地调试和构建会自动先同步文章：

```bash
npm run dev
npm run build
```

也可以单独同步文章：

```bash
npm run sync-blog
```

## 🌐 部署到 Cloudflare Pages

1. 构建项目:
   ```bash
   npm run build
   ```

2. 在 Cloudflare Dashboard 中:
   - 创建新的 Pages 项目
   - 连接 GitHub 仓库
   - 设置构建命令：`npm run build`
   - 设置输出目录：`dist`

3. 自动部署:
   - 每次推送到 main 分支会自动触发部署

## 🔧 自定义配置

### 修改站点信息

编辑 `src/layouts/Layout.astro`:

```astro
<meta name="description" content="你的博客描述" />
<title>{title}</title>
```

### 修改颜色主题

编辑 `tailwind.config.mjs` 或直接在 Astro 组件中使用 Tailwind 颜色类。

### 添加自定义域名

在 Cloudflare Pages 设置中添加自定义域名，自动配置 HTTPS。

## 📊 推荐功能

- **评论系统**: [Giscus](https://giscus.app) (基于 GitHub Discussions)
- **搜索**: [Pagefind](https://pagefind.app)
- **统计**: [Umami](https://umami.is)
- **RSS**: Astro 官方插件

## 📄 许可证

MIT License

---

© 2025 Edward. Built with ❤️ using Astro.
