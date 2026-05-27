import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [],
    projects: ['packages/api/vitest.config.ts', 'packages/crypto'],
  },
});
