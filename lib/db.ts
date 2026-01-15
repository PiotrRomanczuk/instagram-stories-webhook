import fs from 'fs/promises';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'tokens.json');

import { TokenData } from './types';

export async function getTokens(): Promise<TokenData | null> {
    try {
        const data = await fs.readFile(DB_PATH, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        return null;
    }
}

export async function saveTokens(tokens: TokenData): Promise<void> {
    await fs.writeFile(DB_PATH, JSON.stringify(tokens, null, 2));
}
