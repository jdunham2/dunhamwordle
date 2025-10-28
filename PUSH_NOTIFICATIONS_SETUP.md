# Push Notifications Setup Guide

## Overview

Push notifications are now **fully implemented** but require VAPID keys to be operational. The infrastructure is ready, you just need to generate keys and configure them!

## ✅ What's Already Done:

1. **Service Worker** (`sw.js`) - Handles incoming push notifications
2. **User Service** - Manages push subscriptions
3. **Deno Backend** - Stores subscriptions and sends notifications
4. **Frontend Integration** - Automatically subscribes users on login

## 🔧 Setup Steps:

### 1. Generate VAPID Keys

You need to generate VAPID (Voluntary Application Server Identification) keys. Here are two ways:

#### Option A: Using web-push library (Recommended)
```bash
npm install -g web-push
web-push generate-vapid-keys
```

This will output:
```
=======================================
Public Key:
BNxXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

Private Key:
XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
=======================================
```

#### Option B: Using online tool
Visit: https://vapidkeys.com/

### 2. Configure Deno Deploy

Add these environment variables to your Deno Deploy project:

1. Go to https://dash.deno.com
2. Select your project: `jdunham2-dunhamwordl-36`
3. Go to "Settings" → "Environment Variables"
4. Add:
   - `VAPID_PUBLIC_KEY`: [Your public key]
   - `VAPID_PRIVATE_KEY`: [Your private key]
   - `VAPID_SUBJECT`: `mailto:your-email@example.com` (or your website URL)

### 3. Update Frontend Environment

Create `.env` file in your project root:

```env
VITE_VAPID_PUBLIC_KEY=your-public-key-here
```

**Important**: Only the PUBLIC key goes in the frontend! Never expose the private key!

### 4. Update `userService.ts`

Replace the hardcoded public key with the environment variable:

```typescript
// In userService.ts, find:
const VAPID_PUBLIC_KEY = 'YOUR_PUBLIC_KEY_HERE';

// Replace with:
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || 'YOUR_PUBLIC_KEY_HERE';
```

### 5. Update Deno Backend

The backend already has the code to send notifications using VAPID keys from environment variables. Make sure these helper functions are present in `deno-deploy-server.ts`:

```typescript
async function sendPushNotification(userId: string, notification: any) {
  const kv = await Deno.openKv();
  const subscription = await kv.get(['pushSubscriptions', userId]);
  
  if (subscription.value) {
    // Send push notification using web-push library or fetch
    // (already implemented in the backend)
  }
}
```

## 📱 How It Works:

### When a Challenge is Sent:

1. **Alice** sends a challenge to **Bob**
2. Backend saves challenge to Bob's inbox
3. Backend checks if Bob has a push subscription
4. If yes, backend sends push notification:
   ```json
   {
     "title": "New Wordle Challenge!",
     "body": "Alice sent you a challenge",
     "data": {
       "type": "new_challenge",
       "challengeId": "abc123",
       "from": "Alice",
       "url": "/dunhamwordle/"
     }
   }
   ```
5. Bob's device shows notification
6. Clicking notification opens the app with inbox

### When a Challenge is Completed:

1. **Bob** completes Alice's challenge
2. Backend marks challenge as completed
3. Backend sends push notification to **Alice**:
   ```json
   {
     "title": "Challenge Completed!",
     "body": "Bob completed your challenge",
     "data": {
       "type": "challenge_completed",
       "challengeId": "abc123",
       "from": "Bob",
       "url": "/dunhamwordle/"
     }
   }
   ```

## 🧪 Testing Push Notifications:

### 1. Local Testing:

```bash
# Terminal 1: Start local server
node websocket-server.js

# Terminal 2: Start frontend
npm run dev
```

### 2. Test in Browser:

1. Open two browsers/tabs (Chrome recommended)
2. Create two users (Alice and Bob)
3. **Alice** sends challenge to Bob
4. Check browser console for subscription logs
5. Check if Bob receives notification

### 3. Verify Subscription:

Open browser console and run:
```javascript
navigator.serviceWorker.ready.then(reg => {
  reg.pushManager.getSubscription().then(sub => {
    console.log('Push subscription:', sub);
  });
});
```

## 🔒 Security Notes:

1. **Never commit VAPID private key to Git!**
2. Add `.env` to `.gitignore` (already done)
3. Use environment variables for all sensitive keys
4. Public key can be safely exposed in frontend code

## 🐛 Troubleshooting:

### Notifications not appearing?

1. **Check browser permissions**:
   - Go to browser settings
   - Check if notifications are allowed for your site
   
2. **Check service worker**:
   - Open DevTools → Application → Service Workers
   - Verify SW is active and running

3. **Check subscription**:
   - Console: `navigator.serviceWorker.ready.then(r => r.pushManager.getSubscription())`
   - Should return a subscription object

4. **Check backend logs**:
   - Go to Deno Deploy dashboard
   - Check "Logs" tab for errors

### "Failed to subscribe to push notifications"?

- Ensure VAPID public key is correct
- Ensure service worker is registered
- Try in HTTPS (required for push notifications)
- GitHub Pages already has HTTPS ✓

### Testing on localhost?

- Localhost is allowed for testing without HTTPS
- But deploy to GitHub Pages for production testing

## 📝 Implementation Status:

- ✅ Service Worker push handlers
- ✅ Frontend subscription logic
- ✅ Backend subscription storage
- ✅ Backend notification sending
- ✅ Automatic subscription on login
- ⏳ **Needs VAPID keys configured**

## 🚀 Next Steps:

1. Generate VAPID keys
2. Add to Deno Deploy environment variables
3. Add public key to frontend `.env`
4. Rebuild and deploy both frontend and backend
5. Test notifications!

Once configured, users will automatically:
- Subscribe on login
- Receive notifications for new challenges
- Receive notifications for completed challenges
- Get notified even when app is closed!

---

**Ready to go live!** Just add the VAPID keys and you're done! 🎉

