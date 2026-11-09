/// <reference types="astro" />
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import remarkCitations from './src/plugins/remark-citations.mjs';

import cloudflare from "@astrojs/cloudflare";

function addImageAttributes() {
  return (tree) => {
    const visit = (node) => {
      if (!node || typeof node !== 'object') return;

      if (node.type === 'element' && node.tagName === 'img') {
        node.properties = {
          loading: 'lazy',
          decoding: 'async',
          ...node.properties,
        };
      }

      if (Array.isArray(node.children)) {
        node.children.forEach(visit);
      }
    };

    visit(tree);
  };
}

export default defineConfig({
  site: 'https://heyedwardchen.com',

  integrations: [
    tailwind(),
  ],

  markdown: {
    remarkPlugins: [remarkCitations],
    rehypePlugins: [addImageAttributes],
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
      defaultColor: false,
    },
  },

  output: "hybrid",
  adapter: cloudflare()
});
