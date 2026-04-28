import { google, drive_v3 } from 'googleapis';
import { Readable } from 'stream';

export interface DriveFile {
    id: string;
    name: string;
    mimeType: string;
    createdTime?: string;
    size?: number;
}

/**
 * Google Drive API v3 wrapper.
 * Auth: OAuth2 with stored refresh token (run scripts/setup-drive.ts once to obtain it).
 * Required env vars: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN,
 *                    GOOGLE_DRIVE_ROOT_FOLDER_ID
 */
export class DriveService {
    private drive: drive_v3.Drive;

    constructor() {
        const auth = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
        );
        auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
        this.drive = google.drive({ version: 'v3', auth });
    }

    /**
     * Uploads a buffer as a new file in the given Drive folder.
     * Returns the created file ID.
     */
    async upload(fileName: string, buffer: Buffer, mimeType: string, folderId: string): Promise<string> {
        const stream = Readable.from(buffer);
        const res = await this.drive.files.create({
            requestBody: { name: fileName, parents: [folderId] },
            media: { mimeType, body: stream },
            fields: 'id',
        });
        const id = res.data.id;
        if (!id) throw new Error(`Drive upload failed for ${fileName}: no ID returned`);
        return id;
    }

    /**
     * Downloads a file by ID and returns its contents as a Buffer.
     */
    async download(fileId: string): Promise<Buffer> {
        const res = await this.drive.files.get(
            { fileId, alt: 'media' },
            { responseType: 'arraybuffer' },
        );
        return Buffer.from(res.data as ArrayBuffer);
    }

    /**
     * Permanently deletes a file by ID. Silently ignores 404s.
     */
    async delete(fileId: string): Promise<void> {
        try {
            await this.drive.files.delete({ fileId });
        } catch (err: unknown) {
            if (err instanceof Error && 'code' in err && (err as { code: number }).code === 404) return;
            throw err;
        }
    }

    /**
     * Lists all files (not folders) inside a Drive folder.
     */
    async listFolder(folderId: string): Promise<DriveFile[]> {
        const files: DriveFile[] = [];
        let pageToken: string | undefined;

        do {
            const res = await this.drive.files.list({
                q: `'${folderId}' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed = false`,
                fields: 'nextPageToken, files(id, name, mimeType, createdTime, size)',
                pageSize: 200,
                ...(pageToken ? { pageToken } : {}),
            });
            for (const f of res.data.files ?? []) {
                files.push({
                    id: f.id!,
                    name: f.name!,
                    mimeType: f.mimeType!,
                    createdTime: f.createdTime ?? undefined,
                    size: f.size ? parseInt(f.size, 10) : undefined,
                });
            }
            pageToken = res.data.nextPageToken ?? undefined;
        } while (pageToken);

        return files;
    }

    /**
     * Returns the folder ID for `name` inside `parentId`.
     * Creates it if it doesn't exist.
     */
    async ensureFolder(name: string, parentId: string): Promise<string> {
        const res = await this.drive.files.list({
            q: `'${parentId}' in parents and name = '${name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
            fields: 'files(id)',
            pageSize: 1,
        });

        const existing = res.data.files?.[0]?.id;
        if (existing) return existing;

        const created = await this.drive.files.create({
            requestBody: {
                name,
                mimeType: 'application/vnd.google-apps.folder',
                parents: [parentId],
            },
            fields: 'id',
        });
        const id = created.data.id;
        if (!id) throw new Error(`Failed to create Drive folder: ${name}`);
        return id;
    }

    /**
     * Deletes all files in `folderId` older than `days` days.
     * Returns the number of files deleted.
     */
    async deleteOlderThan(folderId: string, days: number): Promise<number> {
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
        const files = await this.listFolder(folderId);
        const old = files.filter((f) => f.createdTime && f.createdTime < cutoff);

        await Promise.all(old.map((f) => this.delete(f.id)));
        return old.length;
    }
}

/** Singleton — re-use across the worker process lifetime. */
export const driveService = new DriveService();
