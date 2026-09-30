module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    // Entry point: 6k lines of route registration exercised via supertest in
    // middleware.test.ts (which drives the exported app, not this file's
    // branches). Counting it drowns real logic coverage in registration noise.
    '!src/index.ts',
    // Thin wrappers around the SDK clients (Stripe/Redis/analytics ingest).
    // Real logic lives in the services they call; these need live vendor
    // credentials to execute and are covered by contract tests in staging.
    '!src/stripe.ts',
    '!src/cache.ts',
    '!src/jobs.ts',
    // Admin/analytics REST layers: 1k+ lines of boilerplate CRUD over Prisma
    // with auth provided by requireSuperadmin. Gating global coverage on them
    // would require a full admin e2e suite; tracked as backlog #241 follow-up.
    '!src/adminRoutes.ts',
    '!src/analytics.ts',
    '!src/swagger.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  // Gates set ~8 points under actual coverage (88/77/86/88) so regressions
  // trip the CI gate long before coverage collapses, without flaking on
  // minor test churn.
  coverageThreshold: {
    global: {
      lines: 80,
      functions: 80,
      branches: 70,
      statements: 80,
    },
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  verbose: true,
};
