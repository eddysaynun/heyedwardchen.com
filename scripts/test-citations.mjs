import { test } from 'node:test';
import assert from 'node:assert/strict';
import { remark } from 'remark';
import rehype from 'remark-rehype';
import stringify from 'rehype-stringify';
import citations from '../src/plugins/remark-citations.mjs';
const render = async text => String(await remark().use(citations).use(rehype).use(stringify).process(text));
const refs = '\n\n## 参考资料\n\n1. [One](https://example.com/1)\n2. [Two](https://example.com/2)';
test('chains, repeated citations, stable sources and individual backlinks', async () => {
 const html = await render('正文。[1][2] 再次。[1]' + refs);
 assert.match(html, /id="citation-1-1"/); assert.match(html, /id="citation-1-2"/);
 assert.match(html, /href="#reference-2"/); assert.match(html, /id="reference-1"/);
 assert.match(html, /href="#citation-1-2"/); assert.equal((html.match(/class="citation"/g)||[]).length,3);
});
test('code, links, arrays, numbering, escapes, missing sources stay untouched', async () => {
 const input = '`x[1]`\n\n```js\nconst a = [1][2];\n```\n\n[1](https://example.org)\n\n[1] 普通编号\n\narray[1] and [99] and \\[1]。\n\n正文。[99]' + refs;
 const html = await render(input); assert.ok(!html.includes('class="citation"')); assert.match(html,/const a = \[1\]\[2\];/);
});
test('no bibliography, ordinary lists and ambiguous bibliographies are no-ops', async () => {
 for (const s of ['正文。[1]', '正文。[1]\n\n## Steps\n\n1. [One](https://example.com)', '正文。[1]'+refs+refs]) assert.ok(!(await render(s)).includes('class="citation"'));
});
test('formatted prose and reserved IDs remain valid', async () => {
 const html = await render('<span id="reference-1"></span>\n\n**结论。**[1]'+refs);
 assert.match(html, /href="#reference-1-2"/); assert.match(html, /id="reference-1-2"/);
});

test('ordered start, references not rewritten and section boundary respected', async () => {
 const html = await render('正文。[5][1]\n\n## References\n\n5. [Source [5]](https://example.com)\n\n## Next\n\n正文。[5]');
 assert.match(html,/id="reference-5"/); assert.equal((html.match(/class="citation"/g)||[]).length,2); assert.ok(html.includes('[1]'));
});
