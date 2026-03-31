import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // jsdom for unit tests that don't need real browser APIs
    environment: 'jsdom',
    globals: true,
    include: ['tests/unit/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.types.ts'],
    },
  },
});
