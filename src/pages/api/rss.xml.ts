import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { sortPostsByPinnedAndDate } from '../../utils/posts';
import { remark } from 'remark';
import remarkHtml from 'remark-html';

// 辅助函数：将 Markdown 转换为 HTML，并修复相对链接
async function markdownToHtml(markdown: string, siteUrl: string): Promise<string> {
  const result = await remark().use(remarkHtml).process(markdown);
  let html = result.toString();
  
  // 修复所有相对链接为绝对链接
  html = html.replace(
    /href="(blog\/[^"]+\.md)"/g,
    (match, path) => {
      const cleanPath = path.replace(/\.md$/, '');
      return `href="${siteUrl}/${cleanPath}/"`;
    }
  );
  
  html = html.replace(
    /href="\/blog\/([^"#"]+)"(?!")/g,
    (match, path) => {
      const cleanPath = path.endsWith('/') ? path : `${path}/`;
      return `href="${siteUrl}/blog/${cleanPath}"`;
    }
  );
  
  html = html.replace(
    /href="\/([^"\/#][^"]*)"/g,
    (match, path) => {
      return `href="${siteUrl}/${path}"`;
    }
  );

  return html;
}

export async function GET() {
  const posts = await getCollection('blog');
  const sortedPosts = sortPostsByPinnedAndDate(posts);
  const siteUrl = 'https://heyedwardchen.com';

  // 渲染所有文章的 HTML 内容
  const items = await Promise.all(
    sortedPosts.map(async (post) => {
      const htmlContent = await markdownToHtml(post.body, siteUrl);
      
      return {
        title: post.data.title,
        pubDate: post.data.pubDate,
        description: post.data.description,
        link: `/blog/${post.slug}/`,
        content: htmlContent,
        categories: post.data.tags,
      };
    })
  );

  const rssResponse = await rss({
    title: 'Edward Chen',
    description: '构建事物的笔记',
    site: siteUrl,
    items,
    // RSS 图标、Atom 自引用和 Folo 认证
    customData: `<image>
  <url>https://heyedwardchen.com/favicon.svg</url>
  <title>Edward Chen</title>
  <link>https://heyedwardchen.com/</link>
  <width>32</width>
  <height>32</height>
</image>
<atom:link href="https://heyedwardchen.com/api/rss.xml" rel="self" type="application/rss+xml" xmlns:atom="http://www.w3.org/2005/Atom"/>
<follow_challenge>
  <feedId>1118027493089869824</feedId>
  <userId>67422381549442048</userId>
</follow_challenge>`,
  });

  // 添加缓存控制头，禁用 Cloudflare 缓存
  const headers = new Headers(rssResponse.headers);
  headers.set('Cache-Control', 'no-cache, no-store, must-revalidate, private');
  headers.set('Pragma', 'no-cache');
  headers.set('Expires', '0');
  headers.set('Surrogate-Control', 'no-store'); // Cloudflare 特定
  
  return new Response(rssResponse.body, {
    status: rssResponse.status,
    statusText: rssResponse.statusText,
    headers,
  });
}
