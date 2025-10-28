import React, { useReducer, useEffect, useCallback, useRef, useState, createContext } from 'react';
import { Grid } from './components/Grid';
import { Keyboard } from './components/Keyboard';
import { Boosts } from './components/Boosts';
import { CalendarPicker } from './components/CalendarPicker';
import { StartScreen } from './components/StartScreen';
import { WordChallengeModal } from './components/WordChallengeModal';
import { ResultPlaybackScreen } from './components/ResultPlaybackScreen';
import { PlaybackView } from './components/PlaybackView';
import { MultiplayerLobby } from './components/MultiplayerLobby';
import { CollaborativeMultiplayerGame } from './components/CollaborativeMultiplayerGame';
import { MyChallengesView } from './components/MyChallengesView';
import { MultiplayerProvider } from './contexts/MultiplayerContext';
import { useKeyPress } from './hooks/useKeyPress';
import { loadWordLists } from './services/wordService';
import { loadBadges, saveBadges, checkForNewBadges, calculateDayStreak } from './services/badgeService';
import { extractChallengeFromUrl, extractResultFromUrl, WordChallenge, ChallengeResult, encodeChallengeResult, generateResultUrl, submitChallengeCompletion } from './services/challengeService';
import { GameState, GameAction, GameStatus, GameMode, GameModeStats, KeyStatuses, WordOfTheDayCompletion, Badge } from './types';
import './App.css';


const WORD_LENGTH = 5;
const MAX_GUESSES = 6;
const STATS_KEY = 'word-guess-stats';
const WORD_OF_THE_DAY_COMPLETIONS_KEY = 'word-of-the-day-completions';
const MODAL_ANIMATION_DELAY = 1200; // ms for 5 tiles to flip

// Context for hint tiles to avoid prop drilling through Grid/Row
export const AppContext = createContext<{ hintIndices: Set<number>; solution: string }>({ hintIndices: new Set(), solution: '' });

// --- Stats Persistence ---
const createDefaultStats = () => {
  const defaultDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  return { gamesPlayed: 0, wins: 0, currentStreak: 0, maxStreak: 0, guessDistribution: defaultDistribution };
};

const loadStats = (): GameModeStats => {
  const storedStats = localStorage.getItem(STATS_KEY);
  const defaultStats = createDefaultStats();

  if (storedStats) {
    try {
      const parsed = JSON.parse(storedStats);

      // Check if it's the old format (single stats object)
      if ('gamesPlayed' in parsed && !('unlimited' in parsed)) {
        // Migrate old format to new format
        const migratedStats: GameModeStats = {
          unlimited: {
            gamesPlayed: parsed.gamesPlayed || 0,
            wins: parsed.wins || 0,
            currentStreak: parsed.currentStreak || 0,
            maxStreak: parsed.maxStreak || 0,
            guessDistribution: parsed.guessDistribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
          },
          wordOfTheDay: createDefaultStats()
        };
        return migratedStats;
      }

      // New format
      if ('unlimited' in parsed && 'wordOfTheDay' in parsed) {
        return {
          unlimited: { ...defaultStats, ...parsed.unlimited },
          wordOfTheDay: { ...defaultStats, ...parsed.wordOfTheDay }
        };
      }
    } catch {
      // If parsing fails, fall back to default
    }
  }

  return {
    unlimited: createDefaultStats(),
    wordOfTheDay: createDefaultStats()
  };
};

const saveStats = (stats: GameModeStats) => {
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
};

const loadWordOfTheDayCompletions = (): WordOfTheDayCompletion => {
  const stored = localStorage.getItem(WORD_OF_THE_DAY_COMPLETIONS_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // If parsing fails, fall back to empty object
    }
  }
  return {};
};

const saveWordOfTheDayCompletions = (completions: WordOfTheDayCompletion) => {
  localStorage.setItem(WORD_OF_THE_DAY_COMPLETIONS_KEY, JSON.stringify(completions));
};

// Word of the Day Algorithm - More random approach
const getWordOfTheDay = (solutions: string[], date?: Date): string => {
  const targetDate = date || new Date();
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth() + 1; // 1-12
  const day = targetDate.getDate();

  // Create a more complex seed using multiple mathematical operations
  const baseSeed = year * 10000 + month * 100 + day;

  // Apply multiple transformations to make it less predictable
  const seed1 = (baseSeed * 9301 + 49297) % 233280;
  const seed2 = (seed1 * 9301 + 49297) % 233280;
  const seed3 = (seed2 * 9301 + 49297) % 233280;

  // Combine seeds with additional randomness factors
  const finalSeed = (seed1 + seed2 * 7 + seed3 * 13) % solutions.length;

  return solutions[finalSeed];
};

// Helper function to get date key for storage
const getDateKey = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
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
  wordOfTheDayCompletions: loadWordOfTheDayCompletions(),
  badges: loadBadges(),
  currentGameMode: GameMode.Unlimited,
  selectedDate: undefined,
};

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_GAME':
      return {
        ...initialState,
        stats: state.stats, // Persist stats across new games
        wordOfTheDayCompletions: state.wordOfTheDayCompletions, // Persist completions
        badges: state.badges, // Persist badges across new games
        solution: action.payload.solution,
        currentGameMode: action.payload.gameMode,
        selectedDate: action.payload.selectedDate,
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
      let updatedCompletions = state.wordOfTheDayCompletions;

      if (newGameStatus === GameStatus.Won || newGameStatus === GameStatus.Lost) {
          // Update stats for the current game mode
          updatedStats = { ...state.stats };
          const currentModeStats = { ...updatedStats[state.currentGameMode] };

          currentModeStats.gamesPlayed += 1;
          if (isWin) {
              currentModeStats.wins += 1;
              currentModeStats.currentStreak += 1;
              if (currentModeStats.currentStreak > currentModeStats.maxStreak) {
                  currentModeStats.maxStreak = currentModeStats.maxStreak;
              }
              const guessNum = state.currentGuessIndex + 1;
              const newDistribution = { ...currentModeStats.guessDistribution };
              newDistribution[guessNum] = (newDistribution[guessNum] || 0) + 1;
              currentModeStats.guessDistribution = newDistribution;

              // Update Word of the Day completion if this is a Word of the Day game
              if (state.currentGameMode === GameMode.WordOfTheDay) {
                updatedCompletions = { ...state.wordOfTheDayCompletions };
                const dateToUse = state.selectedDate || new Date();
                const dateKey = getDateKey(dateToUse);
                updatedCompletions[dateKey] = {
                  completed: true,
                  guesses: guessNum,
                  solution: state.solution
                };
              }
          } else {
              currentModeStats.currentStreak = 0;
          }

          updatedStats[state.currentGameMode] = currentModeStats;
      }

      return {
        ...state,
        guesses: newGuesses,
        currentGuessIndex: state.currentGuessIndex + 1,
        currentGuess: '',
        gameStatus: newGameStatus,
        keyStatuses: newKeyStatuses,
        error: null,
        stats: updatedStats,
        wordOfTheDayCompletions: updatedCompletions
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
    case 'UNLOCK_BADGE':
      return {
        ...state,
        badges: {
          ...state.badges,
          [action.payload.badgeId]: action.payload.badge
        }
      };
    case 'UPDATE_DAY_STREAK':
      return {
        ...state,
        stats: {
          ...state.stats,
          wordOfTheDay: {
            ...state.stats.wordOfTheDay,
            dayStreak: action.payload.dayStreak,
            maxDayStreak: action.payload.maxDayStreak
          }
        }
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
  const [showCalendar, setShowCalendar] = useState(false);
  const [showStartScreen, setShowStartScreen] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [showMilesExplosion, setShowMilesExplosion] = useState(false);
  const [showTraceyMessage, setShowTraceyMessage] = useState(false);
  const [gameExploded, setGameExploded] = useState(false);
  const [newBadgeNotification, setNewBadgeNotification] = useState<Badge | null>(null);
  const [showWordChallenge, setShowWordChallenge] = useState(false);
  const [currentChallenge, setCurrentChallenge] = useState<WordChallenge | null>(null);
  const [currentResult, setCurrentResult] = useState<ChallengeResult | null>(null);
  const [showResultPlayback, setShowResultPlayback] = useState(false);
  const [showPlaybackView, setShowPlaybackView] = useState(false);
  const [wordListsState, setWordListsState] = useState<{ solutions: string[]; validWords: Set<string> } | null>(null);
  const [showMultiplayerLobby, setShowMultiplayerLobby] = useState(false);
  const [showMultiplayerGame, setShowMultiplayerGame] = useState(false);
  const [multiplayerRoomId, setMultiplayerRoomId] = useState('');
  const [isMultiplayerHost, setIsMultiplayerHost] = useState(false);
  const [multiplayerPlayerName, setMultiplayerPlayerName] = useState('');
  const [showResultShareConfirm, setShowResultShareConfirm] = useState(false);
  const [pendingResultShare, setPendingResultShare] = useState<{url: string, message: string, creatorName?: string} | null>(null);
  const [showMyChallenges, setShowMyChallenges] = useState(false);

  // Enable audio on first user interaction
  const enableAudio = useCallback(() => {
    if (!audioEnabled) {
      setAudioEnabled(true);
      console.log('Audio enabled for celebrations');
    }
  }, [audioEnabled]);

  // Native share function using Web Share API
  const shareNative = useCallback(async (url: string, title: string, text: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text,
          url
        });
        return true;
      } catch (error) {
        // User cancelled or error occurred
        return false;
      }
    }
    return false;
  }, []);

  const startNewGame = useCallback(async (mode: GameMode = GameMode.Unlimited, date?: Date) => {
    if (!wordLists.current) {
        try {
            wordLists.current = await loadWordLists();
            setWordListsState(wordLists.current);
        } catch (e) {
            console.error('Failed to load word lists:', e);
            dispatch({ type: 'SET_ERROR', payload: { error: 'Failed to load words.' } });
            return;
        }
    }
    const { solutions } = wordLists.current;

    let newSolution: string;
    if (mode === GameMode.WordOfTheDay) {
        newSolution = getWordOfTheDay(solutions, date);
    } else {
        newSolution = solutions[Math.floor(Math.random() * solutions.length)];
    }

    setGameMode(mode);
    dispatch({ type: 'START_GAME', payload: { solution: newSolution, gameMode: mode, selectedDate: date } });
    setRevealedHintIndices(new Set()); // Reset ghost letters for new game
  }, []);

  // Save stats when they change
  useEffect(() => {
    saveStats(state.stats);
  }, [state.stats]);

  // Save Word of the Day completions when they change
  useEffect(() => {
    saveWordOfTheDayCompletions(state.wordOfTheDayCompletions);
  }, [state.wordOfTheDayCompletions]);

  // Save badges when they change
  useEffect(() => {
    saveBadges(state.badges);
  }, [state.badges]);

  // Check for new badges and update day streak when game completes
  useEffect(() => {
    if (state.gameStatus === GameStatus.Won || state.gameStatus === GameStatus.Lost) {
      const isWin = state.gameStatus === GameStatus.Won;
      const guesses = state.currentGuessIndex;
      const gameMode = state.currentGameMode === GameMode.WordOfTheDay ? 'wordOfTheDay' : 'unlimited';

      // Check for new badges
      const newBadges = checkForNewBadges(
        state.stats.unlimited,
        state.stats.wordOfTheDay,
        state.wordOfTheDayCompletions,
        state.badges,
        gameMode,
        guesses,
        isWin
      );

      // Unlock new badges
      newBadges.forEach(badge => {
        dispatch({ type: 'UNLOCK_BADGE', payload: { badgeId: badge.id, badge } });
        // Show notification for the first badge (most recent)
        if (newBadges.length > 0 && badge === newBadges[0]) {
          setNewBadgeNotification(badge);
        }
      });

      // Update day streak for Word of the Day
      if (state.currentGameMode === GameMode.WordOfTheDay) {
        const dayStreak = calculateDayStreak(state.wordOfTheDayCompletions);
        const maxDayStreak = Math.max(dayStreak, state.stats.wordOfTheDay.maxDayStreak || 0);

        if (dayStreak !== state.stats.wordOfTheDay.dayStreak || maxDayStreak !== state.stats.wordOfTheDay.maxDayStreak) {
          dispatch({ type: 'UPDATE_DAY_STREAK', payload: { dayStreak, maxDayStreak } });
        }
      }

      // Handle challenge completion
      if (currentChallenge) {
        const result = {
          challengeId: currentChallenge.challengeId,
          word: currentChallenge.word,
          guesses: state.guesses,
          solved: isWin,
          solveTime: Date.now() - currentChallenge.createdAt.getTime(),
          createdAt: new Date()
        };

        // Submit completion to backend
        submitChallengeCompletion(currentChallenge, result, 'Player').catch(error => {
          console.error('Failed to submit challenge completion:', error);
        });

        const resultUrl = generateResultUrl(result);
        console.log('=== RESULT URL GENERATION ===');
        console.log('Result data:', result);
        console.log('Generated URL:', resultUrl);
        console.log('=============================');

        // Show confirmation modal before sharing
        const guessCount = result.guesses.filter(guess => guess.trim() !== '').length;
        const message = `I just ${isWin ? 'solved' : 'played'} your Play with Friends challenge in Dunham Wordle in ${guessCount} guesses!`;
        
        setTimeout(() => {
          setPendingResultShare({
            url: resultUrl,
            message,
            creatorName: currentChallenge.senderName || 'Friend'
          });
          setShowResultShareConfirm(true);
        }, 2000); // Wait for stats modal to show first

        // Clear the challenge
        setCurrentChallenge(null);
      }
    }
  }, [state.gameStatus, state.currentGuessIndex, state.currentGameMode, state.stats, state.wordOfTheDayCompletions, state.badges, currentChallenge]);

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
    // Dynamic page title based on URL type
    const urlParams = new URLSearchParams(window.location.search);
    
    if (urlParams.has('c') || urlParams.has('challenge')) {
      const challenge = extractChallengeFromUrl();
      const creatorName = challenge?.senderName || 'Friend';
      document.title = `Challenge from ${creatorName} - Dunham Wordle`;
    } else if (urlParams.has('r') || urlParams.has('result')) {
      const result = extractResultFromUrl();
      document.title = result?.solved ? "Challenge Completed! - Dunham Wordle" : "Challenge Result - Dunham Wordle";
    } else if (state.gameStatus === GameStatus.Won) {
      document.title = "You Won! - Dunham Wordle";
    } else if (state.gameStatus === GameStatus.Lost) {
      document.title = "Game Over - Dunham Wordle";
    } else {
      document.title = "Dunham Wordle";
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

  // Check for challenge URLs on app load
  useEffect(() => {
    console.log('=== URL DETECTION ===');
    console.log('Current URL:', window.location.href);
    console.log('Search params:', window.location.search);

    const challenge = extractChallengeFromUrl();
    const result = extractResultFromUrl();

    console.log('Extracted challenge:', challenge);
    console.log('Extracted result:', result);

    if (challenge) {
      console.log('Challenge detected, starting challenge game');
      // Bypass start screen and start challenge immediately
      setShowStartScreen(false);
      setCurrentChallenge(challenge);
      startNewGame(GameMode.Unlimited).then(() => {
        // Add the challenge word to valid words so it can be guessed
        // This happens after startNewGame to ensure word lists are loaded
        if (wordLists.current) {
          wordLists.current.validWords.add(challenge.word);
          // Update the state so the game uses the updated word list
          setWordListsState({ ...wordLists.current });
        }
        // Override the solution with the challenge word
        dispatch({ type: 'START_GAME', payload: { solution: challenge.word, gameMode: GameMode.Unlimited } });
      });
    } else if (result) {
      console.log('Result detected, showing playback screen');
      // Handle challenge result - show result playback screen
      setShowStartScreen(false);
      setCurrentResult(result);
      setShowPlaybackView(true);
    }
  }, []); // Run once on mount


  const handleKeyPress = useCallback((key: string) => {
    enableAudio(); // Enable audio on first key press
    if (state.gameStatus !== GameStatus.Playing) return;

    // Handle regular game input first for better responsiveness
    if (key === 'Enter') {
      // Use the actual typed letters, not the ghost letters
      if (state.currentGuess.length !== WORD_LENGTH) {
        dispatch({ type: 'SET_ERROR', payload: { error: 'Not enough letters' } });
        return;
      }
      const validWordsToUse = wordListsState?.validWords || wordLists.current!.validWords;
      dispatch({ type: 'SUBMIT_GUESS', payload: { validWords: validWordsToUse, guess: state.currentGuess } });
      return;
    } else if (key === 'Backspace') {
      dispatch({ type: 'BACKSPACE' });
      return;
    } else if (key.length === 1 && key.match(/[a-z]/i)) {
      dispatch({ type: 'TYPE_LETTER', payload: { letter: key } });
    }

    // Handle special sequences after regular input (less critical for responsiveness)
    if (key.length === 1 && key.match(/[a-z]/i)) {
        const newSequence = (keySequence + key).slice(-6);
        setKeySequence(newSequence);

        // Check for cheat codes
        if (newSequence.toUpperCase() === 'JESHUA' || newSequence.toUpperCase() === 'AMARA') {
            dispatch({ type: 'SET_CURRENT_GUESS', payload: state.solution });
            setKeySequence(''); // Reset after use
            return;
        }

        // Easter eggs
        if (newSequence.toUpperCase() === 'MILES') {
            setShowMilesExplosion(true);
            setGameExploded(true);
            setKeySequence(''); // Reset after use

            // Add CSS custom properties for explosion animation
            const addExplosionStyles = () => {
              if (typeof document === 'undefined') return; // Skip in test environment
              const tiles = document.querySelectorAll('[role="gridcell"]');
              const keys = document.querySelectorAll('.keyboard-container button');

              // Add random scatter values to tiles
              tiles.forEach((tile, index) => {
                const scatterX = (Math.random() - 0.5) * 200;
                const scatterY = (Math.random() - 0.5) * 200;
                const rotation = (Math.random() - 0.5) * 720;

                (tile as HTMLElement).style.setProperty('--scatter-x', scatterX.toString());
                (tile as HTMLElement).style.setProperty('--scatter-y', scatterY.toString());
                (tile as HTMLElement).style.setProperty('--scatter-rotation', rotation.toString());
                (tile as HTMLElement).classList.add('tile-exploded');
              });

              // Add random scatter values to keys
              keys.forEach((key, index) => {
                const scatterX = (Math.random() - 0.5) * 300;
                const scatterY = (Math.random() - 0.5) * 300;
                const rotation = (Math.random() - 0.5) * 720;

                (key as HTMLElement).style.setProperty('--scatter-x', scatterX.toString());
                (key as HTMLElement).style.setProperty('--scatter-y', scatterY.toString());
                (key as HTMLElement).style.setProperty('--scatter-rotation', rotation.toString());
                (key as HTMLElement).classList.add('key-exploded');
              });
            };

            // Apply styles after a short delay to ensure DOM is ready
            setTimeout(addExplosionStyles, 100);

            // Auto-reset after 3 seconds
            setTimeout(() => {
                setShowMilesExplosion(false);
                setGameExploded(false);
                dispatch({ type: 'NEW_GAME' });
            }, 3000);

            return;
        }

        if (newSequence.toUpperCase() === 'TRACEY') {
            setShowTraceyMessage(true);
            setKeySequence(''); // Reset after use
            return;
        }
    } else {
        setKeySequence(''); // Reset on non-letter keys
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

  const currentModeStats = state.stats[state.currentGameMode];
  const winPercentage = currentModeStats.gamesPlayed > 0 ? Math.round((currentModeStats.wins / currentModeStats.gamesPlayed) * 100) : 0;

  const distEntries = Object.entries(currentModeStats.guessDistribution);
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
    setShowCalendar(true);
  };

  const handleSelectDate = (date: Date) => {
    startNewGame(GameMode.WordOfTheDay, date);
  };

  const handlePlayUnlimited = () => {
    startNewGame(GameMode.Unlimited);
  };

  // Start screen handlers
  const handleStartUnlimited = () => {
    setShowStartScreen(false);
    startNewGame(GameMode.Unlimited);
  };

  const handleStartWordOfTheDay = () => {
    setShowStartScreen(false);
    setShowCalendar(true);
  };

  const handleShowStats = () => {
    setShowStartScreen(false);
    setShowStats(true);
  };

  const handlePlayWithFriends = async () => {
    setShowStartScreen(false);

    // Load word lists if not already loaded
    if (!wordLists.current) {
      try {
        wordLists.current = await loadWordLists();
        setWordListsState(wordLists.current);
      } catch (error) {
        console.error('Failed to load word lists:', error);
      }
    } else {
      setWordListsState(wordLists.current);
    }

    setShowWordChallenge(true);
  };

  const handleMultiplayer = () => {
    setShowStartScreen(false);
    setShowMultiplayerLobby(true);
  };

  const handleGoHome = () => {
    // Close all modals and return to start screen
    setShowHelp(false);
    setShowStats(false);
    setShowCalendar(false);
    setShowWordChallenge(false);
    setShowMultiplayerLobby(false);
    setShowMultiplayerGame(false);
    setShowPlaybackView(false);
    setShowResultShareConfirm(false);
    setShowMyChallenges(false);
    setShowStartScreen(true);
  };

  const handleMyChallenges = () => {
    setShowStartScreen(false);
    setShowMyChallenges(true);
  };

  const handleShareResult = async () => {
    if (!pendingResultShare) return;
    
    setShowResultShareConfirm(false);
    
    const shared = await shareNative(
      pendingResultShare.url,
      `My Result - Dunham Wordle`,
      pendingResultShare.message
    );

    if (!shared) {
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(pendingResultShare.url);
        alert('Result link copied to clipboard! Share it with ' + (pendingResultShare.creatorName || 'your friend'));
      } catch {
        // Final fallback
        const textArea = document.createElement('textarea');
        textArea.value = pendingResultShare.url;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert('Result link copied to clipboard! Share it with ' + (pendingResultShare.creatorName || 'your friend'));
      }
    }
    
    setPendingResultShare(null);
  };

  const handleSkipResultShare = () => {
    setShowResultShareConfirm(false);
    setPendingResultShare(null);
  };

  const handleRoomCreated = (roomId: string, isHost: boolean, playerName: string) => {
    setMultiplayerRoomId(roomId);
    setIsMultiplayerHost(isHost);
    setMultiplayerPlayerName(playerName);
    setShowMultiplayerLobby(false);
    setShowMultiplayerGame(true);
  };

  const handleRoomJoined = (roomId: string, isHost: boolean, playerName: string) => {
    setMultiplayerRoomId(roomId);
    setIsMultiplayerHost(isHost);
    setMultiplayerPlayerName(playerName);
    setShowMultiplayerLobby(false);
    setShowMultiplayerGame(true);
  };

  const handleMultiplayerExit = () => {
    setShowMultiplayerGame(false);
    setShowMultiplayerLobby(false);
    setShowStartScreen(true);
    setMultiplayerRoomId('');
    setIsMultiplayerHost(false);
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

      {!showPlaybackView && !showMultiplayerGame && (
        <header className="flex items-center justify-between border-b border-gray-600 pb-1 mb-1 flex-shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={() => { enableAudio(); handleGoHome(); }} aria-label="Home">
             <Home className="h-5 w-5 text-gray-400 hover:text-white" />
          </button>
          <button onClick={() => { enableAudio(); setShowHelp(true); }} aria-label="How to play">
             <HelpCircle className="h-5 w-5 text-gray-400 hover:text-white" />
          </button>
           <button onClick={() => { enableAudio(); setShowStats(true); }} aria-label="View statistics">
             <BarChart4 className="h-5 w-5 text-gray-400 hover:text-white" />
          </button>
        <button onClick={async () => {
          enableAudio();
          // Ensure word lists are loaded before opening modal
          if (!wordLists.current) {
            try {
              wordLists.current = await loadWordLists();
              setWordListsState(wordLists.current);
            } catch (e) {
              console.error('Failed to load word lists:', e);
              alert('Failed to load word lists. Please try again.');
              return;
            }
          } else {
            setWordListsState(wordLists.current);
          }
          setShowWordChallenge(true);
        }} aria-label="Create word challenge">
             <Share2 className="h-5 w-5 text-gray-400 hover:text-white" />
          </button>
          <button onClick={() => { enableAudio(); handleMyChallenges(); }} aria-label="Sent Challenges">
             <Trophy className="h-5 w-5 text-gray-400 hover:text-white" />
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
      )}

      {/* IMPORTANT: Layout spacing rules - DO NOT CHANGE without explicit request */}
      {/* mb-4: Fixed 16px gap between grid and keyboard (not flexible spacing) */}
      {!showPlaybackView && !showMultiplayerGame && (
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
                      exploded={gameExploded}
                  />
             </AppContext.Provider>
        )}
        </main>
      )}

      {!showPlaybackView && !showMultiplayerGame && (
        <div className="flex-shrink-0">
          <Boosts
            onReveal={handleRevealBoost}
            onEliminate={handleEliminateBoost}
            isRevealDisabled={isGameOver || !canReveal}
            isEliminateDisabled={isGameOver}
          />
        </div>
      )}

      {!showPlaybackView && !showMultiplayerGame && (
        <div className="flex-shrink-0">
          <Keyboard onKeyPress={handleKeyPress} keyStatuses={state.keyStatuses} exploded={gameExploded} />
        </div>
      )}


      {showHelp && (
        <div className="absolute inset-0 bg-black bg-opacity-75 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowHelp(false)}>
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
        <div className="absolute inset-0 bg-black bg-opacity-75 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowStats(false)}>
            <div className="bg-zinc-800 p-8 rounded-lg shadow-xl max-w-md w-full relative" onClick={(e) => e.stopPropagation()}>
                 <button className="absolute top-4 right-4 text-gray-400 hover:text-white" onClick={() => setShowStats(false)} aria-label="Close statistics">
                    <X className="h-6 w-6"/>
                </button>

                {isGameOver && (
                    <div className="text-center mb-6">
                        <h2 className="text-3xl font-bold mb-2">{state.gameStatus === GameStatus.Won ? 'You Won!' : 'Game Over'}</h2>
                    </div>
                )}

                <h2 className="text-2xl font-bold mb-6 text-center">
                  {state.currentGameMode === GameMode.WordOfTheDay ? 'Word of the Day Statistics' : 'Statistics'}
                </h2>
                <div className="flex justify-around text-center mb-6">
                    <div>
                        <p className="text-4xl font-bold">{currentModeStats.gamesPlayed}</p>
                        <p className="text-xs text-gray-400">Played</p>
                    </div>
                     <div>
                        <p className="text-4xl font-bold">{winPercentage}</p>
                        <p className="text-xs text-gray-400">Win %</p>
                    </div>
                     <div>
                        <p className="text-4xl font-bold">{currentModeStats.currentStreak}</p>
                        <p className="text-xs text-gray-400">Current Streak</p>
                    </div>
                     <div>
                        <p className="text-4xl font-bold">{currentModeStats.maxStreak}</p>
                        <p className="text-xs text-gray-400">Max Streak</p>
                    </div>
                </div>

                {/* Day Streak for Word of the Day */}
                {state.currentGameMode === GameMode.WordOfTheDay && currentModeStats.dayStreak !== undefined && (
                    <div className="flex justify-around text-center mb-6">
                        <div>
                            <p className="text-4xl font-bold">{currentModeStats.dayStreak}</p>
                            <p className="text-xs text-gray-400">Day Streak</p>
                        </div>
                        <div>
                            <p className="text-4xl font-bold">{currentModeStats.maxDayStreak || 0}</p>
                            <p className="text-xs text-gray-400">Max Day Streak</p>
                        </div>
                    </div>
                )}

                <h3 className="text-xl font-bold mb-4 text-center">Guess Distribution</h3>
                <div className="space-y-2 px-4">
                  {distEntries.map(([guesses, count]) => {
                    const countNum = count as number;
                    return (
                      <div key={guesses} className="flex items-center gap-3 w-full text-base">
                        <div className="w-4 font-semibold">{guesses}</div>
                        <div className="flex-1 bg-zinc-700 rounded-sm">
                          <div
                            className={`h-5 text-right pr-2 text-white flex items-center justify-end rounded-sm ${state.gameStatus === GameStatus.Won && state.currentGuessIndex === Number(guesses) ? 'bg-correct' : 'bg-gray-500'}`}
                            style={{ width: countNum > 0 ? `${(countNum / maxDistCount) * 100}%` : '0' }}
                          >
                            {countNum > 0 && <span className="font-bold">{countNum}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Badges Section */}
                <div className="mt-8">
                    <h3 className="text-xl font-bold mb-4 text-center">Badges</h3>
                    <div className="max-h-40 overflow-y-auto">
                        {Object.values(state.badges).filter((badge: Badge) => badge.unlockedAt).length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {Object.values(state.badges)
                                    .filter((badge: Badge) => badge.unlockedAt)
                                    .slice(0, 6) // Show first 6 badges
                                    .map((badge: Badge) => (
                                        <div key={badge.id} className="flex flex-col items-center p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                                            <div className="w-8 h-8 flex items-center justify-center bg-yellow-100 dark:bg-yellow-900 rounded-full border border-yellow-300 dark:border-yellow-600 mb-1">
                                                <span className="text-yellow-600 dark:text-yellow-400 text-sm">
                                                    {badge.icon}
                                                </span>
                                            </div>
                                            <div className="text-xs font-semibold text-gray-900 dark:text-gray-100 text-center">
                                                {badge.name}
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        ) : (
                            <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                                No badges unlocked yet!
                            </div>
                        )}
                    </div>
                </div>

                {isGameOver && (
                    <div className="text-center mt-8">
                        {state.currentGameMode === GameMode.WordOfTheDay ? (
                            <button
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded"
                                onClick={() => {
                                    setShowStats(false);
                                    setShowCalendar(true);
                                }}
                            >
                                Next
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

      {showStartScreen && (
        <StartScreen
          onStartUnlimited={handleStartUnlimited}
          onStartWordOfTheDay={handleStartWordOfTheDay}
          onShowStats={handleShowStats}
          onPlayWithFriends={handlePlayWithFriends}
          onMultiplayer={handleMultiplayer}
        />
      )}

      {/* Only show Lobby when needed, don't keep in DOM */}
      {showMultiplayerLobby && (
        <MultiplayerLobby
          onRoomCreated={handleRoomCreated}
          onRoomJoined={handleRoomJoined}
          onBack={() => {
            setShowMultiplayerLobby(false);
            setShowStartScreen(true);
          }}
        />
      )}

      {showMultiplayerGame && (
        <CollaborativeMultiplayerGame
          roomId={multiplayerRoomId}
          isHost={isMultiplayerHost}
          playerName={multiplayerPlayerName}
          onExit={handleMultiplayerExit}
        />
      )}

      {showResultPlayback && currentResult && (
        <ResultPlaybackScreen
          result={currentResult}
          onViewPlayback={() => {
            setShowResultPlayback(false);
            setShowPlaybackView(true);
          }}
          onClose={() => {
            setShowResultPlayback(false);
            setCurrentResult(null);
            setShowStartScreen(true);
          }}
        />
      )}

      {showPlaybackView && currentResult && (
        <PlaybackView
          result={currentResult}
          solution={currentResult.word}
          onClose={() => {
            setShowPlaybackView(false);
            setCurrentResult(null);
            setShowStartScreen(true);
          }}
        />
      )}

      {showCalendar && (
        <CalendarPicker
          onClose={() => setShowCalendar(false)}
          onSelectDate={handleSelectDate}
          onLeave={() => {
            setShowCalendar(false);
            startNewGame(); // Start new unlimited game
          }}
          completions={state.wordOfTheDayCompletions}
        />
      )}

      {/* Miles Easter Egg - Explosion */}
      {showMilesExplosion && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          {/* Background explosion effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-red-500 via-yellow-500 to-orange-500 opacity-90 animate-pulse"></div>

          {/* Explosion particles */}
          <div className="absolute inset-0">
            {Array.from({ length: 100 }, (_, i) => (
              <div
                key={i}
                className="absolute w-3 h-3 bg-yellow-400 rounded-full animate-ping"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${1 + Math.random() * 2}s`,
                  transform: `scale(${0.5 + Math.random() * 1.5})`
                }}
              />
            ))}
            {Array.from({ length: 50 }, (_, i) => (
              <div
                key={`red-${i}`}
                className="absolute w-2 h-2 bg-red-500 rounded-full animate-pulse"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${0.5 + Math.random() * 1}s`,
                  transform: `scale(${0.5 + Math.random() * 1.5})`
                }}
              />
            ))}
            {Array.from({ length: 30 }, (_, i) => (
              <div
                key={`orange-${i}`}
                className="absolute w-1 h-1 bg-orange-400 rounded-full animate-bounce"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${0.3 + Math.random() * 0.7}s`
                }}
              />
            ))}
          </div>

          {/* BOOM text with multiple effects */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="text-9xl font-bold text-yellow-400 animate-bounce drop-shadow-2xl">
              💥 BOOM! 💥
            </div>
            <div className="text-6xl font-bold text-red-500 animate-pulse mt-4 drop-shadow-lg">
              SIQUIJOR!
            </div>
          </div>

          {/* Screen crack effect */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/4 w-1 h-full bg-red-600 opacity-60 animate-pulse"></div>
            <div className="absolute top-0 right-1/3 w-1 h-full bg-red-600 opacity-60 animate-pulse" style={{animationDelay: '0.5s'}}></div>
            <div className="absolute top-1/3 left-0 w-full h-1 bg-red-600 opacity-60 animate-pulse" style={{animationDelay: '1s'}}></div>
            <div className="absolute bottom-1/4 left-0 w-full h-1 bg-red-600 opacity-60 animate-pulse" style={{animationDelay: '1.5s'}}></div>
          </div>
        </div>
      )}

      {/* Tracey Easter Egg - Love Message */}
      {showTraceyMessage && (
        <div className="absolute inset-0 bg-black bg-opacity-75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-800 p-8 rounded-lg shadow-xl max-w-md w-full relative text-center">
            <h2 className="text-3xl font-bold mb-4 text-pink-400">I love you Mom!</h2>
            <p className="text-xl mb-6 text-gray-300">The word was:</p>
            <p className="text-4xl font-bold tracking-widest text-white mb-6">{state.solution}</p>
            <button
              onClick={() => setShowTraceyMessage(false)}
              className="bg-pink-600 hover:bg-pink-700 text-white font-bold py-2 px-6 rounded"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* New Badge Notification */}
      {newBadgeNotification && (
        <div className="absolute inset-0 bg-black bg-opacity-75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm mx-4 text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              New Badge Unlocked!
            </h2>
            <div className="text-4xl mb-4">{newBadgeNotification.icon}</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {newBadgeNotification.name}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {newBadgeNotification.description}
            </p>
            <button
              onClick={() => setNewBadgeNotification(null)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold"
            >
              Awesome!
            </button>
          </div>
        </div>
      )}

      {/* Word Challenge Modal */}
      <WordChallengeModal
        isOpen={showWordChallenge}
        onClose={() => setShowWordChallenge(false)}
        onStartChallenge={() => {}} // No longer used since we removed Play Challenge button
        validWords={wordListsState?.validWords}
        shareNative={shareNative}
      />

      {/* Result Share Confirmation Modal */}
      {showResultShareConfirm && pendingResultShare && (
        <div className="absolute inset-0 bg-black bg-opacity-75 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={handleSkipResultShare}>
          <div className="bg-zinc-800 p-8 rounded-lg shadow-xl max-w-md w-full relative" onClick={(e) => e.stopPropagation()}>
            <button className="absolute top-4 right-4 text-gray-400 hover:text-white" onClick={handleSkipResultShare} aria-label="Close">
              <X className="h-6 w-6"/>
            </button>
            
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold mb-2">Challenge Complete!</h2>
              <p className="text-gray-300">
                You just completed {pendingResultShare.creatorName}'s challenge!
              </p>
            </div>

            <div className="bg-zinc-700 p-4 rounded-lg mb-6">
              <p className="text-sm text-gray-300 mb-2">
                <strong>Share your results</strong> with {pendingResultShare.creatorName}!
              </p>
              <p className="text-xs text-gray-400 mb-2">
                A share dialog will open where you can send your results.
              </p>
              <p className="text-xs text-blue-400">
                {pendingResultShare.creatorName} can see your completion in their "Sent Challenges" page
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleShareResult}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
              >
                Share My Results
              </button>
              <button
                onClick={handleSkipResultShare}
                className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* My Challenges View */}
      {showMyChallenges && (
        <MyChallengesView onClose={() => setShowMyChallenges(false)} />
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

const Home = createIcon(
    <>
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9,22 9,12 15,12 15,22" />
    </>
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

const Share2 = createIcon(
    <>
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </>
);

const Trophy = createIcon(
    <>
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
        <path d="M4 22h16" />
        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </>
);

const X = createIcon(
    <path d="M18 6 6 18M6 6l12 12" />
);


export default App;
