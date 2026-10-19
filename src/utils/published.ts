import { getCollection } from 'astro:content';
import { isPublished } from './publication';

export async function getPublishedPosts() {
  const now = new Date();
  return getCollection('blog', ({ data }) => isPublished(data, now));
}
