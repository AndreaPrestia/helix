import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts', 'packages/**/src/**/*.test.ts'],
    environment: 'node',
    globals: false,
  },
  resolve: {
    alias: {
      '@helix/core': fileURLToPath(new URL('./packages/core/src/index.ts', import.meta.url)),
      '@helix/context': fileURLToPath(new URL('./packages/context/src/index.ts', import.meta.url)),
    },
  },
});
