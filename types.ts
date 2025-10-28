export enum GameStatus {
  Playing = 'playing',
  Won = 'won',
  Lost = 'lost',
  Loading = 'loading',
}

export enum GameMode {
  Unlimited = 'unlimited',
  WordOfTheDay = 'wordOfTheDay'
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
  dayStreak?: number; // For Word of the Day consecutive days
  maxDayStreak?: number; // For Word of the Day max consecutive days
  guessDistribution: { [key: number]: number };
}

export interface GameModeStats {
  unlimited: Stats;
  wordOfTheDay: Stats;
}

export interface WordOfTheDayCompletion {
  [dateKey: string]: {
    completed: boolean;
    guesses?: number;
    solution?: string;
  };
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt?: Date;
  category: 'streak' | 'speed' | 'accuracy' | 'special';
}

export interface UserBadges {
  [badgeId: string]: Badge;
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
  stats: GameModeStats;
  wordOfTheDayCompletions: WordOfTheDayCompletion;
  badges: UserBadges;
  currentGameMode: GameMode;
  selectedDate?: Date;
}

export type GameAction =
  | { type: 'START_GAME'; payload: { solution: string; gameMode: GameMode; selectedDate?: Date } }
  | { type: 'TYPE_LETTER'; payload: { letter: string } }
  | { type: 'BACKSPACE' }
  | { type: 'SUBMIT_GUESS'; payload: { validWords: Set<string>, guess: string } }
  | { type: 'SET_ERROR'; payload: { error: string | null } }
  | { type: 'NEW_GAME' }
  | { type: 'SET_CURRENT_GUESS'; payload: string }
  | { type: 'UPDATE_KEY_STATUSES'; payload: KeyStatuses }
  | { type: 'UNLOCK_BADGE'; payload: { badgeId: string; badge: Badge } }
  | { type: 'UPDATE_DAY_STREAK'; payload: { dayStreak: number; maxDayStreak: number } }
  | { type: 'LOAD_STATS'; payload: { stats: GameModeStats; wordOfTheDayCompletions: WordOfTheDayCompletion } };

// Add to Home Screen types
declare global {
  interface Window {
    AddToHomeScreenInstance?: {
      show: (locale?: string) => void;
      clearModalDisplayCount: () => void;
    };
  }
}
