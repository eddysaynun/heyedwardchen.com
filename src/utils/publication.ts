export function isPublished(data: { draft?: boolean; pubDate?: Date }, now = new Date()): boolean {
  return !data.draft && (!data.pubDate || data.pubDate <= now);
}
