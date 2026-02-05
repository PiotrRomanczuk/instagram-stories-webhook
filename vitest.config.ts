import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';

export default defineConfig({
    plugins: [react(), tsconfigPaths()],
    test: {
        globals: true,
        environment: 'happy-dom',
        setupFiles: ['__tests__/setup.ts'],
        include: ['__tests__/**/*.test.{ts,tsx}'],
        exclude: ['node_modules', '.next', '__tests__/e2e/**'],
        env: {
            NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
            NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
            SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
        },
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/',
                '__tests__/',
                '.next/',
                '*.config.{ts,js}',
                'types/',
            ],
            reportsDirectory: './coverage',
            clean: true,
            cleanOnRerun: true,
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './'),
        },
    },
});
