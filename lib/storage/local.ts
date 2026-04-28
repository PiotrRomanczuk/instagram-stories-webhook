import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { Logger } from '@/lib/utils/logger';

const MODULE = 'storage:local';

/**
 * Root directory for all pipeline media files.
 * Configurable via DATA_DIR env var, defaults to ./data
 */
function getDataDir(): string {
    return process.env.DATA_DIR || path.join(process.cwd(), 'data');
}

/**
 * Resolves a subpath to an absolute path under DATA_DIR.
 */
export function getStoragePath(subpath: string): string {
    return path.join(getDataDir(), subpath);
}

/**
 * Ensures a directory exists under DATA_DIR, creating it recursively if needed.
 */
export async function ensureDir(subpath: string): Promise<string> {
    const dirPath = getStoragePath(subpath);
    await fs.mkdir(dirPath, { recursive: true });
    return dirPath;
}

/**
 * Saves a buffer to a file under DATA_DIR.
 * Creates parent directories automatically.
 * Returns the absolute path of the saved file.
 */
export async function saveFile(subpath: string, buffer: Buffer): Promise<string> {
    const filePath = getStoragePath(subpath);
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, buffer);
    return filePath;
}

/**
 * Reads a file from DATA_DIR and returns its contents as a Buffer.
 */
export async function readFile(subpath: string): Promise<Buffer> {
    const filePath = getStoragePath(subpath);
    return fs.readFile(filePath);
}

/**
 * Checks if a file exists under DATA_DIR.
 */
export async function fileExists(subpath: string): Promise<boolean> {
    try {
        await fs.access(getStoragePath(subpath));
        return true;
    } catch {
        return false;
    }
}

/**
 * Deletes a file from DATA_DIR. Ignores if file doesn't exist.
 */
export async function deleteFile(subpath: string): Promise<void> {
    try {
        await fs.unlink(getStoragePath(subpath));
    } catch (err: unknown) {
        if (err instanceof Error && 'code' in err && (err as NodeJS.ErrnoException).code !== 'ENOENT') {
            throw err;
        }
    }
}

/**
 * Gets file stats (size, timestamps) for a file under DATA_DIR.
 */
export async function getFileSize(subpath: string): Promise<number> {
    const stats = await fs.stat(getStoragePath(subpath));
    return stats.size;
}

/**
 * Lists files in a directory under DATA_DIR.
 */
export async function listFiles(subpath: string): Promise<string[]> {
    const dirPath = getStoragePath(subpath);
    try {
        return await fs.readdir(dirPath);
    } catch {
        return [];
    }
}

/**
 * Returns disk space information for the DATA_DIR volume.
 */
export async function checkDiskSpace(): Promise<{ freeBytes: number; totalBytes: number; freePercent: number }> {
    const freeMem = os.freemem();
    const totalMem = os.totalmem();

    // For actual disk space, use statvfs via a temp file approach
    // os.freemem/totalmem gives RAM, not disk. Use df for disk.
    try {
        const { exec } = await import('child_process');
        const { promisify } = await import('util');
        const execAsync = promisify(exec);
        const dataDir = getDataDir();
        await fs.mkdir(dataDir, { recursive: true });

        const { stdout } = await execAsync(`df -k "${dataDir}" | tail -1`);
        const parts = stdout.trim().split(/\s+/);
        // df -k output: Filesystem 1K-blocks Used Available Use% Mounted
        const totalKb = parseInt(parts[1], 10);
        const availableKb = parseInt(parts[3], 10);

        const totalBytes = totalKb * 1024;
        const freeBytes = availableKb * 1024;

        return {
            freeBytes,
            totalBytes,
            freePercent: totalBytes > 0 ? Math.round((freeBytes / totalBytes) * 100) : 0,
        };
    } catch (err) {
        await Logger.warn(MODULE, 'Failed to check disk space via df, falling back to memory info', err);
        return {
            freeBytes: freeMem,
            totalBytes: totalMem,
            freePercent: Math.round((freeMem / totalMem) * 100),
        };
    }
}

/**
 * Minimum free disk space required before starting a composition (default 500MB).
 */
const MIN_FREE_BYTES = parseInt(process.env.MIN_FREE_DISK_BYTES || '524288000', 10);

/**
 * Checks if there is enough disk space for pipeline operations.
 * Returns true if sufficient space is available.
 */
export async function hasSufficientDiskSpace(): Promise<boolean> {
    const { freeBytes } = await checkDiskSpace();
    const sufficient = freeBytes > MIN_FREE_BYTES;
    if (!sufficient) {
        await Logger.warn(MODULE, `Insufficient disk space: ${Math.round(freeBytes / 1024 / 1024)}MB free, need ${Math.round(MIN_FREE_BYTES / 1024 / 1024)}MB`);
    }
    return sufficient;
}

/**
 * Cleans up temp files in data/temp/ directory.
 * Called on graceful shutdown or after composition.
 */
export async function cleanupTempFiles(): Promise<number> {
    const tempDir = getStoragePath('temp');
    try {
        const files = await fs.readdir(tempDir);
        let cleaned = 0;
        for (const file of files) {
            try {
                await fs.unlink(path.join(tempDir, file));
                cleaned++;
            } catch { /* ignore individual file errors */ }
        }
        if (cleaned > 0) {
            await Logger.info(MODULE, `Cleaned up ${cleaned} temp files`);
        }
        return cleaned;
    } catch {
        return 0;
    }
}

/**
 * Initializes the storage directory structure.
 * Call once at startup.
 */
export async function initStorage(): Promise<void> {
    const dirs = ['stories', 'audio', 'composed', 'temp'];
    for (const dir of dirs) {
        await ensureDir(dir);
    }
    await Logger.info(MODULE, `Storage initialized at ${getDataDir()}`);
}
