/** @type {import('pm2').StartOptions[]} */
module.exports = {
    apps: [
        {
            name: 'web',
            script: 'node_modules/.bin/next',
            args: 'start',
            cwd: __dirname,
            max_restarts: 10,
            restart_delay: 5000,
            min_uptime: '10s',
            env: {
                NODE_ENV: 'production',
                PORT: 3000,
            },
            log_file: './logs/web/combined.log',
            out_file: './logs/web/out.log',
            error_file: './logs/web/error.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss',
            merge_logs: true,
        },
        {
            name: 'worker',
            script: 'worker/index.ts',
            interpreter: 'node',
            interpreter_args: '--import tsx',
            cwd: __dirname,
            max_restarts: 10,
            restart_delay: 5000,
            min_uptime: '10s',
            env: {
                NODE_ENV: 'production',
            },
            log_file: './logs/worker/combined.log',
            out_file: './logs/worker/out.log',
            error_file: './logs/worker/error.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss',
            merge_logs: true,
        },
    ],
};
