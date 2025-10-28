# Local Testing Guide 🧪

Test your multiplayer Wordle locally before deploying to Val Town!

---

## ✅ Setup Complete!

Your local WebSocket server now supports:
- 🎮 **Multiplayer rooms** (same as Val Town)
- 🎯 **Challenge creation** (stored in `local-db.json`)
- 📊 **Challenge completions** (tracked locally)
- 🔔 **Real-time notifications** (works locally!)

---

## 🚀 Quick Start

### 1. Start Local Server (Already Running!)

```bash
node websocket-server.js
```

You should see:
```
✅ WebSocket server running on ws://localhost:8080
📊 Database file: ./local-db.json
🎮 Ready for multiplayer connections!
```

### 2. Configure for Local Testing

Your `.env` should already have:
```env
VITE_WS_URL=ws://localhost:8080
```

### 3. Start Dev Server

```bash
npm run dev
```

### 4. Test!

Open http://localhost:5173 in **two browsers** (or tabs):

#### Test Multiplayer:
1. **Browser 1**: Click "Multiplayer" → "Create Room"
2. Copy the room code
3. **Browser 2**: Click "Multiplayer" → "Join Room" → Enter code
4. ✅ You should connect and see each other typing!

#### Test Challenges:
1. Create a challenge (single player mode)
2. Share the URL
3. Open in another browser
4. Complete it
5. ✅ Check `local-db.json` to see it stored!

---

## 📂 Local Database

All data is stored in **`local-db.json`** in your project root:

```json
{
  "rooms": {
    "ABC123": {
      "roomId": "ABC123",
      "createdAt": 1234567890,
      "hostUsername": "you"
    }
  },
  "challenges": {
    "challenge_xyz": {
      "challengeId": "challenge_xyz",
      "creatorId": "user1",
      "creatorName": "You",
      "word": "TESTS",
      "createdAt": 1234567890,
      "completedCount": 2
    }
  },
  "completions": [
    {
      "challengeId": "challenge_xyz",
      "completerId": "user2",
      "completerName": "Friend",
      "won": true,
      "guesses": 4,
      "completedAt": 1234567890
    }
  ]
}
```

### View/Edit Database

```bash
# View the database
cat local-db.json

# Or open in your editor
code local-db.json

# Reset database (delete file)
rm local-db.json
```

---

## 🔧 Troubleshooting

### "Failed to create room"

**Check server is running:**
```bash
tail -f /tmp/ws-server.log
```

**Restart server:**
```bash
lsof -ti:8080 | xargs kill -9
node websocket-server.js
```

### "WebSocket connection failed"

**Check `.env` has:**
```env
VITE_WS_URL=ws://localhost:8080
```

**Rebuild:**
```bash
npm run dev
```

### Port 8080 already in use

**Kill the process:**
```bash
lsof -ti:8080 | xargs kill -9
```

**Or use a different port:**
```bash
PORT=8081 node websocket-server.js
```

Then update `.env`:
```env
VITE_WS_URL=ws://localhost:8081
```

---

## 🎯 Testing Challenges Locally

### Create a Challenge

```javascript
// In browser console
const ws = new WebSocket('ws://localhost:8080');

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'create-challenge',
    challengeId: 'test-123',
    word: 'TESTS',
    creatorId: 'dev-user',
    creatorName: 'Developer'
  }));
};

ws.onmessage = (e) => console.log('Response:', JSON.parse(e.data));
```

### Complete a Challenge

```javascript
ws.send(JSON.stringify({
  type: 'complete-challenge',
  challengeId: 'test-123',
  completerId: 'friend-1',
  completerName: 'Friend',
  won: true,
  guesses: 4
}));
```

### Get Challenge Stats

```javascript
ws.send(JSON.stringify({
  type: 'get-challenge-completions',
  challengeId: 'test-123'
}));
```

---

## 🔄 Switching Between Local and Val Town

### For Local Testing:
```env
VITE_WS_URL=ws://localhost:8080
```

### For Val Town:
```env
VITE_WS_URL=wss://[your-username]-wordleserver.web.val.run
```

**No rebuild needed for `.env` changes in dev mode!**

Just refresh your browser after changing `.env`.

---

## 📊 Compare Local vs Val Town

| Feature | Local | Val Town |
|---------|-------|----------|
| **Storage** | `local-db.json` | Blob storage |
| **Persistence** | File-based | Cloud-based |
| **Access** | localhost only | Public URL |
| **Speed** | Instant | ~50ms ping |
| **Debugging** | Easy (view file) | Easy (Blob tab) |
| **Testing** | Perfect! | Production |

---

## 🧪 Testing Workflow

### Day-to-Day Development:

1. **Use Local Server** (`ws://localhost:8080`)
   - Faster iteration
   - No network delays
   - Easy to debug
   - Can inspect `local-db.json`

2. **Test Locally** with two browser tabs

3. **Check Database** (`cat local-db.json`)

4. **Deploy to Val Town** when ready

5. **Test Production** with real devices

---

## 🎯 What to Test Locally

### Multiplayer:
- ✅ Room creation
- ✅ Room joining
- ✅ Player synchronization
- ✅ Voice chat (if using TURN)
- ✅ Disconnect handling

### Challenges:
- ✅ Create challenge
- ✅ Store in database
- ✅ Complete challenge
- ✅ Track completions
- ✅ View stats

### Edge Cases:
- ✅ Room full (3rd player)
- ✅ Room not found
- ✅ Disconnect during game
- ✅ Multiple challenges
- ✅ Database persistence (restart server)

---

## 📝 Example Test Session

```bash
# Terminal 1: Start WebSocket server
node websocket-server.js

# Terminal 2: Start dev server
npm run dev

# Browser 1: http://localhost:5173
# → Create multiplayer room

# Browser 2: http://localhost:5173
# → Join the room

# Check database
cat local-db.json

# View server logs
tail -f /tmp/ws-server.log

# Test completed! 🎉
```

---

## 🚀 Ready for Production?

When everything works locally:

1. **Deploy to Val Town** (see `VAL_TOWN_DEPLOYMENT.md`)
2. **Update `.env`** with Val Town URL
3. **Build**: `npm run build`
4. **Deploy** to GitHub Pages
5. **Test** with real devices

---

## 💡 Pro Tips

1. **Use two browsers** (Chrome + Firefox) for testing
2. **Check console logs** for errors
3. **Inspect `local-db.json`** to see data
4. **Tail server logs**: `tail -f /tmp/ws-server.log`
5. **Reset database**: Delete `local-db.json` to start fresh
6. **Test on mobile** using your local IP (e.g., `http://192.168.1.x:5173`)

---

## 🐛 Debug Mode

Enable verbose logging:

```bash
DEBUG=* node websocket-server.js
```

Or check specific events:
```javascript
// In browser console
const ws = new WebSocket('ws://localhost:8080');
ws.onopen = () => console.log('Connected!');
ws.onmessage = (e) => console.log('Message:', e.data);
ws.onerror = (e) => console.error('Error:', e);
ws.onclose = () => console.log('Closed!');
```

---

## ✅ Summary

- ✅ Local WebSocket server matches Val Town
- ✅ Stores data in `local-db.json`
- ✅ Supports multiplayer + challenges
- ✅ Easy to test and debug
- ✅ Switch to Val Town anytime

**Happy testing!** 🎉

