import { SignalingService } from './signalingService';
import { getWebSocketUrl } from './wsConfig';

/**
 * Shared multiplayer connection manager
 * Ensures we only have ONE WebSocket connection per user
 */
class MultiplayerConnectionManager {
  private static instance: MultiplayerConnectionManager;
  private signaling: SignalingService | null = null;
  private connectionCount = 0;
  private keepAlive: boolean = false;

  private constructor() {}

  static getInstance(): MultiplayerConnectionManager {
    if (!MultiplayerConnectionManager.instance) {
      MultiplayerConnectionManager.instance = new MultiplayerConnectionManager();
    }
    return MultiplayerConnectionManager.instance;
  }

  setKeepAlive(value: boolean): void {
    this.keepAlive = value;
    console.log(`[ConnectionManager] Keep alive set to: ${value}`);
  }

  getSignaling(): SignalingService {
    if (!this.signaling) {
      this.signaling = new SignalingService(getWebSocketUrl());
      console.log('[ConnectionManager] Created new signaling connection');
    }
    return this.signaling;
  }

  incrementUsage(): void {
    this.connectionCount++;
    console.log(`[ConnectionManager] Usage count: ${this.connectionCount}`);
  }

  decrementUsage(): void {
    // Don't go below 0
    if (this.connectionCount > 0) {
      this.connectionCount--;
    }
    console.log(`[ConnectionManager] Usage count: ${this.connectionCount}`);
    
    // Only disconnect when no one is using it AND keepAlive is false
    if (this.connectionCount <= 0 && !this.keepAlive && this.signaling) {
      console.log('[ConnectionManager] No more users and keepAlive=false, disconnecting');
      this.signaling.disconnect();
      this.signaling = null;
      this.connectionCount = 0;
    } else if (this.keepAlive) {
      console.log('[ConnectionManager] Keep alive is true, not disconnecting');
    }
  }

  disconnect(): void {
    if (this.signaling) {
      this.signaling.disconnect();
      this.signaling = null;
    }
    this.connectionCount = 0;
    this.keepAlive = false;
  }
}

export const connectionManager = MultiplayerConnectionManager.getInstance();

