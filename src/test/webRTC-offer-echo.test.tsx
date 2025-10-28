import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('WebRTC Offer Echo Bug', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should NOT send offer back to the sender', async () => {
    const room = {
      players: [
        { ws: { id: 'host', send: vi.fn() } },
        { ws: { id: 'guest', send: vi.fn() } }
      ]
    };
    
    const offerSender = room.players[0].ws;
    const offer = { type: 'offer', data: 'test-offer' };
    
    // Server should forward offer to OTHER players only
    room.players.forEach(player => {
      if (player.ws !== offerSender) {
        player.ws.send(JSON.stringify(offer));
        console.log(`Sent to ${player.ws.id}`);
      } else {
        console.log(`Skipped sender ${player.ws.id}`);
      }
    });
    
    // Host should NOT receive its own offer
    expect(offerSender.send).not.toHaveBeenCalled();
    
    // Guest SHOULD receive the offer
    expect(room.players[1].ws.send).toHaveBeenCalledWith(JSON.stringify(offer));
  });

  it('should demonstrate the bug: host receives its own offer', async () => {
    let hostReceivedOffer = false;
    let guestReceivedOffer = false;
    
    const room = {
      players: [
        { ws: { id: 'host', onmessage: null } },
        { ws: { id: 'guest', onmessage: null } }
      ]
    };
    
    // Simulate sending offer
    const offerSender = room.players[0].ws;
    
    // BUG: Server sends to ALL players including sender
    room.players.forEach(player => {
      if (player.ws.onmessage) {
        player.ws.onmessage({ data: JSON.stringify({ type: 'offer' }) });
        
        if (player.ws === offerSender) {
          hostReceivedOffer = true; // BUG!
        } else {
          guestReceivedOffer = true; // Correct
        }
      }
    });
    
    // This demonstrates the bug
    expect(hostReceivedOffer).toBe(true); // Should be false!
    expect(guestReceivedOffer).toBe(true);
  });

  it('should queue ICE candidates until remote description is set', async () => {
    const queuedCandidates: any[] = [];
    let remoteDescriptionSet = false;
    
    const queueCandidate = (candidate: any) => {
      if (!remoteDescriptionSet) {
        queuedCandidates.push(candidate);
        console.log(`Queued candidate #${queuedCandidates.length}`);
      } else {
        console.log('Processing candidate immediately');
      }
    };
    
    // Receive ICE candidates before remote description
    queueCandidate({ candidate: 'candidate:1' });
    queueCandidate({ candidate: 'candidate:2' });
    queueCandidate({ candidate: 'candidate:3' });
    
    expect(queuedCandidates.length).toBe(3);
    
    // Set remote description
    remoteDescriptionSet = true;
    
    // Now process queue
    const count = queuedCandidates.length;
    queuedCandidates.length = 0; // Clear queue
    
    expect(count).toBe(3);
    expect(queuedCandidates.length).toBe(0);
  });

  it('should test the exact error message', async () => {
    const error = new Error("Failed to execute 'addIceCandidate' on 'RTCPeerConnection': The remote description was null");
    
    expect(error.message).toContain('The remote description was null');
    expect(error.message).toContain('addIceCandidate');
  });

  it('should verify host should NOT receive its own offer message', async () => {
    const messagesReceivedByHost: string[] = [];
    const messagesReceivedByGuest: string[] = [];
    
    const room = {
      players: [
        { ws: { id: 'host' } },
        { ws: { id: 'guest' } }
      ]
    };
    
    const offer = { type: 'offer', roomId: 'TEST', data: {} };
    const offerSender = room.players[0].ws;
    
    // Forward offer to other players only
    room.players.forEach(player => {
      if (player.ws !== offerSender) {
        messagesReceivedByGuest.push('offer');
      } else {
        messagesReceivedByHost.push('offer'); // This is the bug!
      }
    });
    
    // Host should NOT receive its own offer
    expect(messagesReceivedByHost.length).toBe(0);
    expect(messagesReceivedByGuest.length).toBe(1);
  });
});

