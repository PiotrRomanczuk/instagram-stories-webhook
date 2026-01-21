import { describe, it, expect } from 'vitest';

describe('Initial Testing Setup', () => {
  it('should correctly run a basic test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should have access to the mock server', async () => {
    const response = await fetch('https://graph.facebook.com/v21.0/me');
    const data = await response.json();
    
    expect(data.name).toBe('Test Artist');
  });
});
