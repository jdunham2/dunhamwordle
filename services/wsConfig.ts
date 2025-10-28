// WebSocket server configuration
// For local development: ws://localhost:8080
// For production: Set VITE_WS_URL environment variable

export const getWebSocketUrl = (): string => {
  // Use environment variable if provided
  const envWsUrl = import.meta.env.VITE_WS_URL;
  if (envWsUrl) {
    console.log('[wsConfig] Using WebSocket URL from environment:', envWsUrl);
    return envWsUrl;
  }
  
  // Check if we're in production mode
  const isProduction = import.meta.env.PROD;
  
  if (isProduction) {
    // For production, you should set VITE_WS_URL environment variable
    // Render URL format: 'wss://your-app-name.onrender.com'
    // Railway URL format: 'wss://your-app-name.up.railway.app'
    // 
    // Note: Use wss:// (secure WebSocket) for HTTPS sites like GitHub Pages
    console.warn('[wsConfig] Production mode but VITE_WS_URL not set. WebSocket connection will fail.');
    return 'wss://your-server-url.onrender.com'; // Placeholder
  }
  
  // Development URL (localhost)
  return 'ws://localhost:8080';
};

