// WebSocket server configuration
// For local development: ws://localhost:8080
// For production: Change this to your deployed WebSocket server URL

export const getWebSocketUrl = (): string => {
  // Check if we're in production (deployed to GitHub Pages)
  const isProduction = import.meta.env.PROD;
  
  if (isProduction) {
    // IMPORTANT: Replace this with your deployed WebSocket server URL from Render/Railway
    // Render URL format: 'wss://your-app-name.onrender.com'
    // Railway URL format: 'wss://your-app-name.up.railway.app'
    // 
    // Note: Use wss:// (secure WebSocket) for HTTPS sites like GitHub Pages
    return 'wss://your-server-url.onrender.com'; // TODO: Replace with your actual server URL
  }
  
  // Development URL (localhost)
  return 'ws://localhost:8080';
};

