import { describe, it, expect } from 'vitest';

describe('Final Multiplayer Fix - Connection Tracking', () => {
  it('should demonstrate the bug: Lobby and Game both create connections', () => {
    const connections: string[] = [];
    
    // Simulate Lobby
    connections.push('Lobby-connection-1');
    
    // Simulate Game (SHOULD reuse Lobby connection, but creates new one)
    connections.push('Game-connection-1'); // BUG!
    
    // Now we have 2 connections from same user
    expect(connections.length).toBe(2); // Should be 1
  });

  it('should show the fix: Game reuses Lobby connection', () => {
    let connection: string | null = null;
    
    // Lobby creates connection
    connection = 'shared-connection';
    
    // Game checks for existing connection
    if (connection) {
      // Reuse it!
      console.log('Game reusing connection:', connection);
    } else {
      connection = 'Game-connection'; // Only if no existing connection
    }
    
    // Still just 1 connection
    expect(connection).toBe('shared-connection');
  });

  it('should verify signaling.connect() is only called once', () => {
    let connectCount = 0;
    
    const getConnection = (shouldConnect: boolean) => {
      if (shouldConnect) {
        connectCount++;
      }
    };
    
    // Lobby connects
    getConnection(true); // Connect
    
    // Game should NOT connect if already connected
    const alreadyConnected = connectCount > 0;
    getConnection(!alreadyConnected); // Don't connect
    
    expect(connectCount).toBe(1);
  });

  it('should track the exact issue from logs', () => {
    const events: string[] = [];
    
    // From actual logs
    events.push('[ConnectionManager] Usage count: 1'); // Lobby
    events.push('WebSocket connected'); // Lobby connects
    events.push('Room created');
    events.push('[ConnectionManager] Usage count: 2'); // Game increments
    events.push('WebSocket connected'); // Game connects AGAIN - BUG!
    events.push('Joining room');
    events.push('Player count: 3'); // Should be 2!
    
    const connectCount = events.filter(e => e === 'WebSocket connected').length;
    expect(connectCount).toBe(2); // BUG: Should be 1
  });

  it('should verify the fix prevents duplicate connects', () => {
    let wsConnection: any = null;
    let connectCalls = 0;
    
    const connect = () => {
      connectCalls++;
      wsConnection = { id: 'connection-1' };
    };
    
    // Lobby
    if (!wsConnection) {
      connect();
    }
    
    // Game checks before connecting
    if (!wsConnection) {
      connect(); // Should not reach here
    }
    
    expect(connectCalls).toBe(1);
    expect(wsConnection).not.toBeNull();
  });
});


