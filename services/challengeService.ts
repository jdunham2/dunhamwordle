import { GameMode } from '../types';
import { getWebSocketUrl } from './wsConfig';
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
export function generateChallengeUrl(challenge: WordChallenge, baseUrl: string = window.location.origin): string {
  const encoded = encodeWordChallenge(challenge);
  // Use query param only for GitHub Pages compatibility (no path routing)
  return `${baseUrl}/dunhamwordle/?c=${encoded}`;
}

// Generate shareable URL for a challenge result
export function generateResultUrl(result: ChallengeResult, baseUrl: string = window.location.origin): string {
  const encoded = encodeChallengeResult(result);
  // Use query param only for GitHub Pages compatibility (no path routing)
  return `${baseUrl}/dunhamwordle/?r=${encoded}`;
}

// Extract challenge from URL parameters (supports both old and new formats)
export function extractChallengeFromUrl(): WordChallenge | null {
  const urlParams = new URLSearchParams(window.location.search);
  // Try new format first (/challenge?c=...)
  let challengeParam = urlParams.get('c');
  // Fallback to old format (?challenge=...)
  if (!challengeParam) {
    challengeParam = urlParams.get('challenge');
  }

  if (challengeParam) {
    return decodeWordChallenge(challengeParam);
  }

  return null;
}

// Extract result from URL parameters (supports both old and new formats)
export function extractResultFromUrl(): ChallengeResult | null {
  const urlParams = new URLSearchParams(window.location.search);
  // Try new format first (/result?r=...)
  let resultParam = urlParams.get('r');
  // Fallback to old format (?result=...)
  if (!resultParam) {
    resultParam = urlParams.get('result');
  }

  if (resultParam) {
    return decodeChallengeResult(resultParam);
  }

  return null;
}

// Store a challenge on the backend
export async function storeChallengeOnBackend(challenge: WordChallenge): Promise<boolean> {
  try {
    const wsUrl = getWebSocketUrl();
    // Convert ws:// or wss:// to http:// or https://
    const httpUrl = wsUrl.replace(/^ws/, 'http');
    
    const response = await fetch(`${httpUrl}/api/challenge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        challengeId: challenge.challengeId,
        word: challenge.word,
        creatorName: challenge.senderName || 'Anonymous',
        creatorId: challenge.creatorId || generateChallengeId(),
        createdAt: challenge.createdAt.getTime(),
      }),
    });

    if (!response.ok) {
      console.error('[Challenge] Failed to store challenge:', response.statusText);
      return false;
    }

    console.log('[Challenge] Challenge stored successfully:', challenge.challengeId);
    return true;
  } catch (error) {
    console.error('[Challenge] Error storing challenge:', error);
    return false;
  }
}

// Submit a challenge completion to the backend
export async function submitChallengeCompletion(
  challenge: WordChallenge,
  result: ChallengeResult,
  completerName: string
): Promise<boolean> {
  try {
    const wsUrl = getWebSocketUrl();
    const httpUrl = wsUrl.replace(/^ws/, 'http');
    
    const response = await fetch(`${httpUrl}/api/challenge/${challenge.challengeId}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        completerName: completerName || 'Anonymous',
        solved: result.solved,
        guesses: result.guesses,
        solveTime: result.solveTime,
        completedAt: Date.now(),
      }),
    });

    if (!response.ok) {
      console.error('[Challenge] Failed to submit completion:', response.statusText);
      return false;
    }

    console.log('[Challenge] Completion submitted successfully');
    return true;
  } catch (error) {
    console.error('[Challenge] Error submitting completion:', error);
    return false;
  }
}

// Get completions for a challenge
export async function getChallengeCompletions(challengeId: string): Promise<any[]> {
  try {
    const wsUrl = getWebSocketUrl();
    const httpUrl = wsUrl.replace(/^ws/, 'http');
    
    const response = await fetch(`${httpUrl}/api/challenge/${challengeId}/completions`);
    
    if (!response.ok) {
      console.error('[Challenge] Failed to get completions:', response.statusText);
      return [];
    }

    const data = await response.json();
    return data.completions || [];
  } catch (error) {
    console.error('[Challenge] Error getting completions:', error);
    return [];
  }
}

// Get challenge info from backend
export async function getChallengeInfo(challengeId: string): Promise<any | null> {
  try {
    const wsUrl = getWebSocketUrl();
    const httpUrl = wsUrl.replace(/^ws/, 'http');
    
    const response = await fetch(`${httpUrl}/api/challenge/${challengeId}`);
    
    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.challenge || null;
  } catch (error) {
    console.error('[Challenge] Error getting challenge info:', error);
    return null;
  }
}

// Check for new completions (for notifications)
export async function checkForNewCompletions(challengeIds: string[]): Promise<Map<string, number>> {
  const completionCounts = new Map<string, number>();
  
  for (const challengeId of challengeIds) {
    const completions = await getChallengeCompletions(challengeId);
    completionCounts.set(challengeId, completions.length);
  }
  
  return completionCounts;
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

  // Submit completion to backend (which will notify the creator)
  return await submitChallengeCompletion(challenge, result, completerName);
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
