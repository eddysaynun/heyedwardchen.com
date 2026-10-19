interface TextNode {
  type: string;
  value?: string;
  alt?: string;
  children?: TextNode[];
}

export function toSearchText(node: TextNode): string {
  if (node.type === 'html') return '';
  if (node.type === 'image') return node.alt ?? '';
  if (node.value !== undefined) return node.value;
  return (node.children ?? []).map(toSearchText).join(node.type === 'paragraph' || node.type === 'heading' ? '' : ' ').replace(/\s+/g, ' ').trim();
}

export function searchExcerpt(content: string, query: string): string {
  const match = content.toLocaleLowerCase().indexOf(query.toLocaleLowerCase());
  const start = Math.max(0, match - 45);
  const end = start + 180;
  return `${start ? '…' : ''}${content.slice(start, end)}${end < content.length ? '…' : ''}`;
}
