import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { sortPostsByPinnedAndDate } from '../utils/posts';
import { remark } from 'remark';
import remarkHtml from 'remark-html';

export const prerender = true;

// 辅助函数：将 Markdown 转换为 HTML
async function markdownToHtml(markdown: string): Promise<string> {
  const result = await remark().use(remarkHtml).process(markdown);
  return result.toString();
}

export async function GET(context) {
  const posts = await getCollection('blog');
  const sortedPosts = sortPostsByPinnedAndDate(posts);

  // 渲染所有文章的 HTML 内容
  const items = await Promise.all(
    sortedPosts.map(async (post) => {
      const htmlContent = await markdownToHtml(post.body);
      
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

  return rss({
    title: 'Edward Chen',
    description: '构建事物的笔记',
    site: context.site!,
    items,
  });
}
