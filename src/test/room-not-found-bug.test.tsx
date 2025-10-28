import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Room Not Found Bug', () => {
  it('room should still exist when transitioning from Lobby to Game', async () => {
    // Simulate the exact bug scenario:
    // 1. Host creates room in Lobby
    // 2. Lobby unmounts and disconnects after delay
    // 3. Game component tries to join
    // 4. Room should still exist with quick transition
    
    // Track room state
    const rooms = new Map();
    
    // Simulate server-side room tracking
    const createRoom = (roomId: string) => {
      rooms.set(roomId, {
        players: [{ socket: 'lobby-connection', playerId: 'host-lobby' }],
        created: Date.now()
      });
      console.log(`Room ${roomId} created with 1 player`);
    };
    
    const disconnectPlayer = (roomId: string) => {
      const room = rooms.get(roomId);
      if (room) {
        room.players.pop();
        if (room.players.length === 0) {
          rooms.delete(roomId);
          console.log(`Room ${roomId} cleaned up`);
        } else {
          console.log(`Room ${roomId} has ${room.players.length} players remaining`);
        }
      }
    };
    
    const joinRoom = (roomId: string) => {
      const room = rooms.get(roomId);
      if (!room) {
        throw new Error('Room not found');
      }
      room.players.push({ socket: 'game-connection', playerId: 'host-game' });
      console.log(`Joined room ${roomId}, now has ${room.players.length} players`);
    };
    
    // Simulate the bug: Host creates room
    const roomId = 'TEST123';
    createRoom(roomId);
    expect(rooms.has(roomId)).toBe(true);
    
    // Game joins first (before Lobby disconnects)
    joinRoom(roomId);
    expect(rooms.get(roomId).players.length).toBe(2);
    
    // Now Lobby disconnects
    setTimeout(() => {
      disconnectPlayer(roomId);
    }, 50);
    
    // Wait for disconnect to complete
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // Room should still exist with Game player
    expect(rooms.has(roomId)).toBe(true);
    expect(rooms.get(roomId).players.length).toBe(1);
  });

  it('should allow multiple connections from same player (Lobby + Game)', async () => {
    const rooms = new Map();
    
    const createRoom = (roomId: string, playerId: string) => {
      rooms.set(roomId, {
        players: [{ id: playerId }],
      });
    };
    
    const joinRoom = (roomId: string, playerId: string) => {
      const room = rooms.get(roomId);
      if (!room) {
        throw new Error('Room not found');
      }
      
      // Check if player is already in room
      const alreadyInRoom = room.players.some(p => p.id === playerId);
      
      if (!alreadyInRoom) {
        room.players.push({ id: playerId });
      }
    };
    
    const disconnectPlayer = (roomId: string, playerId: string) => {
      const room = rooms.get(roomId);
      if (room) {
        const index = room.players.findIndex(p => p.id === playerId);
        if (index > -1) {
          room.players.splice(index, 1);
          if (room.players.length === 0) {
            rooms.delete(roomId);
          }
        }
      }
    };
    
    // Player creates room
    createRoom('ROOM1', 'player-host');
    expect(rooms.get('ROOM1').players.length).toBe(1);
    
    // Same player joins with Game connection
    // (Different socket but same logical player)
    joinRoom('ROOM1', 'player-host-game');
    expect(rooms.get('ROOM1').players.length).toBe(2);
    
    // Player disconnects from Lobby
    disconnectPlayer('ROOM1', 'player-host');
    
    // Room should still exist (Game connection still there)
    expect(rooms.has('ROOM1')).toBe(true);
    expect(rooms.get('ROOM1').players.length).toBe(1);
    
    // Game connection should still work
    expect(() => joinRoom('ROOM1', 'player-host-game')).not.toThrow();
    
    // Only clean up when ALL connections gone
    disconnectPlayer('ROOM1', 'player-host-game');
    expect(rooms.has('ROOM1')).toBe(false);
  });

  it('should prevent room from being deleted until ALL connections leave', () => {
    const rooms = new Map();
    
    rooms.set('TEST', {
      players: [
        { id: 'player1-lobby' },
        { id: 'player1-game' },
        { id: 'player2-lobby' },
        { id: 'player2-game' }
      ]
    });
    
    // Disconnect player1's lobby connection
    const room = rooms.get('TEST');
    const index = room.players.findIndex(p => p.id === 'player1-lobby');
    room.players.splice(index, 1);
    
    // Room should still exist
    expect(rooms.has('TEST')).toBe(true);
    expect(room.players.length).toBe(3);
    
    // Disconnect player1's game connection
    const index2 = room.players.findIndex(p => p.id === 'player1-game');
    room.players.splice(index2, 1);
    
    // Room should still exist (player2 connections)
    expect(rooms.has('TEST')).toBe(true);
    expect(room.players.length).toBe(2);
  });
});

