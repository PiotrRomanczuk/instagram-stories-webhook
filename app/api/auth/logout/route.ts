import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'tokens.json');

export async function POST() {
    try {
        await fs.unlink(DB_PATH);
        return NextResponse.json({ success: true, message: 'Disconnected successfully' });
    } catch (error) {
        // If file doesn't exist, we're already "logged out"
        return NextResponse.json({ success: true, message: 'Already disconnected' });
    }
}
