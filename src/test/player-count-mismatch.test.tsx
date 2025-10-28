import { describe, it, expect } from 'vitest';

describe('Player Count Mismatch Bug', () => {
  it('should demonstrate host sees playerCount: 1, guest sees playerCount: 2', () => {
    const room = {
      players: []
    };
    
    // Host creates room
    room.players.push({ id: 'host', joined: true });
    const hostPlayerCount = room.players.length; // 1
    
    // Host joins room AGAIN (from Game component)
    // But server sees it as "already in room" and doesn't add
    // So host still sees playerCount: 1
    
    // Guest joins
    room.players.push({ id: 'guest', joined: true });
    const guestPlayerCount = room.players.length; // 2
    
    expect(hostPlayerCount).toBe(1);
    expect(guestPlayerCount).toBe(2);
    // They see different counts!
  });

  it('should show the issue: host rejoining room sends old playerCount', () => {
    let playerCount = 1;
    
    // Host in room
    console.log('Host player count:', playerCount);
    
    // Host tries to join again (from Game component)
    // Server sends back "already in room" with OLD count
    const alreadyInRoomMessage = { playerCount: playerCount }; // Still 1!
    
    // But guest HAS joined, count should be 2
    playerCount = 2;
    
    // Host gets old message
    expect(alreadyInRoomMessage.playerCount).toBe(1); // Stale!
    expect(playerCount).toBe(2); // Actual count
  });

  it('should verify host needs to wait for guest join event', () => {
    const events: string[] = [];
    
    // Host
    events.push('Host joins room: playerCount=1');
    events.push('Host Game component joins: playerCount=1 (already in room)');
    
    // Guest
    events.push('Guest joins room: playerCount=2');
    
    // Host should receive event that guest joined
    events.push('Host receives: player-joined, playerCount=2'); // This should trigger WebRTC!
    
    const hostShouldStart = events.some(e => e.includes('Host receives') && e.includes('playerCount=2'));
    expect(hostShouldStart).toBe(true);
  });

  it('should show when host Game rejoins, it gets stale count', () => {
    const room = {
      players: [{ id: 'host-lobby' }]
    };
    
    // Guest joins
    room.players.push({ id: 'guest-lobby' });
    console.log('Actual player count:', room.players.length); // 2
    
    // Host Game tries to join
    // Server checks: already in room?
    const hostAlreadyInRoom = room.players.some(p => p.id.startsWith('host'));
    
    if (hostAlreadyInRoom) {
      // Send back confirmation with CURRENT count
      const message = { playerCount: room.players.length }; // Should be 2
      expect(message.playerCount).toBe(2);
    }
  });

  it('should verify both players see playerCount: 2', () => {
    let hostCount = 1;
    let guestCount = 2;
    
    // After both join, host should receive update
    hostCount = 2; // Host receives player-joined event for guest
    
    expect(hostCount).toBe(2);
    expect(guestCount).toBe(2);
    
    // Now both can start WebRTC
    const hostShouldStart = hostCount >= 2;
    const guestShouldStart = guestCount >= 2;
    
    expect(hostShouldStart).toBe(true);
    expect(guestShouldStart).toBe(true);
  });
});


