# Complete Deployment Guide

This guide covers deploying your Wordle multiplayer game with voice chat using **free services**.

## Quick Overview (Recommended: Val Town)

- **🏝️ Val Town** (EASIEST): WebSocket + Database all-in-one (see `VAL_TOWN_DEPLOYMENT.md`)
- **Frontend**: GitHub Pages (free, easy)
- **WebRTC**: ExpressTURN (configured, free tier included)

## Alternative Platforms

- **WebSocket Server**: Railway, Fly.io, or Glitch
- **Database for Challenges**: Firebase, Supabase, or Val Town SQLite

---

## Part 1: Configure Environment Variables

1. **Copy the example file:**
   ```bash
   cp env.example .env
   ```

2. **Edit `.env` with your values:**
   ```bash
   # Local development
   VITE_WS_URL=ws://localhost:8080
   
   # ExpressTURN (already configured)
   VITE_TURN_SERVER=relay1.expressturn.com:3478
   VITE_TURN_USERNAME=000000002076975744
   VITE_TURN_PASSWORD=rOnkKAOHY+v33zFalCzbKCxe3as=
   ```

---

## Part 2: Deploy WebSocket Server

### Option A: Railway (Recommended - Simplest)

1. **Sign up at [Railway.app](https://railway.app/)** (free tier: $5/month credit)

2. **Deploy from GitHub:**
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli
   
   # Login
   railway login
   
   # Initialize
   railway init
   
   # Deploy
   railway up
   ```

3. **Configure:**
   - Railway auto-detects `websocket-server.js`
   - Start command: `node websocket-server.js`
   - Railway provides a public URL automatically
   - Copy the URL: `https://your-app.up.railway.app`

4. **Get your WebSocket URL:**
   - Use: `wss://your-app.up.railway.app` (note the `wss://`)

### Option B: Fly.io (Good Free Tier)

1. **Sign up at [Fly.io](https://fly.io/)** (free tier: 3 VMs, 160GB transfer)

2. **Install flyctl:**
   ```bash
   # macOS
   brew install flyctl
   
   # Windows/Linux
   curl -L https://fly.io/install.sh | sh
   ```

3. **Create `fly.toml`:**
   ```toml
   app = "your-wordle-ws"
   
   [build]
   
   [http_service]
     internal_port = 8080
     force_https = true
     auto_stop_machines = true
     auto_start_machines = true
   
   [[services]]
     internal_port = 8080
     protocol = "tcp"
   
     [[services.ports]]
       port = 80
       handlers = ["http"]
     
     [[services.ports]]
       port = 443
       handlers = ["tls", "http"]
   ```

4. **Deploy:**
   ```bash
   flyctl launch
   flyctl deploy
   ```

5. **Your URL:** `wss://your-wordle-ws.fly.dev`

### Option C: Glitch (Easiest - No CLI needed)

1. **Go to [Glitch.com](https://glitch.com/)** and sign up

2. **Import from GitHub:**
   - Click "New Project" → "Import from GitHub"
   - Paste your repo URL
   - Glitch auto-deploys!

3. **Configure:**
   - Glitch auto-runs `package.json` start script
   - Add: `"start": "node websocket-server.js"` to package.json if not there

4. **Your URL:** `wss://your-project-name.glitch.me`

### Why Render May Not Be Working

Render's free tier has limitations:
- Spins down after 15 min of inactivity
- Takes 30-60 seconds to wake up
- May require payment verification now
- **Recommendation:** Use Railway or Fly.io instead

---

## Part 3: Deploy Frontend (GitHub Pages)

1. **Update `.env` with your WebSocket URL:**
   ```bash
   # Production settings
   VITE_WS_URL=wss://your-app.up.railway.app  # or fly.dev or glitch.me
   VITE_TURN_SERVER=relay1.expressturn.com:3478
   VITE_TURN_USERNAME=000000002076975744
   VITE_TURN_PASSWORD=rOnkKAOHY+v33zFalCzbKCxe3as=
   ```

2. **Build with environment variables:**
   ```bash
   npm run build
   ```

3. **Commit and push:**
   ```bash
   git add docs/
   git commit -m "Build for production with WebSocket URL"
   git push origin main
   ```

4. **Enable GitHub Pages:**
   - Go to repo Settings → Pages
   - Source: Deploy from branch `main`
   - Folder: `/docs`
   - Save

5. **Your site:** `https://yourusername.github.io/dunhamwordle/`

---

## Part 4: Alternative - Deploy Both on Same Platform

### Fly.io (Frontend + Backend)

You can serve both the static frontend and WebSocket server from one Fly.io app:

1. **Update `websocket-server.js`** to serve static files:
   ```javascript
   import { WebSocketServer } from 'ws';
   import express from 'express';
   import { createServer } from 'http';
   import path from 'path';
   import { fileURLToPath } from 'url';
   
   const __dirname = path.dirname(fileURLToPath(import.meta.url));
   const app = express();
   const PORT = process.env.PORT || 8080;
   
   // Serve static files from docs folder
   app.use(express.static(path.join(__dirname, 'docs')));
   
   const server = createServer(app);
   const wss = new WebSocketServer({ server });
   
   // ... rest of your WebSocket code ...
   
   server.listen(PORT, () => {
     console.log(`Server listening on port ${PORT}`);
   });
   ```

2. **Deploy to Fly.io** - serves both frontend and WebSocket!

---

## Part 5: Set Up Firebase for Challenge Notifications (Optional)

For async "Play with Friends" where you get notified when someone completes your challenge:

1. **Create Firebase Project:**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project (free Spark plan)
   - Enable Firestore Database
   - Enable Cloud Messaging

2. **Get Configuration:**
   - Project Settings → General → Your apps
   - Click Web app icon
   - Copy the config values

3. **Add to `.env`:**
   ```bash
   VITE_FIREBASE_API_KEY=your-api-key
   VITE_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-app.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
   VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
   ```

4. **Install Firebase SDK:**
   ```bash
   npm install firebase
   ```

---

## Testing Your Deployment

### 1. Test WebSocket Connection

Open browser console on your deployed site:
```javascript
const ws = new WebSocket('wss://your-app.up.railway.app');
ws.onopen = () => console.log('Connected!');
ws.onerror = (e) => console.error('Error:', e);
```

### 2. Test TURN Server

In browser console:
```javascript
const pc = new RTCPeerConnection({
  iceServers: [{
    urls: 'turn:relay1.expressturn.com:3478',
    username: '000000002076975744',
    credential: 'rOnkKAOHY+v33zFalCzbKCxe3as='
  }]
});
console.log('TURN configured:', pc.getConfiguration());
```

### 3. Test Multiplayer

1. Open your deployed site in two browsers
2. Create a room on one
3. Join from the other
4. Check console for TURN server usage:
   - Look for "relay" in ICE candidates
   - Should see successful connection even across different networks

---

## Troubleshooting

### "WebSocket connection failed"
- ✅ Check that WebSocket server is running
- ✅ Verify VITE_WS_URL uses `wss://` (not `ws://`)
- ✅ Check server logs for errors
- ✅ Make sure firewall allows WebSocket connections

### "Room not found"
- If using Render: Server spun down, wait 30 seconds
- If using Railway/Fly: Check server logs
- Try creating a new room

### Voice chat not connecting
- ✅ ExpressTURN credentials configured
- ✅ Microphone permissions granted
- ✅ HTTPS required for getUserMedia (GitHub Pages ✓)
- ✅ Check browser console for errors

### Build errors with environment variables
```bash
# Make sure .env exists
cp env.example .env

# Load variables before build
source .env && npm run build
```

---

## Cost Breakdown (All Free!)

| Service | Free Tier | What You Get |
|---------|-----------|-------------|
| **Railway** | $5/month credit | ~400 hours runtime |
| **Fly.io** | 3 VMs, 160GB | Always-on, 3 apps |
| **Glitch** | Unlimited projects | Sleeps after 5 min |
| **GitHub Pages** | Unlimited | Static hosting |
| **ExpressTURN** | Free tier | 500MB/month transfer |
| **Firebase** | Spark plan | 50K reads/day, 20K writes/day |

---

## Recommended Setup

For best experience:
- **WebSocket Server:** Railway or Fly.io (both reliable, always-on)
- **Frontend:** GitHub Pages (fast CDN, free SSL)
- **TURN:** ExpressTURN (already configured)
- **Notifications:** Firebase (if you want async challenges)

---

## Next Steps

1. Choose a WebSocket hosting platform
2. Deploy WebSocket server
3. Update `.env` with your WebSocket URL
4. Build and deploy frontend
5. Test multiplayer with voice chat
6. (Optional) Set up Firebase for challenge notifications

Need help? Check the logs:
- Railway: `railway logs`
- Fly.io: `flyctl logs`
- Glitch: View logs in the Glitch editor

---

## Pro Tips

1. **Always use wss:// (not ws://)** for production
2. **Test on mobile** - ExpressTURN helps with mobile NAT traversal
3. **Monitor free tier limits** - Railway gives you $5/month
4. **Use GitHub Actions** to auto-deploy on push
5. **Keep credentials in .env** - never commit them!

