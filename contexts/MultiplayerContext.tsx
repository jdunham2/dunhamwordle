import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SignalingService } from '../services/signalingService';
import { getWebSocketUrl } from '../services/wsConfig';

interface MultiplayerContextType {
  signaling: SignalingService | null;
  isConnected: boolean;
}

const MultiplayerContext = createContext<MultiplayerContextType>({
  signaling: null,
  isConnected: false
});

export const useMultiplayerContext = () => useContext(MultiplayerContext);

interface MultiplayerProviderProps {
  children: ReactNode;
}

export const MultiplayerProvider: React.FC<MultiplayerProviderProps> = ({ children }) => {
  const [signaling, setSignaling] = useState<SignalingService | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const usageRef = React.useRef(0);

  useEffect(() => {
    console.log('[MultiplayerProvider] Initializing provider');
    
    // Create connection ONCE and reuse
    const signal = new SignalingService(getWebSocketUrl());
    setSignaling(signal);
    
    signal.on('error', () => setIsConnected(false));
    
    // Auto-connect
    signal.connect().then(() => {
      setIsConnected(true);
      console.log('[MultiplayerProvider] Connected');
    }).catch(err => {
      console.error('[MultiplayerProvider] Connection failed:', err);
      setIsConnected(false);
    });

    // Cleanup on unmount
    return () => {
      console.log('[MultiplayerProvider] Cleaning up connection');
      signal.disconnect();
    };
  }, []); // Only run once when provider mounts

  return (
    <MultiplayerContext.Provider value={{ signaling, isConnected }}>
      {children}
    </MultiplayerContext.Provider>
  );
};

