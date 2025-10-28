import React, { useState, useEffect } from 'react';
import { SignalingService } from '../services/signalingService';
import { connectionManager } from '../services/multiplayerConnection';
import { getWebSocketUrl } from '../services/wsConfig';

interface MultiplayerLobbyProps {
  onRoomCreated: (roomId: string, isHost: boolean, playerName: string) => void;
  onRoomJoined: (roomId: string, isHost: boolean, playerName: string) => void;
  onBack: () => void;
}

export const MultiplayerLobby: React.FC<MultiplayerLobbyProps> = ({
  onRoomCreated,
  onRoomJoined,
  onBack
}) => {
  const [roomId, setRoomId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signaling, setSignaling] = useState<SignalingService | null>(null);

  useEffect(() => {
    // Keep connection alive while transitioning to Game
    connectionManager.setKeepAlive(true);
    connectionManager.incrementUsage();
    const signal = connectionManager.getSignaling();
    setSignaling(signal);

    signal.on('error', (message: any) => {
      setError(message.message || 'Connection error');
      setIsConnecting(false);
    });

    signal.on('room-full', () => {
      setError('Room is full');
      setIsConnecting(false);
    });

    return () => {
      // Don't decrement usage yet - Game will use the connection
      // Keep it alive for smooth transition
    };
  }, []);

  const handleCreateRoom = async () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      if (!signaling) {
        throw new Error('Signaling service not initialized');
      }

      // Set up event handler BEFORE connecting
      const joinedHandler = (message: any) => {
        console.log('Player joined:', message);
        // Unregister the handler to prevent multiple calls
        signaling.off('player-joined', joinedHandler);
        onRoomCreated(message.roomId, true, playerName);
      };
      
      signaling.on('player-joined', joinedHandler);

      await signaling.connect();

      signaling.createRoom();
      
      // Note: Don't set isConnecting to false here - wait for player-joined event
    } catch (err) {
      console.error('Error creating room:', err);
      setError('Failed to create room. Make sure the WebSocket server is running.');
      setIsConnecting(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    if (!roomId.trim()) {
      setError('Please enter a room ID');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      if (!signaling) {
        throw new Error('Signaling service not initialized');
      }

      await signaling.connect();
      
      const joinedHandler = (message: any) => {
        console.log('Joined room:', message);
        // Unregister the handler to prevent multiple calls
        signaling.off('player-joined', joinedHandler);
        onRoomJoined(message.roomId, false, playerName);
      };

      signaling.on('player-joined', joinedHandler);

      signaling.joinRoom(roomId);
    } catch (err) {
      setError('Failed to join room. Make sure the room ID is correct and the WebSocket server is running.');
      setIsConnecting(false);
    }
  };

  return (
    <div className="absolute inset-0 bg-black bg-opacity-75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
        <h2 className="text-2xl font-bold text-gray-100 mb-2 text-center">
          Multiplayer
        </h2>
        <p className="text-center text-gray-400 mb-6">
          Play Wordle with a friend in real-time
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Your Name
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              maxLength={20}
              className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100"
              placeholder="Enter your name"
              disabled={isConnecting}
            />
          </div>

          <div className="border-t border-gray-700 pt-4">
            <h3 className="text-lg font-semibold text-gray-300 mb-3">Join a Room</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Room ID
                </label>
                <input
                  type="text"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 font-mono text-center tracking-wider"
                  placeholder="ABC123"
                  disabled={isConnecting}
                />
              </div>
              <button
                onClick={handleJoinRoom}
                disabled={isConnecting}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded transition-colors"
              >
                {isConnecting ? 'Connecting...' : 'Join Room'}
              </button>
            </div>
          </div>

          <div className="border-t border-gray-700 pt-4">
            <h3 className="text-lg font-semibold text-gray-300 mb-3">Create a Room</h3>
            <button
              onClick={handleCreateRoom}
              disabled={isConnecting}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded transition-colors"
            >
              {isConnecting ? 'Creating...' : 'Create New Room'}
            </button>
          </div>

          {error && (
            <div className="bg-red-900 bg-opacity-50 border border-red-600 text-red-200 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <button
            onClick={onBack}
            disabled={isConnecting}
            className="w-full bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 text-white font-bold py-2 px-4 rounded transition-colors"
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
};
