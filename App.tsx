import React, { useReducer, useEffect, useCallback, useRef, useState, createContext } from 'react';
import { Grid } from './components/Grid';
import { Keyboard } from './components/Keyboard';
import { Boosts } from './components/Boosts';
import { useKeyPress } from './hooks/useKeyPress';
import { loadWordLists } from './services/wordService';
import { GameState, GameAction, GameStatus, Stats, KeyStatuses } from './types';
import './App.css';


const WORD_LENGTH = 5;
const MAX_GUESSES = 6;
const STATS_KEY = 'word-guess-stats';
const MODAL_ANIMATION_DELAY = 1200; // ms for 5 tiles to flip

// Game modes
enum GameMode {
  Unlimited = 'unlimited',
  WordOfTheDay = 'wordOfTheDay'
}

// Context for hint tiles to avoid prop drilling through Grid/Row
export const AppContext = createContext<{ hintIndices: Set<number>; solution: string }>({ hintIndices: new Set(), solution: '' });

// --- Stats Persistence ---
const loadStats = (): Stats => {
  const storedStats = localStorage.getItem(STATS_KEY);
  const defaultDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  if (storedStats) {
    try {
      const parsed = JSON.parse(storedStats);
      if ('gamesPlayed' in parsed && 'wins' in parsed && 'currentStreak' in parsed && 'maxStreak' in parsed) {
        // Migration for older stats objects
        if (!parsed.guessDistribution) {
          parsed.guessDistribution = defaultDistribution;
        }
        return parsed as Stats;
      }
    } catch {
      // If parsing fails, fall back to default
    }
  }
  return { gamesPlayed: 0, wins: 0, currentStreak: 0, maxStreak: 0, guessDistribution: defaultDistribution };
};

const saveStats = (stats: Stats) => {
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
};

// Word of the Day Algorithm
const getWordOfTheDay = (solutions: string[]): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1; // 1-12
  const day = today.getDate();

  // Create a deterministic seed from the date
  const seed = year * 10000 + month * 100 + day;

  // Use the seed to select a word from the solutions array
  const wordIndex = seed % solutions.length;
  return solutions[wordIndex];
};

const initialState: GameState = {
  solution: '',
  guesses: Array(MAX_GUESSES).fill(''),
  currentGuessIndex: 0,
  currentGuess: '',
  gameStatus: GameStatus.Loading,
  keyStatuses: {},
  error: null,
  isInvalidGuess: false,
  stats: loadStats(),
};

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_GAME':
      return {
        ...initialState,
        stats: state.stats, // Persist stats across new games
        solution: action.payload.solution,
        gameStatus: GameStatus.Playing,
      };
    case 'NEW_GAME':
      return {
        ...state,
        gameStatus: GameStatus.Loading,
      };
    case 'TYPE_LETTER':
      if (state.gameStatus !== GameStatus.Playing || state.currentGuess.length >= WORD_LENGTH) {
        return state;
      }
      return {
        ...state,
        currentGuess: state.currentGuess + action.payload.letter.toUpperCase(),
      };
    case 'BACKSPACE':
      if (state.gameStatus !== GameStatus.Playing || state.currentGuess.length === 0) {
        return state;
      }
      return {
        ...state,
        currentGuess: state.currentGuess.slice(0, -1),
      };
    case 'SUBMIT_GUESS': {
      const { validWords, guess } = action.payload;

      if (state.gameStatus !== GameStatus.Playing || guess.length !== WORD_LENGTH) {
        return state;
      }

      if (!validWords.has(guess)) {
          return { ...state, error: 'Not in word list', isInvalidGuess: true };
      }

      const newGuesses = [...state.guesses];
      newGuesses[state.currentGuessIndex] = guess;

      const newKeyStatuses = { ...state.keyStatuses };
      const solutionChars = state.solution.split('');

      guess.split('').forEach((letter, index) => {
        if (solutionChars[index] === letter) {
          newKeyStatuses[letter] = 'correct';
          solutionChars[index] = '_';
        }
      });

      guess.split('').forEach((letter, index) => {
        if (state.solution[index] !== letter) {
           if (solutionChars.includes(letter)) {
             if (newKeyStatuses[letter] !== 'correct') {
                newKeyStatuses[letter] = 'present';
             }
             solutionChars[solutionChars.indexOf(letter)] = '_';
           } else if (!newKeyStatuses[letter]) {
             newKeyStatuses[letter] = 'absent';
           }
        }
      });

      const isWin = guess === state.solution;
      const newGameStatus = isWin
        ? GameStatus.Won
        : state.currentGuessIndex === MAX_GUESSES - 1
        ? GameStatus.Lost
        : GameStatus.Playing;

      let updatedStats = state.stats;
      if (newGameStatus === GameStatus.Won || newGameStatus === GameStatus.Lost) {
          updatedStats = { ...state.stats };
          updatedStats.gamesPlayed += 1;
          if (isWin) {
              updatedStats.wins += 1;
              updatedStats.currentStreak += 1;
              if (updatedStats.currentStreak > updatedStats.maxStreak) {
                  updatedStats.maxStreak = updatedStats.currentStreak;
              }
              const guessNum = state.currentGuessIndex + 1;
              const newDistribution = { ...updatedStats.guessDistribution };
              newDistribution[guessNum] = (newDistribution[guessNum] || 0) + 1;
              updatedStats.guessDistribution = newDistribution;
          } else {
              updatedStats.currentStreak = 0;
          }
      }

      return {
        ...state,
        guesses: newGuesses,
        currentGuessIndex: state.currentGuessIndex + 1,
        currentGuess: '',
        gameStatus: newGameStatus,
        keyStatuses: newKeyStatuses,
        error: null,
        stats: updatedStats
      };
    }
    case 'SET_ERROR':
        const isInvalid = action.payload.error !== null;
        return {
            ...state,
            error: action.payload.error,
            isInvalidGuess: isInvalid,
        };
    case 'SET_CURRENT_GUESS':
      return {
        ...state,
        currentGuess: action.payload,
      };
    case 'UPDATE_KEY_STATUSES':
      return {
        ...state,
        keyStatuses: action.payload,
      };
    default:
      return state;
  }
}


function App() {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const wordLists = useRef<{ solutions: string[], validWords: Set<string> } | null>(null);
  const announcementsRef = useRef<HTMLDivElement>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showStats, setShowStats] = useState(false);
  // Track revealed hints: just store which indices were revealed
  const [revealedHintIndices, setRevealedHintIndices] = useState<Set<number>>(new Set());
  const [keySequence, setKeySequence] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [gameMode, setGameMode] = useState<GameMode>(GameMode.Unlimited);
  const [showWordOfTheDayConfirm, setShowWordOfTheDayConfirm] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);

  // Enable audio on first user interaction
  const enableAudio = useCallback(() => {
    if (!audioEnabled) {
      setAudioEnabled(true);
      console.log('Audio enabled for celebrations');
    }
  }, [audioEnabled]);

  const startNewGame = useCallback(async (mode: GameMode = GameMode.Unlimited) => {
    if (!wordLists.current) {
        try {
            wordLists.current = await loadWordLists();
        } catch (e) {
            dispatch({ type: 'SET_ERROR', payload: { error: 'Failed to load words.' } });
            return;
        }
    }
    const { solutions } = wordLists.current;

    let newSolution: string;
    if (mode === GameMode.WordOfTheDay) {
        newSolution = getWordOfTheDay(solutions);
    } else {
        newSolution = solutions[Math.floor(Math.random() * solutions.length)];
    }

    setGameMode(mode);
    dispatch({ type: 'START_GAME', payload: { solution: newSolution } });
  }, []);

  // Reset hints only when starting a completely new game
  useEffect(() => {
    if (state.gameStatus === GameStatus.Loading) {
      setRevealedHintIndices(new Set());
    }
  }, [state.gameStatus]);

  // Calculate which hints should be visible based on:
  // 1. What indices were revealed (revealedHintIndices)
  // 2. What indices have been correctly guessed (should NOT show)
  const getVisibleHints = useCallback((): Set<number> => {
    const correctIndices = new Set<number>();

    // Find all positions that have been correctly guessed
    state.guesses.forEach(guess => {
      if (guess) {
        guess.split('').forEach((letter, i) => {
          if (state.solution[i] === letter) {
            correctIndices.add(i);
          }
        });
      }
    });

    // Only show revealed hints that haven't been correctly guessed yet
    const visibleHints = new Set<number>();
    revealedHintIndices.forEach(index => {
      if (!correctIndices.has(index)) {
        visibleHints.add(index);
      }
    });

    return visibleHints;
  }, [state.guesses, state.solution, revealedHintIndices]);

  useEffect(() => {
    if(state.gameStatus === GameStatus.Loading) {
      startNewGame();
    }
  }, [state.gameStatus, startNewGame]);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                             window.innerWidth <= 768;
      setIsMobile(isMobileDevice);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    document.title = "React Word Guess Game";
    if (state.gameStatus === GameStatus.Won) {
        document.title = "You Won! - React Word Guess Game";
    } else if (state.gameStatus === GameStatus.Lost) {
        document.title = "Game Over - React Word Guess Game";
    }
  }, [state.gameStatus]);

  useEffect(() => {
      if (state.error) {
        if(announcementsRef.current) announcementsRef.current.textContent = state.error;
          const timer = setTimeout(() => {
              dispatch({ type: 'SET_ERROR', payload: { error: null } });
          }, 1500);
          return () => clearTimeout(timer);
      }
  }, [state.error]);

  useEffect(() => {
    if (state.gameStatus === GameStatus.Won) {
      if(announcementsRef.current) announcementsRef.current.textContent = "Congratulations, you won!";
      saveStats(state.stats);

      // Trigger confetti celebration
      const guessCount = state.currentGuessIndex + 1;
      triggerCelebration(guessCount);

      const timer = setTimeout(() => setShowStats(true), MODAL_ANIMATION_DELAY);
      return () => clearTimeout(timer);
    } else if (state.gameStatus === GameStatus.Lost) {
      if(announcementsRef.current) announcementsRef.current.textContent = `Game over! The word was ${state.solution}.`;
      saveStats(state.stats);
      const timer = setTimeout(() => setShowStats(true), MODAL_ANIMATION_DELAY);
      return () => clearTimeout(timer);
    }
  }, [state.gameStatus, state.solution, state.stats, state.currentGuessIndex]);


  const handleKeyPress = useCallback((key: string) => {
    enableAudio(); // Enable audio on first key press
    if (state.gameStatus !== GameStatus.Playing) return;

    // Check for cheat code
    if (key.length === 1 && key.match(/[a-z]/i)) {
        const newSequence = (keySequence + key).slice(-6);
        setKeySequence(newSequence);
        if (newSequence.toUpperCase() === 'JESHUA' || newSequence.toUpperCase() === 'AMARA') {
            dispatch({ type: 'SET_CURRENT_GUESS', payload: state.solution });
            setKeySequence(''); // Reset after use
            return; // Exit to avoid processing as a normal letter
        }
    } else {
        setKeySequence(''); // Reset on non-letter keys
    }

    // Hints persist until explicitly cleared or new game starts

    if (key === 'Enter') {
      // Use the actual typed letters, not the ghost letters
      if (state.currentGuess.length !== WORD_LENGTH) {
        dispatch({ type: 'SET_ERROR', payload: { error: 'Not enough letters' } });
        return;
      }

      dispatch({ type: 'SUBMIT_GUESS', payload: { validWords: wordLists.current!.validWords, guess: state.currentGuess } });
    } else if (key === 'Backspace') {
      dispatch({ type: 'BACKSPACE' });
    } else if (key.length === 1 && key.match(/[a-z]/i)) {
      dispatch({ type: 'TYPE_LETTER', payload: { letter: key } });
    }
  }, [state.gameStatus, state.currentGuess, state.solution, keySequence]);

  useKeyPress(handleKeyPress);

  // Track if we're currently processing a reveal to prevent double-calls
  const isProcessingRevealRef = useRef(false);

  // Only called when user clicks the Reveal button
  const handleRevealBoost = useCallback(() => {
    // Prevent double-calls
    if (isProcessingRevealRef.current) {
      return;
    }

    isProcessingRevealRef.current = true;

    // Find all indices that are already correct (green) from previous guesses
    const correctIndices = new Set<number>();
    state.guesses.forEach(guess => {
      if (guess) {
        guess.split('').forEach((letter, i) => {
          if (state.solution[i] === letter) {
            correctIndices.add(i);
          }
        });
      }
    });

    // Find the first index that hasn't been revealed yet and isn't correct
    let revealableIndex: number | null = null;
    for (let i = 0; i < state.solution.length; i++) {
      if (!correctIndices.has(i) && !revealedHintIndices.has(i)) {
        revealableIndex = i;
        break;
      }
    }

    // Add this index to the revealed hints
    if (revealableIndex !== null) {
      setRevealedHintIndices(prev => new Set(prev).add(revealableIndex));
    }

    // Reset the flag after a short delay to allow the next legitimate click
    setTimeout(() => {
      isProcessingRevealRef.current = false;
    }, 100);
  }, [state.solution, state.guesses, revealedHintIndices]);

  const handleEliminateBoost = useCallback(() => {
    const solutionLetters = new Set(state.solution.split(''));
    const allKeys = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('');

    const eliminatable = allKeys.filter(key =>
        !solutionLetters.has(key) && (!state.keyStatuses[key] || state.keyStatuses[key] === 'unused')
    );

    // Shuffle and pick 3
    const shuffled = eliminatable.sort(() => 0.5 - Math.random());
    const toEliminate = shuffled.slice(0, 3);

    if (toEliminate.length > 0) {
        const newKeyStatuses: KeyStatuses = { ...state.keyStatuses };
        toEliminate.forEach(key => {
            newKeyStatuses[key] = 'absent';
        });
        dispatch({ type: 'UPDATE_KEY_STATUSES', payload: newKeyStatuses });
    }
  }, [state.keyStatuses, state.solution]);


  const isGameOver = state.gameStatus === GameStatus.Won || state.gameStatus === GameStatus.Lost;
  const canReveal = state.solution.split('').some((_, i) => {
      // Check if this position has been correctly guessed in any previous row
      return !state.guesses.some(g => g && g[i] === state.solution[i]);
  });

  const winPercentage = state.stats.gamesPlayed > 0 ? Math.round((state.stats.wins / state.stats.gamesPlayed) * 100) : 0;

  const distEntries = Object.entries(state.stats.guessDistribution);
  const maxDistCount = Math.max(...distEntries.map(([, count]) => count as number), 1);

  const handlePlayAgain = () => {
    dispatch({ type: 'NEW_GAME' });
    setShowStats(false);
  };

  const handleDownload = () => {
    if ((window as any).AddToHomeScreenInstance) {
      (window as any).AddToHomeScreenInstance.show();
    }
  };

  const handleWordOfTheDayClick = () => {
    setShowWordOfTheDayConfirm(true);
  };

  const handleConfirmWordOfTheDay = () => {
    setShowWordOfTheDayConfirm(false);
    startNewGame(GameMode.WordOfTheDay);
  };

  const handlePlayUnlimited = () => {
    startNewGame(GameMode.Unlimited);
  };

  // Confetti celebration function
  const triggerCelebration = (guessCount: number) => {
    // Play audio celebration
    const playAudio = (audioFile: string) => {
      if (!audioEnabled) {
        console.log('Audio not enabled yet, skipping:', audioFile);
        return;
      }
      
      console.log('Attempting to play audio:', audioFile);
      
      try {
        const audio = new Audio(audioFile);
        audio.volume = 0.8; // Set volume to 80%
        audio.preload = 'auto';
        audio.crossOrigin = 'anonymous'; // Add CORS support
        
        // Add event listeners for debugging
        audio.addEventListener('loadstart', () => console.log('Audio load started:', audioFile));
        audio.addEventListener('canplay', () => console.log('Audio can play:', audioFile));
        audio.addEventListener('error', (e) => {
          console.log('Audio error:', e, audioFile);
          console.log('Audio error details:', {
            error: audio.error,
            networkState: audio.networkState,
            readyState: audio.readyState,
            src: audio.src
          });
        });
        
        // Try to play the audio
        const playPromise = audio.play();
        
        if (playPromise !== undefined) {
          playPromise.then(() => {
            console.log('Audio played successfully:', audioFile);
          }).catch(err => {
            console.log('Audio play failed:', err, 'File:', audioFile);
            // Try again with user gesture simulation
            setTimeout(() => {
              audio.play().catch(e => console.log('Retry failed:', e, 'File:', audioFile));
            }, 100);
          });
        }
      } catch (err) {
        console.log('Audio creation failed:', err, 'File:', audioFile);
      }
    };

    // Fallback: Generate celebration sound using Web Audio API
    const playFallbackSound = (isEpic: boolean) => {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        if (isEpic) {
          // Epic sound for 1-guess win
          oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.1);
          oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.3);
          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.5);
        } else {
          // Regular sound for other wins
          oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.2);
          gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.3);
        }
        
        console.log('Played fallback celebration sound');
      } catch (err) {
        console.log('Fallback sound failed:', err);
      }
    };

    if (typeof window !== 'undefined' && (window as any).confetti) {
      const confetti = (window as any).confetti;

      if (guessCount === 1) {
        // Play special audio for 1-guess win
        playAudio('/dunhamwordle/audio/mom-awesome.mp3');
        // Fallback to generated sound if MP3 fails
        setTimeout(() => playFallbackSound(true), 100);
        // EPIC celebration for getting it in 1 guess!
        // Multiple bursts from different positions
        confetti({
          particleCount: 300,
          spread: 150,
          origin: { y: 0.3 },
          colors: ['#ffd700', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff']
        });

        // Left side burst
        setTimeout(() => {
          confetti({
            particleCount: 200,
            spread: 60,
            origin: { x: 0.2, y: 0.8 },
            colors: ['#ffd700', '#ff6b6b', '#4ecdc4']
          });
        }, 200);

        // Right side burst
        setTimeout(() => {
          confetti({
            particleCount: 200,
            spread: 60,
            origin: { x: 0.8, y: 0.8 },
            colors: ['#45b7d1', '#96ceb4', '#feca57']
          });
        }, 400);

        // Final center burst
        setTimeout(() => {
          confetti({
            particleCount: 250,
            spread: 180,
            origin: { y: 0.6 },
            colors: ['#ffd700', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff', '#5f27cd']
          });
        }, 800);
      } else {
        // Play regular audio for other wins
        playAudio('/dunhamwordle/audio/mom-you-did-it.mp3');
        // Fallback to generated sound if MP3 fails
        setTimeout(() => playFallbackSound(false), 100);
        // Regular celebration for other wins
        confetti({
          particleCount: 150,
          spread: 100,
          origin: { y: 0.6 },
          colors: ['#538d4e', '#b59f3b', '#3a3a3c', '#ffffff']
        });
      }
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-lg mx-auto p-2 sm:p-4 font-sans overflow-hidden lg:justify-center" style={{ height: '100dvh' }}>
      <div ref={announcementsRef} className="absolute w-1 h-1 -m-1 overflow-hidden p-0 border-0" style={{ clip: 'rect(0,0,0,0)' }} aria-live="assertive"></div>

      <header className="flex items-center justify-between border-b border-gray-600 pb-1 mb-1 flex-shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={() => { enableAudio(); setShowHelp(true); }} aria-label="How to play">
             <HelpCircle className="h-5 w-5 text-gray-400 hover:text-white" />
          </button>
           <button onClick={() => { enableAudio(); setShowStats(true); }} aria-label="View statistics">
             <BarChart4 className="h-5 w-5 text-gray-400 hover:text-white" />
          </button>
          {isMobile && (
            <button onClick={handleDownload} aria-label="Install app">
              <Download className="h-5 w-5 text-gray-400 hover:text-white" />
            </button>
          )}
        </div>
        <h1 className="text-xl sm:text-2xl md:text-4xl font-bold tracking-wider">WORDLE</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => { enableAudio(); handleWordOfTheDayClick(); }} aria-label="Word of the Day">
            <Calendar className="h-5 w-5 text-gray-400 hover:text-white" />
          </button>
          <button onClick={() => { enableAudio(); dispatch({ type: 'NEW_GAME' }); }} aria-label="New Game">
             <RefreshCw className="h-5 w-5 text-gray-400 hover:text-white" />
          </button>
        </div>
      </header>

      {/* IMPORTANT: Layout spacing rules - DO NOT CHANGE without explicit request */}
      {/* mb-4: Fixed 16px gap between grid and keyboard (not flexible spacing) */}
      <main className="flex flex-col items-center relative flex-shrink-0 mb-4">
         {state.error && (
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 z-50 bg-orange-800 text-white font-bold py-2 px-4 rounded-md animate-shake whitespace-nowrap">
                {state.error}
            </div>
         )}

        {state.gameStatus === GameStatus.Loading ? (
            <p>Loading...</p>
        ) : (
             <AppContext.Provider value={{ hintIndices: getVisibleHints(), solution: state.solution }}>
                 <Grid
                    guesses={state.guesses}
                    currentGuess={state.currentGuess}
                    currentGuessIndex={state.currentGuessIndex}
                    solution={state.solution}
                    isInvalidGuess={state.isInvalidGuess}
                />
             </AppContext.Provider>
        )}
      </main>

      <div className="flex-shrink-0">
        <Boosts
          onReveal={handleRevealBoost}
          onEliminate={handleEliminateBoost}
          isRevealDisabled={isGameOver || !canReveal}
          isEliminateDisabled={isGameOver}
        />

        <Keyboard onKeyPress={handleKeyPress} keyStatuses={state.keyStatuses} />
      </div>


      {showHelp && (
        <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4" onClick={() => setShowHelp(false)}>
            <div className="bg-zinc-800 p-8 rounded-lg shadow-xl max-w-md w-full relative" onClick={(e) => e.stopPropagation()}>
                 <button className="absolute top-4 right-4 text-gray-400 hover:text-white" onClick={() => setShowHelp(false)} aria-label="Close help">
                    <X className="h-6 w-6"/>
                </button>
                <h2 className="text-2xl font-bold mb-4 text-center">Game Features</h2>

                <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3 text-green-400">Special Boosts</h3>
                    <div className="space-y-3">
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-sm flex-shrink-0">💡</div>
                            <div>
                                <p className="font-semibold">Reveal Hint</p>
                                <p className="text-sm text-gray-300">Shows you one letter from the solution word. Perfect for getting unstuck!</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center text-white font-bold text-sm flex-shrink-0">❌</div>
                            <div>
                                <p className="font-semibold">Eliminate Letters</p>
                                <p className="text-sm text-gray-300">Removes 3 wrong letters from the keyboard, making it easier to focus on the right ones.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3 text-blue-400">Word of the Day</h3>
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-purple-600 rounded flex items-center justify-center text-white font-bold text-sm flex-shrink-0">📅</div>
                        <div>
                            <p className="font-semibold">Family Challenge</p>
                            <p className="text-sm text-gray-300">Everyone gets the same word each day! Perfect for comparing strategies and celebrating together.</p>
                        </div>
                    </div>
                </div>

                <div className="border-t border-gray-600 pt-4">
                    <h3 className="text-lg font-semibold mb-2 text-yellow-400">Want New Features?</h3>
                    <p className="text-sm text-gray-300">
                        If there are features the family wants, just ask me! I'm always happy to add new things to make the game more fun.
                    </p>
                </div>
            </div>
        </div>
      )}

      {showStats && (
        <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4" onClick={() => setShowStats(false)}>
            <div className="bg-zinc-800 p-8 rounded-lg shadow-xl max-w-md w-full relative" onClick={(e) => e.stopPropagation()}>
                 <button className="absolute top-4 right-4 text-gray-400 hover:text-white" onClick={() => setShowStats(false)} aria-label="Close statistics">
                    <X className="h-6 w-6"/>
                </button>

                {isGameOver && (
                    <div className="text-center mb-6">
                        <h2 className="text-3xl font-bold mb-2">{state.gameStatus === GameStatus.Won ? 'You Won!' : 'Game Over'}</h2>
                        <p>The word was: <strong className="text-2xl tracking-widest">{state.solution}</strong></p>
                    </div>
                )}

                <h2 className="text-2xl font-bold mb-6 text-center">Statistics</h2>
                <div className="flex justify-around text-center mb-6">
                    <div>
                        <p className="text-4xl font-bold">{state.stats.gamesPlayed}</p>
                        <p className="text-xs text-gray-400">Played</p>
                    </div>
                     <div>
                        <p className="text-4xl font-bold">{winPercentage}</p>
                        <p className="text-xs text-gray-400">Win %</p>
                    </div>
                     <div>
                        <p className="text-4xl font-bold">{state.stats.currentStreak}</p>
                        <p className="text-xs text-gray-400">Current Streak</p>
                    </div>
                     <div>
                        <p className="text-4xl font-bold">{state.stats.maxStreak}</p>
                        <p className="text-xs text-gray-400">Max Streak</p>
                    </div>
                </div>

                <h3 className="text-xl font-bold mb-4 text-center">Guess Distribution</h3>
                <div className="space-y-2 px-4">
                  {distEntries.map(([guesses, count]) => {
                    const countNum = count as number;
                    return (
                      <div key={guesses} className="flex items-center gap-3 w-full text-base">
                        <div className="w-4 font-semibold">{guesses}</div>
                        <div className="flex-1 bg-zinc-700 rounded-sm">
                          <div
                            className={`h-5 text-right pr-2 text-white flex items-center justify-end rounded-sm ${state.gameStatus === GameStatus.Won && state.currentGuessIndex === Number(guesses) ? 'bg-correct' : 'bg-absent'}`}
                            style={{ width: countNum > 0 ? `${(countNum / maxDistCount) * 100}%` : '0' }}
                          >
                            {countNum > 0 && <span className="font-bold">{countNum}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {isGameOver && (
                    <div className="text-center mt-8">
                        {gameMode === GameMode.WordOfTheDay ? (
                            <button
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded"
                                onClick={handlePlayUnlimited}
                            >
                                Play Unlimited Wordle
                            </button>
                        ) : (
                            <button
                                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded"
                                onClick={handlePlayAgain}
                            >
                                Play Again
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
      )}

      {showWordOfTheDayConfirm && (
        <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4" onClick={() => setShowWordOfTheDayConfirm(false)}>
            <div className="bg-zinc-800 p-8 rounded-lg shadow-xl max-w-md w-full relative" onClick={(e) => e.stopPropagation()}>
                 <button className="absolute top-4 right-4 text-gray-400 hover:text-white" onClick={() => setShowWordOfTheDayConfirm(false)} aria-label="Close">
                    <X className="h-6 w-6"/>
                </button>

                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-4">Word of the Day</h2>
                    <p className="mb-6 text-gray-300">
                        Play today's special word! Everyone in the family will get the same word,
                        making it perfect for comparing strategies and celebrating together.
                    </p>
                    <div className="flex gap-3 justify-center">
                        <button
                            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded"
                            onClick={handleConfirmWordOfTheDay}
                        >
                            Play Word of the Day
                        </button>
                        <button
                            className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded"
                            onClick={() => setShowWordOfTheDayConfirm(false)}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Static SEO content section */}
      <section className="hidden" aria-hidden="true">
        <h2>About The Game</h2>
        <p>This is a word guessing game created as a demonstration of modern React development principles. It uses TypeScript, Tailwind CSS, and a clean, component-based architecture. The game state is managed centrally with a useReducer hook for predictability and scalability. The game is fully accessible via keyboard and provides feedback for screen readers.</p>
      </section>
    </div>
  );
}

// Minimal implementation of lucide-react icons for demonstration
const createIcon = (svg: React.ReactNode) => (props: React.SVGProps<SVGSVGElement>) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
    >
        {svg}
    </svg>
);

const HelpCircle = createIcon(
    <>
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
    </>
);

const RefreshCw = createIcon(
    <>
        <path d="M3 2v6h6" />
        <path d="M21 12A9 9 0 0 0 6 5.3L3 8" />
        <path d="M21 22v-6h-6" />
        <path d="M3 12a9 9 0 0 0 15 6.7l3-2.7" />
    </>
);

const Download = createIcon(
    <>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7,10 12,15 17,10" />
        <line x1="12" y1="15" x2="12" y2="3" />
    </>
);

const Calendar = createIcon(
    <>
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
    </>
);

const BarChart4 = createIcon(
    <>
      <path d="M3 3v18h18" />
      <path d="M7 12v5" />
      <path d="M12 8v9" />
      <path d="M17 4v13" />
    </>
);

const X = createIcon(
    <path d="M18 6 6 18M6 6l12 12" />
);


export default App;
