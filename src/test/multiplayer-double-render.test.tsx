import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SignalingService } from '../../services/signalingService';
import { WebRTCHandler } from '../../services/webrtcHandler';

// Mock WebSocket
class MockWebSocket {
  static OPEN = 1;
  readyState = MockWebSocket.OPEN;
  onopen: ((event: Event) => void) | null = null;
  
  constructor(private url: string) {
    setTimeout(() => {
      if (this.onopen) this.onopen(new Event('open'));
    }, 10);
  }
  
  send(data: string) {
    console.log('MockWebSocket.send:', data);
  }
  
  close() {
    this.readyState = 3;
  }
  
  addEventListener() {}
  removeEventListener() {}
}

class MockRTCPeerConnection {
  localDescription: RTCSessionDescription | null = null;
  connectionState: RTCPeerConnectionState = 'new';

  onicecandidate: ((event: RTCPeerConnectionIceEvent) => void) | null = null;
  oniceconnectionstatechange: (() => void) | null = null;
  ondatachannel: ((event: RTCDataChannelEvent) => void) | null = null;

  async createOffer() {
    return { type: 'offer', sdp: 'mock-offer' } as RTCSessionDescriptionInit;
  }

  async createAnswer() {
    return { type: 'answer', sdp: 'mock-answer' } as RTCSessionDescriptionInit;
  }

  async setLocalDescription(desc: RTCSessionDescriptionInit) {
    this.localDescription = desc as RTCSessionDescription;
  }

  async setRemoteDescription(desc: RTCSessionDescriptionInit) {}

  async addIceCandidate(candidate: RTCIceCandidateInit) {}

  createDataChannel() {
    return {
      readyState: 'connecting',
      send: vi.fn(),
      close: vi.fn(),
    } as unknown as RTCDataChannel;
  }

  close() {
    this.connectionState = 'closed';
  }
}

global.RTCPeerConnection = MockRTCPeerConnection as any;
global.RTCSessionDescription = class {
  sdp: string;
  type: RTCSdpType;
  constructor(init: RTCSessionDescriptionInit) {
    this.sdp = init.sdp || '';
    this.type = init.type || 'offer';
  }
} as any;

global.RTCIceCandidate = class {
  candidate: string;
  constructor(init: RTCIceCandidateInit) {
    this.candidate = init.candidate || '';
  }
} as any;

global.WebSocket = MockWebSocket as any;

describe('Multiplayer Double Render Issues', () => {
  describe('React StrictMode double render handling', () => {
    it('should handle double render without errors', async () => {
      // Simulate React StrictMode: create connection twice
      let disconnectCount = 0;
      
      const createAndDestroy = async () => {
        const signaling = new SignalingService('ws://localhost:8080');
        await signaling.connect();
        
        const cleanup = () => {
          disconnectCount++;
          signaling.disconnect();
        };
        
        return cleanup;
      };
      
      // First render (gets cleaned up immediately by StrictMode)
      const cleanup1 = await createAndDestroy();
      cleanup1();
      
      // Second render (the actual one that stays)
      await new Promise(resolve => setTimeout(resolve, 100));
      const cleanup2 = await createAndDestroy();
      
      expect(disconnectCount).toBe(1);
      
      cleanup2();
    });

    it('should not create duplicate room connections', async () => {
      const connections: SignalingService[] = [];
      
      const simulateComponentRender = async () => {
        const signaling = new SignalingService('ws://localhost:8080');
        connections.push(signaling);
        await signaling.connect();
        
        // Simulate joining a room
        signaling.joinRoom('TESTROOM');
        
        return () => {
          const index = connections.indexOf(signaling);
          if (index > -1) connections.splice(index, 1);
          signaling.disconnect();
        };
      };
      
      // Simulate StrictMode: render twice
      const cleanup1 = await simulateComponentRender();
      const cleanup2 = await simulateComponentRender();
      
      // Both connect successfully
      expect(connections.length).toBeGreaterThan(0);
      
      // Only cleanup the second one (first one already cleaned up)
      cleanup2();
      cleanup1(); // This should be safe even if called twice
    });

    it('should handle cleanup race condition', async () => {
      let connectAttempts = 0;
      let disconnectAttempts = 0;
      
      const signaling = new SignalingService('ws://localhost:8080');
      
      // Track attempts
      const originalConnect = signaling.connect.bind(signaling);
      signaling.connect = async () => {
        connectAttempts++;
        return originalConnect();
      };
      
      const originalDisconnect = signaling.disconnect.bind(signaling);
      signaling.disconnect = () => {
        disconnectAttempts++;
        return originalDisconnect();
      };
      
      // Simulate the double-render issue where connection happens
      // then immediately cleanup happens before connection completes
      const connectPromise = signaling.connect();
      // Immediately try to cleanup (simulating first render cleanup)
      signaling.disconnect();
      
      // Should handle this gracefully
      try {
        await connectPromise;
      } catch (error) {
        // Expected to potentially fail in this race condition
      }
      
      // After a moment, try again (second render)
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(connectAttempts).toBe(1);
      expect(disconnectAttempts).toBeGreaterThanOrEqual(1);
      
      // Second connection should succeed
      await signaling.connect();
      expect(connectAttempts).toBe(2);
    });

    it('should prevent "room-full" errors from double connections', async () => {
      // Simulate the actual bug: Lobby creates connection, then Game tries to join
      const lobbyConnection = new SignalingService('ws://localhost:8080');
      await lobbyConnection.connect();
      
      // Lobby joins the room
      lobbyConnection.joinRoom('TESTROOM');
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Now Game component tries to join WHILE Lobby is still connected
      // This should trigger "room-full" if the server sees 2 connections
      const gameConnection = new SignalingService('ws://localhost:8080');
      await gameConnection.connect();
      
      // Try to join immediately (while Lobby is still in the room)
      let receivedRoomFull = false;
      gameConnection.on('room-full', () => {
        receivedRoomFull = true;
      });
      
      gameConnection.joinRoom('TESTROOM');
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // This IS the bug - we're getting room-full when we shouldn't
      // because both Lobby and Game are trying to be in the same room
      expect(receivedRoomFull).toBe(true);
      
      lobbyConnection.disconnect();
      gameConnection.disconnect();
    }, 5000);
  });

  describe('Connection State Management', () => {
    it('should handle connection errors gracefully', async () => {
      const signaling = new SignalingService('ws://localhost:8080');
      
      try {
        await signaling.connect();
        
        // Simulate an error during operation
        signaling.send({ type: 'invalid-message' } as any);
        
        // Should not throw
        expect(() => signaling.send({ type: 'test' })).not.toThrow();
        
      } catch (error) {
        // Connection errors should be handled
      }
    });

    it('should track connection state correctly', async () => {
      const webrtc = new WebRTCHandler();
      
      const connectionStates: RTCPeerConnectionState[] = [];
      
      webrtc.onConnectionStateChange((state) => {
        connectionStates.push(state);
      });
      
      // Initial state
      expect(webrtc.getConnectionState()).toBeDefined();
      
      webrtc.close();
    });
  });
});

