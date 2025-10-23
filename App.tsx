import React, { useReducer, useEffect, useCallback, useRef, useState, createContext } from 'react';
import { AdBanner } from './components/AdBanner';
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
  const [hintIndices, setHintIndices] = useState<Set<number>>(new Set());
  const [keySequence, setKeySequence] = useState('');


  const startNewGame = useCallback(async () => {
    if (!wordLists.current) {
        try {
            wordLists.current = await loadWordLists();
        } catch (e) {
            dispatch({ type: 'SET_ERROR', payload: { error: 'Failed to load words.' } });
            return;
        }
    }
    const { solutions } = wordLists.current;
    const newSolution = solutions[Math.floor(Math.random() * solutions.length)];
    dispatch({ type: 'START_GAME', payload: { solution: newSolution } });
  }, []);
  
  // Reset hints when a new row starts
  useEffect(() => {
    if (state.gameStatus === GameStatus.Playing) {
        setHintIndices(new Set());
    }
  }, [state.currentGuessIndex, state.gameStatus]);

  useEffect(() => {
    if(state.gameStatus === GameStatus.Loading) {
      startNewGame();
    }
  }, [state.gameStatus, startNewGame]);
  
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
      const timer = setTimeout(() => setShowStats(true), MODAL_ANIMATION_DELAY);
      return () => clearTimeout(timer);
    } else if (state.gameStatus === GameStatus.Lost) {
      if(announcementsRef.current) announcementsRef.current.textContent = `Game over! The word was ${state.solution}.`;
      saveStats(state.stats);
      const timer = setTimeout(() => setShowStats(true), MODAL_ANIMATION_DELAY);
      return () => clearTimeout(timer);
    }
  }, [state.gameStatus, state.solution, state.stats]);


  const handleKeyPress = useCallback((key: string) => {
    if (state.gameStatus !== GameStatus.Playing) return;
    
    // Check for cheat code
    if (key.length === 1 && key.match(/[a-z]/i)) {
        const newSequence = (keySequence + key).slice(-6);
        setKeySequence(newSequence);
        if (newSequence.toUpperCase() === 'JESHUA') {
            dispatch({ type: 'SET_CURRENT_GUESS', payload: state.solution });
            setKeySequence(''); // Reset after use
            return; // Exit to avoid processing as a normal letter
        }
    } else {
        setKeySequence(''); // Reset on non-letter keys
    }
    
    // Any other key press removes hint styling from view
    setHintIndices(new Set());

    if (key === 'Enter') {
      let finalGuess = '';
      let typedCursor = 0;
      for (let i = 0; i < WORD_LENGTH; i++) {
        if (hintIndices.has(i)) {
            finalGuess += state.solution[i];
        } else {
            if (typedCursor < state.currentGuess.length) {
                finalGuess += state.currentGuess[typedCursor];
                typedCursor++;
            } else {
                finalGuess += ' '; // Add a space for unfilled letters
            }
        }
      }
      
      if (finalGuess.includes(' ')) {
        dispatch({ type: 'SET_ERROR', payload: { error: 'Not enough letters' } });
        return;
      }
      
      dispatch({ type: 'SUBMIT_GUESS', payload: { validWords: wordLists.current!.validWords, guess: finalGuess } });
    } else if (key === 'Backspace') {
      dispatch({ type: 'BACKSPACE' });
    } else if (key.length === 1 && key.match(/[a-z]/i)) {
      dispatch({ type: 'TYPE_LETTER', payload: { letter: key } });
    }
  }, [state.gameStatus, state.currentGuess, state.solution, hintIndices, keySequence]);

  useKeyPress(handleKeyPress);

  const handleRevealBoost = useCallback(() => {
    // 1. Find all indices that are already correct (green) from previous guesses.
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

    // 2. Find the first index in the solution that is not already correct AND not already a hint.
    let revealableIndex: number | null = null;
    for (let i = 0; i < state.solution.length; i++) {
      if (!correctIndices.has(i) && !hintIndices.has(i)) {
        revealableIndex = i;
        break;
      }
    }

    if (revealableIndex !== null) {
      // 3. Add the new index to the hints.
      setHintIndices(prev => new Set(prev).add(revealableIndex!));
    }
  }, [state.solution, state.guesses, hintIndices]);


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
  const maxDistCount = Math.max(...distEntries.map(([, count]) => count), 1);

  const handlePlayAgain = () => {
    dispatch({ type: 'NEW_GAME' });
    setShowStats(false);
  };

  return (
    <div className="flex flex-col h-screen max-w-lg mx-auto p-4 font-sans">
      <div ref={announcementsRef} className="absolute w-1 h-1 -m-1 overflow-hidden p-0 border-0" style={{ clip: 'rect(0,0,0,0)' }} aria-live="assertive"></div>

      <header className="flex items-center justify-between border-b border-gray-600 pb-4 mb-4">
        <div className="flex items-center gap-4">
          <button onClick={() => setShowHelp(true)} aria-label="How to play">
             <HelpCircle className="h-6 w-6 text-gray-400 hover:text-white" />
          </button>
           <button onClick={() => setShowStats(true)} aria-label="View statistics">
             <BarChart4 className="h-6 w-6 text-gray-400 hover:text-white" />
          </button>
        </div>
        <h1 className="text-4xl font-bold tracking-wider">WORDLE</h1>
        <div className="flex items-center gap-4">
          <button onClick={() => dispatch({ type: 'NEW_GAME' })} aria-label="New Game">
             <RefreshCw className="h-6 w-6 text-gray-400 hover:text-white" />
          </button>
        </div>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center gap-4">
         {state.error && (
            <div className="absolute top-20 bg-orange-800 text-white font-bold py-2 px-4 rounded-md animate-shake">
                {state.error}
            </div>
         )}

        {state.gameStatus === GameStatus.Loading ? (
            <p>Loading...</p>
        ) : (
             <AppContext.Provider value={{ hintIndices, solution: state.solution }}>
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

      <Boosts
        onReveal={handleRevealBoost}
        onEliminate={handleEliminateBoost}
        isRevealDisabled={isGameOver || !canReveal}
        isEliminateDisabled={isGameOver}
      />
      
      <AdBanner triggerShow={state.gameStatus === GameStatus.Won || state.gameStatus === GameStatus.Lost} />

      <Keyboard onKeyPress={handleKeyPress} keyStatuses={state.keyStatuses} />

      {showHelp && (
        <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4" onClick={() => setShowHelp(false)}>
            <div className="bg-zinc-800 p-8 rounded-lg shadow-xl max-w-md w-full relative" onClick={(e) => e.stopPropagation()}>
                 <button className="absolute top-4 right-4 text-gray-400 hover:text-white" onClick={() => setShowHelp(false)} aria-label="Close help">
                    <X className="h-6 w-6"/>
                </button>
                <h2 className="text-2xl font-bold mb-4 text-center">How to Play</h2>
                <p className="mb-2">Guess the word in 6 tries.</p>
                <ul className="list-disc list-inside mb-4 space-y-2">
                    <li>Each guess must be a valid 5-letter word.</li>
                    <li>Hit the enter button to submit.</li>
                    <li>After each guess, the color of the tiles will change to show how close your guess was to the word.</li>
                </ul>
                <div className="border-b border-gray-600 my-4"></div>
                <strong className="block mb-2">Examples</strong>
                <div className="flex justify-center gap-2 mb-2">
                    <div className="w-12 h-12 flex items-center justify-center bg-correct text-white text-2xl font-bold border-2 border-transparent">R</div>
                    <div className="w-12 h-12 flex items-center justify-center bg-zinc-900 text-white text-2xl font-bold border-2 border-tile-border">E</div>
                    <div className="w-12 h-12 flex items-center justify-center bg-zinc-900 text-white text-2xl font-bold border-2 border-tile-border">A</div>
                    <div className="w-12 h-12 flex items-center justify-center bg-zinc-900 text-white text-2xl font-bold border-2 border-tile-border">C</div>
                    <div className="w-12 h-12 flex items-center justify-center bg-zinc-900 text-white text-2xl font-bold border-2 border-tile-border">T</div>
                </div>
                <p className="mb-4"><span className="font-bold">R</span> is in the word and in the correct spot.</p>
                <div className="flex justify-center gap-2 mb-2">
                    <div className="w-12 h-12 flex items-center justify-center bg-zinc-900 text-white text-2xl font-bold border-2 border-tile-border">L</div>
                    <div className="w-12 h-12 flex items-center justify-center bg-present text-white text-2xl font-bold border-2 border-transparent">O</div>
                    <div className="w-12 h-12 flex items-center justify-center bg-zinc-900 text-white text-2xl font-bold border-2 border-tile-border">G</div>
                    <div className="w-12 h-12 flex items-center justify-center bg-zinc-900 text-white text-2xl font-bold border-2 border-tile-border">I</div>
                    <div className="w-12 h-12 flex items-center justify-center bg-zinc-900 text-white text-2xl font-bold border-2 border-tile-border">C</div>
                </div>
                <p className="mb-4"><span className="font-bold">O</span> is in the word but in the wrong spot.</p>
                 <div className="flex justify-center gap-2 mb-2">
                    <div className="w-12 h-12 flex items-center justify-center bg-zinc-900 text-white text-2xl font-bold border-2 border-tile-border">S</div>
                    <div className="w-12 h-12 flex items-center justify-center bg-zinc-900 text-white text-2xl font-bold border-2 border-tile-border">T</div>
                    <div className="w-12 h-12 flex items-center justify-center bg-absent text-white text-2xl font-bold border-2 border-transparent">Y</div>
                    <div className="w-12 h-12 flex items-center justify-center bg-zinc-900 text-white text-2xl font-bold border-2 border-tile-border">L</div>
                    <div className="w-12 h-12 flex items-center justify-center bg-zinc-900 text-white text-2xl font-bold border-2 border-tile-border">E</div>
                </div>
                <p className="mb-4"><span className="font-bold">Y</span> is not in the word in any spot.</p>
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
                  {distEntries.map(([guesses, count]) => (
                    <div key={guesses} className="flex items-center gap-3 w-full text-base">
                      <div className="w-4 font-semibold">{guesses}</div>
                      <div className="flex-1 bg-zinc-700 rounded-sm">
                        <div
                          className={`h-5 text-right pr-2 text-white flex items-center justify-end rounded-sm ${state.gameStatus === GameStatus.Won && state.currentGuessIndex === Number(guesses) ? 'bg-correct' : 'bg-absent'}`}
                          style={{ width: count > 0 ? `${(count / maxDistCount) * 100}%` : '0' }}
                        >
                          {count > 0 && <span className="font-bold">{count}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {isGameOver && (
                    <div className="text-center mt-8">
                        <button
                            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded"
                            onClick={handlePlayAgain}
                        >
                            Play Again
                        </button>
                    </div>
                )}
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
        viewBox="0 0 24"
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
