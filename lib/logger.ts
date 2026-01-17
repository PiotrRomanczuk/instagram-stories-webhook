import fs from 'fs';
import path from 'path';
import { supabaseAdmin } from './supabase-admin';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogOptions {
    module: string;
    level?: LogLevel;
    details?: unknown;
    pushToSupabase?: boolean;
}

const LOG_DIR = path.resolve(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'app.log');

// Ensure logs directory exists
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

export class Logger {
    private static formatMessage(level: LogLevel, module: string, message: string): string {
        const timestamp = new Date().toISOString();
        return `[${timestamp}] [${level.toUpperCase()}] [${module}] ${message}`;
    }

    private static async writeToLocalFile(formattedMessage: string) {
        try {
            // Only use fs in server-side non-browser environments
            if (typeof window === 'undefined') {
                fs.appendFileSync(LOG_FILE, formattedMessage + '\n');
            }
        } catch (error) {
            console.error('Failed to write to local log file:', error);
        }
    }

    private static async pushToSupabase(level: LogLevel, module: string, message: string, details?: unknown) {
        try {
            const { error } = await supabaseAdmin.from('system_logs').insert({
                level,
                module,
                message,
                details: details || null
            });
            if (error) throw error;
        } catch (error) {
            // Don't use logger here to avoid infinite loops, just console.error
            console.error('Failed to push log to Supabase:', error);
        }
    }

    private static lastLog: { key: string; timestamp: number } | null = null;
    private static readonly DUPLICATE_WINDOW = 10 * 60 * 1000; // 10 minutes

    /**
     * Main log function. Returns a promise that resolves when local file write is finish,
     * BUT we also trigger Supabase update.
     */
    static async log(message: string, options: LogOptions) {
        const { module, level = 'info', details, pushToSupabase = true } = options;
        const formatted = this.formatMessage(level, module, message);

        // Deduplication Logic
        const currentKey = `${level}:${module}:${message}`;
        let isDuplicate = false;

        if (this.lastLog && this.lastLog.key === currentKey) {
            const timeDiff = Date.now() - this.lastLog.timestamp;
            if (timeDiff < this.DUPLICATE_WINDOW) {
                isDuplicate = true;
            }
        }

        if (!isDuplicate) {
            this.lastLog = { key: currentKey, timestamp: Date.now() };
        }

        // 1. Console Output - always log to console for debugging visibility
        if (level === 'error') {
            console.error(formatted);
        } else if (level === 'warn') {
            console.warn(formatted);
        } else {
            console.log(formatted);
        }

        // Skip persistence if it's a duplicate
        if (isDuplicate) {
            return;
        }

        // 2. Local File Output
        await this.writeToLocalFile(formatted);

        // 3. Supabase Output
        if (pushToSupabase) {
            // For serverless stability, we await the push to Supabase 
            // otherwise the function might terminate before the log is sent.
            await this.pushToSupabase(level, module, message, details);
        }
    }

    static info(module: string, message: string, details?: unknown) {
        return this.log(message, { module, level: 'info', details });
    }

    static warn(module: string, message: string, details?: unknown) {
        return this.log(message, { module, level: 'warn', details });
    }

    static error(module: string, message: string, details?: unknown) {
        return this.log(message, { module, level: 'error', details });
    }

    static debug(module: string, message: string, details?: unknown) {
        return this.log(message, { module, level: 'debug', details });
    }
}
