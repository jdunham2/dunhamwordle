# Quick Start Guide ⚡

Get your multiplayer Wordle with voice chat running in **10 minutes**.

---

## Step 1: Deploy Backend (5 minutes) 🏝️

### Option A: Val Town (Recommended)

1. **Go to [val.town](https://val.town)** and sign up (free)

2. **Create new HTTP Val**
   - Click "New Val"
   - Select "HTTP"
   - Name it `wordleServer`

3. **Paste this code:**
   - Copy from `val-town-setup/websocket-server.val.ts`
   - Save (Cmd/Ctrl + S)

4. **Get your URL:**
   ```
   wss://[your-username]-wordleserver.web.val.run
   ```

**That's it! Backend deployed!** ✅

---

## Step 2: Configure Frontend (3 minutes) ⚙️

1. **Copy environment file:**
   ```bash
   cp env.example .env
   ```

2. **Edit `.env`:**
   ```env
   # Your Val Town URL
   VITE_WS_URL=wss://[your-username]-wordleserver.web.val.run
   
   # TURN server (already configured - no changes needed)
   VITE_TURN_SERVER=relay1.expressturn.com:3478
   VITE_TURN_USERNAME=000000002076975744
   VITE_TURN_PASSWORD=rOnkKAOHY+v33zFalCzbKCxe3as=
   ```

3. **Build:**
   ```bash
   npm run build
   ```

---

## Step 3: Deploy Frontend (2 minutes) 📦

1. **Commit:**
   ```bash
   git add docs/ .env
   git commit -m "Deploy multiplayer with Val Town"
   git push
   ```

2. **Enable GitHub Pages:**
   - Go to repo Settings → Pages
   - Source: `main` branch, `/docs` folder
   - Save

3. **Your site:**
   ```
   https://[your-username].github.io/dunhamwordle/
   ```

**Done!** 🎉

---

## Testing Multiplayer

1. **Open your site** in two browsers (or devices)

2. **Host:** Click "Multiplayer" → "Create Room"
   - Get room code (e.g., `ABC123`)
   - Allow microphone when prompted

3. **Guest:** Click "Multiplayer" → "Join Room"
   - Enter room code
   - Allow microphone

4. **Play together!**
   - You'll hear each other
   - Typing appears in real-time
   - Same puzzle, collaborative play

---

## Troubleshooting

### "WebSocket connection failed"
✅ Check Val URL in `.env` uses `wss://` not `ws://`  
✅ Verify Val is saved and public on Val Town  
✅ Rebuild: `npm run build`

### "Microphone not working"
✅ Allow permissions when prompted  
✅ Must use HTTPS (GitHub Pages ✓)  
✅ Check browser console for errors

### "Room not found"
✅ Val might have cold-started, try again  
✅ Room codes are case-sensitive  
✅ Create a new room

---

## What You Get

✅ **Real-time multiplayer** - Shared game state  
✅ **Voice chat** - Talk while playing  
✅ **Room system** - Easy to join friends  
✅ **Challenge mode** - Create and share puzzles  
✅ **Database** - Challenges stored in Val Town SQLite  
✅ **100% FREE** - No credit card needed

---

## Next Steps

### Want Async Challenges?
See `VAL_TOWN_DEPLOYMENT.md` - challenges are already stored in Val Town's database!

### Want to Customize?
- Edit `val-town-setup/websocket-server.val.ts`
- Save in Val Town
- Changes are instant!

### Want Better Hosting?
See `PLATFORM_COMPARISON.md` for alternatives

---

## Architecture

```
┌─────────────┐
│  Browser 1  │◄────────┐
│  (Host)     │         │
└──────┬──────┘         │
       │                │
       │ WebRTC         │ WebRTC
       │ (P2P)          │ (P2P)
       │                │
       ▼                ▼
┌─────────────┐    ┌─────────────┐
│ Val Town    │◄───┤  Browser 2  │
│ WebSocket   │    │  (Guest)    │
│ + SQLite    │    └─────────────┘
└─────────────┘
       │
       │ Signaling Only
       │ (WebRTC setup)
       └──────────────┐
                      │
               ┌──────▼──────┐
               │ ExpressTURN │
               │ (NAT fix)   │
               └─────────────┘
```

**Key Points:**
- Val Town handles signaling (room management)
- WebRTC connects browsers directly (P2P)
- ExpressTURN helps traverse firewalls
- SQLite stores challenges in Val Town

---

## Support

- **Val Town Docs:** [docs.val.town](https://docs.val.town)
- **Val Town Discord:** [val.town/discord](https://val.town/discord)
- **This Project:** See other `.md` files in this repo

---

## Summary

```bash
# 1. Deploy backend (5 min)
# → Copy code to Val Town

# 2. Configure frontend (3 min)
cp env.example .env
# → Edit VITE_WS_URL
npm run build

# 3. Deploy frontend (2 min)
git add docs/ && git commit -m "Deploy" && git push
# → Enable GitHub Pages

# 4. Play! 🎮
# → Open site, create room, invite friend
```

**Total time: 10 minutes**  
**Total cost: $0**  
**Total fun: ∞** 🎉

