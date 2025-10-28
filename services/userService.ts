import { getWebSocketUrl } from './wsConfig';

export interface User {
  userId: string;
  username: string;
  avatar: string;
  createdAt: number;
  lastSeen: number;
}

export interface UserStats {
  userId: string;
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  lastDailyPlayed?: string; // YYYY-MM-DD format
}

// Avatar options - using emojis for simplicity and cross-platform compatibility
export const AVATARS = [
  '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
  '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙',
  '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫',
  '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬',
  '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢',
  '🥳', '🥸', '😎', '🤓', '🧐', '😕', '😟', '🙁', '☹️', '😮',
  '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢',
  '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤',
  '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹',
  '👺', '👻', '👽', '👾', '🤖', '😺', '😸', '😹', '😻', '😼',
  '😽', '🙀', '😿', '😾', '🐶', '🐱', '🐭', '🐹', '🐰', '🦊',
  '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔',
  '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴',
  '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟', '🦗', '🕷️',
  '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞',
  '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅',
];

const STORAGE_KEY = 'dunhamwordle_current_user';

// Get current logged-in user
export function getCurrentUser(): User | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('[User] Error reading current user:', error);
    return null;
  }
}

// Set current logged-in user
export function setCurrentUser(user: User): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } catch (error) {
    console.error('[User] Error saving current user:', error);
  }
}

// Clear current user (logout)
export function clearCurrentUser(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('[User] Error clearing current user:', error);
  }
}

// Check if username is available
export async function checkUsernameAvailable(username: string): Promise<boolean> {
  try {
    const wsUrl = getWebSocketUrl();
    const httpUrl = wsUrl.replace('wss://', 'https://').replace('ws://', 'http://');
    
    const response = await fetch(`${httpUrl}/api/user/check/${encodeURIComponent(username)}`);
    if (!response.ok) return false;
    
    const data = await response.json();
    return data.available;
  } catch (error) {
    console.error('[User] Error checking username:', error);
    return false;
  }
}

// Create new user account
export async function createUser(username: string, avatar: string): Promise<User | null> {
  try {
    const wsUrl = getWebSocketUrl();
    const httpUrl = wsUrl.replace('wss://', 'https://').replace('ws://', 'http://');
    
    const response = await fetch(`${httpUrl}/api/user/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, avatar }),
    });
    
    if (!response.ok) {
      console.error('[User] Failed to create user:', response.statusText);
      return null;
    }
    
    const user = await response.json();
    setCurrentUser(user);
    return user;
  } catch (error) {
    console.error('[User] Error creating user:', error);
    return null;
  }
}

// Get all users (for avatar selection screen)
export async function getAllUsers(): Promise<User[]> {
  try {
    const wsUrl = getWebSocketUrl();
    const httpUrl = wsUrl.replace('wss://', 'https://').replace('ws://', 'http://');
    
    const response = await fetch(`${httpUrl}/api/users`);
    if (!response.ok) {
      console.error('[User] Failed to fetch users:', response.statusText);
      return [];
    }
    
    const users = await response.json();
    return users;
  } catch (error) {
    console.error('[User] Error fetching users:', error);
    return [];
  }
}

// Get user by username
export async function getUserByUsername(username: string): Promise<User | null> {
  try {
    const wsUrl = getWebSocketUrl();
    const httpUrl = wsUrl.replace('wss://', 'https://').replace('ws://', 'http://');
    
    const response = await fetch(`${httpUrl}/api/user/${encodeURIComponent(username)}`);
    if (!response.ok) return null;
    
    const user = await response.json();
    return user;
  } catch (error) {
    console.error('[User] Error fetching user:', error);
    return null;
  }
}

// Login as existing user
export async function loginUser(userId: string): Promise<User | null> {
  try {
    const wsUrl = getWebSocketUrl();
    const httpUrl = wsUrl.replace('wss://', 'https://').replace('ws://', 'http://');
    
    const response = await fetch(`${httpUrl}/api/user/${userId}/login`, {
      method: 'POST',
    });
    
    if (!response.ok) return null;
    
    const user = await response.json();
    setCurrentUser(user);
    return user;
  } catch (error) {
    console.error('[User] Error logging in:', error);
    return null;
  }
}

// Get user's received challenges
export async function getUserChallenges(userId: string): Promise<any[]> {
  try {
    const wsUrl = getWebSocketUrl();
    const httpUrl = wsUrl.replace('wss://', 'https://').replace('ws://', 'http://');
    
    const response = await fetch(`${httpUrl}/api/user/${userId}/challenges`);
    if (!response.ok) return [];
    
    const challenges = await response.json();
    return challenges;
  } catch (error) {
    console.error('[User] Error fetching challenges:', error);
    return [];
  }
}

// Send challenge to specific user
export async function sendChallengeToUser(
  fromUserId: string,
  toUsername: string,
  word: string,
  challengeId: string
): Promise<boolean> {
  try {
    const wsUrl = getWebSocketUrl();
    const httpUrl = wsUrl.replace('wss://', 'https://').replace('ws://', 'http://');
    
    const response = await fetch(`${httpUrl}/api/challenge/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fromUserId,
        toUsername,
        word,
        challengeId,
      }),
    });
    
    return response.ok;
  } catch (error) {
    console.error('[User] Error sending challenge:', error);
    return false;
  }
}

// Mark challenge as read
export async function markChallengeAsRead(challengeId: string, userId: string): Promise<boolean> {
  try {
    const wsUrl = getWebSocketUrl();
    const httpUrl = wsUrl.replace('wss://', 'https://').replace('ws://', 'http://');
    
    const response = await fetch(`${httpUrl}/api/challenge/${challengeId}/read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    
    return response.ok;
  } catch (error) {
    console.error('[User] Error marking challenge as read:', error);
    return false;
  }
}

// Mark challenge as completed
export async function markChallengeAsCompleted(challengeId: string, userId: string, result: any): Promise<boolean> {
  try {
    const wsUrl = getWebSocketUrl();
    const httpUrl = wsUrl.replace('wss://', 'https://').replace('ws://', 'http://');
    
    const response = await fetch(`${httpUrl}/api/challenge/${challengeId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, result }),
    });
    
    return response.ok;
  } catch (error) {
    console.error('[User] Error marking challenge as completed:', error);
    return false;
  }
}

// Get count of unread challenges
export async function getUnreadChallengeCount(userId: string): Promise<number> {
  try {
    const challenges = await getUserChallenges(userId);
    return challenges.filter((c: any) => !c.read).length;
  } catch (error) {
    console.error('[User] Error getting unread count:', error);
    return 0;
  }
}

// Request push notification permission and save subscription
export async function subscribeToPushNotifications(userId: string): Promise<boolean> {
  try {
    // Check if push notifications are supported
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('[Push] Push notifications not supported');
      return false;
    }

    // Request permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('[Push] Permission denied');
      return false;
    }

    // Get service worker registration
    const registration = await navigator.serviceWorker.ready;

    // Subscribe to push notifications
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        'BEl62iUYgUivxIkv69yViEuiBIa-Ib37gp65aOzvtg8qPZZOhbN-5QWgzaI3ZvEQ6wqL9uGOGCZyqR7aYjFeFTU'
      ),
    });

    // Send subscription to backend
    const wsUrl = getWebSocketUrl();
    const httpUrl = wsUrl.replace('wss://', 'https://').replace('ws://', 'http://');
    
    await fetch(`${httpUrl}/api/user/${userId}/push-subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription),
    });

    return true;
  } catch (error) {
    console.error('[Push] Error subscribing:', error);
    return false;
  }
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

