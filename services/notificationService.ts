// Firebase notification service for async challenge completion
// Install with: npm install firebase
// This module is optional - if Firebase is not installed, notifications will be disabled

type FirebaseApp = any;
type Firestore = any;
type Messaging = any;
type Timestamp = any;

interface ChallengeNotification {
  challengeId: string;
  creatorId: string;
  completerId: string;
  completerName: string;
  word: string;
  guesses: number;
  won: boolean;
  completedAt: Timestamp;
}

class NotificationService {
  private app: FirebaseApp | null = null;
  private db: Firestore | null = null;
  private messaging: Messaging | null = null;
  private initialized = false;

  async initialize() {
    // Check if Firebase config is provided via environment variables
    const firebaseConfig = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID
    };

    // Only initialize if all config values are present
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
      console.log('[Notifications] Firebase not configured - async notifications disabled');
      return false;
    }

    try {
      // Dynamically import Firebase (only if configured and installed)
      // This will fail gracefully if firebase package is not installed
      const firebaseApp = await import(/* @vite-ignore */ 'firebase/app').catch(() => null);
      if (!firebaseApp) {
        console.log('[Notifications] Firebase package not installed');
        return false;
      }

      const firebaseFirestore = await import(/* @vite-ignore */ 'firebase/firestore').catch(() => null);
      if (!firebaseFirestore) {
        console.log('[Notifications] Firebase Firestore package not installed');
        return false;
      }

      const { initializeApp } = firebaseApp;
      const { getFirestore, collection, addDoc, query, where, onSnapshot, Timestamp } = firebaseFirestore;
      
      this.app = initializeApp(firebaseConfig);
      this.db = getFirestore(this.app);
      
      // Store Firebase functions for later use
      (this as any)._collection = collection;
      (this as any)._addDoc = addDoc;
      (this as any)._query = query;
      (this as any)._where = where;
      (this as any)._onSnapshot = onSnapshot;
      (this as any)._Timestamp = Timestamp;
      
      // Initialize messaging if available (requires HTTPS)
      if ('Notification' in window && window.location.protocol === 'https:') {
        const firebaseMessaging = await import(/* @vite-ignore */ 'firebase/messaging').catch(() => null);
        if (firebaseMessaging) {
          const { getMessaging, getToken, onMessage } = firebaseMessaging;
          this.messaging = getMessaging(this.app);
          (this as any)._getToken = getToken;
          (this as any)._onMessage = onMessage;
          this.requestPermission();
        }
      }
      
      this.initialized = true;
      console.log('[Notifications] Firebase initialized successfully');
      return true;
    } catch (error) {
      console.error('[Notifications] Failed to initialize Firebase:', error);
      return false;
    }
  }

  async requestPermission(): Promise<boolean> {
    if (!this.messaging) return false;

    try {
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        console.log('[Notifications] Permission granted');
        const getToken = (this as any)._getToken;
        if (getToken) {
          const token = await getToken(this.messaging, {
            vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
          });
          console.log('[Notifications] FCM token:', token);
        }
        return true;
      } else {
        console.log('[Notifications] Permission denied');
        return false;
      }
    } catch (error) {
      console.error('[Notifications] Error requesting permission:', error);
      return false;
    }
  }

  // Send notification when someone completes a challenge
  async notifyChallengeComplete(data: {
    challengeId: string;
    creatorId: string;
    completerId: string;
    completerName: string;
    word: string;
    guesses: number;
    won: boolean;
  }): Promise<boolean> {
    if (!this.initialized || !this.db) {
      console.log('[Notifications] Service not initialized');
      return false;
    }

    try {
      const Timestamp = (this as any)._Timestamp;
      const collection = (this as any)._collection;
      const addDoc = (this as any)._addDoc;
      
      const notificationData: ChallengeNotification = {
        ...data,
        completedAt: Timestamp.now()
      };

      await addDoc(collection(this.db, 'challenge_completions'), notificationData);
      console.log('[Notifications] Challenge completion recorded');
      return true;
    } catch (error) {
      console.error('[Notifications] Error recording completion:', error);
      return false;
    }
  }

  // Listen for notifications for a specific user
  listenForNotifications(userId: string, callback: (notification: ChallengeNotification) => void): () => void {
    if (!this.initialized || !this.db) {
      console.log('[Notifications] Service not initialized');
      return () => {};
    }

    const query = (this as any)._query;
    const collection = (this as any)._collection;
    const where = (this as any)._where;
    const onSnapshot = (this as any)._onSnapshot;

    const q = query(
      collection(this.db, 'challenge_completions'),
      where('creatorId', '==', userId)
    );

    const unsubscribe = onSnapshot(q, (snapshot: any) => {
      snapshot.docChanges().forEach((change: any) => {
        if (change.type === 'added') {
          const data = change.doc.data() as ChallengeNotification;
          console.log('[Notifications] New completion:', data);
          callback(data);
          
          // Show browser notification
          this.showBrowserNotification(data);
        }
      });
    });

    return unsubscribe;
  }

  private showBrowserNotification(data: ChallengeNotification) {
    if ('Notification' in window && Notification.permission === 'granted') {
      const title = data.won 
        ? `${data.completerName} solved your challenge!` 
        : `${data.completerName} tried your challenge`;
      
      const body = data.won 
        ? `They guessed "${data.word}" in ${data.guesses} tries!`
        : `They couldn't guess "${data.word}"`;

      new Notification(title, {
        body,
        icon: '/vite.svg',
        badge: '/vite.svg'
      });
    }
  }

  // Setup foreground message listener
  setupForegroundListener(callback: (payload: any) => void) {
    if (!this.messaging) return;

    const onMessage = (this as any)._onMessage;
    if (onMessage) {
      onMessage(this.messaging, (payload: any) => {
        console.log('[Notifications] Foreground message:', payload);
        callback(payload);
      });
    }
  }

  isEnabled(): boolean {
    return this.initialized;
  }
}

export const notificationService = new NotificationService();

