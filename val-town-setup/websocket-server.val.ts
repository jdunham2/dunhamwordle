/**
 * Val Town WebSocket Server for Dunham Wordle Multiplayer
 * 
 * Deploy this as a Val on Val.town:
 * 1. Sign up at https://val.town
 * 2. Create a new HTTP Val
 * 3. Paste this code
 * 4. Your WebSocket URL will be: wss://[your-username]-wordleserver.web.val.run
 * 
 * Features:
 * - Room management
 * - WebRTC signaling
 * - Challenge storage in SQLite
 * - No database setup needed!
 */

import { blob } from "https://esm.town/v/std/blob";

let db: any = { rooms: {}, challenges: {}, completions: [] };

try {
  db = (await blob.getJSON("wordle_db")) || db;
} catch (err) {
  console.error("Failed to load blob:", err);
}

// Helper functions for database operations
async function saveDB() {
  await blob.setJSON("wordle_db", db);
}

async function addChallenge(challenge: any) {
  db.challenges[challenge.challengeId] = {
    ...challenge,
    createdAt: Date.now(),
    completedCount: 0
  };
  await saveDB();
}

async function addCompletion(completion: any) {
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

async function getChallengeCompletions(challengeId: string) {
  return db.completions.filter((c: any) => c.challengeId === challengeId);
}

async function getChallenge(challengeId: string) {
  return db.challenges[challengeId];
}

// In-memory storage for active connections
const rooms = new Map<string, Set<WebSocket>>();
const socketToRoom = new WeakMap<WebSocket, string>();

function generateRoomId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export default async function(req: Request): Promise<Response> {
  // Handle WebSocket upgrade
  if (req.headers.get("upgrade") === "websocket") {
    const { socket, response } = Deno.upgradeWebSocket(req);
    
    socket.onopen = () => {
      console.log("Client connected");
    };

    socket.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case "create-room": {
            const roomId = generateRoomId();
            rooms.set(roomId, new Set([socket]));
            socketToRoom.set(socket, roomId);
            
            // Store in database
            db.rooms[roomId] = {
              roomId,
              createdAt: Date.now(),
              hostUsername: data.username || "anonymous"
            };
            await saveDB();
            
            socket.send(JSON.stringify({
              type: "room-created",
              roomId,
            }));
            
            console.log(`Room ${roomId} created`);
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
            
            // Check if already in room
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
            
            // Forward to other players in room
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
            
            // Get creator info to notify them
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
      const roomId = socketToRoom.get(socket);
      if (roomId) {
        const room = rooms.get(roomId);
        if (room) {
          room.delete(socket);
          
          if (room.size === 0) {
            rooms.delete(roomId);
            console.log(`Room ${roomId} cleaned up`);
          } else {
            // Notify remaining players
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

  // HTTP endpoint for stats/health check
  if (req.method === "GET") {
    const activeRooms = rooms.size;
    const totalConnections = Array.from(rooms.values()).reduce(
      (sum, room) => sum + room.size,
      0
    );
    
    // Get challenge stats from blob storage
    const totalChallenges = Object.keys(db.challenges).length;
    const totalCompletions = db.completions.length;
    
    return Response.json({
      status: "ok",
      activeRooms,
      totalConnections,
      totalChallenges,
      totalCompletions,
      timestamp: new Date().toISOString(),
    });
  }

  return new Response("Dunham Wordle WebSocket Server\n\nUpgrade to WebSocket to connect.", {
    status: 426,
    headers: { "Upgrade": "websocket" },
  });
}

