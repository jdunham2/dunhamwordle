import { WebSocketServer } from 'ws';

// Use PORT environment variable for Render, fallback to 8080 for local dev
const PORT = process.env.PORT || 8080;
const wss = new WebSocketServer({ port: PORT });

const rooms = new Map();

function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      switch (data.type) {
        case 'get-room-status':
          console.log(`\n=== GET ROOM STATUS ===`);
          console.log(`Room ID: ${data.roomId}`);
          const statusRoom = rooms.get(data.roomId);
          if (!statusRoom) {
            console.log(`ERROR: Room ${data.roomId} not found`);
            ws.send(JSON.stringify({ type: 'error', message: 'Room not found' }));
            break;
          }
          
          // Check if this WebSocket is in the room
          const playerIndex = statusRoom.players.findIndex(p => p.ws === ws);
          if (playerIndex === -1) {
            console.log(`ERROR: WebSocket not in room ${data.roomId}`);
            ws.send(JSON.stringify({ type: 'error', message: 'Not in room' }));
            break;
          }
          
          // Send room status
          const statusMessage = {
            type: 'room-status',
            roomId: data.roomId,
            playerCount: statusRoom.players.length,
            isHost: playerIndex === 0
          };
          console.log(`Sending room status:`, JSON.stringify(statusMessage));
          ws.send(JSON.stringify(statusMessage));
          console.log(`=== GET ROOM STATUS COMPLETE ===\n`);
          break;
          
        case 'create-room':
          const roomId = generateRoomId();
          const newRoom = {
            players: [{ ws, id: generateRoomId() }],
            host: ws
          };
          rooms.set(roomId, newRoom);
          
          ws.send(JSON.stringify({
            type: 'player-joined',
            roomId,
            isHost: true
          }));
          console.log(`Room ${roomId} created`);
          break;

        case 'join-room':
          console.log(`\n=== JOIN ROOM REQUEST ===`);
          console.log(`Room ID: ${data.roomId}`);
          console.log(`Total rooms: ${rooms.size}`);
          
          const room = rooms.get(data.roomId);
          if (!room) {
            console.log(`ERROR: Room ${data.roomId} not found`);
            ws.send(JSON.stringify({ type: 'error', message: 'Room not found' }));
            break;
          }
          
          console.log(`Room ${data.roomId} found with ${room.players.length} players`);
          
          // Check if this WebSocket is already in the room
          const alreadyInRoom = room.players.some(player => player.ws === ws);
          console.log(`Already in room check: ${alreadyInRoom}`);
          
          if (alreadyInRoom) {
            console.log('>>> WebSocket ALREADY in room - NOT adding, NOT sending message');
            console.log('=== JOIN ROOM COMPLETE (no action) ===\n');
            break;
          }
          
          console.log('>>> New player joining room');
          
          // Allow unlimited players - removed the 2-player limit
          const playerId = generateRoomId();
          room.players.push({ ws, id: playerId });
          console.log(`Added player ${playerId} to room ${data.roomId}`);
          console.log(`Room now has ${room.players.length} players`);
          
          // Notify ALL players (so everyone sees updated count)
          console.log(`Notifying all ${room.players.length} players...`);
          room.players.forEach((player, index) => {
            const message = {
              type: 'player-joined',
              roomId: data.roomId,
              isHost: index === 0,
              playerCount: room.players.length,
              isNewPlayer: player.ws === ws
            };
            console.log(`  → Sending to player ${player.id}:`, JSON.stringify(message));
            player.ws.send(JSON.stringify(message));
          });
          
          console.log(`=== JOIN ROOM COMPLETE (${room.players.length} total) ===\n`);
          break;

        case 'offer':
          // Forward offer to the other player
          const offerRoom = rooms.get(data.roomId);
          if (offerRoom) {
            console.log(`Forwarding offer in room ${data.roomId} (${offerRoom.players.length} players)`);
            let sentCount = 0;
            offerRoom.players.forEach(player => {
              if (player.ws !== ws) {
                console.log(`Sending offer to player ${player.id}`);
                player.ws.send(JSON.stringify({
                  type: 'offer',
                  roomId: data.roomId,
                  data: data.data
                }));
                sentCount++;
              } else {
                console.log(`Skipping sender ${player.id}`);
              }
            });
            console.log(`Offered sent to ${sentCount} players`);
          }
          break;

        case 'answer':
          // Forward answer to the other player
          const answerRoom = rooms.get(data.roomId);
          if (answerRoom) {
            answerRoom.players.forEach(player => {
              if (player.ws !== ws) {
                player.ws.send(JSON.stringify({
                  type: 'answer',
                  roomId: data.roomId,
                  data: data.data
                }));
              }
            });
          }
          break;

        case 'ice-candidate':
          // Forward ICE candidate to the other player
          const iceRoom = rooms.get(data.roomId);
          if (iceRoom) {
            iceRoom.players.forEach(player => {
              if (player.ws !== ws) {
                player.ws.send(JSON.stringify({
                  type: 'ice-candidate',
                  roomId: data.roomId,
                  data: data.data
                }));
              }
            });
          } else {
            console.log(`Ice candidate received for non-existent room ${data.roomId}`);
          }
          break;

        default:
          console.log('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    // Clean up rooms
    for (const [roomId, room] of rooms.entries()) {
      const index = room.players.findIndex(p => p.ws === ws);
      if (index !== -1) {
        const wasHost = index === 0;
        room.players.splice(index, 1);
        
        // If host left, make the next player the host
        if (wasHost && room.players.length > 0) {
          console.log(`Host left, promoting next player in room ${roomId}`);
        }
        
        // Notify remaining players
        room.players.forEach(player => {
          player.ws.send(JSON.stringify({
            type: 'player-left'
          }));
        });
        
        // Only clean up if ALL players left
        if (room.players.length === 0) {
          rooms.delete(roomId);
          console.log(`Room ${roomId} cleaned up (all players left)`);
        }
        break;
      }
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

console.log(`WebSocket server running on port ${PORT}`);

