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
const MAX_LOG_SIZE = 1024 * 1024; // 1MB
const MAX_BACKUP_FILES = 5;

// Ensure logs directory exists
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

export class Logger {
    private static recentLogs: Map<string, { timestamp: number; count: number }> = new Map();
    private static readonly AGGREGATE_WINDOW = 60 * 60 * 1000; // 1 hour

    // Patterns that should be aggregated
    private static readonly NOISY_PATTERNS = [
        'Running scheduled post check...',
        'Checking for pending scheduled posts...',
        'No pending posts to publish'
    ];

    private static formatMessage(level: LogLevel, module: string, message: string): string {
        const timestamp = new Date().toISOString();
        return `[${timestamp}] [${level.toUpperCase()}] [${module}] ${message}`;
    }

    private static async rotateLogs() {
        try {
            if (!fs.existsSync(LOG_FILE)) return;

            const stats = fs.statSync(LOG_FILE);
            if (stats.size < MAX_LOG_SIZE) return;

            // Simple rotation: app.log -> app.log.1 -> app.log.2 ...
            for (let i = MAX_BACKUP_FILES - 1; i >= 1; i--) {
                const oldFile = path.join(LOG_DIR, `app.${i}.log`);
                const newFile = path.join(LOG_DIR, `app.${i + 1}.log`);
                if (fs.existsSync(oldFile)) {
                    fs.renameSync(oldFile, newFile);
                }
            }

            const firstBackup = path.join(LOG_DIR, 'app.1.log');
            fs.renameSync(LOG_FILE, firstBackup);

            // Create fresh file
            fs.writeFileSync(LOG_FILE, `[${new Date().toISOString()}] [INFO] [system] Log rotated. Previous logs moved to app.1.log\n`);
        } catch (error) {
            console.error('Failed to rotate logs:', error);
        }
    }

    private static async writeToLocalFile(formattedMessage: string) {
        try {
            if (typeof window === 'undefined') {
                await this.rotateLogs();
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
            console.error('Failed to push log to Supabase:', error);
        }
    }

    /**
     * Main log function with smart aggregation and rotation.
     */
    static async log(message: string, options: LogOptions) {
        const { module, level = 'info', details, pushToSupabase = true } = options;

        // 1. Check for noisy patterns that need aggregation
        const isNoisy = this.NOISY_PATTERNS.some(p => message.includes(p));
        if (isNoisy) {
            const key = `${module}:${message}`;
            const now = Date.now();
            const last = this.recentLogs.get(key);

            if (last && (now - last.timestamp) < this.AGGREGATE_WINDOW) {
                last.count++;
                this.recentLogs.set(key, last);
                // Don't log to file/db, but still log to console once in a while or just skip
                // For now, let's keep console clean too
                return;
            }

            // If it's the first time in the window, log it but add count info if it was aggregated before
            const suffix = last && last.count > 1 ? ` (occurred ${last.count} times in last hour)` : '';
            this.recentLogs.set(key, { timestamp: now, count: 1 });
            message += suffix;
        }

        const formatted = this.formatMessage(level, module, message);

        // 2. Console Output
        if (level === 'error') {
            console.error(formatted);
        } else if (level === 'warn') {
            console.warn(formatted);
        } else {
            // Suppress debug logs in console unless specified (optional, but keeps console clean)
            if (level !== 'debug' || process.env.NODE_ENV !== 'production') {
                console.log(formatted);
            }
        }

        // 3. Local File Output (with rotation check)
        await this.writeToLocalFile(formatted);

        // 4. Supabase Output
        if (pushToSupabase) {
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

    /**
     * Cleans up existing logs by consolidating repetitive entries.
     * Processes both local app.log and Supabase system_logs.
     */
    static async cleanup() {
        console.log('🧹 Starting log cleanup...');
        await this.cleanupLocalFile();
        await this.cleanupSupabase();
        console.log('✨ Log cleanup complete!');
    }

    private static async cleanupLocalFile() {
        if (typeof window !== 'undefined' || !fs.existsSync(LOG_FILE)) return;
        try {
            console.log('📄 Cleaning local app.log...');
            const content = fs.readFileSync(LOG_FILE, 'utf-8');
            const lines = content.split('\n').filter(l => l.trim());
            const newLines: string[] = [];
            const consolidated = new Map<string, { fullMessage: string, count: number }>();

            for (const line of lines) {
                const match = line.match(/^\[(.*?)\] \[(.*?)\] \[(.*?)\] (.*)$/);
                if (!match) {
                    newLines.push(line);
                    continue;
                }

                const [_, ts, level, module, message] = match;
                const isNoisy = this.NOISY_PATTERNS.some(p => message.includes(p));

                if (isNoisy) {
                    const date = new Date(ts);
                    const hourTs = new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()).toISOString();
                    const cleanMessage = message.split(' (occurred')[0];
                    const key = `${hourTs}:${level}:${module}:${cleanMessage}`;

                    const existing = consolidated.get(key);
                    if (existing) {
                        existing.count++;
                    } else {
                        consolidated.set(key, {
                            fullMessage: `[${hourTs}] [${level}] [${module}] ${cleanMessage}`,
                            count: 1
                        });
                    }
                } else {
                    newLines.push(line);
                }
            }

            for (const [_, data] of consolidated) {
                const suffix = data.count > 1 ? ` (occurred ${data.count} times in this hour)` : '';
                newLines.push(data.fullMessage + suffix);
            }

            fs.writeFileSync(LOG_FILE, newLines.join('\n') + '\n');
            console.log(`✅ Local log cleaned. Total lines: ${newLines.length}`);
        } catch (error) {
            console.error('Failed to cleanup local logs:', error);
        }
    }

    private static async cleanupSupabase() {
        try {
            console.log('☁️ Cleaning Supabase system_logs...');
            for (const pattern of this.NOISY_PATTERNS) {
                const { data, error } = await supabaseAdmin
                    .from('system_logs')
                    .select('id, created_at, module, message')
                    .ilike('message', `%${pattern}%`)
                    .lt('created_at', new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString())
                    .order('created_at', { ascending: false });

                if (error || !data || data.length <= 1) continue;

                const groups = new Map<string, string[]>();
                data.forEach(row => {
                    const d = new Date(row.created_at);
                    const hourKey = `${row.module}:${new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()).toISOString()}`;
                    if (!groups.has(hourKey)) groups.set(hourKey, []);
                    groups.get(hourKey)!.push(row.id);
                });

                let deleteCount = 0;
                for (const [_, ids] of groups) {
                    if (ids.length > 1) {
                        const toDelete = ids.slice(1);
                        const { error: delError } = await supabaseAdmin
                            .from('system_logs')
                            .delete()
                            .in('id', toDelete);
                        if (!delError) deleteCount += toDelete.length;
                    }
                }
                console.log(`🗑️ Deleted ${deleteCount} redundant entries for pattern: "${pattern}"`);
            }
        } catch (error) {
            console.error('Failed to cleanup Supabase logs:', error);
        }
    }
}

