import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { WebRTCHandler } from '../../services/webrtcHandler';

describe('Audio Streaming', () => {
  let webrtc: WebRTCHandler;

  // Mock getUserMedia
  const mockGetUserMedia = vi.fn();
  
  // Create mock tracks with mutable enabled property
  let mockAudioTrack = {
    kind: 'audio',
    enabled: true,
    stop: vi.fn()
  };
  
  const mockMediaStream = {
    getTracks: vi.fn(() => [mockAudioTrack]),
    getAudioTracks: vi.fn(() => [mockAudioTrack]),
    addTrack: vi.fn()
  };

  beforeEach(() => {
    // Reset mock track
    mockAudioTrack = {
      kind: 'audio',
      enabled: true,
      stop: vi.fn()
    };
    mockMediaStream.getTracks = vi.fn(() => [mockAudioTrack]);
    mockMediaStream.getAudioTracks = vi.fn(() => [mockAudioTrack]);
    
    // Mock navigator.mediaDevices.getUserMedia
    global.navigator = {
      ...global.navigator,
      mediaDevices: {
        getUserMedia: mockGetUserMedia
      } as any
    };

    mockGetUserMedia.mockResolvedValue(mockMediaStream);

    // Mock RTCPeerConnection
    global.RTCPeerConnection = class MockRTCPeerConnection {
      createDataChannel = vi.fn(() => ({
        addEventListener: vi.fn(),
        send: vi.fn(),
        close: vi.fn(),
        readyState: 'open'
      }));
      createOffer = vi.fn().mockResolvedValue({ type: 'offer', sdp: 'mock-sdp' });
      createAnswer = vi.fn().mockResolvedValue({ type: 'answer', sdp: 'mock-sdp' });
      setLocalDescription = vi.fn().mockResolvedValue(undefined);
      setRemoteDescription = vi.fn().mockResolvedValue(undefined);
      addIceCandidate = vi.fn().mockResolvedValue(undefined);
      addTrack = vi.fn();
      close = vi.fn();
      iceConnectionState = 'connected';
      connectionState = 'connected';
      onicecandidate: any = null;
      oniceconnectionstatechange: any = null;
      ondatachannel: any = null;
      ontrack: any = null;
    } as any;

    webrtc = new WebRTCHandler();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should request microphone access and add audio stream', async () => {
    await webrtc.addAudioStream();

    expect(mockGetUserMedia).toHaveBeenCalledWith({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });

    const localStream = webrtc.getLocalStream();
    expect(localStream).toBeDefined();
  });

  it('should add audio tracks to peer connection', async () => {
    const mockPeerConnection = (webrtc as any).peerConnection;
    await webrtc.addAudioStream();

    expect(mockPeerConnection.addTrack).toHaveBeenCalled();
  });

  it('should handle getUserMedia errors gracefully', async () => {
    mockGetUserMedia.mockRejectedValueOnce(new Error('Permission denied'));

    await expect(webrtc.addAudioStream()).rejects.toThrow('Permission denied');
  });

  it('should mute audio when toggleAudio is called with true', async () => {
    await webrtc.addAudioStream();
    
    webrtc.toggleAudio(true); // mute

    const tracks = mockMediaStream.getAudioTracks();
    expect(tracks[0].enabled).toBe(false);
  });

  it('should unmute audio when toggleAudio is called with false', async () => {
    await webrtc.addAudioStream();
    
    webrtc.toggleAudio(true); // mute
    webrtc.toggleAudio(false); // unmute

    const tracks = mockMediaStream.getAudioTracks();
    expect(tracks[0].enabled).toBe(true);
  });

  it('should handle remote audio stream via ontrack event', async () => {
    const mockRemoteStream = {
      addTrack: vi.fn()
    };
    
    const onRemoteStreamCallback = vi.fn();
    webrtc.onRemoteStream(onRemoteStreamCallback);

    // Simulate receiving a remote track
    const mockPeerConnection = (webrtc as any).peerConnection;
    const mockTrack = { kind: 'audio' };
    
    if (mockPeerConnection.ontrack) {
      mockPeerConnection.ontrack({ track: mockTrack });
    }

    expect(onRemoteStreamCallback).toHaveBeenCalled();
  });

  it('should stop all audio tracks when closing connection', async () => {
    await webrtc.addAudioStream();
    
    const tracks = mockMediaStream.getTracks();
    const stopSpy = tracks[0].stop;

    webrtc.close();

    expect(stopSpy).toHaveBeenCalled();
  });

  it('should clean up local and remote streams on close', async () => {
    await webrtc.addAudioStream();
    
    webrtc.close();

    expect(webrtc.getLocalStream()).toBeNull();
    expect(webrtc.getRemoteStream()).toBeNull();
  });

  it('should not throw when toggleAudio is called without stream', () => {
    expect(() => webrtc.toggleAudio(true)).not.toThrow();
  });

  it('should return null for remote stream initially', () => {
    expect(webrtc.getRemoteStream()).toBeNull();
  });
});

