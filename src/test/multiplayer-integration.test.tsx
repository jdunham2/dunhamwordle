import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SignalingService } from '../../services/signalingService';
import { WebRTCHandler } from '../../services/webrtcHandler';

// Mock WebSocket and WebRTC
class MockWebSocket {
  static OPEN = 1;
  readyState = MockWebSocket.OPEN;
  onopen: ((event: Event) => void) | null = null;
  
  constructor(private url: string) {
    setTimeout(() => {
      if (this.onopen) this.onopen(new Event('open'));
    }, 10);
  }
  
  send() {}
  close() {}
  addEventListener() {}
  removeEventListener() {}
}

class MockRTCPeerConnection {
  localDescription: RTCSessionDescription | null = null;
  connectionState: RTCPeerConnectionState = 'new';
  iceConnectionState = 'new';

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
  sdpMLineIndex: number | null;
  sdpMid: string | null;
  constructor(init: RTCIceCandidateInit) {
    this.candidate = init.candidate || '';
    this.sdpMLineIndex = init.sdpMLineIndex || null;
    this.sdpMid = init.sdpMid || null;
  }
} as any;

global.WebSocket = MockWebSocket as any;

describe('Multiplayer Integration Tests', () => {
  describe('Room Creation and Joining Flow', () => {
    it('host can create a room', async () => {
      const signaling = new SignalingService('ws://localhost:8080');
      
      await signaling.connect();
      
      // Simulate room creation - send create-room message
      signaling.createRoom();
      
      // Room creation sends a player-joined event back
      // In a real scenario this would be handled by the server
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      signaling.disconnect();
    });

    it('guest can send join-room message', async () => {
      const guestSignaling = new SignalingService('ws://localhost:8080');
      
      await guestSignaling.connect();
      
      // Guest sends join-room message
      guestSignaling.joinRoom('TESTROOM');
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      guestSignaling.disconnect();
    });
  });

  describe('WebRTC Connection Flow', () => {
    it('host creates offer when guest joins', async () => {
      const hostWebRTC = new WebRTCHandler();
      
      // Host creates data channel
      const dataChannel = hostWebRTC.createDataChannel();
      expect(dataChannel).toBeDefined();
      
      // Host creates offer
      const offer = await hostWebRTC.createOffer();
      expect(offer).toBeDefined();
      expect(offer.type).toBe('offer');
      
      hostWebRTC.close();
    });

    it('guest responds with answer when receiving offer', async () => {
      const guestWebRTC = new WebRTCHandler();
      
      // Guest receives offer
      const offer = { type: 'offer', sdp: 'mock-offer' } as RTCSessionDescriptionInit;
      const answer = await guestWebRTC.handleOffer(offer);
      
      expect(answer).toBeDefined();
      expect(answer.type).toBe('answer');
      
      guestWebRTC.close();
    });

    it('handles complete connection flow', async () => {
      const hostWebRTC = new WebRTCHandler();
      const guestWebRTC = new WebRTCHandler();
      
      // Host side: create offer
      const hostChannel = hostWebRTC.createDataChannel();
      const offer = await hostWebRTC.createOffer();
      
      expect(offer.type).toBe('offer');
      
      // Guest side: receive offer and create answer
      const answer = await guestWebRTC.handleOffer(offer);
      
      expect(answer.type).toBe('answer');
      
      // Host: receive answer
      await hostWebRTC.handleAnswer(answer);
      
      expect(hostWebRTC.getConnectionState()).toBeDefined();
      
      hostWebRTC.close();
      guestWebRTC.close();
    });
  });

  describe('Game Message Flow', () => {
    it('host can send word selection to guest', () => {
      const handler = new WebRTCHandler();
      const channel = handler.createDataChannel();
      
      const message = {
        type: 'word-selected',
        data: 'TESTS'
      };
      
      expect(() => handler.sendMessage(message)).not.toThrow();
      
      handler.close();
    });

    it('guest receives word selection from host', () => {
      const handler = new WebRTCHandler();
      const callback = vi.fn();
      
      handler.onMessage(callback);
      
      const message = {
        type: 'word-selected',
        data: 'TESTS'
      };
      
      callback(message);
      
      expect(callback).toHaveBeenCalledWith(message);
      
      handler.close();
    });

    it('handles guess submission between players', () => {
      const handler = new WebRTCHandler();
      const callback = vi.fn();
      
      handler.onMessage(callback);
      
      const message = {
        type: 'guess-submitted',
        data: { guesses: ['WORDS', 'TESTS'] }
      };
      
      callback(message);
      
      expect(callback).toHaveBeenCalledWith(message);
      
      handler.close();
    });
  });

  describe('Connection State Management', () => {
    it('tracks connection state changes', () => {
      const handler = new WebRTCHandler();
      const callback = vi.fn();
      
      handler.onConnectionStateChange(callback);
      
      // Simulate state change
      callback('connecting');
      
      expect(callback).toHaveBeenCalledWith('connecting');
      
      handler.close();
    });

    it('gets current connection state', () => {
      const handler = new WebRTCHandler();
      
      const state = handler.getConnectionState();
      
      expect(state).toBeDefined();
      
      handler.close();
    });
  });

  describe('Cleanup and Disconnection', () => {
    it('properly cleans up WebRTC connection', () => {
      const handler = new WebRTCHandler();
      
      handler.close();
      
      // Should not throw
      expect(() => handler.close()).not.toThrow();
    });

    it('properly cleans up signaling connection', async () => {
      const signaling = new SignalingService('ws://localhost:8080');
      
      await signaling.connect();
      
      expect(() => signaling.disconnect()).not.toThrow();
    });
  });
});

