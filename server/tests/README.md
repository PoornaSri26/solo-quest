# API Testing Infrastructure

This directory contains tests for the Solo Quest backend API.

## Test Setup

The test suite uses:
- **Jest**: Test framework
- **Supertest**: HTTP assertion library for Express
- **ts-jest**: TypeScript preprocessor for Jest

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Test Files

- `auth.test.ts`: Authentication endpoint tests (register, login)
- `quests.test.ts`: Quest API tests (CRUD operations, pagination)
- `business-logic.test.ts`: Business logic security tests (reward security, XP calculations, transaction safety)

## Test Coverage

The tests cover:

### Authentication
- User registration with valid data
- Registration validation (missing fields)
- Database error handling
- Login with valid credentials
- Login with invalid credentials
- Token generation

### Quests
- Quest pagination
- Invalid pagination parameters
- Default pagination behavior
- Quest creation
- Quest updates
- Quest deletion

### Business Logic Security
- Quest reward security (client-supplied rewards ignored)
- Boss bonus calculation (server-side)
- XP progression calculations
- Shop purchase transaction safety
- Insufficient gold prevention
- Duplicate inventory prevention
- Equip category exclusivity

## Adding New Tests

1. Create a new test file in this directory (e.g., `gates.test.ts`)
2. Import necessary dependencies (supertest, express)
3. Use Jest's `describe` and `it` functions to structure tests
4. Use Supertest to make HTTP requests to the test app
5. Assert on response status codes and body

Example:

```typescript
import request from 'supertest';
import express from 'express';

describe('Feature API', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    // Setup test routes
  });

  it('should return 200 on success', async () => {
    const response = await request(app)
      .get('/api/feature')
      .expect(200);

    expect(response.body).toHaveProperty('data');
  });
});
```

## CI/CD Integration

To integrate tests into CI/CD:

```yaml
# Example GitHub Actions workflow
- name: Run tests
  run: npm test
```

## Notes

- Tests use mocked dependencies (Prisma, bcrypt, JWT) for isolation
- Database operations are mocked to avoid side effects
- Tests can be run in parallel using Jest's worker threads
- Coverage reports are generated in the `coverage/` directory
