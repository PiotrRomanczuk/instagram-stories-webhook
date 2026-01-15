import fs from 'fs/promises';
import path from 'path';

const SCHEDULED_POSTS_FILE = path.join(process.cwd(), 'data', 'scheduled-posts.json');

import { ScheduledPost } from './types';

async function ensureFile() {
    try {
        await fs.access(SCHEDULED_POSTS_FILE);
    } catch {
        await fs.writeFile(SCHEDULED_POSTS_FILE, '[]', 'utf-8');
    }
}

export async function getScheduledPosts(): Promise<ScheduledPost[]> {
    await ensureFile();
    const data = await fs.readFile(SCHEDULED_POSTS_FILE, 'utf-8');
    return JSON.parse(data);
}

export async function saveScheduledPosts(posts: ScheduledPost[]): Promise<void> {
    await ensureFile();
    await fs.writeFile(SCHEDULED_POSTS_FILE, JSON.stringify(posts, null, 2), 'utf-8');
}

export async function addScheduledPost(post: Omit<ScheduledPost, 'id' | 'status' | 'createdAt'>): Promise<ScheduledPost> {
    const posts = await getScheduledPosts();
    const newPost: ScheduledPost = {
        ...post,
        id: `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        status: 'pending',
        createdAt: Date.now(),
    };
    posts.push(newPost);
    await saveScheduledPosts(posts);
    return newPost;
}

export async function updateScheduledPost(id: string, updates: Partial<ScheduledPost>): Promise<ScheduledPost | null> {
    const posts = await getScheduledPosts();
    const index = posts.findIndex(p => p.id === id);
    if (index === -1) return null;

    posts[index] = { ...posts[index], ...updates };
    await saveScheduledPosts(posts);
    return posts[index];
}

export async function deleteScheduledPost(id: string): Promise<boolean> {
    const posts = await getScheduledPosts();
    const filtered = posts.filter(p => p.id !== id);
    if (filtered.length === posts.length) return false;

    await saveScheduledPosts(filtered);
    return true;
}

export async function getPendingPosts(): Promise<ScheduledPost[]> {
    const posts = await getScheduledPosts();
    const now = Date.now();
    return posts.filter(p => p.status === 'pending' && p.scheduledTime <= now);
}

export async function getUpcomingPosts(): Promise<ScheduledPost[]> {
    const posts = await getScheduledPosts();
    const now = Date.now();
    return posts.filter(p => p.status === 'pending' && p.scheduledTime > now);
}
