// Real-content regression checks: read only; never create or edit articles.
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { remark } from 'remark';
import gfm from 'remark-gfm';
import citations from '../src/plugins/remark-citations.mjs';
const visit = (node, fn) => { fn(node); node.children?.forEach(child=>visit(child,fn)); };
const protectedNodes = tree => {
 const values = [];
 visit(tree, n => { if (['code','inlineCode','link','image','html'].includes(n.type)) values.push(JSON.stringify(n)); });
 return values;
};
const report = [];
for (const file of (await readdir('src/content/blog')).filter(f=>f.endsWith('.md'))) {
 const input = (await readFile(`src/content/blog/${file}`,'utf8')).replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
 const processor = remark().use(gfm);
 const tree = processor.parse(input);
 const before = protectedNodes(tree);
 citations()(tree, {toString:()=>input});
 assert.deepEqual(protectedNodes(tree), before, `${file}: changed code, original link/image or HTML`);
 const ids = [], hrefs = [];
 visit(tree, n => {
  if(n.data?.hProperties?.id) ids.push(n.data.hProperties.id);
  for (const h of n.data?.hChildren ?? []) {
   if(h.properties?.id) ids.push(h.properties.id);
   if(h.properties?.href?.startsWith('#')) hrefs.push(h.properties.href.slice(1));
  }
 });
 assert.equal(new Set(ids).size,ids.length,file);
 for(const href of hrefs) assert.ok(ids.includes(href),`${file}: broken ${href}`);
 report.push({file,protectedNodes:before.length,anchors:ids.length,links:hrefs.length});
}
for (const file of ['dist/search-index.json','dist/api/rss.xml']) {
 const output = await readFile(file,'utf8');
 assert.ok(!/citation-\d|reference-backlink|image-zoom-trigger|lightbox-caption/.test(output), `${file}: UI markup leaked into feed/index`);
}
console.log(JSON.stringify({passed:true,articles:report.length,report},null,2));
