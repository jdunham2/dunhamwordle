# Val Town Deployment Guide 🏝️

**Val Town is the EASIEST way to deploy everything!** One platform for WebSocket server, database, and optional frontend hosting.

## Why Val Town?

- ✅ **Free tier** - No credit card required
- ✅ **Built-in SQLite database** - No setup needed
- ✅ **WebSocket support** - Perfect for multiplayer
- ✅ **Easy deployment** - Paste code and go
- ✅ **Challenge persistence** - Store challenges in DB
- ✅ **100ms ping times** - Fast connections
- ✅ **Auto HTTPS/WSS** - Secure by default

## What Can Val Town Host?

| Feature | Val Town | Notes |
|---------|----------|-------|
| WebSocket Server | ✅ | Perfect |
| Challenge Database | ✅ | Built-in SQLite |
| Frontend Hosting | ✅ | Static files via HTTP |
| WebRTC Signaling | ✅ | WebSockets handle this |
| WebRTC Media | ⚠️ | Peer-to-peer (doesn't go through server) |
| TURN Server | ❌ | Use ExpressTURN (already configured) |

---

## Quick Start (5 minutes)

### Step 1: Sign Up

1. Go to [val.town](https://val.town)
2. Sign up (free, no credit card)
3. Verify your email

### Step 2: Create the WebSocket Server

1. Click **"New Val"**
2. Select **"HTTP"** (supports WebSocket upgrades)
3. **Name it**: `wordleServer` (or any name you like)
4. **Paste the code** from `val-town-setup/websocket-server.val.ts`
5. Click **"Save"** or press `Cmd/Ctrl + S`

That's it! Your WebSocket server is live! 🎉

### Step 3: Get Your WebSocket URL

Your URL will be:
```
wss://[your-username]-wordleserver.web.val.run
```

Example: If your username is `jeshua`, it would be:
```
wss://jeshua-wordleserver.web.val.run
```

### Step 4: Configure Your Frontend

1. **Update your `.env` file**:
   ```bash
   cp env.example .env
   ```

2. **Edit `.env`**:
   ```env
   # Val Town WebSocket URL
   VITE_WS_URL=wss://[your-username]-wordleserver.web.val.run
   
   # ExpressTURN (already configured)
   VITE_TURN_SERVER=relay1.expressturn.com:3478
   VITE_TURN_USERNAME=000000002076975744
   VITE_TURN_PASSWORD=rOnkKAOHY+v33zFalCzbKCxe3as=
   ```

3. **Build**:
   ```bash
   npm run build
   ```

4. **Deploy to GitHub Pages**:
   ```bash
   git add docs/ .env
   git commit -m "Deploy with Val Town"
   git push
   ```

---

## Features Included

### 1. **Multiplayer Rooms** 🎮
- Create and join rooms
- Automatic cleanup when empty
- Room persistence in database
- Player count tracking

### 2. **WebRTC Signaling** 📡
- Offer/Answer exchange
- ICE candidate forwarding
- Connection state management

### 3. **Challenge Database** 🎯
- Store created challenges
- Track completions
- View who solved your puzzles
- Completion statistics

### 4. **Real-time Notifications** 🔔
- Know when someone completes your challenge
- No Firebase needed!
- Uses WebSocket for instant updates

---

## Using the Challenge Database

### Create a Challenge
```typescript
// In your app
const ws = new WebSocket('wss://your-username-wordleserver.web.val.run');

ws.send(JSON.stringify({
  type: 'create-challenge',
  challengeId: 'abc123',
  word: 'WORDS',
  creatorId: 'user123',
  creatorName: 'John'
}));
```

### Complete a Challenge
```typescript
ws.send(JSON.stringify({
  type: 'complete-challenge',
  challengeId: 'abc123',
  completerId: 'user456',
  completerName: 'Jane',
  won: true,
  guesses: 4
}));
```

### Get Challenge Stats
```typescript
ws.send(JSON.stringify({
  type: 'get-challenge-completions',
  challengeId: 'abc123'
}));

// Response:
{
  type: 'challenge-completions',
  challengeId: 'abc123',
  completions: [
    { completerName: 'Jane', won: true, guesses: 4, completedAt: 1234567890 }
  ]
}
```

---

## Monitoring Your Server

### View Stats

Visit your Val's HTTP endpoint in a browser:
```
https://[your-username]-wordleserver.web.val.run
```

You'll see:
```json
{
  "status": "ok",
  "activeRooms": 2,
  "totalConnections": 4,
  "totalChallenges": 156,
  "totalCompletions": 423,
  "timestamp": "2025-01-28T..."
}
```

### View Database

In Val Town:
1. Go to your Val
2. Click **"Blob"** tab
3. Find **"wordle_db"**
4. View the JSON structure:
   ```json
   {
     "rooms": {...},
     "challenges": {...},
     "completions": [...]
   }
   ```

### View Logs

In Val Town:
1. Go to your Val
2. Click **"Logs"** tab
3. See real-time connection logs

---

## Advanced: Host Frontend on Val Town Too

You can host BOTH backend and frontend on Val Town!

### Create a Frontend Val

```typescript
// frontend.val.ts
export default async function(req: Request): Promise<Response> {
  const url = new URL(req.url);
  
  // Serve your built files
  if (url.pathname === "/") {
    return new Response(await Deno.readTextFile("./docs/index.html"), {
      headers: { "Content-Type": "text/html" }
    });
  }
  
  // Serve static assets
  const filePath = "./docs" + url.pathname;
  try {
    const file = await Deno.readFile(filePath);
    const ext = filePath.split('.').pop();
    const contentType = {
      'js': 'application/javascript',
      'css': 'text/css',
      'html': 'text/html',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'svg': 'image/svg+xml'
    }[ext] || 'text/plain';
    
    return new Response(file, {
      headers: { "Content-Type": contentType }
    });
  } catch {
    return new Response("Not Found", { status: 404 });
  }
}
```

---

## Val Town Free Tier Limits

| Resource | Free Tier | Notes |
|----------|-----------|-------|
| **Vals** | Unlimited | Create as many as you want |
| **Requests** | 1M/month | More than enough |
| **Duration** | 10min max | Per request (plenty for WebSocket) |
| **Storage** | 10MB SQLite | ~100K challenges |
| **Bandwidth** | 10GB/month | Should be fine |

**For this app**: Free tier is perfect! You'd need 100+ concurrent players to hit limits.

---

## Updating Your Val

1. **Edit the code** in Val Town editor
2. **Save** (Cmd/Ctrl + S)
3. **Instant deploy** - No rebuild needed!

Changes are live immediately!

---

## Backup Your Database

### Export SQLite Database

```bash
# In Val Town editor, click "Blob" tab
# Click on "wordle_db" and download JSON
```

Or via API:
```typescript
// In another Val
import { blob } from "https://esm.town/v/std/blob";

const db = await blob.getJSON("wordle_db");
console.log(db);
```

---

## Troubleshooting

### "Connection failed"
- Check your Val is saved and public
- Verify URL format: `wss://` not `ws://`
- Check Val Town status page

### "Database error"
- View logs in Val Town
- Check SQLite tab for schema
- Verify table creation ran

### "Room not found"
- Val Town might have restarted (cold start)
- Rooms are in-memory, DB stores challenges
- Create a new room

---

## Comparison: Val Town vs Others

| Platform | Setup Time | Cost | Database | WebSocket | Ease |
|----------|------------|------|----------|-----------|------|
| **Val Town** | 5 min | Free | ✅ Built-in | ✅ Native | ⭐⭐⭐⭐⭐ |
| Railway | 10 min | $5 credit | ❌ Need add-on | ✅ Yes | ⭐⭐⭐⭐ |
| Fly.io | 15 min | Free tier | ❌ Need add-on | ✅ Yes | ⭐⭐⭐ |
| Glitch | 5 min | Free | ❌ Need add-on | ✅ Yes | ⭐⭐⭐⭐ |
| Render | 10 min | Requires $$$ | ❌ Need add-on | ✅ Yes | ⭐⭐ |

**Winner**: Val Town for this use case! 🏆

---

## Cost Estimate

For **1,000 daily active users**:
- Requests: ~50K/day = 1.5M/month → **Free** ✅
- Storage: ~5MB of challenges → **Free** ✅
- Bandwidth: ~1GB/month → **Free** ✅

You'd need to pay only if you get **viral** (which is a good problem! 🎉)

---

## Next Steps

1. ✅ Create Val on Val Town
2. ✅ Update `.env` with your Val URL
3. ✅ Build and deploy frontend
4. ✅ Test multiplayer
5. ✅ Share with friends!

---

## Support

- **Val Town Docs**: [docs.val.town](https://docs.val.town)
- **Val Town Discord**: [val.town/discord](https://val.town/discord)
- **SQLite Docs**: Built-in, just works!

---

## Pro Tips

1. **Use Val Town for everything** - It's simpler than splitting services
2. **Check SQLite tab** often to see your data
3. **Monitor the stats endpoint** to see usage
4. **Val Town auto-scales** - No config needed
5. **Use Val Town's built-in cron** for cleanup (optional)

---

## Summary

**Val Town gives you:**
- 🎮 Multiplayer WebSocket server
- 📊 SQLite database for challenges  
- 🔔 Real-time notifications
- 📡 WebRTC signaling
- 🆓 All for FREE
- ⚡ 5-minute setup

**You just need:**
1. Sign up on Val Town
2. Paste the code
3. Update your `.env`
4. Deploy!

**It's that simple!** 🎉

