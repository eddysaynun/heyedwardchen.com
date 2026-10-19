import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import { toSearchText } from '../utils/search';
import type { APIRoute } from 'astro';
import { getPublishedPosts } from '../utils/published';
import { sortPostsByPinnedAndDate } from '../utils/posts';

export const prerender = true;

export const GET: APIRoute = async () => {
  const posts = sortPostsByPinnedAndDate(await getPublishedPosts());

  const data = posts.map((post, index) => ({
    id: index,
    title: post.data.title,
    description: post.data.description,
    slug: `/blog/${post.slug}/`,
    published: post.data.pubDate?.toISOString() ?? null,
    tags: post.data.tags,
    content: toSearchText(remark().use(remarkGfm).parse(post.body)),
  }));

  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
  });
};
