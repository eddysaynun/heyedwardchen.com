import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { remark } from 'remark';

// Detect intended bold markup left as prose, not code, HTML, or escaped literals.
export function findUnparsedBold(source) {
  const issues = [];
  function walk(node) {
    if (['code', 'inlineCode', 'html', 'yaml'].includes(node.type)) return;
    if (node.type === 'text') {
      const raw = source.slice(node.position.start.offset, node.position.end.offset);
      if (raw === node.value && /\*\*[^*\n]+\*\*/u.test(raw)) {
        issues.push({ line: node.position.start.line, text: node.value });
      }
    }
    node.children?.forEach(walk);
  }
  walk(remark().parse(source));
  return issues;
}
assert.equal(findUnparsedBold('**Host（宿主）**是用户使用的应用').length, 1);
assert.equal(findUnparsedBold('**Host**（宿主）是用户使用的应用').length, 0);
assert.equal(findUnparsedBold('`**Host（宿主）**是用户使用的应用`').length, 0);
assert.equal(findUnparsedBold('\\*\\*文字\\*\\*').length, 0);
const files = readdirSync('src/content/blog').filter(name => /\.mdx?$/.test(name));
const issues = files.flatMap(file => findUnparsedBold(readFileSync(`src/content/blog/${file}`, 'utf8')).map(issue => ({ file, ...issue })));
assert.deepEqual(issues, [], 'Unparsed bold markers in article prose');
console.log(`Markdown emphasis checks passed for ${files.length} articles.`);
