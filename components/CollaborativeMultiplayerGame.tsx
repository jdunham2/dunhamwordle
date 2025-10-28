import React, { useState, useEffect, useRef } from 'react';
import { Grid } from './Grid';
import { Keyboard } from './Keyboard';
import { MultiplayerChat, ChatMessage } from './MultiplayerChat';
import { WebRTCHandler, GameMessage } from '../services/webrtcHandler';
import { SignalingService } from '../services/signalingService';
import { connectionManager } from '../services/multiplayerConnection';
import { loadWordLists } from '../services/wordService';

interface CollaborativeMultiplayerGameProps {
  roomId: string;
  isHost: boolean;
  playerName: string;
  onExit: () => void;
}

const WORD_LENGTH = 5;
const MAX_GUESSES = 6;

export const CollaborativeMultiplayerGame: React.FC<CollaborativeMultiplayerGameProps> = ({
  roomId,
  isHost,
  playerName,
  onExit
}) => {
  // Game state (shared between both players)
  const [solution, setSolution] = useState<string>('');
  const [guesses, setGuesses] = useState<string[]>(Array(MAX_GUESSES).fill(''));
  const [currentGuess, setCurrentGuess] = useState('');
  const [currentGuessIndex, setCurrentGuessIndex] = useState(0);
  const [gameStatus, setGameStatus] = useState<'playing' | 'won' | 'lost'>('playing');
  const [keyStatuses, setKeyStatuses] = useState<Record<string, 'correct' | 'present' | 'absent' | 'unused'>>({});
  
  // Multiplayer state
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [opponentName, setOpponentName] = useState<string>('Friend');
  const [opponentTyping, setOpponentTyping] = useState(false);
  
  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  
  // Audio state
  const [isMuted, setIsMuted] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  
  // Refs
  const webrtcRef = useRef<WebRTCHandler | null>(null);
  const signalingRef = useRef<SignalingService | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingOfferRef = useRef<any>(null);

  // Initialize WebRTC connection (with full handshake logic from original)
  useEffect(() => {
    let mounted = true;
    
    const initConnection = async () => {
      try {
        console.log('Initializing collaborative multiplayer...', { roomId, isHost, playerName });
        
        const webrtc = new WebRTCHandler();
        connectionManager.incrementUsage();
        const signaling = connectionManager.getSignaling();
        
        webrtcRef.current = webrtc;
        signalingRef.current = signaling;
        
        // Set up offer handler for guest (BEFORE any async operations!)
        if (!isHost) {
          console.log('Guest: Setting up offer handler');
          
          // Check if we already received an offer (from Lobby)
          const checkPendingOffer = () => {
            // Get all 'offer' events from signaling service event history
            // This is a workaround for the race condition where offer arrives before handler is set up
            console.log('Guest: Checking for pending offers...');
          };
          
          signaling.on('offer', async (offerMessage: any) => {
            console.log('Guest: Received offer (handler active)');
            if (!mounted || !webrtcRef.current) {
              console.warn('Guest: Received offer but not ready, storing for later');
              pendingOfferRef.current = offerMessage;
              return;
            }
            try {
              console.log('Guest: Processing offer');
              
              // Set up audio streaming for guest
              try {
                console.log('Guest: Setting up audio stream...');
                await webrtcRef.current.addAudioStream();
                setAudioEnabled(true);
                console.log('Guest: Audio stream added');
              } catch (error: any) {
                console.warn('Guest: Failed to add audio stream:', error);
                setAudioError(error.message || 'Microphone access denied');
              }
              
              // Set up remote audio handler
              webrtcRef.current.onRemoteStream((stream) => {
                console.log('Guest: Received remote audio stream');
                if (remoteAudioRef.current) {
                  remoteAudioRef.current.srcObject = stream;
                  remoteAudioRef.current.play().catch(e => console.warn('Auto-play failed:', e));
                }
              });
              
              const answer = await webrtcRef.current.handleOffer(offerMessage.data);
              console.log('Guest: Sending answer');
              signaling.sendAnswer(answer, roomId);
            } catch (error) {
              console.error('Guest: Error handling offer:', error);
            }
          });
          
          // Process pending offer if any
          setTimeout(async () => {
            if (pendingOfferRef.current && webrtcRef.current && mounted) {
              console.log('Guest: Processing pending offer');
              const offerMessage = pendingOfferRef.current;
              pendingOfferRef.current = null;
              
              try {
                // Set up audio streaming for guest (pending offer case)
                try {
                  console.log('Guest: Setting up audio stream (pending)...');
                  await webrtcRef.current.addAudioStream();
                  setAudioEnabled(true);
                  console.log('Guest: Audio stream added (pending)');
                } catch (error: any) {
                  console.warn('Guest: Failed to add audio stream (pending):', error);
                  setAudioError(error.message || 'Microphone access denied');
                }
                
                // Set up remote audio handler
                webrtcRef.current.onRemoteStream((stream) => {
                  console.log('Guest: Received remote audio stream (pending)');
                  if (remoteAudioRef.current) {
                    remoteAudioRef.current.srcObject = stream;
                    remoteAudioRef.current.play().catch(e => console.warn('Auto-play failed:', e));
                  }
                });
                
                const answer = await webrtcRef.current.handleOffer(offerMessage.data);
                console.log('Guest: Sending answer (from pending)');
                signaling.sendAnswer(answer, roomId);
              } catch (error) {
                console.error('Guest: Error handling pending offer:', error);
              }
            }
          }, 100);
        }
        
        // Set up ICE candidate handler
        signaling.on('ice-candidate', async (message: any) => {
          console.log('Received ICE candidate');
          if (mounted && webrtcRef.current) {
            try {
              await webrtcRef.current.addICECandidate(message.data);
            } catch (error) {
              console.warn('Failed to add ICE candidate:', error);
            }
          }
        });
        
        // Track if we've started WebRTC handshake
        let hasStartedHandshake = false;
        
        // Handle player joined events to trigger WebRTC
        signaling.on('player-joined', async (message: any) => {
          console.log('Player joined:', message);
          console.log('Should start WebRTC?', {
            playerCount: message.playerCount,
            isHost,
            hasStartedHandshake,
            mounted
          });
          
          if (message.playerCount >= 2 && isHost && !hasStartedHandshake && mounted) {
            hasStartedHandshake = true;
            console.log('Host: Will create WebRTC offer in 1 second (giving guest time to set up handler)');
            
            // Wait 1 second for guest's Game component to mount and set up offer handler
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            if (!mounted) {
              console.log('Host: Component unmounted, aborting offer creation');
              return;
            }
            
            console.log('Host: Creating WebRTC offer');
            
            try {
              const dataChannel = webrtc.createDataChannel();
              console.log('Host: Data channel created');
              
              // Set up message handler for host (CRITICAL!)
              webrtc.onMessage((message: GameMessage) => {
                if (!mounted) return;
                
                console.log('Host: Received game message:', message);
                
                switch (message.type) {
                  case 'keystroke':
                    if (message.data) {
                      if (message.data.action === 'add' && message.data.letter) {
                        setCurrentGuess(prev => {
                          if (prev.length < WORD_LENGTH) {
                            return prev + message.data.letter;
                          }
                          return prev;
                        });
                      } else if (message.data.action === 'delete') {
                        setCurrentGuess(prev => prev.slice(0, -1));
                      }
                    }
                    break;
                    
                  case 'guess-submitted':
                    if (message.data) {
                      setGuesses(message.data.guesses);
                      setCurrentGuessIndex(message.data.guessIndex);
                      setCurrentGuess('');
                      if (message.data.keyStatuses) {
                        setKeyStatuses(message.data.keyStatuses);
                      }
                    }
                    break;
                    
                  case 'game-over':
                    if (message.data) {
                      setGameStatus(message.data.won ? 'won' : 'lost');
                    }
                    break;
                    
                  case 'chat-message':
                    if (message.data && message.from && message.timestamp) {
                      setChatMessages(prev => [...prev, {
                        sender: message.from,
                        text: message.data,
                        timestamp: message.timestamp
                      }]);
                    }
                    break;
                    
                  case 'typing-indicator':
                    if (message.data !== undefined) {
                      setOpponentTyping(message.data);
                      if (message.data && typingTimeoutRef.current) {
                        clearTimeout(typingTimeoutRef.current);
                      }
                      if (message.data) {
                        typingTimeoutRef.current = setTimeout(() => {
                          setOpponentTyping(false);
                        }, 3000);
                      }
                    }
                    break;
                }
              });
              
              // Set up data channel onopen handler to send word when ready
              dataChannel.addEventListener('open', async () => {
                console.log('Host: Data channel opened, selecting and sending word...');
                
                if (!mounted) {
                  console.log('Host: Component unmounted, not sending word');
                  return;
                }
                
                try {
                  const wordLists = await loadWordLists();
                  const randomWord = wordLists.solutions[Math.floor(Math.random() * wordLists.solutions.length)];
                  console.log('Host: Word selected:', randomWord);
                  
                  // Set solution locally for host
                  setSolution(randomWord);
                  
                  // Send word to guest via data channel
                  webrtc.sendMessage({
                    type: 'word-selected',
                    data: randomWord
                  });
                  console.log('Host: Word sent to guest successfully');
                } catch (error) {
                  console.error('Host: Error selecting/sending word:', error);
                }
              });
              
              // Set up audio streaming
              try {
                console.log('Host: Setting up audio stream...');
                await webrtc.addAudioStream();
                setAudioEnabled(true);
                console.log('Host: Audio stream added');
              } catch (error: any) {
                console.warn('Host: Failed to add audio stream:', error);
                setAudioError(error.message || 'Microphone access denied');
              }
              
              // Set up remote audio handler
              webrtc.onRemoteStream((stream) => {
                console.log('Host: Received remote audio stream');
                if (remoteAudioRef.current) {
                  remoteAudioRef.current.srcObject = stream;
                  remoteAudioRef.current.play().catch(e => console.warn('Auto-play failed:', e));
                }
              });
              
              const offer = await webrtc.createOffer();
              console.log('Host: Offer created, sending...');
              signaling.sendOffer(offer, roomId);
              console.log('Host: Offer sent');
              
              // Wait for answer
              signaling.on('answer', async (answerMessage: any) => {
                console.log('Host: Received answer');
                try {
                  await webrtc.handleAnswer(answerMessage.data);
                  console.log('Host: Answer processed, waiting for data channel to open...');
                } catch (error) {
                  console.error('Host: Error processing answer:', error);
                }
              });
            } catch (error) {
              console.error('Host: Error creating offer:', error);
              hasStartedHandshake = false; // Reset on error
            }
          }
        });
        
        // Handle incoming game messages
        webrtc.onMessage((message: GameMessage) => {
          if (!mounted) return;
          
          console.log('Received game message:', message);
          
          switch (message.type) {
            case 'word-selected':
              if (message.data) {
                console.log('Word selected:', message.data);
                setSolution(message.data);
              }
              break;
              
            case 'keystroke':
              if (message.data) {
                const { action, letter } = message.data;
                setCurrentGuess(prev => {
                  if (action === 'add' && prev.length < WORD_LENGTH) {
                    return prev + letter;
                  } else if (action === 'delete') {
                    return prev.slice(0, -1);
                  }
                  return prev;
                });
              }
              break;
              
            case 'guess-submitted':
              if (message.data) {
                setGuesses(message.data.guesses);
                setCurrentGuessIndex(message.data.guessIndex);
                setCurrentGuess('');
                if (message.data.keyStatuses) {
                  setKeyStatuses(message.data.keyStatuses);
                }
              }
              break;
              
            case 'game-over':
              if (message.data) {
                setGameStatus(message.data.won ? 'won' : 'lost');
              }
              break;
              
            case 'chat-message':
              if (message.data && message.from) {
                setChatMessages(prev => [...prev, {
                  from: message.from!,
                  message: message.data,
                  timestamp: message.timestamp || Date.now(),
                  isOwn: false
                }]);
              }
              break;
              
            case 'typing-indicator':
              setOpponentTyping(message.data?.isTyping || false);
              break;
          }
        });
        
        webrtc.onConnectionStateChange((state) => {
          console.log('Connection state changed:', state);
          setConnectionState(state === 'connected' ? 'connected' : state === 'connecting' ? 'connecting' : 'disconnected');
        });
        
        // Set up ICE candidate callback
        webrtc.onICECandidate((candidate) => {
          console.log('Sending ICE candidate');
          signaling.sendICECandidate(candidate, roomId);
        });
        
        // Guest joins room
        if (!isHost) {
          console.log('Guest: Joining room');
          signaling.joinRoom(roomId);
        }
        
        console.log('Collaborative multiplayer initialized');
      } catch (error) {
        console.error('Error initializing multiplayer:', error);
      }
    };
    
    initConnection();
    
    return () => {
      mounted = false;
      console.log('Component unmounting - cleanup starting');
      
      // Only close WebRTC if game is actually over or user exited
      // DON'T close during normal gameplay!
      if (gameStatus !== 'playing') {
        console.log('Game over, closing WebRTC connection');
        if (webrtcRef.current) {
          webrtcRef.current.close();
          webrtcRef.current = null;
        }
      } else {
        console.log('Game still playing, keeping WebRTC connection open');
      }
      
      connectionManager.decrementUsage();
    };
  }, [roomId, isHost, playerName]);

  // Handle key presses
  const handleKeyPress = (key: string) => {
    if (gameStatus !== 'playing' || !solution) return;
    
    const webrtc = webrtcRef.current;
    
    if (key === 'Enter') {
      if (currentGuess.length === WORD_LENGTH) {
        const newGuesses = [...guesses];
        newGuesses[currentGuessIndex] = currentGuess;
        setGuesses(newGuesses);
        
        // Update key statuses
        const newKeyStatuses = { ...keyStatuses };
        const solutionChars = solution.split('');
        
        currentGuess.split('').forEach((letter, index) => {
          if (solutionChars[index] === letter) {
            newKeyStatuses[letter] = 'correct';
          } else if (solutionChars.includes(letter)) {
            if (newKeyStatuses[letter] !== 'correct') {
              newKeyStatuses[letter] = 'present';
            }
          } else {
            if (!newKeyStatuses[letter]) {
              newKeyStatuses[letter] = 'absent';
            }
          }
        });
        
        setKeyStatuses(newKeyStatuses);
        
        const isWin = currentGuess === solution;
        const isLoss = currentGuessIndex === MAX_GUESSES - 1;
        
        // Broadcast guess
        if (webrtc) {
          webrtc.sendMessage({
            type: 'guess-submitted',
            data: {
              guesses: newGuesses,
              guessIndex: currentGuessIndex + 1,
              keyStatuses: newKeyStatuses
            }
          });
          
          if (isWin || isLoss) {
            webrtc.sendMessage({
              type: 'game-over',
              data: { won: isWin }
            });
          }
        }
        
        if (isWin || isLoss) {
          setGameStatus(isWin ? 'won' : 'lost');
        } else {
          setCurrentGuessIndex(currentGuessIndex + 1);
          setCurrentGuess('');
        }
      }
    } else if (key === 'Backspace') {
      setCurrentGuess(prev => prev.slice(0, -1));
      
      // Broadcast keystroke
      if (webrtc) {
        webrtc.sendMessage({
          type: 'keystroke',
          data: { action: 'delete' }
        });
      }
    } else if (key.length === 1 && key.match(/[a-z]/i)) {
      if (currentGuess.length < WORD_LENGTH) {
        const upperKey = key.toUpperCase();
        setCurrentGuess(prev => prev + upperKey);
        
        // Broadcast keystroke
        if (webrtc) {
          webrtc.sendMessage({
            type: 'keystroke',
            data: { action: 'add', letter: upperKey }
          });
        }
      }
    }
    
    // Send typing indicator
    if (webrtc) {
      webrtc.sendMessage({
        type: 'typing-indicator',
        data: { isTyping: true }
      });
      
      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Stop typing indicator after 1 second of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        webrtc.sendMessage({
          type: 'typing-indicator',
          data: { isTyping: false }
        });
      }, 1000);
    }
  };

  // Handle chat message send
  const handleSendMessage = (message: string) => {
    const webrtc = webrtcRef.current;
    
    // Add to local chat
    const chatMsg: ChatMessage = {
      from: playerName,
      message,
      timestamp: Date.now(),
      isOwn: true
    };
    setChatMessages(prev => [...prev, chatMsg]);
    
    // Send to opponent
    if (webrtc) {
      webrtc.sendMessage({
        type: 'chat-message',
        data: message,
        from: playerName,
        timestamp: Date.now()
      });
    }
  };

  // Handle audio mute toggle
  const handleToggleMute = () => {
    const webrtc = webrtcRef.current;
    if (webrtc && audioEnabled) {
      const newMutedState = !isMuted;
      webrtc.toggleAudio(newMutedState);
      setIsMuted(newMutedState);
    }
  };

  // Loading state
  if (!solution) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 backdrop-blur-sm z-50">
        <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full mx-4 text-center">
          <div className="mb-6">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
          <h2 className="text-2xl font-bold text-gray-100 mb-2">MULTIPLAYER</h2>
          <p className="text-xl font-semibold text-gray-200 mb-4">
            {isHost ? 'Waiting for player to join...' : 'Connecting to host...'}
          </p>
          <div className={`text-sm ${connectionState === 'connected' ? 'text-green-400' : 'text-yellow-400'}`}>
            {connectionState}
          </div>
          {isHost && (
            <div className="mt-6 p-4 bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-300 mb-2">Share this room code:</p>
              <p className="text-3xl font-bold text-blue-400 tracking-widest">{roomId}</p>
            </div>
          )}
          <button
            onClick={onExit}
            className="mt-6 bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Main game UI
  return (
    <div className="flex flex-col h-full items-center justify-center p-4">
      {/* Header */}
      <div className="w-full max-w-2xl mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-100">Collaborative Wordle</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-sm text-gray-400">Room: {roomId}</span>
              <div className={`flex items-center gap-1 text-sm ${connectionState === 'connected' ? 'text-green-400' : 'text-yellow-400'}`}>
                <div className={`w-2 h-2 rounded-full ${connectionState === 'connected' ? 'bg-green-400' : 'bg-yellow-400'}`} />
                {connectionState}
              </div>
              {audioError && (
                <span className="text-xs text-red-400" title={audioError}>🎤❌</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Audio controls */}
            {audioEnabled && (
              <button
                onClick={handleToggleMute}
                className={`${isMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2`}
                title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
              >
                {isMuted ? '🎤🔇' : '🎤'}
              </button>
            )}
            <button
              onClick={onExit}
              className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm"
            >
              Exit
            </button>
          </div>
        </div>
        
        {/* Typing indicator */}
        {opponentTyping && (
          <div className="mt-2 text-sm text-blue-400 animate-pulse">
            {opponentName} is typing...
          </div>
        )}
      </div>

      {/* Game Grid */}
      <div className="mb-8">
        <Grid 
          guesses={guesses}
          currentGuess={currentGuess}
          currentGuessIndex={currentGuessIndex}
          solution={solution}
        />
      </div>

      {/* Keyboard */}
      <div className="w-full max-w-2xl">
        <Keyboard 
          onKeyPress={handleKeyPress}
          keyStatuses={keyStatuses}
        />
      </div>

      {/* Game Over Message */}
      {gameStatus !== 'playing' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 backdrop-blur-sm z-30">
          <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full mx-4 text-center">
            <h2 className="text-3xl font-bold text-gray-100 mb-4">
              {gameStatus === 'won' ? '🎉 You Won!' : '😔 Game Over'}
            </h2>
            <p className="text-xl text-gray-300 mb-2">The word was:</p>
            <p className="text-4xl font-bold text-blue-400 mb-6">{solution}</p>
            <button
              onClick={onExit}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold"
            >
              Back to Lobby
            </button>
          </div>
        </div>
      )}

      {/* Chat Component */}
      <MultiplayerChat
        messages={chatMessages}
        playerName={playerName}
        onSendMessage={handleSendMessage}
        isConnected={connectionState === 'connected'}
      />

      {/* Hidden audio element for remote stream */}
      <audio
        ref={remoteAudioRef}
        autoPlay
        style={{ display: 'none' }}
      />
    </div>
  );
};

