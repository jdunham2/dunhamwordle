# Render Deployment Guide

This guide explains how to deploy the Dunham Wordle multiplayer game to Render.

## Prerequisites

- A Render account (free tier works fine)
- This repository pushed to GitHub

## Part 1: Deploy the WebSocket Server

1. **Create a New Web Service on Render**
   - Go to https://render.com/
   - Click "New +" → "Web Service"
   - Connect your GitHub repository

2. **Configure the Web Service**
   - **Name**: `dunhamwordle-ws-server` (or your preferred name)
   - **Region**: Choose closest to your users
   - **Branch**: `main`
   - **Root Directory**: Leave blank
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node websocket-server.js`

3. **Environment Variables**
   - No environment variables needed for the WebSocket server
   - Render automatically provides the `PORT` variable

4. **Deploy**
   - Click "Create Web Service"
   - Wait for the deployment to complete
   - Note the URL: `https://dunhamwordle-ws-server.onrender.com`

## Part 2: Deploy the Frontend

Option A: **GitHub Pages** (Recommended)

1. **Update WebSocket URL**
   - In your GitHub repository settings, go to "Secrets and variables" → "Actions"
   - Add a new secret: `VITE_WS_URL` with value `wss://your-ws-server.onrender.com`
   - Update your build workflow to use this environment variable

2. **Build with Environment Variable**
   ```bash
   VITE_WS_URL=wss://your-ws-server.onrender.com npm run build
   ```

3. **Deploy to GitHub Pages**
   - Push the built `docs` folder
   - Enable GitHub Pages in repository settings

Option B: **Deploy Frontend to Render**

1. **Create Another Web Service**
   - Follow same steps as WebSocket server
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run preview` or use a static server
   - **Environment Variables**: 
     - `VITE_WS_URL`: `wss://your-ws-server.onrender.com`

## Important Notes

### WebSocket URL Format

- **Development**: `ws://localhost:8080`
- **Production**: `wss://your-server.onrender.com` (note the `wss://` for secure WebSocket)

### Render Free Tier Limitations

- Services spin down after 15 minutes of inactivity
- First connection may take 30-60 seconds to wake up
- Consider upgrading to a paid plan for production use

### CORS and Security

The WebSocket server accepts all connections by default. For production, consider:
- Adding origin validation
- Rate limiting
- Authentication tokens

## Testing Your Deployment

1. Visit your deployed frontend URL
2. Create a multiplayer room
3. Open another browser/device
4. Join the room using the room code
5. Test voice chat and gameplay

## Troubleshooting

### "WebSocket connection failed"
- Check that VITE_WS_URL is set correctly
- Verify the WebSocket server is running on Render
- Check browser console for exact error

### "Room not found"
- Render free tier may spin down - wait 30 seconds and try again
- Check server logs on Render dashboard

### Voice chat not working
- Ensure microphone permissions are granted
- Check browser console for errors
- Some browsers block getUserMedia on non-HTTPS sites

## Environment Variables Summary

### Frontend (.env or build environment)
```
VITE_WS_URL=wss://your-ws-server.onrender.com
```

### Backend (Render handles automatically)
```
PORT=<automatically set by Render>
```

## Alternative: Self-Hosted

You can also host both frontend and backend on your own server:

```bash
# Start WebSocket server
PORT=8080 node websocket-server.js

# Build frontend with custom WS URL
VITE_WS_URL=wss://your-domain.com npm run build

# Serve frontend
npx serve docs
```

## Support

For issues with:
- Render deployment: Check Render documentation
- WebSocket connection: Verify URL format and server status
- Voice chat: Check browser compatibility and permissions

