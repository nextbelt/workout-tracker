import { defineConfig } from 'vitest/config';

// Vitest config kept separate from vite.config.ts so the production build is
// unaffected. Pure-logic vision tests run in node; no DOM needed.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
