import * as path from 'path';
import * as fs from 'fs';

const MEMES_DIR = path.join(process.cwd(), 'memes');

export function getAllMemes(): string[] {
  return fs.readdirSync(MEMES_DIR)
    .filter(f => f.endsWith('.jpg'))
    .map(f => path.join(MEMES_DIR, f));
}

export function getRandomMeme(): string {
  const memes = getAllMemes();
  return memes[Math.floor(Math.random() * memes.length)];
}

export function getMemeByIndex(index: number): string {
  const memes = getAllMemes();
  return memes[index % memes.length];
}
