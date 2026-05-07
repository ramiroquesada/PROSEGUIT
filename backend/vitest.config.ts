import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/__tests__/**',
        'src/index.ts',
        'prisma/**',
      ],
    },
    // Integration tests need the server running; they use supertest against localhost
    // Run with: npm run test:integration (starts server, runs tests, stops server)
  },
});
