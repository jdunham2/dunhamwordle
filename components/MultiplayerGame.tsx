import React, { useState, useEffect, useRef } from 'react';
import { Grid } from './Grid';
import { Keyboard } from './Keyboard';
import { WebRTCHandler, GameMessage } from '../services/webrtcHandler';
import { SignalingService } from '../services/signalingService';
import { connectionManager } from '../services/multiplayerConnection';
import { loadWordLists } from '../services/wordService';
import { getWebSocketUrl } from '../services/wsConfig';

interface MultiplayerGameProps {
  roomId: string;
  isHost: boolean;
  playerName: string;
  onExit: () => void;
}

const WORD_LENGTH = 5;
const MAX_GUESSES = 6;

export const MultiplayerGame: React.FC<MultiplayerGameProps> = ({
  roomId,
  isHost,
  playerName,
  onExit
}) => {
  const [solution, setSolution] = useState<string>(''); // Will be set by host
  const [guesses, setGuesses] = useState<string[]>(Array(MAX_GUESSES).fill(''));
  const [currentGuess, setCurrentGuess] = useState('');
  const [currentGuessIndex, setCurrentGuessIndex] = useState(0);
  const [gameStatus, setGameStatus] = useState<'playing' | 'won' | 'lost'>('playing');
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('connecting');
  const [opponentName, setOpponentName] = useState<string>('Friend');
  const [opponentGuesses, setOpponentGuesses] = useState<string[]>(Array(MAX_GUESSES).fill(''));
  const [solutionReady, setSolutionReady] = useState(false);

  const webrtcRef = useRef<WebRTCHandler | null>(null);
  const signalingRef = useRef<SignalingService | null>(null);
  const playerJoinCountRef = useRef(0);
  const hasStartedWebRTCRef = useRef(false);
  
  // Track hasStartedWebRTC globally per room to prevent StrictMode issues
  const globalStartedKey = `${roomId}-${isHost}`;
  if (!(window as any).__webRTCStarted) {
    (window as any).__webRTCStarted = new Set();
  }
  const globalStarted = (window as any).__webRTCStarted.has(globalStartedKey);

  useEffect(() => {
    // Reset counters when component mounts
    playerJoinCountRef.current = 0;
    hasStartedWebRTCRef.current = false;
    let mounted = true;
    
    // Initialize WebRTC and signaling
    const initConnection = async () => {
      try {
        console.log('Initializing multiplayer connection...', { roomId, isHost });
        
        const webrtc = new WebRTCHandler();
        
        // Get shared signaling connection
        connectionManager.incrementUsage();
        const signaling = connectionManager.getSignaling();
        signalingRef.current = signaling;
        
        webrtcRef.current = webrtc;
        
        // Set up ALL event handlers FIRST (before any async operations)
        // This ensures we don't miss any messages that arrive during setup
        
        // Listen for when another player joins the room
        const playerJoinedHandler = async (message: any) => {
          if (!mounted) return;
          playerJoinCountRef.current++;
          console.log(`Player joined event #${playerJoinCountRef.current} received:`, message);
          
          console.log(`Checking if we should start WebRTC - count: ${playerJoinCountRef.current}, isHost: ${isHost}, message isHost: ${message.isHost}`);
          
          if (hasStartedWebRTCRef.current) {
            console.log('WebRTC already started, skipping');
            return;
          }
          
          // Start WebRTC when:
          // - We have at least 2 players in the room (but only connect to one peer)
          // - For host: create offer when 2nd player joins
          // - For guest: create answer when receiving offer
          const shouldStart = message.playerCount >= 2 && !hasStartedWebRTCRef.current && !globalStarted;
          
          if (!shouldStart) {
            console.log(`Not the right event to start WebRTC yet - playerCount: ${message.playerCount}, alreadyStarted: ${hasStartedWebRTCRef.current}`);
            return;
          }
          
          // Mark as started BEFORE doing anything async
          hasStartedWebRTCRef.current = true;
          (window as any).__webRTCStarted.add(globalStartedKey);
          
          // Wait a bit to ensure both connections are established
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Double-check mounted state before proceeding
          if (!mounted) {
            console.log('Component unmounted during WebRTC setup, aborting');
            return;
          }
          
          if (isHost) {
            console.log('Host: Creating WebRTC offer');
            const dataChannel = webrtc.createDataChannel();
            
            const waitForDataChannel = () => {
              return new Promise<void>((resolve) => {
                if (dataChannel.readyState === 'open') {
                  resolve();
                } else {
                  dataChannel.onopen = () => resolve();
                }
              });
            };
            
            const offer = await webrtc.createOffer();
            console.log('Host: Sending offer');
            signaling.sendOffer(offer, roomId);

            const answerHandler = async (answerMessage: any) => {
              console.log('Host: Received answer:', answerMessage);
              signaling.off('answer', answerHandler);
              await webrtc.handleAnswer(answerMessage.data);
              
              await waitForDataChannel();
              
              const wordLists = await loadWordLists();
              const randomWord = wordLists.solutions[Math.floor(Math.random() * wordLists.solutions.length)];
              setSolution(randomWord);
              setSolutionReady(true);
              
              if (webrtc.sendMessage) {
                webrtc.sendMessage({
                  type: 'word-selected',
                  data: randomWord
                });
              }
            };
            
            signaling.on('answer', answerHandler);
          } else {
            console.log('Guest: Waiting for offer from host (handler already set up)');
          }
        };
        
        // Handle offer from host (GUEST ONLY - set up immediately)
        if (!isHost) {
          console.log('Guest: Setting up offer handler');
          signaling.on('offer', async (offerMessage: any) => {
            console.log('Guest: Received offer:', offerMessage);
            if (!mounted || !webrtcRef.current) {
              console.warn('Guest: Received offer but not ready');
              return;
            }
            try {
              const answer = await webrtcRef.current.handleOffer(offerMessage.data);
              console.log('Guest: Sending answer:', answer);
              signaling.sendAnswer(answer, roomId);
            } catch (error) {
              console.error('Guest: Error handling offer:', error);
            }
          });
        }

        // Handle ICE candidates from the other peer (set up immediately)
        signaling.on('ice-candidate', async (message: any) => {
          console.log('Received ICE candidate:', message);
          if (mounted && webrtcRef.current) {
            try {
              await webrtcRef.current.addICECandidate(message.data);
            } catch (error) {
              console.warn('Failed to add ICE candidate:', error);
            }
          }
        });

        signaling.on('player-joined', playerJoinedHandler);

        // Handle incoming WebRTC messages
        webrtc.onMessage((message: GameMessage) => {
          switch (message.type) {
            case 'word-selected':
              if (!isHost && message.data) {
                // Host selected the word
                console.log('Word selected:', message.data);
                setSolution(message.data);
              }
              break;
            case 'guess-submitted':
              if (message.data) {
                setOpponentGuesses(message.data.guesses);
              }
              break;
            case 'game-over':
              setGameStatus(message.data.won ? 'won' : 'lost');
              break;
            case 'sync-state':
              // Sync full game state
              if (message.data) {
                setGuesses(message.data.guesses);
                setCurrentGuessIndex(message.data.guessIndex);
              }
              break;
          }
        });

        webrtc.onConnectionStateChange((state) => {
          setConnectionState(state);
          console.log('Connection state changed:', state);
        });

        // Set up ICE candidate callback to send candidates through signaling
        webrtc.onICECandidate((candidate) => {
          if (signaling) {
            console.log('Sending ICE candidate...');
            signaling.sendICECandidate(candidate, roomId);
          }
        });

        // Check if already connected (from Lobby)
        const wsAlreadyConnected = (signaling as any).socket?.readyState === WebSocket.OPEN;
        
        if (!wsAlreadyConnected) {
          // Connect to signaling server
          console.log('Connecting to signaling server...');
          try {
            await signaling.connect();
            console.log('Connected to signaling server successfully');
          } catch (error) {
            if (!mounted) return;
            console.error('Failed to connect to signaling server:', error);
            setConnectionState('disconnected');
            return;
          }
        } else {
          console.log('Reusing existing WebSocket connection from Lobby');
        }
        
        // Wait a moment for Lobby to disconnect
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Set connection state to connecting (ready for WebRTC)
        setConnectionState('connecting');
        
        // Only join if not already in room (guests need to join, hosts already did via Lobby)
        const isAlreadyConnected = (signaling as any).socket?.readyState === WebSocket.OPEN;
        
        if (!isAlreadyConnected) {
          console.log('Connecting to signaling server...');
          await signaling.connect();
          console.log('Connected to signaling server successfully');
        } else {
          console.log('Reusing existing WebSocket connection from Lobby');
        }
        
        // Guest needs to explicitly join the room (host already created it in Lobby)
        if (!isHost) {
          console.log('Guest: Joining room:', roomId);
          signaling.joinRoom(roomId);
        } else {
          console.log('Host: Already in room from Lobby');
        }
        
        // Handle error responses from server
        signaling.on('error', (message: any) => {
          console.error('Server error:', message);
          if (message.message === 'Room not found') {
            console.error('Room not found - this should not happen!');
            setConnectionState('disconnected');
          }
        });
        
        // Get current room status to check if we should start WebRTC
        // This handles the case where both players joined via Lobby before Game mounted
        signaling.on('room-status', async (message: any) => {
          console.log('Received room status:', message);
          if (!mounted) return;
          
          // Treat this like a player-joined event to trigger WebRTC if needed
          if (message.playerCount >= 2 && !hasStartedWebRTCRef.current && !globalStarted) {
            console.log('Room status shows 2+ players, triggering WebRTC setup');
            // Manually call playerJoinedHandler
            await playerJoinedHandler(message);
          }
        });
        
        // Request room status after a brief delay to ensure we're fully joined/ready
        setTimeout(() => {
          if (mounted) {
            console.log('Requesting room status for room:', roomId);
            try {
              signaling.getRoomStatus(roomId);
              console.log('Room status request sent');
            } catch (error) {
              console.error('Failed to request room status:', error);
            }
          }
        }, 500);
      
      console.log('Initialization complete');
      } catch (error) {
        if (!mounted) return;
        console.error('Error initializing multiplayer connection:', error);
        setConnectionState('disconnected');
      }
    };

    initConnection();

    return () => {
      mounted = false;
      console.log('Cleaning up multiplayer connection');
      
      // Only cleanup WebRTC, connection manager handles signaling
      if (webrtcRef.current) {
        webrtcRef.current.close();
        webrtcRef.current = null;
      }
      
      // Decrement usage but don't set keepAlive=false yet if Game is remounting
      // This prevents the connection from closing during StrictMode cleanup
      const currentUsage = (connectionManager as any).connectionCount;
      if (currentUsage > 1) {
        // Another instance exists, just decrement
        connectionManager.decrementUsage();
      }
    };
  }, [roomId, isHost]);

  const handleKeyPress = (key: string) => {
    if (gameStatus !== 'playing' || !solution) return;

    if (key === 'Enter') {
      if (currentGuess.length === WORD_LENGTH) {
        const newGuesses = [...guesses];
        newGuesses[currentGuessIndex] = currentGuess;
        setGuesses(newGuesses);

        // Send guess to opponent
        if (webrtcRef.current) {
          webrtcRef.current.sendMessage({
            type: 'guess-submitted',
            data: { guesses: newGuesses }
          });
        }

        const isWin = currentGuess === solution;
        const isLoss = currentGuessIndex === MAX_GUESSES - 1;

        if (isWin || isLoss) {
          setGameStatus(isWin ? 'won' : 'lost');

          if (webrtcRef.current) {
            webrtcRef.current.sendMessage({
              type: 'game-over',
              data: { won: isWin }
            });
          }
        } else {
          setCurrentGuessIndex(currentGuessIndex + 1);
          setCurrentGuess('');
        }
      }
    } else if (key === 'Backspace') {
      setCurrentGuess(currentGuess.slice(0, -1));
    } else if (key.length === 1 && key.match(/[a-z]/i)) {
      if (currentGuess.length < WORD_LENGTH) {
        setCurrentGuess(currentGuess + key.toUpperCase());
      }
    }
  };

  const getConnectionStatusColor = () => {
    switch (connectionState) {
      case 'connected':
        return 'text-green-400';
      case 'connecting':
        return 'text-yellow-400';
      default:
        return 'text-red-400';
    }
  };

  // Show loading state while waiting for word or connection
  const isConnecting = !solution;
  
  if (isConnecting) {
    const statusMessage = isHost 
      ? 'Waiting for another player to join...' 
      : 'Connecting to host...';
    
    const showInstructions = isHost && connectionState === 'connecting';
    
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 backdrop-blur-sm z-50">
        <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full mx-4 text-center">
          <div className="mb-6">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
          <h2 className="text-2xl font-bold text-gray-100 mb-2">MULTIPLAYER</h2>
          <p className="text-xl font-semibold text-gray-200 mb-4">
            {statusMessage}
          </p>
          
          {/* Show instructions for host */}
          {showInstructions && (
            <div className="bg-blue-900 bg-opacity-50 border border-blue-600 rounded-lg p-4 mb-4 text-left">
              <p className="text-white font-semibold mb-2">📋 Share Your Room Code:</p>
              <div className="flex items-center justify-between bg-gray-700 rounded px-3 py-2 mb-2">
                <code className="text-2xl font-bold text-white tracking-wider">{roomId}</code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(roomId);
                    alert('Room code copied!');
                  }}
                  className="text-blue-400 hover:text-blue-300 text-sm"
                >
                  Copy
                </button>
              </div>
              <p className="text-gray-300 text-sm">Share this code with the other player so they can join your room.</p>
            </div>
          )}
          
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className={`w-2 h-2 rounded-full ${getConnectionStatusColor()}`} />
            <span className="text-sm text-gray-400">
              {connectionState === 'connecting' ? 'Ready' : connectionState}
            </span>
          </div>
          <p className="text-gray-400 text-sm">Room: {roomId}</p>
          <button
            onClick={onExit}
            className="mt-6 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen max-w-lg mx-auto p-2 sm:p-4">
      {/* Header with connection status */}
      <header className="flex items-center justify-between border-b border-gray-600 pb-2 mb-2">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${getConnectionStatusColor()}`} />
          <span className="text-xs text-gray-400">{connectionState}</span>
        </div>
        <h1 className="text-xl font-bold">MULTIPLAYER</h1>
        <button
          onClick={onExit}
          className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded"
        >
          Exit
        </button>
      </header>

      {/* Player info */}
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm">
          <div className="font-semibold text-blue-400">{playerName} (You)</div>
          <div className="text-gray-400">Room: {roomId}</div>
        </div>
        <div className="text-sm text-right">
          <div className="font-semibold text-purple-400">{opponentName}</div>
        </div>
      </div>

      {/* Game grids side by side */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="text-xs text-center text-gray-400 mb-2">{playerName}</div>
          <Grid
            guesses={guesses}
            currentGuess={currentGuess}
            currentGuessIndex={currentGuessIndex}
            solution={solution}
            isInvalidGuess={false}
          />
        </div>
        <div>
          <div className="text-xs text-center text-gray-400 mb-2">{opponentName}</div>
          <Grid
            guesses={opponentGuesses}
            currentGuess=""
            currentGuessIndex={opponentGuesses.filter(g => g).length}
            solution={solution}
            isInvalidGuess={false}
          />
        </div>
      </div>

      {/* Keyboard */}
      <div className="flex-shrink-0">
        <Keyboard
          onKeyPress={handleKeyPress}
          keyStatuses={{}}
          exploded={false}
        />
      </div>

      {/* Game over overlay */}
      {gameStatus !== 'playing' && (
        <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center">
          <div className="bg-gray-800 p-6 rounded-lg text-center">
            <h2 className="text-2xl font-bold mb-4">
              {gameStatus === 'won' ? 'You Won!' : 'Game Over'}
            </h2>
            <button
              onClick={onExit}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded"
            >
              Back to Menu
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
