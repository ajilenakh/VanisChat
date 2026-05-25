import { defineConfig } from 'vitest/config';

/**
 * Vitest config for the API package.
 *
 * The API uses Bun.password (argon2id) for password hashing.
 * Vitest runs on Node.js, so we provide a Bun shim via setup file.
 *
 * Tests share a file-based SQLite database, so they run
 * sequentially in a single fork to avoid DB locking.
 */
export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    setupFiles: ['./src/__tests__/setup.ts'],
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
});
