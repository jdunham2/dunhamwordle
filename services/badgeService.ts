import { Badge, UserBadges, Stats, WordOfTheDayCompletion } from '../types';

export const BADGES: { [key: string]: Badge } = {
  // Streak badges
  'first-win': {
    id: 'first-win',
    name: 'First Victory',
    description: 'Win your first game',
    icon: '🏆',
    category: 'streak'
  },
  'streak-3': {
    id: 'streak-3',
    name: 'Getting Started',
    description: 'Win 3 games in a row',
    icon: '🔥',
    category: 'streak'
  },
  'streak-7': {
    id: 'streak-7',
    name: 'Week Warrior',
    description: 'Win 7 games in a row',
    icon: '⚡',
    category: 'streak'
  },
  'streak-30': {
    id: 'streak-30',
    name: 'Month Master',
    description: 'Win 30 games in a row',
    icon: '👑',
    category: 'streak'
  },
  'day-streak-7': {
    id: 'day-streak-7',
    name: 'Daily Dedication',
    description: 'Complete Word of the Day 7 days in a row',
    icon: '📅',
    category: 'streak'
  },
  'day-streak-30': {
    id: 'day-streak-30',
    name: 'Calendar Champion',
    description: 'Complete Word of the Day 30 days in a row',
    icon: '🗓️',
    category: 'streak'
  },

  // Speed badges
  'solve-1': {
    id: 'solve-1',
    name: 'Lucky Guess',
    description: 'Solve a word in 1 guess',
    icon: '🎯',
    category: 'speed'
  },
  'solve-2': {
    id: 'solve-2',
    name: 'Quick Thinker',
    description: 'Solve a word in 2 guesses',
    icon: '⚡',
    category: 'speed'
  },
  'solve-3': {
    id: 'solve-3',
    name: 'Efficient Solver',
    description: 'Solve a word in 3 guesses',
    icon: '🎪',
    category: 'speed'
  },

  // Accuracy badges
  'perfect-month': {
    id: 'perfect-month',
    name: 'Perfect Month',
    description: 'Win every game for a month',
    icon: '💯',
    category: 'accuracy'
  },
  'century-club': {
    id: 'century-club',
    name: 'Century Club',
    description: 'Play 100 games',
    icon: '💎',
    category: 'accuracy'
  },
  'word-master': {
    id: 'word-master',
    name: 'Word Master',
    description: 'Win 100 games',
    icon: '🧠',
    category: 'accuracy'
  },

  // Special badges
  'easter-egg-miles': {
    id: 'easter-egg-miles',
    name: 'Explosive Discovery',
    description: 'Find the Miles easter egg',
    icon: '💥',
    category: 'special'
  },
  'easter-egg-tracey': {
    id: 'easter-egg-tracey',
    name: 'Love Message',
    description: 'Find the Tracey easter egg',
    icon: '💕',
    category: 'special'
  },
  'boost-master': {
    id: 'boost-master',
    name: 'Boost Master',
    description: 'Use all boost types in a single game',
    icon: '🚀',
    category: 'special'
  }
};

export function checkForNewBadges(
  stats: Stats,
  wordOfTheDayStats: Stats,
  wordOfTheDayCompletions: WordOfTheDayCompletion,
  currentBadges: UserBadges,
  gameMode: 'unlimited' | 'wordOfTheDay',
  guesses: number,
  isWin: boolean
): Badge[] {
  const newBadges: Badge[] = [];
  const relevantStats = gameMode === 'wordOfTheDay' ? wordOfTheDayStats : stats;

  // Check each badge
  Object.values(BADGES).forEach(badge => {
    // Skip if already unlocked
    if (currentBadges[badge.id]) return;

    let shouldUnlock = false;

    switch (badge.id) {
      case 'first-win':
        shouldUnlock = isWin && relevantStats.wins === 1;
        break;

      case 'streak-3':
        shouldUnlock = relevantStats.currentStreak >= 3;
        break;

      case 'streak-7':
        shouldUnlock = relevantStats.currentStreak >= 7;
        break;

      case 'streak-30':
        shouldUnlock = relevantStats.currentStreak >= 30;
        break;

      case 'day-streak-7':
        shouldUnlock = wordOfTheDayStats.dayStreak && wordOfTheDayStats.dayStreak >= 7;
        break;

      case 'day-streak-30':
        shouldUnlock = wordOfTheDayStats.dayStreak && wordOfTheDayStats.dayStreak >= 30;
        break;

      case 'solve-1':
        shouldUnlock = isWin && guesses === 1;
        break;

      case 'solve-2':
        shouldUnlock = isWin && guesses === 2;
        break;

      case 'solve-3':
        shouldUnlock = isWin && guesses === 3;
        break;

      case 'perfect-month':
        // Check if won all games in the last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentCompletions = Object.entries(wordOfTheDayCompletions)
          .filter(([dateKey, completion]) => {
            const date = new Date(dateKey);
            return date >= thirtyDaysAgo && completion.completed;
          });
        shouldUnlock = recentCompletions.length >= 30 &&
          recentCompletions.every(([, completion]) => completion.completed);
        break;

      case 'century-club':
        shouldUnlock = relevantStats.gamesPlayed >= 100;
        break;

      case 'word-master':
        shouldUnlock = relevantStats.wins >= 100;
        break;
    }

    if (shouldUnlock) {
      newBadges.push({
        ...badge,
        unlockedAt: new Date()
      });
    }
  });

  return newBadges;
}

export function calculateDayStreak(wordOfTheDayCompletions: WordOfTheDayCompletion): number {
  const today = new Date();
  let streak = 0;

  // Check backwards from today
  for (let i = 0; i < 365; i++) { // Check up to a year back
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    const dateKey = checkDate.toISOString().split('T')[0];

    const completion = wordOfTheDayCompletions[dateKey];
    if (completion && completion.completed) {
      streak++;
    } else {
      break; // Streak broken
    }
  }

  return streak;
}

export function loadBadges(): UserBadges {
  try {
    const saved = localStorage.getItem('wordle-badges');
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

export function saveBadges(badges: UserBadges): void {
  try {
    localStorage.setItem('wordle-badges', JSON.stringify(badges));
  } catch (error) {
    console.error('Failed to save badges:', error);
  }
}
