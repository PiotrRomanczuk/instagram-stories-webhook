import '@testing-library/jest-dom';
import { beforeAll, afterEach, afterAll, vi } from 'vitest';
import { setupServer } from 'msw/node';
import { handlers } from './mocks/handlers';

// `next/font/google` is a Next.js build-time loader; in vitest it's not
// transformed, so any test that imports a page using a Google font crashes
// with "Inter is not a function". Stub all fonts used by this codebase
// (Inter, Plus_Jakarta_Sans, JetBrains_Mono) with a minimal shape that
// matches what callers consume: `{ variable, className, style }`.
vi.mock('next/font/google', () => {
    const fontStub = () => ({
        variable: '--font-mock',
        className: 'mock-font',
        style: { fontFamily: 'mock' },
    });
    return {
        Inter: fontStub,
        Plus_Jakarta_Sans: fontStub,
        JetBrains_Mono: fontStub,
    };
});

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
