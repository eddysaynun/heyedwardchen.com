👋 Hey!

I'm Edward Chen.

🇬🇧 MSc (CS) graduate at University of Glasgow with distinction (2021 - 2022).
🇨🇳 BSc (CS) graduate at Chongqing University of Posts and Telecommunications (2016 - 2020).

🔗 [heyedwardchen.com](https://heyedwardchen.com/)

## Blog Build Sync

Blog posts are not maintained in this repository. Local development and Cloudflare builds run `npm run sync-blog`, which pulls posts from:

```text
git@github.com:eddysaynun/edward-obsidian-blog.git
```

The generated `src/content/blog/` directory is ignored by Git and should not be committed here.

### Scheduled Build

`.github/workflows/scheduled-cloudflare-build.yml` triggers the Cloudflare Pages Deploy Hook every day at 03:15 Asia/Shanghai. The Cloudflare build then pulls the latest posts from `edward-obsidian-blog`.

Required secrets:

- Cloudflare Pages environment variable: `OBSIDIAN_BLOG_TOKEN`
- GitHub Actions secret: `CLOUDFLARE_DEPLOY_HOOK_URL`

## Publication and series

Optional article frontmatter:

```yaml
draft: false
pubDate: 2026-10-19
updatedDate: 2026-10-20
series: LangGraph 实战
seriesOrder: 1
```

- `draft: true` and future `pubDate` entries are excluded from article routes, lists, tags, recommendations, search, RSS and sitemap. Existing undated articles remain public for compatibility.
- Publication is evaluated at build time. Scheduled posts become visible after the next successful build, not automatically at their timestamp. Use an ISO timestamp with an explicit timezone when the exact publication time matters.
- `series` groups articles by exact name; `seriesOrder` is a positive integer. Missing order values follow ordered entries, sorted by publication date and slug. Previous/next links follow series order when configured.
- Search covers full article text and supports shareable `q` and `tag` query parameters. `sort=updated` orders the article list by last update, keeping pinned posts first.

## Local verification

With Node.js 22.6+ and dependencies installed:

```sh
node --experimental-strip-types scripts/test-blog.mjs
node --experimental-strip-types scripts/test-blog.mjs --build
npx astro build
```

The build check creates temporary draft/future/series fixtures, verifies public output, and removes its fixtures and temporary output. `npx astro build` uses already synced local content; `npm run build` first synchronizes the blog repository.
