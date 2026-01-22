import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        globals: true,
        environment: 'happy-dom',
        setupFiles: ['__tests__/setup.ts'],
        include: ['__tests__/**/*.test.{ts,tsx}'],
        exclude: ['node_modules', '.next', '__tests__/e2e/**'],
        coverage: {
            provider: 'istanbul',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/',
                '__tests__/',
                '.next/',
                '*.config.{ts,js}',
                'types/',
            ],
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './'),
        },
    },
});
