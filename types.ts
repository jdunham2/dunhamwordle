export enum GameStatus {
  Playing = 'playing',
  Won = 'won',
  Lost = 'lost',
  Loading = 'loading',
}

export type TileStatus = 'correct' | 'present' | 'absent' | 'empty' | 'editing';
export type KeyStatus = 'correct' | 'present' | 'absent' | 'unused';

export interface KeyStatuses {
  [key: string]: KeyStatus;
}

export interface Stats {
  gamesPlayed: number;
  wins: number;
  currentStreak: number;
  maxStreak: number;
  guessDistribution: { [key: number]: number };
}

export interface GameState {
  solution: string;
  guesses: string[];
  currentGuessIndex: number;
  currentGuess: string;
  gameStatus: GameStatus;
  keyStatuses: KeyStatuses;
  error: string | null;
  isInvalidGuess: boolean;
  stats: Stats;
}

export type GameAction =
  | { type: 'START_GAME'; payload: { solution: string } }
  | { type: 'TYPE_LETTER'; payload: { letter: string } }
  | { type: 'BACKSPACE' }
  | { type: 'SUBMIT_GUESS'; payload: { validWords: Set<string>, guess: string } }
  | { type: 'SET_ERROR'; payload: { error: string | null } }
  | { type: 'NEW_GAME' }
  | { type: 'SET_CURRENT_GUESS'; payload: string }
  | { type: 'UPDATE_KEY_STATUSES'; payload: KeyStatuses };

// Add to Home Screen types
declare global {
  interface Window {
    AddToHomeScreenInstance?: {
      show: (locale?: string) => void;
      clearModalDisplayCount: () => void;
    };
  }
}
