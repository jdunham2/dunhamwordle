export interface SignalingMessage {
  type: 'create-room' | 'join-room' | 'get-room-status' | 'room-status' | 'offer' | 'answer' | 'ice-candidate' | 'room-full' | 'player-joined' | 'player-left' | 'error';
  roomId?: string;
  data?: any;
  playerCount?: number;
  isHost?: boolean;
}

export class SignalingService {
  private socket: WebSocket | null = null;
  private messageHandlers: Map<string, ((data: any) => void)[]> = new Map();
  private reconnectTimeout: NodeJS.Timeout | null = null;

  constructor(private wsUrl: string) {}

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // For development, use localhost. In production, use your WebSocket server URL
        const url = this.wsUrl || 'ws://localhost:8080';
        this.socket = new WebSocket(url);

        this.socket.onopen = () => {
          console.log('WebSocket connected');
          resolve();
        };

        this.socket.onmessage = (event) => {
          try {
            const message: SignalingMessage = JSON.parse(event.data);
            console.log('Signaling message received:', message);
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse signaling message:', error);
          }
        };

        this.socket.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };

        this.socket.onclose = () => {
          console.log('WebSocket closed');
          // Attempt to reconnect after 3 seconds
          this.reconnectTimeout = setTimeout(() => {
            console.log('Attempting to reconnect...');
            this.connect();
          }, 3000);
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  private handleMessage(message: SignalingMessage): void {
    const handlers = this.messageHandlers.get(message.type);
    if (handlers) {
      // Pass the entire message as data, since the server includes roomId and other fields at the top level
      handlers.forEach(handler => handler(message));
    }
  }

  on(event: string, handler: (data: any) => void): void {
    if (!this.messageHandlers.has(event)) {
      this.messageHandlers.set(event, []);
    }
    this.messageHandlers.get(event)?.push(handler);
  }

  off(event: string, handler: (data: any) => void): void {
    const handlers = this.messageHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  send(message: SignalingMessage): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    } else {
      console.error('WebSocket not connected');
    }
  }

  createRoom(): void {
    this.send({ type: 'create-room' });
  }

  joinRoom(roomId: string): void {
    this.send({ type: 'join-room', roomId });
  }

  sendOffer(offer: RTCSessionDescriptionInit, roomId: string): void {
    this.send({ type: 'offer', roomId, data: offer });
  }

  sendAnswer(answer: RTCSessionDescriptionInit, roomId: string): void {
    this.send({ type: 'answer', roomId, data: answer });
  }

  sendICECandidate(candidate: RTCIceCandidateInit, roomId: string): void {
    this.send({ type: 'ice-candidate', roomId, data: candidate });
  }

  getRoomStatus(roomId: string): void {
    this.send({ type: 'get-room-status', roomId });
  }

  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}
