import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { isPublished } from '../src/utils/publication.ts';
import { getSeriesPosts } from '../src/utils/series.ts';
import { searchExcerpt, toSearchText } from '../src/utils/search.ts';
import { getRelatedPosts } from '../src/utils/related-posts.ts';
import { remark } from 'remark';

const now = new Date('2026-10-19T00:00:00Z');
assert.equal(isPublished({draft: true}, now), false);
assert.equal(isPublished({pubDate: new Date('2026-10-20')}, now), false);
assert.equal(isPublished({pubDate: now}, now), true);
assert.equal(isPublished({}, now), true); // Preserve existing undated articles.
const series = [{slug:'b',data:{series:'Guide',seriesOrder:2}}, {slug:'a',data:{series:'Guide',seriesOrder:1}}, {slug:'x',data:{series:'Other'}}];
assert.deepEqual(getSeriesPosts(series, 'Guide').map(p=>p.slug), ['a','b']);
assert.deepEqual(getSeriesPosts(series), []);
assert.equal(series[0].slug, 'b');
const markdown = '# Heading\n\n' + '正文 '.repeat(1000) + '**文末关键词** [链接](https://example.com)\n\n<script>private()</script>';
const text = toSearchText(remark().parse(markdown));
assert.ok(text.indexOf('文末关键词') > 2000);
assert.ok(searchExcerpt(text, '文末关键词').includes('文末关键词'));
assert.ok(!text.includes('https://') && !text.includes('<script>'));
const post = (id, tags) => ({id,slug:id,tags,title:id,description:'',published:now});
assert.deepEqual(getRelatedPosts(post('a',['X','Y']), [post('a',['X','Y']),post('b',['X']),post('c',['X','Y']),post('d',['Z'])]).map(p=>p.id), ['c','b']);
console.log('Publication, series, full-text excerpts and related-post checks passed.');

if (process.argv.includes('--build')) {
  const out = await mkdtemp(join(tmpdir(), 'blog-check-'));
  const prefix = `test-${Date.now()}`;
  const fixtures = [
    {name:'draft', extra:'draft: true', marker:'PRIVATE_DRAFT_SENTINEL'},
    {name:'future', extra:'pubDate: 2999-01-01', marker:'PRIVATE_FUTURE_SENTINEL'},
    {name:'series-one', extra:'pubDate: 2020-01-01\nseries: Test series\nseriesOrder: 1', marker:'PUBLIC_SERIES_ONE'},
    {name:'series-two', extra:'pubDate: 2020-01-02\nseries: Test series\nseriesOrder: 2', marker:'PUBLIC_SERIES_TWO'},
  ];
  const created = [];
  try {
    for (const fixture of fixtures) {
      const file = `src/content/blog/${prefix}-${fixture.name}.md`;
      await writeFile(file, `---\ntitle: ${fixture.marker}\ndescription: ${fixture.marker}\ntags: [${fixture.marker}]\n${fixture.extra}\n---\n## Heading\n### Nested heading\n${fixture.marker}\n`, {flag:'wx'});
      created.push(file);
    }
    const build = spawnSync(process.execPath, ['node_modules/astro/astro.js','build','--outDir',out], {encoding:'utf8'});
    assert.equal(build.status, 0, build.stdout + build.stderr);
    const outputs = await Promise.all(['index.html','blog/index.html','tags/index.html','search-index.json','sitemap.xml','api/rss.xml'].map(file => readFile(join(out,file),'utf8')));
    for (const content of outputs) {
      assert.ok(!content.includes('PRIVATE_DRAFT_SENTINEL'));
      assert.ok(!content.includes('PRIVATE_FUTURE_SENTINEL'));
    }
    for (const name of ['draft','future']) await assert.rejects(access(join(out,`blog/${prefix}-${name}/index.html`)));
    const article = await readFile(join(out,`blog/${prefix}-series-one/index.html`),'utf8');
    assert.ok(article.includes('Test series') && article.includes(`${prefix}-series-two`));
    assert.ok(article.includes('mobile-toc') && article.includes('#nested-heading'));
    console.log('Build integration passed: private posts excluded from all public feeds, routes and indexes; series and mobile TOC rendered.');
  } finally {
    await Promise.all(created.map(file => rm(file)));
    await rm(out, {recursive:true, force:true});
  }
}
