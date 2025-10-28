import { GameMode } from '../types';
// import { notificationService } from './notificationService'; // Optional - uncomment after installing Firebase

export interface WordChallenge {
  word: string;
  guesses: string[];
  gameMode: GameMode;
  createdAt: Date;
  challengeId: string;
  senderName?: string;
  creatorId?: string; // For notifications
}

export interface ChallengeResult {
  challengeId: string;
  word: string;
  guesses: string[];
  solved: boolean;
  solveTime?: number;
  createdAt: Date;
}

// Generate a unique challenge ID
function generateChallengeId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Encode challenge data into URL-safe string
export function encodeWordChallenge(challenge: WordChallenge): string {
  const data = {
    w: challenge.word,
    g: challenge.guesses,
    m: challenge.gameMode,
    t: challenge.createdAt.getTime(),
    i: challenge.challengeId,
    n: challenge.senderName
  };

  return btoa(JSON.stringify(data))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// Decode challenge data from URL-safe string
export function decodeWordChallenge(encoded: string): WordChallenge | null {
  try {
    // Add padding back if needed
    let padded = encoded;
    while (padded.length % 4) {
      padded += '=';
    }

    // Convert back to base64
    const base64 = padded
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const json = atob(base64);
    const data = JSON.parse(json);

    return {
      word: data.w,
      guesses: data.g || [],
      gameMode: data.m || GameMode.Unlimited,
      createdAt: new Date(data.t),
      challengeId: data.i || generateChallengeId(),
      senderName: data.n
    };
  } catch (error) {
    console.error('Failed to decode word challenge:', error);
    return null;
  }
}

// Encode challenge result
export function encodeChallengeResult(result: ChallengeResult): string {
  const data = {
    i: result.challengeId,
    w: result.word,
    g: result.guesses,
    s: result.solved,
    t: result.solveTime,
    c: result.createdAt.getTime()
  };

  return btoa(JSON.stringify(data))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// Decode challenge result
export function decodeChallengeResult(encoded: string): ChallengeResult | null {
  try {
    // Add padding back if needed
    let padded = encoded;
    while (padded.length % 4) {
      padded += '=';
    }

    // Convert back to base64
    const base64 = padded
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const json = atob(base64);
    const data = JSON.parse(json);

    return {
      challengeId: data.i,
      word: data.w,
      guesses: data.g || [],
      solved: data.s || false,
      solveTime: data.t,
      createdAt: new Date(data.c)
    };
  } catch (error) {
    console.error('Failed to decode challenge result:', error);
    return null;
  }
}

// Create a new word challenge
export function createWordChallenge(word: string, gameMode: GameMode = GameMode.Unlimited, senderName?: string): WordChallenge {
  return {
    word: word.toUpperCase(),
    guesses: [],
    gameMode,
    createdAt: new Date(),
    challengeId: generateChallengeId(),
    senderName
  };
}

// Generate shareable URL for a challenge
export function generateChallengeUrl(challenge: WordChallenge, baseUrl: string = window.location.href.split('?')[0]): string {
  const encoded = encodeWordChallenge(challenge);
  return `${baseUrl}?challenge=${encoded}`;
}

// Generate shareable URL for a challenge result
export function generateResultUrl(result: ChallengeResult, baseUrl: string = window.location.href.split('?')[0]): string {
  const encoded = encodeChallengeResult(result);
  return `${baseUrl}?result=${encoded}`;
}

// Extract challenge from URL parameters
export function extractChallengeFromUrl(): WordChallenge | null {
  const urlParams = new URLSearchParams(window.location.search);
  const challengeParam = urlParams.get('challenge');

  if (challengeParam) {
    return decodeWordChallenge(challengeParam);
  }

  return null;
}

// Extract result from URL parameters
export function extractResultFromUrl(): ChallengeResult | null {
  const urlParams = new URLSearchParams(window.location.search);
  const resultParam = urlParams.get('result');

  if (resultParam) {
    return decodeChallengeResult(resultParam);
  }

  return null;
}

// Notify challenge creator when someone completes their challenge
export async function notifyChallengeCompletion(
  challenge: WordChallenge,
  result: ChallengeResult,
  completerName: string,
  completerId: string
): Promise<boolean> {
  if (!challenge.creatorId) {
    console.log('[Challenge] No creator ID, skipping notification');
    return false;
  }

  // TODO: Enable when Firebase is installed (npm install firebase)
  // const { notificationService } = await import('./notificationService');
  // if (!notificationService.isEnabled()) {
  //   console.log('[Challenge] Notifications not enabled');
  //   return false;
  // }
  // await notificationService.notifyChallengeComplete({...});
  
  console.log('[Challenge] Notifications not configured yet - install Firebase to enable');
  return false;
}

// Initialize notifications for the current user
export function initializeChallengeNotifications(userId: string): () => void {
  // TODO: Enable when Firebase is installed (npm install firebase)
  // const { notificationService } = await import('./notificationService');
  // if (!notificationService.isEnabled()) return () => {};
  // return notificationService.listenForNotifications(userId, callback);
  
  console.log('[Challenge] Notifications not configured yet - install Firebase to enable');
  return () => {};
}
