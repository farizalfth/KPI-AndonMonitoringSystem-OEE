import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globals: false,
    testTimeout: 20_000,
    hookTimeout: 20_000,
    env: {
      NODE_ENV: 'test',
      // Fast bcrypt: the real cost factor is exercised in the DB integration test.
      BCRYPT_ROUNDS: '4',
      JWT_SECRET: 'test-secret-test-secret-test-secret-1234',
      LOG_LEVEL: 'silent',
      // No DATABASE_URL: unit tests must run without a database.
    },
  },
});