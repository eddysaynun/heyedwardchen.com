import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const prerender = true;

const staticPages = ['/', '/blog/', '/tags/', '/projects/', '/about/'];

function urlEntry(site: URL, path: string, lastmod?: Date) {
  const loc = new URL(path, site).toString();
  return [
    '  <url>',
    `    <loc>${loc}</loc>`,
    lastmod ? `    <lastmod>${lastmod.toISOString()}</lastmod>` : '',
    '  </url>',
  ].filter(Boolean).join('\n');
}

export const GET: APIRoute = async ({ site }) => {
  if (!site) {
    return new Response('Missing site config', { status: 500 });
  }

  const posts = await getCollection('blog');
  const tags = new Set(posts.flatMap(post => post.data.tags));
  const entries = [
    ...staticPages.map(path => urlEntry(site, path)),
    ...posts.map(post => urlEntry(
      site,
      `/blog/${post.slug}/`,
      post.data.updatedDate ?? post.data.pubDate
    )),
    ...Array.from(tags).map(tag => urlEntry(site, `/tags/${encodeURIComponent(tag)}/`)),
  ];

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>`,
    {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
      },
    }
  );
};
