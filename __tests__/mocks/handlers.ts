import { http, HttpResponse } from 'msw';

export const handlers = [
  // Mock Facebook Graph API
  http.get('https://graph.facebook.com/v21.0/me', () => {
    return HttpResponse.json({
      id: '123456789',
      name: 'Test Artist',
    });
  }),

  // Mock Instagram Business Account lookup
  http.get('https://graph.facebook.com/v21.0/me/accounts', () => {
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
];
