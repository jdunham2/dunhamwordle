export interface GameMessage {
  type: 'word-selected' | 'guess-submitted' | 'game-over' | 'sync-state' | 'player-ready' | 'keystroke' | 'chat-message' | 'typing-indicator' | 'ping' | 'pong';
  data?: any;
  from?: string; // Player name for chat messages
  timestamp?: number; // For chat messages
}

export class WebRTCHandler {
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private onMessageCallback?: (message: GameMessage) => void;
  private onConnectionStateChangeCallback?: (state: RTCPeerConnectionState) => void;
  private onRemoteStreamCallback?: (stream: MediaStream) => void;

  private iceCandidateCallback?: (candidate: RTCIceCandidateInit) => void;
  private keepAliveInterval?: NodeJS.Timeout;
  private lastPongTime: number = Date.now();
  private connectionCheckInterval?: NodeJS.Timeout;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;

  constructor() {
    // TURN credentials from environment or defaults
    const turnUsername = import.meta.env.VITE_TURN_USERNAME || '000000002076975744';
    const turnPassword = import.meta.env.VITE_TURN_PASSWORD || 'rOnkKAOHY+v33zFalCzbKCxe3as=';
    const turnServer = import.meta.env.VITE_TURN_SERVER || 'relay1.expressturn.com:3478';

    // Enhanced STUN/TURN servers for better NAT traversal
    const iceServers = [
      // Google STUN servers (free, public)
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      
      // ExpressTURN servers (for NAT traversal)
      {
        urls: `turn:${turnServer}`,
        username: turnUsername,
        credential: turnPassword
      },
      {
        urls: `turns:${turnServer}`,
        username: turnUsername,
        credential: turnPassword
      }
    ];

    console.log('[WebRTC] Initializing with TURN server:', turnServer);

    this.peerConnection = new RTCPeerConnection({ 
      iceServers,
      iceCandidatePoolSize: 10 // Pre-gather more candidates
    });

    this.peerConnection.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', this.peerConnection?.iceConnectionState);
      if (this.peerConnection && this.onConnectionStateChangeCallback) {
        this.onConnectionStateChangeCallback(this.peerConnection.connectionState);
      }
    };

    // Also listen to connection state changes (not just ICE)
    this.peerConnection.onconnectionstatechange = () => {
      console.log('Connection state:', this.peerConnection?.connectionState);
      if (this.peerConnection && this.onConnectionStateChangeCallback) {
        this.onConnectionStateChangeCallback(this.peerConnection.connectionState);
      }
    };

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('ICE candidate:', event.candidate);
        if (this.iceCandidateCallback) {
          this.iceCandidateCallback(event.candidate);
        }
      }
    };

    this.peerConnection.ondatachannel = (event) => {
      console.log('Data channel received');
      this.setupDataChannel(event.channel);
    };

    // Handle incoming audio streams
    this.peerConnection.ontrack = (event) => {
      console.log('Received remote track:', event.track.kind);
      if (!this.remoteStream) {
        this.remoteStream = new MediaStream();
      }
      this.remoteStream.addTrack(event.track);
      
      if (this.onRemoteStreamCallback && event.track.kind === 'audio') {
        this.onRemoteStreamCallback(this.remoteStream);
      }
    };
  }

  onICECandidate(callback: (candidate: RTCIceCandidateInit) => void): void {
    this.iceCandidateCallback = callback;
  }

  onRemoteStream(callback: (stream: MediaStream) => void): void {
    this.onRemoteStreamCallback = callback;
  }

  // Add local audio stream
  async addAudioStream(): Promise<MediaStream> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      this.localStream = stream;
      
      // Add audio tracks to peer connection
      stream.getTracks().forEach(track => {
        if (this.peerConnection) {
          this.peerConnection.addTrack(track, stream);
          console.log('Added local audio track to peer connection');
        }
      });
      
      return stream;
    } catch (error) {
      console.error('Failed to get user media:', error);
      throw error;
    }
  }

  // Mute/unmute local audio
  toggleAudio(muted: boolean): void {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = !muted;
      });
      console.log('Audio', muted ? 'muted' : 'unmuted');
    }
  }

  // Get local stream
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  // Get remote stream
  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  createDataChannel(): RTCDataChannel {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    const channel = this.peerConnection.createDataChannel('game', {
      ordered: true // Ensure messages arrive in order
    });

    this.setupDataChannel(channel);
    return channel;
  }

  private setupDataChannel(channel: RTCDataChannel) {
    this.dataChannel = channel;

    channel.onopen = () => {
      console.log('Data channel opened');
      this.startKeepAlive();
      this.startConnectionMonitor();
    };

    channel.onclose = () => {
      console.log('Data channel closed');
      this.stopKeepAlive();
      this.stopConnectionMonitor();
      this.dataChannel = null;
    };

    channel.onerror = (error) => {
      console.error('Data channel error:', error);
    };

    channel.onmessage = (event) => {
      try {
        const message: GameMessage = JSON.parse(event.data);
        console.log('Received message:', message);
        
        // Handle ping/pong automatically
        if (message.type === 'ping') {
          // Automatically respond with pong
          this.sendMessage({ type: 'pong' });
          return; // Don't pass ping to callback
        } else if (message.type === 'pong') {
          // Update last pong time
          this.lastPongTime = Date.now();
          return; // Don't pass pong to callback
        }
        
        if (this.onMessageCallback) {
          this.onMessageCallback(message);
        }
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    };
  }

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    return offer;
  }

  async handleOffer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    return answer;
  }

  async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
  }

  async addICECandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  }

  sendMessage(message: GameMessage): void {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      console.error('Data channel not ready');
      return;
    }

    this.dataChannel.send(JSON.stringify(message));
  }

  onMessage(callback: (message: GameMessage) => void): void {
    this.onMessageCallback = callback;
  }

  onConnectionStateChange(callback: (state: RTCPeerConnectionState) => void): void {
    this.onConnectionStateChangeCallback = callback;
  }

  getConnectionState(): RTCPeerConnectionState | undefined {
    return this.peerConnection?.connectionState;
  }

  // Keep-alive mechanism to prevent connection from closing
  private startKeepAlive(): void {
    this.keepAliveInterval = setInterval(() => {
      if (this.dataChannel && this.dataChannel.readyState === 'open') {
        this.sendMessage({ type: 'ping' });
        // Check if we received a pong recently
        const timeSinceLastPong = Date.now() - this.lastPongTime;
        if (timeSinceLastPong > 30000) {
          console.warn('No pong received in 30 seconds, connection may be stale');
        }
      }
    }, 5000); // Send ping every 5 seconds
  }

  private stopKeepAlive(): void {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = undefined;
    }
  }

  // Monitor connection health
  private startConnectionMonitor(): void {
    this.connectionCheckInterval = setInterval(() => {
      const info = this.getConnectionInfo();
      console.log('[WebRTC Health]', info);
    }, 10000); // Check every 10 seconds
  }

  private stopConnectionMonitor(): void {
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
      this.connectionCheckInterval = undefined;
    }
  }

  close(): void {
    console.log('Closing WebRTC connection');
    
    this.stopKeepAlive();
    this.stopConnectionMonitor();
    
    // Stop local audio tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        track.stop();
        console.log('Stopped local track:', track.kind);
      });
      this.localStream = null;
    }
    
    // Clean up remote stream
    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach(track => {
        track.stop();
      });
      this.remoteStream = null;
    }
    
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
  }

  // Get connection health info
  getConnectionInfo(): {
    dataChannelState: string | null;
    iceConnectionState: string | null;
    connectionState: string | null;
    timeSinceLastPong: number;
  } {
    return {
      dataChannelState: this.dataChannel?.readyState || null,
      iceConnectionState: this.peerConnection?.iceConnectionState || null,
      connectionState: this.peerConnection?.connectionState || null,
      timeSinceLastPong: Date.now() - this.lastPongTime
    };
  }
}
