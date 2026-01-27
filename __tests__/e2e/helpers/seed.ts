import { Page } from '@playwright/test';

/**
 * Test data seeding utilities for E2E tests
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
  const response = await page.request.post('/api/admin/users', {
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

  // Create test meme submissions
  await createMemeSubmissions(page, [
    {
      title: 'Test Meme 1',
      caption: 'This is a test meme',
      mediaUrl: '/fixtures/test-images/valid-square.jpg',
      userId: userId1,
      status: 'pending',
    },
    {
      title: 'Test Meme 2',
      caption: 'Another test meme',
      mediaUrl: '/fixtures/test-images/valid-story.jpg',
      userId: userId1,
      status: 'approved',
    },
    {
      title: 'Test Meme 3',
      caption: 'User 2 meme',
      mediaUrl: '/fixtures/test-images/valid-square.jpg',
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
    mediaUrl: '/fixtures/test-images/valid-square.jpg',
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
