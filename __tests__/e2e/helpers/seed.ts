import { Page } from '@playwright/test';

/**
 * Returns a publicly accessible test image URL for seeding content via API.
 * Uses picsum.photos deterministic images so they're always available.
 * Local file paths from getMemeByIndex() don't work in the browser.
 */
export function getTestMediaUrl(index: number): string {
	return `https://picsum.photos/seed/e2e-test-${index}/1080/1920`;
}

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

  // Create test meme submissions using publicly accessible test images
  await createMemeSubmissions(page, [
    {
      title: 'Test Meme 1',
      caption: 'This is a test meme',
      mediaUrl: getTestMediaUrl(50),
      userId: userId1,
      status: 'pending',
    },
    {
      title: 'Test Meme 2',
      caption: 'Another test meme',
      mediaUrl: getTestMediaUrl(51),
      userId: userId1,
      status: 'approved',
    },
    {
      title: 'Test Meme 3',
      caption: 'User 2 meme',
      mediaUrl: getTestMediaUrl(52),
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
    mediaUrl: getTestMediaUrl(Math.floor(Math.random() * 100)),
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
    mediaUrl: getTestMediaUrl(mediaIndex),
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
    mediaUrl: getTestMediaUrl(mediaIndex),
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
    mediaUrl: getTestMediaUrl(mediaIndex),
    mediaType: 'IMAGE',
    source: 'submission',
    submissionStatus: 'approved',
    publishingStatus: 'scheduled',
    scheduledTime: timeMs,
  });
}

/**
 * Create failed content for retry/delete testing
 */
export async function createFailedContent(
  page: Page,
  options: {
    title?: string;
    caption?: string;
    mediaIndex?: number;
  } = {}
): Promise<string> {
  const { title, caption, mediaIndex = Math.floor(Math.random() * 100) } = options;

  return createContent(page, {
    title: title || `Failed Content ${Date.now()}`,
    caption: caption || 'Failed caption for E2E testing',
    mediaUrl: getTestMediaUrl(mediaIndex),
    mediaType: 'IMAGE',
    source: 'submission',
    submissionStatus: 'approved',
    publishingStatus: 'failed',
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

// ============================================================================
// Batch Seeding Helpers for E2E Tests
// ============================================================================

/**
 * Create multiple approved content items ready for scheduling
 * @param count - Number of items to create
 * @returns Array of created content IDs
 */
export async function seedApprovedContentBatch(
  page: Page,
  count: number,
  options: {
    titlePrefix?: string;
    captionPrefix?: string;
    startIndex?: number;
  } = {}
): Promise<string[]> {
  const { titlePrefix = 'Test Content', captionPrefix = 'Test caption', startIndex = 0 } = options;
  const ids: string[] = [];

  for (let i = 0; i < count; i++) {
    const id = await createApprovedContent(page, {
      title: `${titlePrefix} ${startIndex + i + 1}`,
      caption: `${captionPrefix} ${startIndex + i + 1}`,
      mediaIndex: (startIndex + i) % 100, // Cycle through available memes
    });
    ids.push(id);
  }

  return ids;
}

/**
 * Create scheduled content at a specific time
 * @param scheduledTime - The time to schedule the content
 */
export async function seedScheduledContentAtTime(
  page: Page,
  scheduledTime: Date,
  options: {
    title?: string;
    caption?: string;
    mediaIndex?: number;
  } = {}
): Promise<string> {
  return createScheduledContent(page, scheduledTime, options);
}

/**
 * Create multiple scheduled content items at different times
 * @param times - Array of Date objects for scheduling
 */
export async function seedScheduledContentBatch(
  page: Page,
  times: Date[],
  options: {
    titlePrefix?: string;
    captionPrefix?: string;
  } = {}
): Promise<string[]> {
  const { titlePrefix = 'Scheduled Content', captionPrefix = 'Scheduled caption' } = options;
  const ids: string[] = [];

  for (let i = 0; i < times.length; i++) {
    const id = await createScheduledContent(page, times[i], {
      title: `${titlePrefix} ${i + 1}`,
      caption: `${captionPrefix} ${i + 1}`,
      mediaIndex: i % 100,
    });
    ids.push(id);
  }

  return ids;
}

/**
 * Delete specific content items by ID
 * @param ids - Array of content IDs to delete
 */
export async function cleanupTestContent(page: Page, ids: string[]): Promise<void> {
  for (const id of ids) {
    try {
      await page.request.delete(`/api/content/${id}`);
    } catch (error) {
      console.warn(`Failed to delete content ${id}:`, error);
    }
  }
}

/**
 * Delete all test content matching a pattern
 * @param titlePattern - Pattern to match against titles (e.g., "Test Content")
 */
export async function cleanupTestContentByPattern(
  page: Page,
  titlePattern: string
): Promise<number> {
  const content = await fetchContent(page, { limit: 100 });
  const matching = content.filter(c => c.title?.includes(titlePattern));
  const ids = matching.map(c => c.id).filter((id): id is string => !!id);

  await cleanupTestContent(page, ids);
  return ids.length;
}

/**
 * Get content item by ID
 */
export async function getContentById(
  page: Page,
  contentId: string
): Promise<TestContentItem | null> {
  try {
    const response = await page.request.get(`/api/content/${contentId}`);
    if (!response.ok()) {
      return null;
    }
    const data = await response.json();
    return data.item || data;
  } catch {
    return null;
  }
}

/**
 * Verify content was scheduled correctly
 */
export async function verifyContentScheduled(
  page: Page,
  contentId: string,
  expectedTime: Date,
  toleranceMs: number = 60000 // 1 minute tolerance
): Promise<boolean> {
  const content = await getContentById(page, contentId);
  if (!content) return false;

  if (content.publishingStatus !== 'scheduled') return false;
  if (!content.scheduledTime) return false;

  const diff = Math.abs(content.scheduledTime - expectedTime.getTime());
  return diff <= toleranceMs;
}
