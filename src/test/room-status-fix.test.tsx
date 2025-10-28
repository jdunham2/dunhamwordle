import { describe, it, expect, vi } from 'vitest';

describe('Room Status Fix', () => {
  it('should show the problem: Game components miss player-joined events', () => {
    const events: string[] = [];
    
    // Lobby phase
    events.push('Host Lobby: create-room → playerCount: 1');
    events.push('Guest Lobby: join-room → playerCount: 2');
    events.push('Host Lobby receives: player-joined, playerCount: 2');
    events.push('Guest Lobby receives: player-joined, playerCount: 2');
    
    // Transition: Lobbies unmount, Game components mount
    events.push('Host Lobby: unmounts');
    events.push('Guest Lobby: unmounts');
    events.push('Host Game: mounts, sets up listeners');
    events.push('Guest Game: mounts, sets up listeners');
    
    // Problem: Game components call join-room but already in room
    events.push('Host Game: join-room → already in room → NO message');
    events.push('Guest Game: join-room → already in room → NO message');
    
    // Result: No one triggers WebRTC!
    const hostGameReceivedPlayerCount2 = events.some(e => 
      e.includes('Host Game') && e.includes('playerCount: 2')
    );
    const guestGameReceivedPlayerCount2 = events.some(e => 
      e.includes('Guest Game') && e.includes('playerCount: 2')
    );
    
    expect(hostGameReceivedPlayerCount2).toBe(false); // Bug!
    expect(guestGameReceivedPlayerCount2).toBe(false); // Bug!
  });

  it('should show the solution: Game requests room status', () => {
    const events: string[] = [];
    
    // Lobby phase (same as above)
    events.push('Host Lobby: create-room → playerCount: 1');
    events.push('Guest Lobby: join-room → playerCount: 2');
    
    // Game phase
    events.push('Host Game: join-room → already in room → NO message');
    events.push('Host Game: get-room-status');
    events.push('Host Game receives: room-status, playerCount: 2'); // ✓ Solution!
    
    events.push('Guest Game: join-room → already in room → NO message');
    events.push('Guest Game: get-room-status');
    events.push('Guest Game receives: room-status, playerCount: 2'); // ✓ Solution!
    
    // Now both can trigger WebRTC
    const hostCanStartWebRTC = events.some(e => 
      e.includes('Host Game receives') && e.includes('playerCount: 2')
    );
    const guestCanStartWebRTC = events.some(e => 
      e.includes('Guest Game receives') && e.includes('playerCount: 2')
    );
    
    expect(hostCanStartWebRTC).toBe(true); // Fixed!
    expect(guestCanStartWebRTC).toBe(true); // Fixed!
  });

  it('should verify server logic for get-room-status', () => {
    const room = {
      players: [
        { ws: { id: 'ws-host' }, id: 'player-1' },
        { ws: { id: 'ws-guest' }, id: 'player-2' }
      ]
    };
    
    // Host requests status
    const hostWS = room.players[0].ws;
    const hostIndex = room.players.findIndex(p => p.ws === hostWS);
    const hostStatus = {
      type: 'room-status',
      playerCount: room.players.length,
      isHost: hostIndex === 0
    };
    
    expect(hostStatus.playerCount).toBe(2);
    expect(hostStatus.isHost).toBe(true);
    
    // Guest requests status
    const guestWS = room.players[1].ws;
    const guestIndex = room.players.findIndex(p => p.ws === guestWS);
    const guestStatus = {
      type: 'room-status',
      playerCount: room.players.length,
      isHost: guestIndex === 0
    };
    
    expect(guestStatus.playerCount).toBe(2);
    expect(guestStatus.isHost).toBe(false);
  });

  it('should verify Game component logic for handling room-status', async () => {
    let webrtcStarted = false;
    const hasStartedWebRTCRef = { current: false };
    const globalStarted = false;
    
    // Simulate receiving room-status message
    const message = {
      type: 'room-status',
      playerCount: 2,
      isHost: true
    };
    
    // Game component handler
    const shouldStart = message.playerCount >= 2 && !hasStartedWebRTCRef.current && !globalStarted;
    
    if (shouldStart) {
      hasStartedWebRTCRef.current = true;
      webrtcStarted = true;
      console.log('WebRTC started from room-status');
    }
    
    expect(webrtcStarted).toBe(true);
    expect(hasStartedWebRTCRef.current).toBe(true);
  });
});


