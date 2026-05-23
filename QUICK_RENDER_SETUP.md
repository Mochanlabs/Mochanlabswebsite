# Quick Render Deployment - 5 Minutes

## Summary

Your code is now on GitHub with all production security setup. Deploy to Render in 5 steps.

## Prerequisites Checklist

Before you start, gather these:

- [ ] MongoDB Atlas connection string (`MONGODB_URI`)
- [ ] Gmail App Password (16 characters)
- [ ] Render.com account (free at render.com)
- [ ] Code pushed to GitHub ✅ (Already done!)

## 5-Step Deployment

### 1️⃣ Sign In to Render

Go to: https://dashboard.render.com

(Sign in with GitHub if you don't have account)

### 2️⃣ Create New Service

- Click **New** button → **Web Service**
- Select: `Mochanlabswebsite` repository
- Click **Connect**

### 3️⃣ Fill Service Settings

```
Name:              mochan-labs-admin
Environment:       Node
Region:            Oregon (default)
Branch:            main
Build Command:     cd server && npm install
Start Command:     cd server && npm start
Auto-Deploy:       Yes
```

### 4️⃣ Add Environment Variables

Click **Environment** and add:

```
NODE_ENV                = production
PORT                    = 3000
MONGODB_URI             = mongodb+srv://prod_user:YOUR_PASSWORD@cluster.mongodb.net/mochanlabs?retryWrites=true&w=majority
GMAIL_USER              = mochanlabs@gmail.com
GMAIL_APP_PASSWORD      = YOUR_16_CHAR_PASSWORD
ADMIN_EMAIL             = mochanlabs@gmail.com
OTP_EXPIRY              = 600
```

Replace:
- `YOUR_PASSWORD` with MongoDB password
- `YOUR_16_CHAR_PASSWORD` with Gmail app password

### 5️⃣ Deploy!

Click **Create Web Service**

⏳ Wait 2-3 minutes for deployment...

✅ You'll see: `✅ Server running on port 3000`

## Test It Works

1. Go to: `https://mochan-labs-admin.onrender.com/admin/login.html`
2. Click **Send OTP to Email**
3. Check email at mochanlabs@gmail.com for OTP
4. Enter OTP and verify
5. You're logged in! 🎉

## Important Setup Steps

### MongoDB IP Whitelist (Required)

Your Render app needs access to MongoDB:

1. Go to: https://cloud.mongodb.com
2. Login → Click your cluster
3. **Network Access** → **Add IP Address**
4. Enter: `0.0.0.0/0` (allows Render's dynamic IPs)
5. Click **Confirm**

### (Optional) Use Custom Domain

If you own a domain:

1. In Render dashboard, go to **Settings**
2. Under **Domain**, add your domain
3. Update DNS record (CNAME) at your domain provider:
   ```
   CNAME: admin.yourdomain.com → mochan-labs-admin.onrender.com
   ```
4. Click **Verify** in Render

## Auto-Deployment

Every time you push to GitHub:

```bash
git add -A
git commit -m "Your message"
git push origin main
```

Render automatically:
1. Pulls new code
2. Runs `npm install`
3. Restarts server
4. Deploys to production ✅

**No manual deployment needed!**

## Monitor Your App

### View Logs

In Render Dashboard:
1. Click your service
2. Click **Logs** tab
3. See real-time logs

### Monitor Metrics

In Render Dashboard:
1. Click your service  
2. Click **Metrics** tab
3. View CPU, memory, requests

## Troubleshooting

### Deployment Failed

Check logs in Render → **Logs** tab

Common issues:
- `MongoDB connection failed` → Check MONGODB_URI and IP whitelist
- `Gmail auth failed` → Verify GMAIL_APP_PASSWORD (16 chars)
- `npm install error` → Check package.json syntax

### App Crashes After Deploy

1. Check Render logs
2. Verify all environment variables are set
3. Click **Manual Deploy** → **Clear Builds and Redeploy**

### OTP Not Sending

1. Check GMAIL_APP_PASSWORD is 16 characters
2. Verify 2FA is enabled on Gmail
3. Check Render logs for email service errors

## Useful Links

| What | Link |
|------|------|
| Render Dashboard | https://dashboard.render.com |
| Your App | https://mochan-labs-admin.onrender.com |
| MongoDB Atlas | https://cloud.mongodb.com |
| GitHub Repo | https://github.com/Mochanlabs/Mochanlabswebsite |

## Next Steps

1. ✅ Deploy to Render (you just did this!)
2. ✅ Test OTP login
3. ⏭️ Monitor logs for first week
4. ⏭️ Setup custom domain (optional)
5. ⏭️ Enable monitoring alerts (optional)

## Full Documentation

For detailed guides, see:
- **Production Setup:** `server/PRODUCTION_SETUP.md`
- **Render Deployment:** `RENDER_DEPLOYMENT.md`

---

**Your app is now LIVE! 🚀**

Access admin portal: `https://mochan-labs-admin.onrender.com/admin/login.html`
