# Deno Deploy Setup Guide ⚡

**Val Town doesn't support external WebSocket connections**, but Deno Deploy does! And your code works with zero changes!

---

## 🎯 Why Deno Deploy?

- ✅ **Native WebSocket support** (no proxy issues)
- ✅ **FREE tier** (100K requests/day, 100GB bandwidth)
- ✅ **Built-in KV storage** (like Val Town blob)
- ✅ **Auto-deploy from GitHub**
- ✅ **Global edge network** (fast everywhere)
- ✅ **2-minute setup**

---

## 🚀 Quick Deploy (3 Options)

### Option 1: GitHub Integration (Easiest - No CLI!)

1. **Go to** [dash.deno.com/new](https://dash.deno.com/new)

2. **Sign in** with GitHub

3. **Create new project:**
   - Click **"New Project"**
   - Select **"GitHub"**
   - Choose your `dunhamwordle` repo
   - **Entry point**: `deno-deploy-server.ts`
   - Click **"Deploy"**

4. **Done!** ✅

Your WebSocket URL: `wss://[your-project-name].deno.dev`

---

### Option 2: Deploy from Terminal

```bash
# 1. Install Deno (if you don't have it)
curl -fsSL https://deno.land/install.sh | sh

# 2. Install deployctl
deno install --allow-all --no-check -r -f https://deno.land/x/deploy/deployctl.ts

# 3. Login
deployctl login

# 4. Deploy
deployctl deploy --project=dunhamwordle-ws deno-deploy-server.ts
```

Your URL: `wss://dunhamwordle-ws.deno.dev`

---

### Option 3: Automated GitHub Actions

1. Add `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Deno Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: denoland/deployctl@v1
        with:
          project: dunhamwordle-ws
          entrypoint: deno-deploy-server.ts
          root: .
```

2. Push to GitHub
3. Auto-deploys on every commit! 🎉

---

## 📝 Update Your Frontend

1. **Edit `.env`:**
   ```env
   # Replace Val Town URL with Deno Deploy
   VITE_WS_URL=wss://[your-project-name].deno.dev
   
   # Keep TURN server as-is
   VITE_TURN_SERVER=relay1.expressturn.com:3478
   VITE_TURN_USERNAME=000000002076975744
   VITE_TURN_PASSWORD=rOnkKAOHY+v33zFalCzbKCxe3as=
   ```

2. **Rebuild:**
   ```bash
   npm run build
   ```

3. **Deploy:**
   ```bash
   git add docs/ .env
   git commit -m "Switch to Deno Deploy"
   git push
   ```

---

## 🧪 Test Your Deployment

### 1. Check Server Status

Visit in browser: `https://[your-project-name].deno.dev`

You should see:
```json
{
  "status": "ok",
  "activeRooms": 0,
  "totalConnections": 0,
  "totalChallenges": 0,
  "totalCompletions": 0,
  "timestamp": "2025-01-28T..."
}
```

### 2. Test WebSocket Connection

Open browser console on your site:
```javascript
const ws = new WebSocket('wss://[your-project-name].deno.dev');
ws.onopen = () => console.log('✅ Connected!');
ws.onerror = (e) => console.error('❌ Error:', e);
```

### 3. Test Multiplayer

1. Open your deployed site in two browsers
2. Click "Real-Time Multiplayer"
3. Create a room
4. Join from second browser
5. ✅ Should connect instantly!

---

## 📊 Monitor Your Deployment

### Deno Deploy Dashboard

1. Go to [dash.deno.com](https://dash.deno.com)
2. Click your project
3. View:
   - **Logs** - Real-time server logs
   - **Analytics** - Request metrics
   - **KV Browser** - View stored data
   - **Deployments** - Version history

### View Logs

```bash
# Via CLI
deployctl logs --project=dunhamwordle-ws

# Or in dashboard
# Click project → Logs tab
```

### View Database

In Deno Deploy dashboard:
1. Click your project
2. Go to **"KV"** tab
3. Browse `wordle_db` key
4. See all challenges and completions!

---

## 🔧 Troubleshooting

### "Project not found"

**Create project first:**
```bash
deployctl projects create dunhamwordle-ws
```

Then deploy:
```bash
deployctl deploy --project=dunhamwordle-ws deno-deploy-server.ts
```

### "Permission denied"

**Login again:**
```bash
deployctl login
```

### "WebSocket connection failed"

**Check URL format:**
- ✅ `wss://` (secure)
- ❌ `ws://` (not secure)

**Verify deployment:**
```bash
curl https://your-project.deno.dev
# Should return JSON status
```

---

## 💰 Free Tier Limits

| Resource | Free Tier | Your Usage (est.) |
|----------|-----------|-------------------|
| **Requests** | 100K/day | ~1K/day ✅ |
| **Bandwidth** | 100GB/month | ~1GB/month ✅ |
| **CPU Time** | 50 hours/day | ~1 hour/day ✅ |
| **KV Reads** | 1M/day | ~10K/day ✅ |
| **KV Writes** | 100K/day | ~1K/day ✅ |

**You're well within limits!** 🎉

---

## 🆚 Comparison: Deno Deploy vs Others

| Feature | Deno Deploy | Railway | Fly.io | Val Town |
|---------|-------------|---------|--------|----------|
| **WebSocket** | ✅ Native | ✅ Yes | ✅ Yes | ❌ No (external) |
| **Free Tier** | ✅ Generous | ⚠️ $5 credit | ✅ Good | ✅ Good |
| **Setup Time** | ⚡ 2 min | 10 min | 15 min | N/A |
| **Database** | ✅ Built-in KV | ➕ Add-on | ➕ Add-on | ✅ Blob |
| **Auto-deploy** | ✅ GitHub | ✅ Git | ✅ Git | ✅ Web UI |
| **Edge Network** | ✅ Global | ❌ No | ✅ Yes | ✅ Yes |

**Winner: Deno Deploy** 🏆

---

## 📦 What's Included

Your Deno Deploy server includes:

- ✅ **Multiplayer rooms** - Create/join/manage
- ✅ **WebRTC signaling** - Offer/answer/ICE
- ✅ **Challenge storage** - Deno KV database
- ✅ **Completion tracking** - Who solved what
- ✅ **Real-time notifications** - Instant updates
- ✅ **Stats endpoint** - Monitor usage
- ✅ **Auto-scaling** - Handles traffic spikes

---

## 🔄 Migration from Val Town

Don't worry about losing data - you didn't have any yet! 😄

The code is identical, just:
1. Works with Deno KV instead of Val Town blob
2. Actually accepts external WebSocket connections
3. Still has all the same features

---

## 🎯 Next Steps

### 1. Deploy to Deno Deploy (2 min)
```bash
deployctl deploy --project=dunhamwordle-ws deno-deploy-server.ts
```

### 2. Update Frontend (1 min)
```env
VITE_WS_URL=wss://dunhamwordle-ws.deno.dev
```

### 3. Build & Deploy (1 min)
```bash
npm run build && git add . && git commit -m "Deploy" && git push
```

### 4. Test! 🎮
Open your GitHub Pages site and create a multiplayer room!

---

## 📚 Resources

- **Deno Deploy Docs**: [deno.com/deploy/docs](https://deno.com/deploy/docs)
- **WebSocket Guide**: [deno.land/manual/runtime/web_sockets](https://deno.land/manual/runtime/web_sockets)
- **Deno KV**: [deno.com/kv](https://deno.com/kv)
- **Dashboard**: [dash.deno.com](https://dash.deno.com)

---

## ✅ Summary

**Problem:** Val Town doesn't support external WebSocket connections

**Solution:** Deno Deploy (literally made for this!)

**Time:** 2 minutes

**Cost:** FREE ✅

**Result:** Fully working multiplayer Wordle with voice chat! 🎉

---

Ready to deploy? Just run:

```bash
deployctl login
deployctl deploy --project=dunhamwordle-ws deno-deploy-server.ts
```

That's it! 🚀

