import '@testing-library/jest-dom';
import { beforeAll, afterEach, afterAll } from 'vitest';
import { setupServer } from 'msw/node';
import { handlers } from './mocks/handlers';

// Setup MSW server for API mocking
export const server = setupServer(...handlers);

beforeAll(() => {
    server.listen({ onUnhandledRequest: 'warn' });
});

afterEach(() => {
    server.resetHandlers();
});

afterAll(() => {
    server.close();
});
