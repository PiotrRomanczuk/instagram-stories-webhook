import '@testing-library/jest-dom';
import { beforeAll, afterEach, afterAll } from 'vitest';
import { setupServer } from 'msw/node';
import { handlers } from './mocks/handlers';

export const server = setupServer(...handlers);

// Start worker before all tests
beforeAll(() => server.listen());

// Reset handlers after each test `important for test isolation`
afterEach(() => server.resetHandlers());

// Close worker after all tests
afterAll(() => server.close());
