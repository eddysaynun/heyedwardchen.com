// Conservative, build-time citation convention: prose [n] + one named bibliography.
// RSS and search use their own raw Markdown pipelines; no client HTML rewriting.
const text = node => node.value ?? (node.children ?? []).map(text).join('');
const walk = (node, fn) => { fn(node); node.children?.forEach(child => walk(child, fn)); };
const element = (tagName, properties, children) => ({ type: 'element', tagName, properties, children });
const literal = value => ({ type: 'text', value });
export default function remarkCitations() {
 return (tree, file) => {
  const sections = tree.children.filter(n => n.type === 'heading' && /^(参考资料|参考文献|引用来源|references|sources)$/i.test(text(n).trim()));
  if (sections.length !== 1) return; // Multiple numbering domains are ambiguous.
  const heading = sections[0];
  const start = tree.children.indexOf(heading) + 1;
  const section = [];
  for (const node of tree.children.slice(start)) {
   if (node.type === 'heading' && node.depth <= heading.depth) break;
   section.push(node);
  }
  const lists = section.filter(n => n.type === 'list' && n.ordered);
  if (lists.length !== 1) return;
  const list = lists[0];
  const sources = new Map();
  list.children.forEach((node, index) => {
   let linked = false;
   walk(node, n => { if (n.type === 'link' && /^https?:\/\//.test(n.url)) linked = true; });
   if (linked) sources.set((list.start ?? 1) + index, { node, refs: [] });
  });
  const ids = new Set();
  walk(tree, n => { if (n.data?.hProperties?.id) ids.add(n.data.hProperties.id); });
  // Reserve raw HTML ids too, without interpreting or rewriting the HTML.
  for (const match of String(file).matchAll(/\bid=["']([^"']+)["']/g)) ids.add(match[1]);
  const unique = base => { let id = base, suffix = 1; while (ids.has(id)) id = `${base}-${++suffix}`; ids.add(id); return id; };
  sources.forEach((source, number) => { source.id = unique(`reference-${number}`); });
  const skip = new Set(['link', 'linkReference', 'image', 'imageReference', 'code', 'inlineCode', 'html', 'heading']);
  const transform = (node, inProse = false) => {
   if (section.includes(node) || skip.has(node.type) || !node.children) return;
   const prose = inProse || node.type === 'paragraph' || node.type === 'tableCell';
   let preceding = '';
   node.children = node.children.flatMap(child => {
    const context = preceding;
    if (prose) preceding += text(child);
    if (child.type !== 'text' || !prose) { transform(child, prose); return [child]; }
    // Escaped brackets/entities have different source spelling: leave that text node intact.
    const raw = String(file).slice(child.position?.start.offset, child.position?.end.offset);
    if (raw !== child.value) return [child];
    const result = []; let offset = 0;
    for (const group of child.value.matchAll(/(?:\[[1-9]\d*\])+/g)) {
     const prefix = context + child.value.slice(0, group.index);
     if (!prefix.trim() || /[\w\[]$/.test(prefix)) continue;
     result.push(literal(child.value.slice(offset, group.index)));
     for (const token of group[0].matchAll(/\[(\d+)\]/g)) {
      const number = Number(token[1]), source = sources.get(number);
      if (!source) { result.push(literal(token[0])); continue; }
      const id = unique(`citation-${number}-${source.refs.length + 1}`);
      source.refs.push(id);
      result.push({ type: 'text', value: token[0], data: { hName: 'sup', hProperties: { className: ['citation'] }, hChildren: [element('a', { id, href: `#${source.id}`, ariaLabel: `参考资料 ${number}`, role: 'doc-noteref' }, [literal(String(number))])] } });
     }
     offset = group.index + group[0].length;
    }
    result.push(literal(child.value.slice(offset))); return result;
   });
  };
  transform(tree);
  sources.forEach((source, number) => {
   source.node.data = { ...source.node.data, hProperties: { ...source.node.data?.hProperties, id: source.id, className: ['reference-item'], tabIndex: -1 } };
   if (!source.refs.length) return;
   const links = source.refs.map((id, index) => element('a', { href: `#${id}`, className: ['reference-backlink'], ariaLabel: `返回参考资料 ${number} 的第 ${index + 1} 处引用`, role: 'doc-backlink' }, [literal(source.refs.length === 1 ? '↩' : `↩${index + 1}`)]));
   const back = { type: 'text', value: '', data: { hName: 'span', hProperties: { className: ['reference-backlinks'] }, hChildren: links } };
   const last = source.node.children.at(-1);
   if (last?.type === 'paragraph') last.children.push(back);
   else source.node.children.push({ type: 'paragraph', children: [back] });
  });
 };
}
