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

## 🕒 Step 3: Start the Cron Worker
Instead of setting up system crontabs, you can run the built-in scheduler worker using PM2. This uses `node-cron` to check for posts every minute.

```bash
pm2 start npm --name "insta-worker" -- run worker
```

This worker will:
1. Load environment variables from `.env.local`.
2. check for pending posts every minute.
3. Automatically handle publishing and clean up media.

## 📝 Step 4: Monitor Logs
You can monitor the output of your app and worker using:
```bash
pm2 logs
```

## 🌐 Step 5: External Access (Cloudflare Tunnel)
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
