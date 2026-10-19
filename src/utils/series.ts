interface SeriesPost {
  slug: string;
  data: { series?: string; seriesOrder?: number; pubDate?: Date };
}

export function getSeriesPosts<T extends SeriesPost>(posts: T[], series?: string): T[] {
  if (!series) return [];
  return posts.filter(post => post.data.series === series).sort((a, b) =>
    (a.data.seriesOrder ?? Infinity) - (b.data.seriesOrder ?? Infinity) ||
    (a.data.pubDate?.getTime() ?? 0) - (b.data.pubDate?.getTime() ?? 0) || a.slug.localeCompare(b.slug));
}
