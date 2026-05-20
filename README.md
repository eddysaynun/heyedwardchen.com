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
