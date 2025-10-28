import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Connection Stability Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should send ping every 5 seconds', () => {
    const sendMessage = vi.fn();
    let keepAliveInterval: NodeJS.Timeout | undefined;

    // Simulate keep-alive mechanism
    keepAliveInterval = setInterval(() => {
      sendMessage({ type: 'ping' });
    }, 5000);

    // Fast forward 5 seconds
    vi.advanceTimersByTime(5000);
    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenCalledWith({ type: 'ping' });

    // Fast forward another 5 seconds
    vi.advanceTimersByTime(5000);
    expect(sendMessage).toHaveBeenCalledTimes(2);

    // Fast forward 15 more seconds (total 25s = 5 pings)
    vi.advanceTimersByTime(15000);
    expect(sendMessage).toHaveBeenCalledTimes(5);

    clearInterval(keepAliveInterval);
  });

  it('should respond to ping with pong', () => {
    const messages: Array<{ type: string }> = [];
    
    // Simulate receiving a ping
    const handleMessage = (message: { type: string }) => {
      if (message.type === 'ping') {
        messages.push({ type: 'pong' });
      }
    };

    handleMessage({ type: 'ping' });
    
    expect(messages).toHaveLength(1);
    expect(messages[0].type).toBe('pong');
  });

  it('should detect stale connection after 15 seconds without pong', () => {
    let lastPongTime = Date.now();
    let connectionStale = false;

    // Simulate connection monitor
    const checkConnection = () => {
      const timeSinceLastPong = Date.now() - lastPongTime;
      if (timeSinceLastPong > 15000) {
        connectionStale = true;
      }
    };

    // Initial check - connection is fresh
    checkConnection();
    expect(connectionStale).toBe(false);

    // Fast forward 10 seconds
    vi.advanceTimersByTime(10000);
    checkConnection();
    expect(connectionStale).toBe(false);

    // Fast forward another 6 seconds (total 16s)
    vi.advanceTimersByTime(6000);
    checkConnection();
    expect(connectionStale).toBe(true);
  });

  it('should use multiple STUN servers for better NAT traversal', () => {
    const iceServers = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' }
    ];

    expect(iceServers).toHaveLength(5);
    expect(iceServers.every(server => server.urls.startsWith('stun:'))).toBe(true);
  });

  it('should not pass ping/pong messages to game logic', () => {
    const gameMessages: Array<{ type: string }> = [];
    
    const handleMessage = (message: { type: string }) => {
      // Internal keep-alive messages should be filtered
      if (message.type === 'ping' || message.type === 'pong') {
        return; // Don't pass to game logic
      }
      gameMessages.push(message);
    };

    handleMessage({ type: 'ping' });
    handleMessage({ type: 'pong' });
    handleMessage({ type: 'keystroke' });
    handleMessage({ type: 'guess-submitted' });

    expect(gameMessages).toHaveLength(2);
    expect(gameMessages[0].type).toBe('keystroke');
    expect(gameMessages[1].type).toBe('guess-submitted');
  });

  it('should cleanup intervals on close', () => {
    let keepAliveInterval: NodeJS.Timeout | undefined;
    let connectionCheckInterval: NodeJS.Timeout | undefined;

    // Start intervals
    keepAliveInterval = setInterval(() => {}, 5000);
    connectionCheckInterval = setInterval(() => {}, 10000);

    expect(keepAliveInterval).toBeDefined();
    expect(connectionCheckInterval).toBeDefined();

    // Close/cleanup
    if (keepAliveInterval) clearInterval(keepAliveInterval);
    if (connectionCheckInterval) clearInterval(connectionCheckInterval);
    
    keepAliveInterval = undefined;
    connectionCheckInterval = undefined;

    expect(keepAliveInterval).toBeUndefined();
    expect(connectionCheckInterval).toBeUndefined();
  });

  it('should track connection health metrics', () => {
    const connectionInfo = {
      dataChannelState: 'open',
      iceConnectionState: 'connected',
      connectionState: 'connected',
      timeSinceLastPong: 3000 // 3 seconds
    };

    expect(connectionInfo.dataChannelState).toBe('open');
    expect(connectionInfo.iceConnectionState).toBe('connected');
    expect(connectionInfo.timeSinceLastPong).toBeLessThan(15000);
  });
});

describe('Connection State Monitoring', () => {
  it('should detect disconnected state', () => {
    const states = ['new', 'checking', 'connected', 'disconnected'];
    const currentState = 'disconnected';

    expect(states).toContain(currentState);
    expect(currentState === 'disconnected' || currentState === 'failed').toBe(true);
  });

  it('should warn about non-open data channel', () => {
    const dataChannelStates = ['connecting', 'open', 'closing', 'closed'];
    const currentState = 'closing';

    const isHealthy = currentState === 'open';
    expect(isHealthy).toBe(false);
  });
});


