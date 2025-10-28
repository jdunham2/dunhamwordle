# User Accounts Implementation - Remaining Work

## ✅ Completed:
1. Created `userService.ts` with full user management API
2. Created `UserAuthScreen.tsx` component with avatar selection
3. Created `ChallengeInbox.tsx` for viewing received challenges
4. Created `SendChallengeModal.tsx` for sending challenges to users
5. Updated Deno Deploy server with user endpoints and in-app challenge delivery

## 🔄 Remaining Integration Work:

### 1. App.tsx Integration
- [ ] Add `currentUser` state and check if user is authenticated
- [ ] Show `UserAuthScreen` if no user is logged in
- [ ] Add notification badge showing unread challenge count
- [ ] Replace `WordChallengeModal` with `SendChallengeModal`
- [ ] Add inbox button to header
- [ ] Update challenge completion to mark as completed in user's inbox
- [ ] Add logout functionality

### 2. Update Challenge Flow
- [ ] When completing a received challenge, call `markChallengeAsCompleted`
- [ ] Remove old URL-based challenge sharing
- [ ] Update "Sent Challenges" to fetch from user's sent challenges
- [ ] Track user stats (games played, won, streaks) per account

### 3. Daily Challenge Per User
- [ ] Track daily challenge completion per user ID
- [ ] Show which users have completed today's daily
- [ ] Leaderboard for daily challenges

### 4. Push Notifications (Optional Enhancement)
- [ ] Update service worker to handle push events
- [ ] Prompt user to enable notifications on first login
- [ ] Test push notifications on mobile devices
- [ ] Generate VAPID keys for production

### 5. Testing
- [ ] Test user creation and login flow
- [ ] Test sending challenges between users
- [ ] Test receiving and completing challenges
- [ ] Test notification badge updates
- [ ] Test on mobile devices

## Code Changes Needed in App.tsx:

```typescript
// Add to imports
import { UserAuthScreen } from './components/UserAuthScreen';
import { ChallengeInbox } from './components/ChallengeInbox';
import { SendChallengeModal } from './components/SendChallengeModal';
import { getCurrentUser, getUnreadChallengeCount, subscribeToPushNotifications } from './services/userService';

// Add state
const [currentUser, setCurrentUser] = useState<User | null>(null);
const [showInbox, setShowInbox] = useState(false);
const [unreadCount, setUnreadCount] = useState(0);

// On mount, check for user
useEffect(() => {
  const user = getCurrentUser();
  if (user) {
    setCurrentUser(user);
    loadUnreadCount(user.userId);
    // Optional: prompt for push notifications
    subscribeToPushNotifications(user.userId);
  }
}, []);

// Replace WordChallengeModal with SendChallengeModal
{showWordChallenge && currentUser && (
  <SendChallengeModal
    isOpen={showWordChallenge}
    onClose={() => setShowWordChallenge(false)}
    currentUser={currentUser}
    validWords={validWords}
  />
)}

// Add inbox button to header
<button onClick={() => setShowInbox(true)}>
  <Inbox />
  {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
</button>

// Show user auth screen if not logged in
{!currentUser && <UserAuthScreen onAuthenticated={setCurrentUser} />}
```

## Deployment:
1. Push updated `deno-deploy-server.ts` to GitHub
2. Deno Deploy will auto-deploy
3. Test on GitHub Pages
4. Monitor Deno Deploy logs for any errors

## Notes:
- User accounts are stored in Deno KV (free, built-in database)
- Challenges are delivered in-app, no more external sharing
- Push notifications are optional but recommended for best UX
- All user data persists across sessions via localStorage for current user
- Server handles challenge routing and notifications

