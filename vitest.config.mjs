import { defineConfig } from 'vitest/config';
import path from 'path';

const ROOT = import.meta.dirname;

export default defineConfig({
  resolve: {
    alias: {
      '@engine': path.resolve(ROOT, 'three-isometric-engine'),
      '@root': ROOT,
      '@pages': path.resolve(ROOT, 'pages'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
  },
});
