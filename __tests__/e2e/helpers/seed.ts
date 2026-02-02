import { Page } from '@playwright/test';
import { getMemeByIndex } from './test-assets';

/**
 * Test data seeding utilities for E2E tests
 * Uses real memes from /memes/ folder instead of fixture placeholders.
 */

export interface TestUser {
  email: string;
  name: string;
  role: 'admin' | 'user';
  id?: string;
}

export interface TestMemeSubmission {
  title: string;
  caption: string;
  mediaUrl: string;
  userId: string;
  status?: 'pending' | 'approved' | 'rejected';
  id?: string;
}

export interface TestScheduledPost {
  userId: string;
  mediaId: string;
  caption: string;
  scheduledAt: Date;
  status?: 'pending' | 'processing' | 'published' | 'failed';
  id?: string;
}

/**
 * Create test user via API
 */
export async function createTestUser(page: Page, user: TestUser): Promise<string> {
  const response = await page.request.post('/api/users', {
    data: user,
  });

  if (!response.ok()) {
    throw new Error(`Failed to create test user: ${response.statusText()}`);
  }

  const data = await response.json();
  return data.id;
}

/**
 * Create multiple test users
 */
export async function createTestUsers(page: Page, users: TestUser[]): Promise<string[]> {
  const ids: string[] = [];

  for (const user of users) {
    const id = await createTestUser(page, user);
    ids.push(id);
  }

  return ids;
}

/**
 * Create test meme submission via API
 */
export async function createMemeSubmission(
  page: Page,
  submission: Omit<TestMemeSubmission, 'id'>
): Promise<string> {
  const response = await page.request.post('/api/memes', {
    data: submission,
  });

  if (!response.ok()) {
    throw new Error(`Failed to create meme submission: ${response.statusText()}`);
  }

  const data = await response.json();
  return data.id;
}

/**
 * Create multiple meme submissions
 */
export async function createMemeSubmissions(
  page: Page,
  submissions: Omit<TestMemeSubmission, 'id'>[]
): Promise<string[]> {
  const ids: string[] = [];

  for (const submission of submissions) {
    const id = await createMemeSubmission(page, submission);
    ids.push(id);
  }

  return ids;
}

/**
 * Create test scheduled post via API
 */
export async function createScheduledPost(
  page: Page,
  post: Omit<TestScheduledPost, 'id'>
): Promise<string> {
  const response = await page.request.post('/api/schedule', {
    data: post,
  });

  if (!response.ok()) {
    throw new Error(`Failed to create scheduled post: ${response.statusText()}`);
  }

  const data = await response.json();
  return data.id;
}

/**
 * Approve meme submission (admin action)
 */
export async function approveMeme(page: Page, memeId: string): Promise<void> {
  const response = await page.request.post(`/api/memes/${memeId}/review`, {
    data: { action: 'approve' },
  });

  if (!response.ok()) {
    throw new Error(`Failed to approve meme: ${response.statusText()}`);
  }
}

/**
 * Reject meme submission (admin action)
 */
export async function rejectMeme(
  page: Page,
  memeId: string,
  reason: string
): Promise<void> {
  const response = await page.request.post(`/api/memes/${memeId}/review`, {
    data: { action: 'reject', reason },
  });

  if (!response.ok()) {
    throw new Error(`Failed to reject meme: ${response.statusText()}`);
  }
}

/**
 * Delete all test data (cleanup)
 */
export async function cleanupTestData(page: Page): Promise<void> {
  // This would typically call a special test endpoint that deletes test data
  // For now, we'll just log
  console.log('Cleaning up test data...');

  try {
    // Delete test submissions
    await page.request.delete('/api/test/cleanup/memes');

    // Delete test scheduled posts
    await page.request.delete('/api/test/cleanup/schedule');

    // Delete test users
    await page.request.delete('/api/test/cleanup/users');
  } catch (error) {
    console.warn('Cleanup failed (this is okay if cleanup endpoint does not exist):', error);
  }
}

/**
 * Seed database with sample data for testing
 */
export async function seedTestDatabase(page: Page): Promise<void> {
  // Create test users
  const adminId = await createTestUser(page, {
    email: 'admin@test.com',
    name: 'Test Admin',
    role: 'admin',
  });

  const userId1 = await createTestUser(page, {
    email: 'user@test.com',
    name: 'Test User',
    role: 'user',
  });

  const userId2 = await createTestUser(page, {
    email: 'user2@test.com',
    name: 'Test User 2',
    role: 'user',
  });

  // Create test meme submissions using real memes from /memes/ folder
  await createMemeSubmissions(page, [
    {
      title: 'Test Meme 1',
      caption: 'This is a test meme',
      mediaUrl: getMemeByIndex(50),
      userId: userId1,
      status: 'pending',
    },
    {
      title: 'Test Meme 2',
      caption: 'Another test meme',
      mediaUrl: getMemeByIndex(51),
      userId: userId1,
      status: 'approved',
    },
    {
      title: 'Test Meme 3',
      caption: 'User 2 meme',
      mediaUrl: getMemeByIndex(52),
      userId: userId2,
      status: 'pending',
    },
  ]);

  console.log('Test database seeded successfully');
}

/**
 * Wait for database operation to complete
 */
export async function waitForDbOperation(page: Page, timeout = 3000): Promise<void> {
  await page.waitForTimeout(timeout);
}

/**
 * Generate test data factories
 */
export const TestDataFactory = {
  user: (overrides: Partial<TestUser> = {}): TestUser => ({
    email: `test-${Date.now()}@test.com`,
    name: 'Test User',
    role: 'user',
    ...overrides,
  }),

  memeSubmission: (overrides: Partial<TestMemeSubmission> = {}): Omit<TestMemeSubmission, 'id'> => ({
    title: `Test Meme ${Date.now()}`,
    caption: 'This is a test meme submission',
    mediaUrl: getMemeByIndex(Math.floor(Math.random() * 100)),
    userId: 'test-user-id',
    status: 'pending',
    ...overrides,
  }),

  scheduledPost: (overrides: Partial<TestScheduledPost> = {}): Omit<TestScheduledPost, 'id'> => ({
    userId: 'test-user-id',
    mediaId: 'test-media-id',
    caption: 'Scheduled post test',
    scheduledAt: new Date(Date.now() + 86400000), // Tomorrow
    status: 'pending',
    ...overrides,
  }),
};

// ============================================================================
// Content API Helpers (Unified /api/content endpoint)
// ============================================================================

/**
 * Content item interface matching the unified Content API
 */
export interface TestContentItem {
  id?: string;
  title?: string;
  caption?: string;
  mediaUrl: string;
  mediaType?: 'IMAGE' | 'VIDEO';
  source?: 'submission' | 'direct';
  submissionStatus?: 'pending' | 'approved' | 'rejected';
  publishingStatus?: 'draft' | 'scheduled' | 'processing' | 'published' | 'failed';
  scheduledTime?: number; // Unix timestamp in milliseconds
}

/**
 * Create content via the unified /api/content endpoint
 */
export async function createContent(
  page: Page,
  content: Omit<TestContentItem, 'id'>
): Promise<string> {
  const response = await page.request.post('/api/content', {
    data: content,
  });

  if (!response.ok()) {
    const errorText = await response.text();
    throw new Error(`Failed to create content: ${response.statusText()} - ${errorText}`);
  }

  const data = await response.json();
  return data.item?.id || data.id;
}

/**
 * Create pending content for review testing
 */
export async function createPendingContent(
  page: Page,
  options: {
    title?: string;
    caption?: string;
    mediaIndex?: number;
  } = {}
): Promise<string> {
  const { title, caption, mediaIndex = Math.floor(Math.random() * 100) } = options;

  return createContent(page, {
    title: title || `Test Content ${Date.now()}`,
    caption: caption || 'Test caption for E2E testing',
    mediaUrl: getMemeByIndex(mediaIndex),
    mediaType: 'IMAGE',
    source: 'submission',
    submissionStatus: 'pending',
    publishingStatus: 'draft',
  });
}

/**
 * Create approved content ready for scheduling
 */
export async function createApprovedContent(
  page: Page,
  options: {
    title?: string;
    caption?: string;
    mediaIndex?: number;
  } = {}
): Promise<string> {
  const { title, caption, mediaIndex = Math.floor(Math.random() * 100) } = options;

  return createContent(page, {
    title: title || `Approved Content ${Date.now()}`,
    caption: caption || 'Approved caption for E2E testing',
    mediaUrl: getMemeByIndex(mediaIndex),
    mediaType: 'IMAGE',
    source: 'submission',
    submissionStatus: 'approved',
    publishingStatus: 'draft',
  });
}

/**
 * Create scheduled content
 */
export async function createScheduledContent(
  page: Page,
  scheduledTime: Date | number,
  options: {
    title?: string;
    caption?: string;
    mediaIndex?: number;
  } = {}
): Promise<string> {
  const { title, caption, mediaIndex = Math.floor(Math.random() * 100) } = options;
  const timeMs = typeof scheduledTime === 'number' ? scheduledTime : scheduledTime.getTime();

  return createContent(page, {
    title: title || `Scheduled Content ${Date.now()}`,
    caption: caption || 'Scheduled caption for E2E testing',
    mediaUrl: getMemeByIndex(mediaIndex),
    mediaType: 'IMAGE',
    source: 'submission',
    submissionStatus: 'approved',
    publishingStatus: 'scheduled',
    scheduledTime: timeMs,
  });
}

/**
 * Approve content via review API
 */
export async function approveContent(page: Page, contentId: string): Promise<void> {
  const response = await page.request.post(`/api/content/${contentId}/review`, {
    data: { action: 'approve' },
  });

  if (!response.ok()) {
    throw new Error(`Failed to approve content: ${response.statusText()}`);
  }
}

/**
 * Reject content via review API
 */
export async function rejectContent(
  page: Page,
  contentId: string,
  reason: string = 'Content does not meet guidelines'
): Promise<void> {
  const response = await page.request.post(`/api/content/${contentId}/review`, {
    data: { action: 'reject', rejectionReason: reason },
  });

  if (!response.ok()) {
    throw new Error(`Failed to reject content: ${response.statusText()}`);
  }
}

/**
 * Schedule content via PATCH
 */
export async function scheduleContent(
  page: Page,
  contentId: string,
  scheduledTime: Date | number
): Promise<void> {
  const timeMs = typeof scheduledTime === 'number' ? scheduledTime : scheduledTime.getTime();

  const response = await page.request.patch(`/api/content/${contentId}`, {
    data: {
      scheduledTime: timeMs,
      publishingStatus: 'scheduled',
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to schedule content: ${response.statusText()}`);
  }
}

/**
 * Fetch content items from API
 */
export async function fetchContent(
  page: Page,
  filters: {
    source?: 'submission' | 'direct';
    submissionStatus?: 'pending' | 'approved' | 'rejected';
    publishingStatus?: 'draft' | 'scheduled' | 'processing' | 'published' | 'failed';
    limit?: number;
  } = {}
): Promise<TestContentItem[]> {
  const params = new URLSearchParams();

  if (filters.source) params.set('source', filters.source);
  if (filters.submissionStatus) params.set('submissionStatus', filters.submissionStatus);
  if (filters.publishingStatus) params.set('publishingStatus', filters.publishingStatus);
  if (filters.limit) params.set('limit', filters.limit.toString());

  const url = `/api/content?${params.toString()}`;
  const response = await page.request.get(url);

  if (!response.ok()) {
    throw new Error(`Failed to fetch content: ${response.statusText()}`);
  }

  const data = await response.json();
  return data.items || [];
}
