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

// Database using Deno KV (free, built-in)
const kv = await Deno.openKv();

// Get database
async function getDB() {
  const result = await kv.get(["wordle_db"]);
  return result.value || { rooms: {}, challenges: {}, completions: [] };
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

// In-memory storage for active connections
const rooms = new Map<string, Set<WebSocket>>();
const socketToRoom = new WeakMap<WebSocket, string>();

function generateRoomId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
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
    
    // CORS headers for all HTTP requests
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };
    
    // Handle preflight requests
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
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
        const completion = await req.json();
        await addCompletion({ ...completion, challengeId });
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

