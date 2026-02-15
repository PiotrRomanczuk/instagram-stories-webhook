import { http, HttpResponse } from 'msw';

export const handlers = [
  // Mock Facebook Graph API
  http.get('https://graph.facebook.com/v24.0/me', () => {
    return HttpResponse.json({
      id: '123456789',
      name: 'Test Artist',
    });
  }),

  // Mock Instagram Business Account lookup
  http.get('https://graph.facebook.com/v24.0/me/accounts', () => {
    return HttpResponse.json({
      data: [
        {
          instagram_business_account: {
            id: '17841400000000000',
          },
          id: '987654321',
        },
      ],
    });
  }),

  // Mock token status endpoint
  http.get('/api/auth/token-status', () => {
    return HttpResponse.json({
      connected: true,
      token: {
        expires_at: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days from now
        ig_username: 'test_user',
        ig_user_id: '17841400000000000',
        provider_account_id: '123456789',
        is_expired: false,
      },
    });
  }),
];
