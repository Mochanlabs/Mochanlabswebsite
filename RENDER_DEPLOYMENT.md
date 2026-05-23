# Deploy to Render.com - Complete Guide

## Overview

Render.com is a cloud platform that automatically deploys your app when you push to GitHub. It's perfect for hosting Node.js applications with automatic scaling and monitoring.

## Prerequisites

- GitHub account with code pushed
- Render.com account (free at render.com)
- MongoDB Atlas database setup
- Gmail App Password configured

## Step-by-Step Deployment Guide

### Step 1: Push Code to GitHub

First, commit and push all your code to GitHub:

```bash
# Stage all files (except .env which is in .gitignore)
git add -A

# Create commit
git commit -m "feat: Add OTP-based admin authentication with production security setup

- Implement OTP-based login for admin portal
- Add rate limiting to prevent brute force attacks
- Setup Winston logging for production monitoring
- Add helmet.js security headers
- Configure PM2 for process management
- Create Render.com deployment configuration"

# Push to GitHub
git push origin main
```

### Step 2: Sign Up on Render.com

1. Go to [render.com](https://render.com)
2. Click **Sign up** 
3. Choose **Sign up with GitHub**
4. Authorize Render to access your GitHub repositories
5. Create your account

### Step 3: Create New Service on Render

1. Go to [dashboard.render.com](https://dashboard.render.com)
2. Click **New +** button
3. Select **Web Service**
4. Choose your GitHub repository
5. Select the repository `repo_for_mochanlabs_website` or similar
6. Click **Connect**

### Step 4: Configure Service

Fill in the following details:

**Basic Settings:**
- **Name:** `mochan-labs-admin`
- **Environment:** `Node`
- **Region:** `Oregon` (or your preferred region)
- **Branch:** `main`
- **Build Command:** `cd server && npm install`
- **Start Command:** `cd server && npm start`
- **Auto-Deploy:** `Yes` (automatically redeploy on push)

### Step 5: Add Environment Variables

Click **Environment** section and add these variables:

```
NODE_ENV = production
PORT = 3000
MONGODB_URI = mongodb+srv://prod_user:your_password@cluster.mongodb.net/mochanlabs?retryWrites=true&w=majority
GMAIL_USER = mochanlabs@gmail.com
GMAIL_APP_PASSWORD = your_16_character_app_password
ADMIN_EMAIL = mochanlabs@gmail.com
OTP_EXPIRY = 600
```

⚠️ **IMPORTANT:** 
- Copy MONGODB_URI from MongoDB Atlas
- Get GMAIL_APP_PASSWORD from Google Account settings
- **NEVER commit these values to GitHub**

### Step 6: Deploy

1. Click **Create Web Service**
2. Render will automatically:
   - Clone your repository
   - Install dependencies (`npm install`)
   - Start your server (`npm start`)
   - Assign a URL like `https://mochan-labs-admin.onrender.com`

3. Watch the deployment logs in real-time
4. Once deployment is complete, your app is live! 🚀

## Verify Deployment

### Check Logs

In Render dashboard:
1. Go to your service
2. Click **Logs** tab
3. Look for `✅ Server running on port 3000`

### Test the Admin Portal

Open: `https://mochan-labs-admin.onrender.com/admin/login.html`

You should see the OTP login screen with:
- ✅ "Send OTP to Email" button
- ✅ No username/password fields
- ✅ Message "An OTP will be sent to mochanlabs@gmail.com"

### Test the OTP Flow

1. Click **Send OTP to Email**
2. Check your email (mochanlabs@gmail.com) for OTP
3. Enter the 6-digit OTP
4. Click **Verify OTP**
5. You should be logged in to the dashboard

## Production Configuration

### Update CORS for Production

Update `server/server.js` line with your Render domain:

```javascript
app.use(cors({
  origin: 'https://mochan-labs-admin.onrender.com',
  credentials: true
}));
```

Then commit and push - it will auto-deploy!

### MongoDB Atlas IP Whitelist

Your Render server needs access to MongoDB:

1. Go to MongoDB Atlas Dashboard
2. Click **Network Access**
3. Click **Add IP Address**
4. Enter `0.0.0.0/0` (allows all IPs - for Render's dynamic IPs)
   - ⚠️ Less secure, but necessary for Render's free tier
5. Click **Confirm**

### Enable HTTPS/SSL

Render automatically provides SSL certificates - your site will be HTTPS by default! 🔒

## Automatic Deployments

Every time you push to GitHub, Render will automatically:

1. Pull latest code
2. Install dependencies
3. Restart the server
4. Deploy to production

**No manual deployment needed!**

```bash
# Just push to GitHub and Render handles the rest
git push origin main
```

## Monitoring & Logging

### View Logs

**In Render Dashboard:**
1. Go to your service
2. Click **Logs** tab
3. See real-time logs as requests come in

### Monitor Performance

**In Render Dashboard:**
1. Go to your service
2. Click **Metrics** tab
3. View CPU, Memory, Network usage

### Get Alerts

**In Render Dashboard:**
1. Click on your service
2. Go to **Settings** → **Alerts**
3. Configure email alerts for crashes

## Troubleshooting

### Deployment Failed

**Check logs:**
1. Go to **Logs** in Render dashboard
2. Look for error messages
3. Common issues:
   - `npm install` failed - check package.json syntax
   - `MongoDB connection failed` - verify MONGODB_URI
   - `Gmail auth failed` - check GMAIL_APP_PASSWORD

### App Keeps Crashing

**Check:**
1. Are all environment variables set?
2. Is MongoDB URI correct?
3. View logs for specific error
4. Restart service: Click **Manual Deploy** → **Clear Builds and Redeploy**

### MongoDB Connection Error

```
Error: connect ECONNREFUSED
```

**Solution:**
1. Check MongoDB URI in environment variables
2. Add Render IP to MongoDB Atlas whitelist
3. Verify MongoDB cluster is running

### Gmail OTP Not Sending

**Check:**
1. GMAIL_APP_PASSWORD is correct (16 characters)
2. 2FA is enabled on Gmail account
3. Check Render logs for email service errors

## Update Code

Any time you want to update code:

```bash
# Make changes locally
nano server/server.js

# Commit changes
git add -A
git commit -m "Update server configuration"

# Push to GitHub
git push origin main

# Render automatically redeploys! ✅
```

## Environment Variables Management

### Add/Update Environment Variables

1. Go to Render dashboard
2. Click your service
3. Go to **Environment**
4. Click **Edit**
5. Update variables
6. Click **Save**
7. Service will redeploy automatically

### Secrets Best Practice

✅ **NEVER commit to GitHub:**
- `.env` files
- `.env.production`
- Passwords, API keys, credentials

✅ **Always use Render Environment Variables** for secrets

## Scaling

### Upgrade Plan

If you need more resources:

1. Go to service **Settings**
2. Under **Plan**, select higher tier
3. Render will upgrade automatically

**Plans:**
- **Free:** 0.5 CPU, 512MB RAM (good for testing)
- **Starter:** 1 CPU, 512MB RAM ($7/month)
- **Standard:** 1 CPU, 2GB RAM ($12/month)
- **Pro:** Scalable, 4GB+ RAM ($25+/month)

## Domain Setup

### Connect Custom Domain

1. Go to service **Settings**
2. Under **Domain**, click **Add Custom Domain**
3. Enter your domain (e.g., `admin.mochanlabs.com`)
4. Update DNS records at your domain registrar
5. Render provides SSL certificate automatically

Example DNS record:
```
CNAME: admin.mochanlabs.com → mochan-labs-admin.onrender.com
```

## Backup Strategy

### MongoDB Backup

MongoDB Atlas automatically backs up your data:
- Daily backups retained for 30 days
- Access in MongoDB Atlas Dashboard → **Backup**

### Code Backup

GitHub is your code backup - always push commits!

## Cost Analysis

### Render Pricing

- **Free Tier:** 
  - Limited to 512MB RAM, 0.5 CPU
  - 15-minute inactivity auto-sleep
  - Good for testing/demo

- **Starter ($7/month):**
  - 512MB RAM, 1 CPU
  - No auto-sleep
  - Recommended for production

### Estimates

| Component | Cost |
|-----------|------|
| Render Web Service | $0-25/month |
| MongoDB Atlas | $0-50/month |
| Domain (optional) | $10-15/year |
| **Total** | **$7-90/month** |

## FAQ

### Can I use a free database?

Yes, MongoDB Atlas offers free tier with 512MB storage. Good for testing!

### Will my app sleep?

On free tier: Yes, after 15 minutes of inactivity
On paid tiers: No, always running

### How do I see error logs?

Go to Render Dashboard → Your Service → **Logs** tab

### Can I rollback to previous version?

Yes! In Render Dashboard, go to **Deploys** tab and click previous deploy

### How do I update dependencies?

```bash
npm install package_name
git push origin main
# Render automatically runs npm install and redeploys
```

## Quick Deployment Checklist

- [ ] Code pushed to GitHub
- [ ] `.env` files in `.gitignore` (not committed)
- [ ] Render account created
- [ ] MongoDB URI configured in Render
- [ ] Gmail App Password set in Render
- [ ] Service deployed successfully
- [ ] OTP login tested
- [ ] Logs monitored
- [ ] CORS origin updated
- [ ] MongoDB whitelist updated

## Next Steps

1. ✅ Push code to GitHub
2. ✅ Create Render service
3. ✅ Configure environment variables
4. ✅ Test OTP login
5. ✅ Monitor logs and performance
6. ✅ Setup custom domain (optional)
7. ✅ Upgrade plan if needed

## Support

- **Render Docs:** https://render.com/docs
- **Render Status:** https://status.render.com
- **Render Support:** support@render.com

---

**Your app will be live at:** `https://mochan-labs-admin.onrender.com` 🚀

Once deployed, the admin portal will be accessible and ready for production use!
