import { WebSocketServer } from 'ws';
import fs from 'fs/promises';
import { existsSync } from 'fs';

// Use PORT environment variable for deployment, fallback to 8080 for local dev
const PORT = process.env.PORT || 8080;
const wss = new WebSocketServer({ port: PORT });

// Local file-based storage (simpler than SQLite for development)
const DB_FILE = './local-db.json';

// Initialize database
let db = {
  rooms: {},
  challenges: {},
  completions: []
};

// Load database from file
async function loadDB() {
  try {
    if (existsSync(DB_FILE)) {
      const data = await fs.readFile(DB_FILE, 'utf8');
      db = JSON.parse(data);
      console.log('Database loaded from file');
    }
  } catch (error) {
    console.error('Error loading database:', error);
  }
}

// Save database to file
async function saveDB() {
  try {
    await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2));
  } catch (error) {
    console.error('Error saving database:', error);
  }
}

// Helper functions for database operations
async function addChallenge(challenge) {
  db.challenges[challenge.challengeId] = {
    ...challenge,
    createdAt: Date.now(),
    completedCount: 0
  };
  await saveDB();
}

async function addCompletion(completion) {
  db.completions.push({
    ...completion,
    id: db.completions.length + 1,
    completedAt: Date.now()
  });
  
  // Update challenge completion count
  if (db.challenges[completion.challengeId]) {
    db.challenges[completion.challengeId].completedCount++;
  }
  
  await saveDB();
}

async function getChallengeCompletions(challengeId) {
  return db.completions.filter(c => c.challengeId === challengeId);
}

async function getChallenge(challengeId) {
  return db.challenges[challengeId];
}

// In-memory storage for active connections
const rooms = new Map();
const socketToRoom = new WeakMap();

function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Load database on startup
await loadDB();

console.log(`WebSocket server starting on port ${PORT}...`);

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);

      switch (data.type) {
        case 'create-room': {
          const roomId = generateRoomId();
          rooms.set(roomId, new Set([ws]));
          socketToRoom.set(ws, roomId);
          
          // Store in database
          db.rooms[roomId] = {
            roomId,
            createdAt: Date.now(),
            hostUsername: data.username || 'anonymous'
          };
          await saveDB();
          
          ws.send(JSON.stringify({
            type: 'room-created',
            roomId,
          }));
          
          console.log(`Room ${roomId} created`);
          break;
        }

        case 'join-room': {
          const { roomId } = data;
          const room = rooms.get(roomId);
          
          if (!room) {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Room not found',
            }));
            break;
          }
          
          if (room.size >= 2) {
            ws.send(JSON.stringify({
              type: 'room-full',
            }));
            break;
          }
          
          // Check if already in room
          if (room.has(ws)) {
            console.log(`Socket already in room ${roomId}`);
            break;
          }
          
          room.add(ws);
          socketToRoom.set(ws, roomId);
          
          const isHost = room.size === 1;
          const playerCount = room.size;
          
          // Notify all players
          room.forEach((client) => {
            client.send(JSON.stringify({
              type: 'player-joined',
              roomId,
              isHost: client === ws ? !isHost : isHost,
              playerCount,
              isNewPlayer: client !== ws,
            }));
          });
          
          console.log(`Player joined room ${roomId} (${playerCount} players)`);
          break;
        }

        case 'offer':
        case 'answer':
        case 'ice-candidate': {
          const roomId = socketToRoom.get(ws);
          if (!roomId) break;
          
          const room = rooms.get(roomId);
          if (!room) break;
          
          // Forward to other players in room
          room.forEach((client) => {
            if (client !== ws) {
              client.send(JSON.stringify(data));
            }
          });
          break;
        }

        case 'get-room-status': {
          const { roomId } = data;
          const room = rooms.get(roomId);
          
          if (!room) {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Room not found',
            }));
            break;
          }
          
          const isHost = Array.from(room)[0] === ws;
          
          ws.send(JSON.stringify({
            type: 'room-status',
            roomId,
            playerCount: room.size,
            isHost,
          }));
          break;
        }

        // Challenge API
        case 'create-challenge': {
          const { challengeId, word, creatorId, creatorName } = data;
          
          await addChallenge({
            challengeId,
            creatorId,
            creatorName,
            word
          });
          
          ws.send(JSON.stringify({
            type: 'challenge-created',
            challengeId,
          }));
          
          console.log(`Challenge ${challengeId} created by ${creatorName}`);
          break;
        }

        case 'complete-challenge': {
          const { challengeId, completerId, completerName, won, guesses } = data;
          
          await addCompletion({
            challengeId,
            completerId,
            completerName,
            won,
            guesses
          });
          
          // Get creator info to notify them
          const challenge = await getChallenge(challengeId);
          
          if (challenge) {
            ws.send(JSON.stringify({
              type: 'challenge-completed',
              challengeId,
              creatorId: challenge.creatorId,
              completerName,
              won,
              guesses,
            }));
          }
          
          console.log(`Challenge ${challengeId} completed by ${completerName} (${won ? 'won' : 'lost'})`);
          break;
        }

        case 'get-challenge-completions': {
          const { challengeId } = data;
          
          const completions = await getChallengeCompletions(challengeId);
          
          ws.send(JSON.stringify({
            type: 'challenge-completions',
            challengeId,
            completions: completions.map(c => ({
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
      console.error('Error handling message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Internal server error',
      }));
    }
  });

  ws.on('close', () => {
    const roomId = socketToRoom.get(ws);
    if (roomId) {
      const room = rooms.get(roomId);
      if (room) {
        room.delete(ws);
        
        if (room.size === 0) {
          rooms.delete(roomId);
          console.log(`Room ${roomId} cleaned up (empty)`);
        } else {
          // Notify remaining players
          room.forEach((client) => {
            client.send(JSON.stringify({
              type: 'player-left',
              playerCount: room.size,
            }));
          });
          console.log(`Player left room ${roomId} (${room.size} remaining)`);
        }
      }
    }
    console.log('Client disconnected');
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

console.log(`✅ WebSocket server running on ws://localhost:${PORT}`);
console.log(`📊 Database file: ${DB_FILE}`);
console.log(`🎮 Ready for multiplayer connections!`);
