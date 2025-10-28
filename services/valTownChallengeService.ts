/**
 * Val Town Challenge Service
 * 
 * Uses Val Town's WebSocket server + SQLite database for async challenges
 * No Firebase needed!
 */

export interface ValTownChallenge {
  challengeId: string;
  creatorId: string;
  creatorName: string;
  word: string;
  createdAt: number;
}

export interface ValTownCompletion {
  completerName: string;
  won: boolean;
  guesses: number;
  completedAt: number;
}

class ValTownChallengeService {
  private ws: WebSocket | null = null;
  private wsUrl: string;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private messageHandlers: Map<string, ((data: any) => void)[]> = new Map();

  constructor() {
    this.wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8080';
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      try {
        this.ws = new WebSocket(this.wsUrl);

        this.ws.onopen = () => {
          console.log('[ValTown] Connected to challenge server');
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('[ValTown] Failed to parse message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('[ValTown] WebSocket error:', error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('[ValTown] Connection closed');
          this.ws = null;
          
          // Auto-reconnect after 3 seconds
          this.reconnectTimeout = setTimeout(() => {
            console.log('[ValTown] Attempting to reconnect...');
            this.connect();
          }, 3000);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private handleMessage(message: any) {
    const handlers = this.messageHandlers.get(message.type);
    if (handlers) {
      handlers.forEach(handler => handler(message));
    }
  }

  on(type: string, handler: (data: any) => void) {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, []);
    }
    this.messageHandlers.get(type)!.push(handler);
  }

  off(type: string, handler: (data: any) => void) {
    const handlers = this.messageHandlers.get(type);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  private send(message: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('[ValTown] WebSocket not connected, cannot send message');
    }
  }

  /**
   * Create a new challenge and store it in Val Town's database
   */
  async createChallenge(challenge: {
    challengeId: string;
    word: string;
    creatorId: string;
    creatorName: string;
  }): Promise<boolean> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      await this.connect();
    }

    return new Promise((resolve) => {
      const handler = (data: any) => {
        if (data.challengeId === challenge.challengeId) {
          this.off('challenge-created', handler);
          resolve(true);
        }
      };

      this.on('challenge-created', handler);

      this.send({
        type: 'create-challenge',
        ...challenge,
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        this.off('challenge-created', handler);
        resolve(false);
      }, 5000);
    });
  }

  /**
   * Record a challenge completion
   */
  async completeChallenge(completion: {
    challengeId: string;
    completerId: string;
    completerName: string;
    won: boolean;
    guesses: number;
  }): Promise<boolean> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      await this.connect();
    }

    this.send({
      type: 'complete-challenge',
      ...completion,
    });

    return true;
  }

  /**
   * Get all completions for a challenge
   */
  async getChallengeCompletions(challengeId: string): Promise<ValTownCompletion[]> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      await this.connect();
    }

    return new Promise((resolve) => {
      const handler = (data: any) => {
        if (data.challengeId === challengeId) {
          this.off('challenge-completions', handler);
          resolve(data.completions || []);
        }
      };

      this.on('challenge-completions', handler);

      this.send({
        type: 'get-challenge-completions',
        challengeId,
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        this.off('challenge-completions', handler);
        resolve([]);
      }, 5000);
    });
  }

  /**
   * Listen for notifications when someone completes YOUR challenges
   */
  onChallengeCompleted(callback: (data: {
    challengeId: string;
    completerName: string;
    won: boolean;
    guesses: number;
  }) => void): () => void {
    this.on('challenge-completed', callback);
    
    // Return unsubscribe function
    return () => {
      this.off('challenge-completed', callback);
    };
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.messageHandlers.clear();
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

export const valTownChallengeService = new ValTownChallengeService();

