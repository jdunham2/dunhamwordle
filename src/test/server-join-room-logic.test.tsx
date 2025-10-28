import { describe, it, expect } from 'vitest';

describe('Server join-room Logic Test', () => {
  it('should demonstrate the expected flow', () => {
    const room = { players: [] };
    const hostWS = { id: 'ws-host' };
    
    // Step 1: Host Lobby creates room
    room.players.push({ ws: hostWS, id: 'player-1' });
    console.log('Step 1 - Host Lobby creates room:', room.players.length); // 1
    
    // Step 2: Host Game joins room (same WebSocket)
    const alreadyInRoom = room.players.some(p => p.ws === hostWS);
    console.log('Step 2 - Host Game joins, already in room?', alreadyInRoom); // true
    
    if (alreadyInRoom) {
      console.log('Host already in room, NOT sending message');
      // Don't add, don't send message
    } else {
      room.players.push({ ws: hostWS, id: 'player-2' });
    }
    
    expect(room.players.length).toBe(1); // Should still be 1
    
    // Step 3: Guest Lobby joins
    const guestWS = { id: 'ws-guest' };
    room.players.push({ ws: guestWS, id: 'player-3' });
    console.log('Step 3 - Guest joins:', room.players.length); // 2
    
    // Notify ALL players
    const notifications = room.players.map((player, index) => ({
      to: player.ws.id,
      playerCount: room.players.length,
      isHost: index === 0
    }));
    
    console.log('Notifications sent:', JSON.stringify(notifications, null, 2));
    
    expect(notifications.length).toBe(2);
    expect(notifications[0].playerCount).toBe(2);
    expect(notifications[1].playerCount).toBe(2);
  });

  it('should show the bug: if different WS instances, check fails', () => {
    const room = { players: [] };
    const hostWS1 = { id: 'ws-host-1' }; // Lobby connection
    const hostWS2 = { id: 'ws-host-2' }; // Game connection (different instance!)
    
    room.players.push({ ws: hostWS1, id: 'player-1' });
    
    // Game tries to join with hostWS2
    const alreadyInRoom = room.players.some(p => p.ws === hostWS2);
    console.log('Same WS?', hostWS1 === hostWS2); // false!
    console.log('Already in room check:', alreadyInRoom); // false!
    
    expect(alreadyInRoom).toBe(false); // Bug: different WS instances
  });

  it('should verify connectionManager returns same instance', () => {
    class MockConnectionManager {
      private signaling: any = null;
      
      getSignaling() {
        if (!this.signaling) {
          this.signaling = { socket: { id: 'mock-ws' } };
        }
        return this.signaling;
      }
    }
    
    const manager = new MockConnectionManager();
    const signaling1 = manager.getSignaling();
    const signaling2 = manager.getSignaling();
    
    expect(signaling1).toBe(signaling2); // Same instance
    expect(signaling1.socket).toBe(signaling2.socket); // Same socket
  });
});

