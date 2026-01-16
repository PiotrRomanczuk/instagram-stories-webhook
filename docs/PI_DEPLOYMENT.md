# 🥧 Raspberry Pi Deployment Guide

This guide covers how to deploy the **Instagram Story Automation** project locally on a Raspberry Pi.

## 📋 Prerequisites
- Raspberry Pi (3B+ or newer recommended)
- Node.js (v18 or newer)
- npm or yarn
- PM2 (Process Manager)

## 🛠️ Step 1: Install PM2
On your Raspberry Pi, install PM2 globally:
```bash
sudo npm install -g pm2
```

## 🏗️ Step 2: Build & Start
1. Clone the repository to your Pi.
2. Install dependencies: `npm install`
3. Create your `.env.local` with your production keys.
4. Build the project:
   ```bash
   npm run build
   ```
5. Start the server with PM2:
   ```bash
   pm2 start npm --name "insta-auto" -- start
   ```
6. Save the PM2 list and set up startup script:
   ```bash
   pm2 save
   pm2 startup
   ```
   *(Follow the command returned by `pm2 startup` to enable it on boot)*

## 🕒 Step 3: Configure Local Cron Jobs
Open your crontab editor:
```bash
crontab -e
```
Add the following lines (replace `<CRON_SECRET>` with your secret and port with your app's port, default 3000):

```bash
# Process scheduled posts every minute
* * * * * curl -X GET "http://localhost:3000/api/schedule/process" -H "Authorization: Bearer <CRON_SECRET>"

# Refresh Meta Token every Sunday at midnight
0 0 * * 0 curl -X GET "http://localhost:3000/api/schedule/refresh-token" -H "Authorization: Bearer <CRON_SECRET>"
```

## 🌐 Step 4: External Access (Cloudflare Tunnel)
Since your Pi is likely behind a NAT/Firewall, use a **Cloudflare Tunnel** to expose it to the internet without port forwarding.

1. Install `cloudflared` on your Pi.
2. Authenticate: `cloudflared tunnel login`
3. Create a tunnel: `cloudflared tunnel create insta-tunnel`
4. Route traffic:
   ```bash
   cloudflared tunnel route dns insta-tunnel your-domain.com
   ```
5. Run the tunnel:
   ```bash
   pm2 start cloudflared --name "cf-tunnel" -- tunnel run insta-tunnel
   ```

## 📝 Updating
To update the app after making changes:
```bash
git pull
npm install
npm run build
pm2 restart insta-auto
```
