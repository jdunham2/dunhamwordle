/**
 * Deno Deploy WebSocket Server for Dunham Wordle Multiplayer
 * 
 * Deploy to Deno Deploy:
 * 1. Go to dash.deno.com
 * 2. Create new project
 * 3. Connect GitHub repo
 * 4. Entry point: deno-deploy-server.ts
 * 5. Deploy!
 * 
 * Your WebSocket URL: wss://[your-project].deno.dev
 */

declare const Deno: any;

// Database using Deno KV (free, built-in)
const kv = await Deno.openKv();

// Get database
async function getDB() {
  const result = await kv.get(["wordle_db"]);
  const defaultDB = { 
    rooms: {}, 
    challenges: {}, 
    completions: [],
    users: {},
    userChallenges: {}, // userId -> array of received challenges
    sentChallenges: {}, // userId -> array of challenges they sent
    pushSubscriptions: {} // userId -> push subscription
  };
  
  // If no database exists, return default
  if (!result.value) {
    return defaultDB;
  }
  
  // Merge with default to ensure all keys exist
  const db = result.value as any;
  return {
    rooms: db.rooms || {},
    challenges: db.challenges || {},
    completions: db.completions || [],
    users: db.users || {},
    userChallenges: db.userChallenges || {},
    sentChallenges: db.sentChallenges || {},
    pushSubscriptions: db.pushSubscriptions || {}
  };
}

// Save database
async function saveDB(db: any) {
  await kv.set(["wordle_db"], db);
}

// Helper functions
async function addChallenge(challenge: any) {
  const db = await getDB();
  db.challenges[challenge.challengeId] = {
    ...challenge,
    createdAt: Date.now(),
    completedCount: 0
  };
  await saveDB(db);
}

async function addCompletion(completion: any) {
  const db = await getDB();
  db.completions.push({
    ...completion,
    id: db.completions.length + 1,
    completedAt: Date.now()
  });
  
  if (db.challenges[completion.challengeId]) {
    db.challenges[completion.challengeId].completedCount++;
  }
  
  await saveDB(db);
}

async function getChallengeCompletions(challengeId: string) {
  const db = await getDB();
  return db.completions.filter((c: any) => c.challengeId === challengeId);
}

async function getChallenge(challengeId: string) {
  const db = await getDB();
  return db.challenges[challengeId];
}

// User management functions
function generateUserId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

async function createUser(username: string, avatar: string) {
  const db = await getDB();
  const userId = generateUserId();
  const user = {
    userId,
    username,
    avatar,
    createdAt: Date.now(),
    lastSeen: Date.now(),
    dailyCompletions: {}, // Store Word of the Day completions
    stats: {} // Store user stats (optional, for future use)
  };
  db.users[userId] = user;
  await saveDB(db);
  return user;
}

async function getUser(userId: string) {
  const db = await getDB();
  return db.users[userId];
}

async function getUserByUsername(username: string): Promise<any | null> {
  const db = await getDB();
  // Ensure users object exists
  if (!db.users || typeof db.users !== 'object') {
    return null;
  }
  return Object.values(db.users).find((u: any) => 
    u.username.toLowerCase() === username.toLowerCase()
  );
}

async function getAllUsers() {
  const db = await getDB();
  // Ensure users object exists
  if (!db.users || typeof db.users !== 'object') {
    db.users = {};
    await saveDB(db);
  }
  return Object.values(db.users);
}

async function updateUserLastSeen(userId: string) {
  const db = await getDB();
  if (db.users[userId]) {
    db.users[userId].lastSeen = Date.now();
    await saveDB(db);
  }
}

async function sendChallengeToUser(fromUserId: string, toUsername: string, word: string, challengeId: string) {
  const db = await getDB();
  const toUser = await getUserByUsername(toUsername);
  
  if (!toUser) {
    return { success: false, error: 'User not found' };
  }
  
  const fromUser = db.users[fromUserId];
  if (!fromUser) {
    return { success: false, error: 'Sender not found' };
  }
  
  // Initialize user challenges array if needed
  if (!db.userChallenges[toUser.userId]) {
    db.userChallenges[toUser.userId] = [];
  }
  
  // Add challenge to recipient's inbox
  db.userChallenges[toUser.userId].push({
    challengeId,
    fromUserId: fromUser.userId,
    fromUsername: fromUser.username,
    fromAvatar: fromUser.avatar,
    word,
    sentAt: Date.now(),
    read: false,
    completed: false,
  });
  
  // Initialize sent challenges array if needed
  if (!db.sentChallenges[fromUser.userId]) {
    db.sentChallenges[fromUser.userId] = [];
  }
  
  // Add challenge to sender's sent list
  db.sentChallenges[fromUser.userId].push({
    challengeId,
    toUserId: toUser.userId,
    toUsername: toUser.username,
    toAvatar: toUser.avatar,
    word,
    sentAt: Date.now(),
  });
  
  await saveDB(db);
  
  // Send WebSocket notification to recipient
  sendNotificationToUser(toUser.userId, {
    kind: 'new-challenge',
    fromUsername: fromUser.username,
    fromAvatar: fromUser.avatar,
    word,
    challengeId
  });
  
  // TODO: Send push notification if user has subscription
  await sendPushNotification(toUser.userId, {
    title: `New Challenge from ${fromUser.username}!`,
    body: `${fromUser.username} sent you a Wordle challenge`,
    icon: fromUser.avatar,
  });
  
  return { success: true, toUserId: toUser.userId };
}

async function getUserChallenges(userId: string) {
  const db = await getDB();
  return db.userChallenges[userId] || [];
}

async function markChallengeAsRead(challengeId: string, userId: string) {
  const db = await getDB();
  const challenges = db.userChallenges[userId] || [];
  const challenge = challenges.find((c: any) => c.challengeId === challengeId);
  if (challenge) {
    challenge.read = true;
    await saveDB(db);
  }
}

async function markChallengeAsCompleted(challengeId: string, userId: string, result: any) {
  const db = await getDB();
  const challenges = db.userChallenges[userId] || [];
  const challenge = challenges.find((c: any) => c.challengeId === challengeId);
  if (challenge) {
    // Check if already completed to prevent duplicates
    if (challenge.completed) {
      console.log(`Challenge ${challengeId} already completed by user ${userId}`);
      return;
    }
    
    challenge.completed = true;
    challenge.completedAt = Date.now();
    challenge.result = result;
    challenge.read = true; // Also mark as read when completed
    await saveDB(db);
    
    // Send WebSocket notification to sender
    const completerName = await getUsername(userId);
    const db2 = await getDB();
    sendNotificationToUser(challenge.fromUserId, {
      kind: 'challenge-completed',
      completerName,
      completerAvatar: db2.users[userId]?.avatar || '👤',
      word: challenge.word,
      solved: result?.solved || false,
      guesses: result?.guesses?.length || 0,
      challengeId
    });
    
    // Notify sender with push notification
    await sendPushNotification(challenge.fromUserId, {
      title: `Challenge Completed!`,
      body: `${completerName} completed your challenge`,
      icon: '🎉',
    });
  }
}

async function deleteReceivedChallenge(userId: string, challengeId: string) {
  const db = await getDB();
  if (db.userChallenges[userId]) {
    db.userChallenges[userId] = db.userChallenges[userId].filter(
      (c: any) => c.challengeId !== challengeId
    );
    await saveDB(db);
  }
}

async function deleteSentChallenge(userId: string, challengeId: string) {
  const db = await getDB();
  if (db.sentChallenges[userId]) {
    db.sentChallenges[userId] = db.sentChallenges[userId].filter(
      (c: any) => c.challengeId !== challengeId
    );
    await saveDB(db);
  }
}

async function getUsername(userId: string): Promise<string> {
  const user = await getUser(userId);
  return user?.username || 'Someone';
}

async function savePushSubscription(userId: string, subscription: any) {
  const db = await getDB();
  db.pushSubscriptions[userId] = subscription;
  await saveDB(db);
}

async function sendPushNotification(userId: string, payload: any) {
  const db = await getDB();
  const subscription = db.pushSubscriptions[userId];
  
  if (!subscription) {
    console.log(`No push subscription for user ${userId}`);
    return;
  }
  
  try {
    // Get VAPID keys from environment variables
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY') || '';
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY') || '';
    const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@dunhamwordle.com';
    
    if (!vapidPublicKey || !vapidPrivateKey) {
      console.log('[Push] VAPID keys not configured, skipping push notification');
      return;
    }
    
    // Import web-push-deno for Deno environment
    // Note: Using fetch API with Web Push protocol directly
    const endpoint = subscription.endpoint;
    const p256dh = subscription.keys.p256dh;
    const auth = subscription.keys.auth;
    
    // Prepare notification payload
    const notificationPayload = JSON.stringify({
      title: payload.title || 'Dunham Wordle',
      body: payload.body || 'New notification',
      icon: payload.icon || '/dunhamwordle/vite.svg',
      badge: payload.badge || '/dunhamwordle/vite.svg',
      tag: payload.tag || 'wordle-notification',
      data: payload.data || { url: '/dunhamwordle/' }
    });
    
    // For now, log the notification (actual web push requires crypto signing)
    // Full implementation would use web-push protocol with VAPID authentication
    console.log(`[Push] Sending notification to ${userId}:`, payload);
    console.log(`[Push] Endpoint:`, endpoint);
    
    // TODO: Implement full web-push protocol with VAPID signing
    // This requires:
    // 1. JWT token generation with VAPID keys
    // 2. Encryption of payload using p256dh and auth
    // 3. POST request to subscription endpoint with proper headers
    // For production, consider using a library or service
    
  } catch (error) {
    console.error(`[Push] Error sending notification to ${userId}:`, error);
  }
}

// In-memory storage for active connections
const rooms = new Map<string, Set<WebSocket>>();
const socketToRoom = new WeakMap<WebSocket, string>();
const socketToUser = new WeakMap<WebSocket, string>(); // Track which user each socket belongs to
const userSockets = new Map<string, Set<WebSocket>>(); // Track all active sockets per user

function generateRoomId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Send notification to all active sockets for a user
function sendNotificationToUser(userId: string, notification: any) {
  const sockets = userSockets.get(userId);
  if (!sockets || sockets.size === 0) {
    console.log(`No active sockets for user ${userId}`);
    return;
  }
  
  const message = JSON.stringify({
    type: 'notification',
    ...notification
  });
  
  sockets.forEach(socket => {
    try {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(message);
      }
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  });
  
  console.log(`Sent notification to ${sockets.size} socket(s) for user ${userId}`);
}

// Track user WebSocket connection
function registerUserSocket(userId: string, socket: WebSocket) {
  if (!userSockets.has(userId)) {
    userSockets.set(userId, new Set());
  }
  userSockets.get(userId)!.add(socket);
  socketToUser.set(socket, userId);
  console.log(`Registered socket for user ${userId}, total: ${userSockets.get(userId)!.size}`);
}

// Remove user WebSocket connection
function unregisterUserSocket(socket: WebSocket) {
  const userId = socketToUser.get(socket);
  if (userId) {
    const sockets = userSockets.get(userId);
    if (sockets) {
      sockets.delete(socket);
      if (sockets.size === 0) {
        userSockets.delete(userId);
      }
      console.log(`Unregistered socket for user ${userId}, remaining: ${sockets.size}`);
    }
    socketToUser.delete(socket);
  }
}

// Main handler
export default {
  async fetch(req: Request): Promise<Response> {
    // Handle WebSocket upgrade
    if (req.headers.get("upgrade") === "websocket") {
      const { socket, response } = Deno.upgradeWebSocket(req);
      
      socket.onopen = () => {
        console.log("Client connected");
      };

      socket.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Handle user registration
          if (data.type === 'register-user' && data.userId) {
            registerUserSocket(data.userId, socket);
            socket.send(JSON.stringify({ type: 'user-registered' }));
            return;
          }
          
          switch (data.type) {
            case "create-room": {
              const roomId = generateRoomId();
              rooms.set(roomId, new Set([socket]));
              socketToRoom.set(socket, roomId);
              
              // Store in database
              const db = await getDB();
              db.rooms[roomId] = {
                roomId,
                createdAt: Date.now(),
                hostUsername: data.username || "anonymous"
              };
              await saveDB(db);
              
              socket.send(JSON.stringify({
                type: "room-created",
                roomId,
              }));
              
              // Also send player-joined message to match local server behavior
              socket.send(JSON.stringify({
                type: "player-joined",
                roomId,
                isHost: true,
                playerCount: 1,
                isNewPlayer: false,
              }));
              
              console.log(`Room ${roomId} created and host added`);
              break;
            }

            case "join-room": {
              const { roomId } = data;
              const room = rooms.get(roomId);
              
              if (!room) {
                socket.send(JSON.stringify({
                  type: "error",
                  message: "Room not found",
                }));
                break;
              }
              
              if (room.size >= 2) {
                socket.send(JSON.stringify({
                  type: "room-full",
                }));
                break;
              }
              
              if (room.has(socket)) {
                console.log(`Socket already in room ${roomId}`);
                break;
              }
              
              room.add(socket);
              socketToRoom.set(socket, roomId);
              
              const isHost = room.size === 1;
              const playerCount = room.size;
              
              // Notify all players
              room.forEach((client) => {
                client.send(JSON.stringify({
                  type: "player-joined",
                  roomId,
                  isHost: client === socket ? !isHost : isHost,
                  playerCount,
                  isNewPlayer: client !== socket,
                }));
              });
              
              console.log(`Player joined room ${roomId} (${playerCount} players)`);
              break;
            }

            case "offer":
            case "answer":
            case "ice-candidate": {
              const roomId = socketToRoom.get(socket);
              if (!roomId) break;
              
              const room = rooms.get(roomId);
              if (!room) break;
              
              // Forward to other players
              room.forEach((client) => {
                if (client !== socket) {
                  client.send(JSON.stringify(data));
                }
              });
              break;
            }

            case "get-room-status": {
              const { roomId } = data;
              const room = rooms.get(roomId);
              
              if (!room) {
                socket.send(JSON.stringify({
                  type: "error",
                  message: "Room not found",
                }));
                break;
              }
              
              const isHost = Array.from(room)[0] === socket;
              
              socket.send(JSON.stringify({
                type: "room-status",
                roomId,
                playerCount: room.size,
                isHost,
              }));
              break;
            }

            // Challenge API
            case "create-challenge": {
              const { challengeId, word, creatorId, creatorName } = data;
              
              await addChallenge({
                challengeId,
                creatorId,
                creatorName,
                word
              });
              
              socket.send(JSON.stringify({
                type: "challenge-created",
                challengeId,
              }));
              
              console.log(`Challenge ${challengeId} created`);
              break;
            }

            case "complete-challenge": {
              const { challengeId, completerId, completerName, won, guesses } = data;
              
              await addCompletion({
                challengeId,
                completerId,
                completerName,
                won,
                guesses
              });
              
              const challenge = await getChallenge(challengeId);
              
              if (challenge) {
                socket.send(JSON.stringify({
                  type: "challenge-completed",
                  challengeId,
                  creatorId: challenge.creatorId,
                  completerName,
                  won,
                  guesses,
                }));
              }
              
              console.log(`Challenge ${challengeId} completed`);
              break;
            }

            case "get-challenge-completions": {
              const { challengeId } = data;
              
              const completions = await getChallengeCompletions(challengeId);
              
              socket.send(JSON.stringify({
                type: "challenge-completions",
                challengeId,
                completions: completions.map((c: any) => ({
                  completerName: c.completerName,
                  won: c.won,
                  guesses: c.guesses,
                  completedAt: c.completedAt,
                })),
              }));
              break;
            }
          }
        } catch (error) {
          console.error("Error handling message:", error);
          socket.send(JSON.stringify({
            type: "error",
            message: "Internal server error",
          }));
        }
      };

      socket.onclose = () => {
        // Unregister user tracking
        unregisterUserSocket(socket);
        
        const roomId = socketToRoom.get(socket);
        if (roomId) {
          const room = rooms.get(roomId);
          if (room) {
            room.delete(socket);
            
            if (room.size === 0) {
              rooms.delete(roomId);
              console.log(`Room ${roomId} cleaned up`);
            } else {
              room.forEach((client) => {
                client.send(JSON.stringify({
                  type: "player-left",
                  playerCount: room.size,
                }));
              });
            }
          }
        }
        console.log("Client disconnected");
      };

      socket.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      return response;
    }

    // HTTP API endpoints
    const url = new URL(req.url);
    
    console.log(`[HTTP] ${req.method} ${url.pathname}`);
    
    // CORS headers for all HTTP requests
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };
    
    // Handle preflight requests
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    
    // GET /api/users - Get all users
    if (req.method === "GET" && url.pathname === "/api/users") {
      try {
        const users = await getAllUsers();
        return Response.json(users, { headers: corsHeaders });
      } catch (error) {
        console.error("Error getting users:", error);
        return Response.json(
          { success: false, error: String(error) },
          { status: 500, headers: corsHeaders }
        );
      }
    }
    
    // POST /api/user/create - Create new user
    if (req.method === "POST" && url.pathname === "/api/user/create") {
      try {
        const { username, avatar } = await req.json();
        
        // Check if username already exists
        const existing = await getUserByUsername(username);
        if (existing) {
          return Response.json(
            { success: false, error: "Username already taken" },
            { status: 400, headers: corsHeaders }
          );
        }
        
        const user = await createUser(username, avatar);
        return Response.json(user, { headers: corsHeaders });
      } catch (error) {
        console.error("Error creating user:", error);
        return Response.json(
          { success: false, error: String(error) },
          { status: 500, headers: corsHeaders }
        );
      }
    }
    
    // GET /api/user/check/:username - Check if username is available
    if (req.method === "GET" && url.pathname.match(/^\/api\/user\/check\/.+$/)) {
      try {
        const username = decodeURIComponent(url.pathname.split('/').pop() || '');
        const existing = await getUserByUsername(username);
        return Response.json(
          { available: !existing },
          { headers: corsHeaders }
        );
      } catch (error) {
        console.error("Error checking username:", error);
        return Response.json(
          { success: false, error: String(error) },
          { status: 500, headers: corsHeaders }
        );
      }
    }
    
    // GET /api/user/:username - Get user by username
    if (req.method === "GET" && url.pathname.match(/^\/api\/user\/[^\/]+$/) && !url.pathname.includes('/check/') && !url.pathname.includes('/login') && !url.pathname.includes('/challenges')) {
      try {
        const username = decodeURIComponent(url.pathname.split('/').pop() || '');
        const user = await getUserByUsername(username);
        if (user) {
          return Response.json(user, { headers: corsHeaders });
        } else {
          return Response.json(
            { success: false, error: "User not found" },
            { status: 404, headers: corsHeaders }
          );
        }
      } catch (error) {
        console.error("Error getting user:", error);
        return Response.json(
          { success: false, error: String(error) },
          { status: 500, headers: corsHeaders }
        );
      }
    }
    
    // POST /api/user/:userId/login - Login user
    if (req.method === "POST" && url.pathname.match(/^\/api\/user\/[^\/]+\/login$/)) {
      try {
        const pathParts = url.pathname.split('/');
        const userId = pathParts[3];
        await updateUserLastSeen(userId);
        const user = await getUser(userId);
        if (user) {
          // Ensure dailyCompletions exists
          if (!user.dailyCompletions) {
            user.dailyCompletions = {};
          }
          return Response.json(user, { headers: corsHeaders });
        } else {
          return Response.json(
            { success: false, error: "User not found" },
            { status: 404, headers: corsHeaders }
          );
        }
      } catch (error) {
        console.error("Error logging in user:", error);
        return Response.json(
          { success: false, error: String(error) },
          { status: 500, headers: corsHeaders }
        );
      }
    }
    
    // POST /api/user/:userId/daily - Update daily completions
    if (req.method === "POST" && url.pathname.match(/^\/api\/user\/[^\/]+\/daily$/)) {
      try {
        const pathParts = url.pathname.split('/');
        const userId = pathParts[3];
        const dailyCompletions = await req.json();
        
        const db = await getDB();
        if (db.users[userId]) {
          db.users[userId].dailyCompletions = dailyCompletions;
          await saveDB(db);
          return Response.json({ success: true }, { headers: corsHeaders });
        } else {
          return Response.json(
            { success: false, error: "User not found" },
            { status: 404, headers: corsHeaders }
          );
        }
      } catch (error) {
        console.error("Error updating daily completions:", error);
        return Response.json(
          { success: false, error: String(error) },
          { status: 500, headers: corsHeaders }
        );
      }
    }
    
    // DELETE /api/user/:userId/delete - Delete user (admin)
    if (req.method === "DELETE" && url.pathname.match(/^\/api\/user\/[^\/]+\/delete$/)) {
      try {
        const pathParts = url.pathname.split('/');
        const userId = pathParts[3];
        const db = await getDB();
        
        // Delete user
        delete db.users[userId];
        
        // Delete user's challenges inbox
        delete db.userChallenges[userId];
        
        // Delete user's push subscription
        delete db.pushSubscriptions[userId];
        
        await saveDB(db);
        
        console.log(`Deleted user: ${userId}`);
        
        return Response.json(
          { success: true },
          { headers: corsHeaders }
        );
      } catch (error) {
        console.error("Error deleting user:", error);
        return Response.json(
          { success: false, error: String(error) },
          { status: 500, headers: corsHeaders }
        );
      }
    }
    
    // GET /api/user/:userId/challenges - Get user's received challenges
    if (req.method === "GET" && url.pathname.match(/^\/api\/user\/[^\/]+\/challenges$/)) {
      try {
        const pathParts = url.pathname.split('/');
        const userId = pathParts[3];
        const challenges = await getUserChallenges(userId);
        return Response.json(challenges, { headers: corsHeaders });
      } catch (error) {
        console.error("Error getting user challenges:", error);
        return Response.json(
          { success: false, error: String(error) },
          { status: 500, headers: corsHeaders }
        );
      }
    }
    
    // GET /api/user/:userId/sent-challenges - Get user's sent challenges
    if (req.method === "GET" && url.pathname.match(/^\/api\/user\/[^\/]+\/sent-challenges$/)) {
      try {
        const pathParts = url.pathname.split('/');
        const userId = pathParts[3];
        const db = await getDB();
        const sentChallenges = db.sentChallenges[userId] || [];
        return Response.json(sentChallenges, { headers: corsHeaders });
      } catch (error) {
        console.error("Error getting sent challenges:", error);
        return Response.json(
          { success: false, error: String(error) },
          { status: 500, headers: corsHeaders }
        );
      }
    }
    
    // POST /api/user/:userId/username - Update username
    if (req.method === "POST" && url.pathname.match(/^\/api\/user\/[^\/]+\/username$/)) {
      try {
        const pathParts = url.pathname.split('/');
        const userId = pathParts[3];
        const { username } = await req.json();
        
        // Check if username is taken by another user
        const db = await getDB();
        const existingUser = Object.values(db.users).find((u: any) => 
          u.username.toLowerCase() === username.toLowerCase() && u.userId !== userId
        );
        
        if (existingUser) {
          return Response.json(
            { success: false, error: "Username already taken" },
            { status: 400, headers: corsHeaders }
          );
        }
        
        if (db.users[userId]) {
          db.users[userId].username = username;
          await saveDB(db);
          return Response.json({ success: true, user: db.users[userId] }, { headers: corsHeaders });
        } else {
          return Response.json(
            { success: false, error: "User not found" },
            { status: 404, headers: corsHeaders }
          );
        }
      } catch (error) {
        console.error("Error updating username:", error);
        return Response.json(
          { success: false, error: String(error) },
          { status: 500, headers: corsHeaders }
        );
      }
    }
    
    // POST /api/user/:userId/avatar - Update avatar
    if (req.method === "POST" && url.pathname.match(/^\/api\/user\/[^\/]+\/avatar$/)) {
      try {
        const pathParts = url.pathname.split('/');
        const userId = pathParts[3];
        const { avatar } = await req.json();
        
        const db = await getDB();
        if (db.users[userId]) {
          db.users[userId].avatar = avatar;
          await saveDB(db);
          return Response.json({ success: true, user: db.users[userId] }, { headers: corsHeaders });
        } else {
          return Response.json(
            { success: false, error: "User not found" },
            { status: 404, headers: corsHeaders }
          );
        }
      } catch (error) {
        console.error("Error updating avatar:", error);
        return Response.json(
          { success: false, error: String(error) },
          { status: 500, headers: corsHeaders }
        );
      }
    }
    
    // POST /api/challenge/send - Send challenge to user
    if (req.method === "POST" && url.pathname === "/api/challenge/send") {
      try {
        const { fromUserId, toUsername, word, challengeId } = await req.json();
        const result = await sendChallengeToUser(fromUserId, toUsername, word, challengeId);
        return Response.json(result, { headers: corsHeaders });
      } catch (error) {
        console.error("Error sending challenge:", error);
        return Response.json(
          { success: false, error: String(error) },
          { status: 500, headers: corsHeaders }
        );
      }
    }
    
    // POST /api/challenge/:id/read - Mark challenge as read
    if (req.method === "POST" && url.pathname.match(/^\/api\/challenge\/[^\/]+\/read$/)) {
      try {
        const pathParts = url.pathname.split('/');
        const challengeId = pathParts[3];
        const { userId } = await req.json();
        await markChallengeAsRead(challengeId, userId);
        return Response.json({ success: true }, { headers: corsHeaders });
      } catch (error) {
        console.error("Error marking challenge as read:", error);
        return Response.json(
          { success: false, error: String(error) },
          { status: 500, headers: corsHeaders }
        );
      }
    }
    
    // POST /api/challenge/:id/complete - Mark challenge as completed
    if (req.method === "POST" && url.pathname.match(/^\/api\/challenge\/[^\/]+\/complete$/)) {
      try {
        const pathParts = url.pathname.split('/');
        const challengeId = pathParts[3];
        const { userId, result } = await req.json();
        await markChallengeAsCompleted(challengeId, userId, result);
        return Response.json({ success: true }, { headers: corsHeaders });
      } catch (error) {
        console.error("Error marking challenge as completed:", error);
        return Response.json(
          { success: false, error: String(error) },
          { status: 500, headers: corsHeaders }
        );
      }
    }
    
    // DELETE /api/challenge/:id/received - Delete received challenge
    if (req.method === "DELETE" && url.pathname.match(/^\/api\/challenge\/[^\/]+\/received$/)) {
      try {
        const pathParts = url.pathname.split('/');
        const challengeId = pathParts[3];
        const { userId } = await req.json();
        await deleteReceivedChallenge(userId, challengeId);
        return Response.json({ success: true }, { headers: corsHeaders });
      } catch (error) {
        console.error("Error deleting received challenge:", error);
        return Response.json(
          { success: false, error: String(error) },
          { status: 500, headers: corsHeaders }
        );
      }
    }
    
    // DELETE /api/challenge/:id/sent - Delete sent challenge
   if (req.method === "DELETE" && url.pathname.match(/^\/api\/challenge\/[^\/]+\/sent$/)) {
      try {
        const pathParts = url.pathname.split('/');
        const challengeId = pathParts[3];
        const { userId } = await req.json();
        await deleteSentChallenge(userId, challengeId);
        return Response.json({ success: true }, { headers: corsHeaders });
      } catch (error) {
        console.error("Error deleting sent challenge:", error);
        return Response.json(
          { success: false, error: String(error) },
          { status: 500, headers: corsHeaders }
        );
      }
    }
    
    // POST /api/user/:userId/push-subscribe - Save push subscription
    if (req.method === "POST" && url.pathname.match(/^\/api\/user\/[^\/]+\/push-subscribe$/)) {
      try {
        const pathParts = url.pathname.split('/');
        const userId = pathParts[3];
        const subscription = await req.json();
        await savePushSubscription(userId, subscription);
        return Response.json({ success: true }, { headers: corsHeaders });
      } catch (error) {
        console.error("Error saving push subscription:", error);
        return Response.json(
          { success: false, error: String(error) },
          { status: 500, headers: corsHeaders }
        );
      }
    }
    
    // POST /api/challenge - Create a challenge
    if (req.method === "POST" && url.pathname === "/api/challenge") {
      try {
        const challenge = await req.json();
        await addChallenge(challenge);
        return Response.json(
          { success: true, challengeId: challenge.challengeId },
          { headers: corsHeaders }
        );
      } catch (error) {
        console.error("Error creating challenge:", error);
        return Response.json(
          { success: false, error: String(error) },
          { status: 500, headers: corsHeaders }
        );
      }
    }
    
    // GET /api/challenge/:id - Get challenge info
    if (req.method === "GET" && url.pathname.match(/^\/api\/challenge\/[^\/]+$/) && !url.pathname.includes('/completions')) {
      try {
        const pathParts = url.pathname.split('/');
        const challengeId = pathParts[3];
        const challenge = await getChallenge(challengeId);
        if (challenge) {
          return Response.json({ success: true, challenge }, { headers: corsHeaders });
        } else {
          return Response.json({ success: false, error: "Challenge not found" }, { status: 404, headers: corsHeaders });
        }
      } catch (error) {
        console.error("Error getting challenge:", error);
        return Response.json(
          { success: false, error: String(error) },
          { status: 500, headers: corsHeaders }
        );
      }
    }
    
    // POST /api/challenge/:id/complete - Submit completion
    if (req.method === "POST" && url.pathname.match(/^\/api\/challenge\/[^\/]+\/complete$/)) {
      try {
        const pathParts = url.pathname.split('/');
        const challengeId = pathParts[3];
        const data = await req.json();
        
        // Handle both formats: new (with completerName) and old (with userId)
        if (data.userId && data.result) {
          // Old format - mark as completed in user's inbox
          await markChallengeAsCompleted(challengeId, data.userId, data.result);
        } else {
          // New format - add to completions list
          await addCompletion({ ...data, challengeId });
        }
        
        return Response.json({ success: true }, { headers: corsHeaders });
      } catch (error) {
        console.error("Error submitting completion:", error);
        return Response.json(
          { success: false, error: String(error) },
          { status: 500, headers: corsHeaders }
        );
      }
    }
    
    // GET /api/challenge/:id/completions - Get completions
    if (req.method === "GET" && url.pathname.match(/^\/api\/challenge\/[^\/]+\/completions$/)) {
      try {
        const pathParts = url.pathname.split('/');
        const challengeId = pathParts[3];
        const completions = await getChallengeCompletions(challengeId);
        return Response.json({ success: true, completions }, { headers: corsHeaders });
      } catch (error) {
        console.error("Error getting completions:", error);
        return Response.json(
          { success: false, error: String(error) },
          { status: 500, headers: corsHeaders }
        );
      }
    }
    
    // GET / - Stats endpoint
    if (req.method === "GET" && url.pathname === "/") {
      const activeRooms = rooms.size;
      const totalConnections = Array.from(rooms.values()).reduce(
        (sum, room) => sum + room.size,
        0
      );
      
      const db = await getDB();
      const totalChallenges = Object.keys(db.challenges).length;
      const totalCompletions = db.completions.length;
      
      return Response.json({
        status: "ok",
        activeRooms,
        totalConnections,
        totalChallenges,
        totalCompletions,
        timestamp: new Date().toISOString(),
      }, { headers: corsHeaders });
    }

    return new Response("Dunham Wordle WebSocket Server\n\nUpgrade to WebSocket to connect.", {
      status: 426,
      headers: { "Upgrade": "websocket" },
    });
  }
};

