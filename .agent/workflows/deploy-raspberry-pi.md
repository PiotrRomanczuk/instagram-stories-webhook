---
description: Raspberry Pi local deployment workflow using PM2 and Cloudflare Tunnel.
---

# Deploy to Raspberry Pi Workflow

This workflow guides deployment of the application to a Raspberry Pi for local hosting.

## Prerequisites
- [ ] Raspberry Pi with Node.js 18+ installed.
- [ ] PM2 installed globally: `npm install -g pm2`.
- [ ] Cloudflare account with a domain configured.
- [ ] `cloudflared` CLI installed on the Pi.

## 1. Build Production Bundle
```bash
# On the Raspberry Pi, in the project directory
npm install
npm run build
```

## 2. Create PM2 Ecosystem File
Create `ecosystem.config.js` in the project root:
```javascript
module.exports = {
  apps: [{
    name: 'instagram-webhook',
    script: 'npm',
    args: 'start',
    cwd: '/path/to/instagram-stories-webhook',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
```

## 3. Start Application with PM2
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Follow instructions to enable auto-start on boot
```

## 4. Set Up System Cron for Scheduler
Edit crontab: `crontab -e`
```cron
# Run scheduler every minute
* * * * * curl -X POST http://localhost:3000/api/schedule/process -H "X-API-Key: YOUR_API_KEY" >> /var/log/instagram-scheduler.log 2>&1
```

## 5. Configure Cloudflare Tunnel
```bash
# Authenticate cloudflared
cloudflared tunnel login

# Create a tunnel
cloudflared tunnel create instagram-webhook

# Configure the tunnel (create config.yml)
# Point to localhost:3000
cloudflared tunnel route dns instagram-webhook your-subdomain.yourdomain.com

# Run the tunnel
cloudflared tunnel run instagram-webhook
```

## 6. Update Environment Variables
Update `.env.local` with production values:
- `FB_REDIRECT_URI=https://your-subdomain.yourdomain.com/api/auth/callback`
- Update the redirect URI in Facebook Developer Console.

## 7. Run PM2 for Cloudflare Tunnel
```bash
pm2 start cloudflared --name cf-tunnel -- tunnel run instagram-webhook
pm2 save
```

## 8. Verify Deployment
1. Access `https://your-subdomain.yourdomain.com` from an external device.
2. Check PM2 status: `pm2 status`.
3. View logs: `pm2 logs instagram-webhook`.

## Reference
See `docs/PI_DEPLOYMENT.md` for additional details.
