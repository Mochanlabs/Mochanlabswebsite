# Production Setup Guide - Mochan Labs Admin

## Overview

This guide covers setting up the Mochan Labs admin server in a production environment with security hardening, monitoring, and process management.

## Prerequisites

- Node.js 18+ installed
- MongoDB Atlas account and cluster
- Gmail account with 2FA enabled
- Server with Linux OS (Ubuntu 20.04+ recommended)
- PM2 installed globally: `npm install -g pm2`

## Step-by-Step Setup

### 1. Clone and Install

```bash
# Clone repository
git clone <your-repo-url>
cd Mochanlabswebsite/server

# Install dependencies
npm install
```

### 2. Configure Environment Variables

Create `.env.production` file with the following:

```bash
# Copy from .env.example
cp .env.example .env.production

# Edit with your production values
nano .env.production
```

**Required Variables:**
```
MONGODB_URI=mongodb+srv://prod_user:strong_password@cluster.mongodb.net/mochanlabs?retryWrites=true&w=majority
PORT=3000
NODE_ENV=production

GMAIL_USER=mochanlabs@gmail.com
GMAIL_APP_PASSWORD=your_16_character_app_password

ADMIN_EMAIL=mochanlabs@gmail.com
OTP_EXPIRY=600
```

### 3. Set Up Gmail App Password

1. Go to [myaccount.google.com](https://myaccount.google.com)
2. Click **Security** in the left menu
3. Enable **2-Step Verification** (if not already enabled)
4. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
5. Select **Mail** and **Windows Computer** (or your device type)
6. Google will generate a 16-character password
7. Copy this password to `.env.production` as `GMAIL_APP_PASSWORD`

### 4. Start with PM2

```bash
# Start the application
./start-prod.sh

# Or manually:
pm2 start ecosystem.config.js --env production --update-env

# Save PM2 process list
pm2 save
```

### 5. Setup PM2 Startup Hook (Auto-start on Server Reboot)

```bash
# Generate startup script
pm2 startup

# Save the PM2 process list
pm2 save

# Verify it saved
pm2 ls
```

### 6. Monitor Logs

```bash
# View real-time logs
pm2 logs mochan-admin

# View specific log file
tail -f logs/combined.log

# View error logs
tail -f logs/error.log

# Monitor with UI
pm2 monit
```

## Security Configuration

### Enabled Security Features

✅ **Helmet.js** - HTTP Security Headers
- Content Security Policy
- X-Frame-Options
- X-Content-Type-Options
- Strict-Transport-Security

✅ **Rate Limiting**
- OTP Request: 5 requests per 15 minutes per IP
- OTP Verify: 10 attempts per 15 minutes per IP
- Prevents brute force attacks

✅ **CORS Restrictions**
- Development: Allow all origins
- Production: Restrict to your domain (update in server.js)

✅ **Environment-based Configuration**
- Development: Console logging enabled
- Production: File-based logging only

### Update CORS Origin (Production)

In `server/server.js`, update the CORS configuration:

```javascript
app.use(cors({
  origin: 'https://yourdomain.com', // Your production domain
  credentials: true
}));
```

## Logging

All logs are stored in `server/logs/` directory:

- **combined.log** - All logs (info, warnings, errors)
- **error.log** - Only errors
- **pm2-out.log** - PM2 stdout
- **pm2-error.log** - PM2 stderr

Log rotation is enabled:
- Max file size: 5MB
- Max files: 5
- Old logs are automatically archived

## Monitoring

### PM2 Plus (Recommended)

```bash
# Enable PM2 Plus monitoring
pm2 plus

# View at https://app.pm2.io
```

### Manual Monitoring

```bash
# Get process info
pm2 info mochan-admin

# Monitor in real-time
pm2 monit

# Show logs
pm2 logs mochan-admin

# Get resource usage
pm2 show mochan-admin
```

## Troubleshooting

### Server won't start

```bash
# Check PM2 logs
pm2 logs mochan-admin

# Check system logs
tail -f logs/combined.log

# Verify environment variables
cat .env.production
```

### MongoDB connection failed

```bash
# Verify MONGODB_URI
echo $MONGODB_URI

# Check MongoDB Atlas IP Whitelist:
# 1. Go to MongoDB Atlas Dashboard
# 2. Network Access
# 3. Add your server's IP address
```

### Gmail not sending OTP

```bash
# Verify Gmail credentials
# 1. Check GMAIL_APP_PASSWORD is correct (16 characters)
# 2. Verify 2FA is enabled on Gmail account
# 3. Check logs for email service errors
tail -f logs/error.log
```

### High memory usage

```bash
# Check memory usage
pm2 show mochan-admin | grep memory

# Restart with memory limit
pm2 start ecosystem.config.js --env production -- --max-memory-restart=500M
```

## Maintenance

### Update Dependencies

```bash
# Check for updates
npm outdated

# Update securely
npm update

# Reinstall
npm ci --production
```

### Restart Server

```bash
# Graceful restart
pm2 restart mochan-admin

# Hard restart
pm2 kill
./start-prod.sh
```

### Backup MongoDB

```bash
# MongoDB Atlas automatically backs up data
# Access backups in MongoDB Atlas Dashboard → Backup

# Manual export (if needed)
mongoexport --uri="$MONGODB_URI" --collection=otps --out=otps-backup.json
```

## Database Maintenance

### Remove Old OTPs

OTPs automatically expire in 10 minutes via MongoDB TTL index.

### Monitor Database

```bash
# Connect to MongoDB Atlas
# View in MongoDB Atlas Dashboard → Collections
```

## SSL/HTTPS Setup

For production, use SSL/HTTPS with Nginx reverse proxy:

### Nginx Configuration Example

```nginx
server {
    listen 443 ssl http2;
    server_name admin.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/admin.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/admin.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Install SSL Certificate (Let's Encrypt)

```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Create certificate
sudo certbot certonly --nginx -d admin.yourdomain.com

# Auto-renew
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

## Performance Tuning

### Node.js Cluster Mode (Enabled in PM2)

The server runs in cluster mode with auto-scaling:

```javascript
// ecosystem.config.js
instances: 'max',        // Use all CPU cores
exec_mode: 'cluster',    // Cluster mode for load balancing
```

### Database Connection Pooling

MongoDB driver handles connection pooling automatically.

### Memory Management

```javascript
// ecosystem.config.js
max_memory_restart: '500M'  // Restart if exceeds 500MB
```

## Deployment Checklist

- [ ] Node.js 18+ installed
- [ ] MongoDB Atlas cluster created
- [ ] Gmail App Password generated and configured
- [ ] `.env.production` file created with all variables
- [ ] Dependencies installed: `npm install`
- [ ] Logs directory created: `mkdir logs`
- [ ] PM2 startup hook configured: `pm2 startup`
- [ ] Server started: `./start-prod.sh`
- [ ] PM2 process list saved: `pm2 save`
- [ ] Logs verified: `pm2 logs mochan-admin`
- [ ] CORS origin updated to your domain
- [ ] Nginx/SSL configured (if applicable)
- [ ] Monitoring enabled (PM2 Plus recommended)
- [ ] Backup strategy in place

## Support

For issues or questions:
1. Check logs: `pm2 logs mochan-admin`
2. Review this guide
3. Check MongoDB Atlas dashboard
4. Verify Gmail account settings

## Useful Commands

```bash
# Status
pm2 status

# List all processes
pm2 ls

# Restart all
pm2 restart all

# Stop server
pm2 stop mochan-admin

# Delete from PM2
pm2 delete mochan-admin

# View details
pm2 describe mochan-admin

# Export configuration
pm2 export

# Kill all PM2 processes
pm2 kill
```

---

**Version:** 1.0
**Last Updated:** May 2024
**Maintainer:** Mochan Labs Team
