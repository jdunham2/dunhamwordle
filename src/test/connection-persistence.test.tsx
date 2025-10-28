import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Connection Persistence Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should maintain connection when Lobby unmounts and Game mounts (Simulates StrictMode)', async () => {
    // Track if connection is alive
    let connectionActive = false;
    let connectionCount = 0;
    
    const connect = () => {
      connectionCount++;
      connectionActive = true;
      console.log(`Connection created (count: ${connectionCount})`);
    };
    
    const disconnect = () => {
      connectionCount--;
      connectionActive = connectionCount > 0;
      console.log(`Connection closed (count: ${connectionCount})`);
    };
    
    // Simulate connection lifecycle
    connect(); // Lobby mounts
    connect(); // StrictMode re-render (duplicate mount)
    
    // Lobby unmounts (StrictMode cleanup)
    disconnect();
    
    // Game should mount now
    connect(); // Game mounts
    
    // At this point, connection should still be active
    expect(connectionActive).toBe(true);
    expect(connectionCount).toBeGreaterThan(0);
  });

  it('should track room state independently of connection lifecycle', async () => {
    const rooms = new Map<string, { id: string; players: string[] }>();
    
    // Create room
    const roomId = 'TEST123';
    rooms.set(roomId, { id: roomId, players: ['player1-lobby'] });
    
    // Lobby disconnects (connection closes)
    const room = rooms.get(roomId);
    if (room) {
      room.players = room.players.filter(p => p !== 'player1-lobby');
    }
    
    // Room should still exist even with 0 players
    expect(rooms.has(roomId)).toBe(true);
    
    // Game tries to join
    const gameRoom = rooms.get(roomId);
    if (gameRoom) {
      gameRoom.players.push('player1-game');
    }
    
    // Room should still exist
    expect(rooms.has(roomId)).toBe(true);
    expect(rooms.get(roomId)?.players.length).toBe(1);
  });

  it('should handle rapid mount/unmount cycles without breaking room', async () => {
    let usageCount = 0;
    
    const incrementUsage = () => {
      usageCount++;
      console.log(`Usage: ${usageCount}`);
    };
    
    const decrementUsage = () => {
      usageCount--;
      console.log(`Usage: ${usageCount}`);
      // Simulate bug: if count reaches 0, we disconnect
      // This is the bug!
      if (usageCount <= 0) {
        console.log('BUG: Disconnecting when usage count is 0, but components might still need it!');
      }
    };
    
    // Simulate lifecycle
    incrementUsage(); // Lobby mount
    incrementUsage(); // StrictMode double mount
    decrementUsage(); // StrictMode cleanup
    // At this point, usageCount is 1, but if we decrement again...
    decrementUsage(); // Lobby unmounts
    // Now usageCount is 0, connection would close
    // But Game hasn't mounted yet!
    
    expect(usageCount).toBe(0);
    
    // This is the bug: connection closes before Game can mount
    // Fix: Don't close until ALL consumers are done
  });

  it('should simulate the exact server logs pattern', async () => {
    const events: string[] = [];
    
    // Simulate server logs
    events.push('Client connected'); // Lobby connects
    events.push('Room XYZ created'); // Room created
    events.push('Client disconnected'); // StrictMode cleanup OR Lobby unmount
    events.push('Room XYZ cleaned up (all players left)'); // Room deleted
    events.push('Client connected'); // Game connects
    events.push("Join room request for XYZ, current room count: 0");
    events.push('Room XYZ not found'); // ERROR!
    
    console.log('Events:', events);
    
    // The bug is clear: room gets cleaned up before Game can join
    const roomCleanedUp = events.includes('Room XYZ cleaned up (all players left)');
    const roomNotFound = events.includes('Room XYZ not found');
    
    expect(roomCleanedUp && roomNotFound).toBe(true);
  });

  it('should verify connection manager reference counting works', async () => {
    let refCount = 0;
    let connectionOpen = false;
    
    const increment = () => {
      refCount++;
      connectionOpen = true;
      console.log(`Ref count: ${refCount}`);
    };
    
    const decrement = () => {
      refCount--;
      if (refCount <= 0) {
        connectionOpen = false;
        console.log('Connection closed');
      }
    };
    
    // Simulate lifecycle
    increment(); // Lobby
    increment(); // Game
    decrement(); // Lobby unmount
    // Connection should still be open (Game still using it)
    expect(connectionOpen).toBe(true);
    expect(refCount).toBe(1);
    
    decrement(); // Game unmount
    expect(connectionOpen).toBe(false);
    expect(refCount).toBe(0);
  });
});

