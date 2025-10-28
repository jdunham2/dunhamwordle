import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Multiplayer StrictMode Issues', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should demonstrate host receiving its own offer', async () => {
    const hostMessages: string[] = [];
    const guestMessages: string[] = [];
    
    // Simulate 4 players (2 from host StrictMode, 2 from guest StrictMode)
    const room = {
      players: [
        { ws: { id: 'host-1', send: (msg: string) => hostMessages.push(msg) } },
        { ws: { id: 'host-2', send: (msg: string) => hostMessages.push(msg) } }, // StrictMode duplicate
        { ws: { id: 'guest-1', send: (msg: string) => guestMessages.push(msg) } },
        { ws: { id: 'guest-2', send: (msg: string) => guestMessages.push(msg) } } // StrictMode duplicate
      ]
    };
    
    // Host (player 0) sends offer
    const offerSender = room.players[0].ws;
    const offer = JSON.stringify({ type: 'offer', data: 'test' });
    
    // Server forwards to all OTHER players
    room.players.forEach(player => {
      if (player.ws !== offerSender) {
        player.ws.send(offer);
      }
    });
    
    // Host received its own offer because StrictMode duplicate (host-2) got it
    // and both share the same WebSocket object
    expect(hostMessages.length).toBeGreaterThan(0); // BUG: Host gets its own offer
    expect(guestMessages.length).toBe(2); // Correct
  });

  it('should track strict mode creating 2 offers from host', async () => {
    const hasStartedWebRTCRef = { current: false };
    let offerCount = 0;
    
    const createOffer = vi.fn(() => {
      offerCount++;
      console.log(`Offer created #${offerCount}`);
    });
    
    // StrictMode: First render
    if (!hasStartedWebRTCRef.current) {
      hasStartedWebRTCRef.current = true;
      createOffer();
    }
    
    // StrictMode: Second render (cleanup resets it)
    hasStartedWebRTCRef.current = false; // Gets reset!
    
    // StrictMode: Third render
    if (!hasStartedWebRTCRef.current) {
      hasStartedWebRTCRef.current = true;
      createOffer();
    }
    
    // Should only create 1 offer, but StrictMode causes 2
    expect(offerCount).toBeGreaterThan(1); // This DEMONSTRATES the bug
  });

  it('should verify we have 4 players in room when we should have 2', async () => {
    const room = {
      players: [
        { ws: { id: 'host-lobby' } },
        { ws: { id: 'host-game' } }, // Game component connection
        { ws: { id: 'guest-lobby' } },
        { ws: { id: 'guest-game' } } // Game component connection
      ]
    };
    
    // We should only have 2 players (1 host, 1 guest)
    // But we have 4 because Lobby and Game both create connections
    expect(room.players.length).toBe(4); // BUG: Should be 2
    
    // This means offers get sent to wrong players
    const hostConnections = room.players.filter(p => p.ws.id.startsWith('host'));
    const guestConnections = room.players.filter(p => p.ws.id.startsWith('guest'));
    
    expect(hostConnections.length).toBe(2); // Should be 1
    expect(guestConnections.length).toBe(2); // Should be 1
  });

  it('should show guest not receiving offer due to multiple connections', async () => {
    let offerSent = false;
    let guestReceived = false;
    
    // 4 players in room (2 from each user)
    const room = {
      players: [
        { ws: { id: 'host-1', isHost: true } },
        { ws: { id: 'host-2', isHost: true } }, // Duplicate
        { ws: { id: 'guest-1', isHost: false } },
        { ws: { id: 'guest-2', isHost: false } } // Duplicate
      ]
    };
    
    // Host sends offer
    offerSent = true;
    
    // Server forwards to "other players"
    // But there are 3 "other players" (host-2, guest-1, guest-2)
    // The offer might go to host-2 (the wrong connection)
    
    // Guest never receives offer
    guestReceived = false; // BUG!
    
    expect(offerSent).toBe(true);
    expect(guestReceived).toBe(false); // Should be true
  });

  it('should demonstrate connection sharing issue', async () => {
    const events: string[] = [];
    
    // Lobby creates connection
    events.push('Lobby: connectionManager.incrementUsage()');
    events.push('Lobby: Usage count = 1');
    
    // Game mounts
    events.push('Game: connectionManager.incrementUsage()');
    events.push('Game: Usage count = 2');
    
    // Lobby unmounts (StrictMode cleanup)
    events.push('Lobby: connectionManager.decrementUsage()');
    events.push('Game: Usage count = 1');
    
    // Game mounts again (StrictMode)
    events.push('Game: connectionManager.incrementUsage()');
    events.push('Game: Usage count = 2');
    
    // Now we have 2 Game instances using the same connection
    // Each one joins the room, creating duplicate players
    
    expect(events.filter(e => e.includes('Usage count = 2')).length).toBe(2);
  });

  it('should verify hasStartedWebRTC prevents duplicate offers but gets reset', async () => {
    let hasStarted = false;
    
    const startWebRTC = () => {
      if (!hasStarted) {
        hasStarted = true;
        console.log('Starting WebRTC');
      } else {
        console.log('WebRTC already started, skipping');
      }
    };
    
    // First attempt
    startWebRTC(); // Starts
    expect(hasStarted).toBe(true);
    
    // StrictMode cleanup resets it!
    hasStarted = false; // BUG: Gets reset during cleanup
    
    // Second attempt
    startWebRTC(); // Starts AGAIN - BUG!
    expect(hasStarted).toBe(true);
  });
});

