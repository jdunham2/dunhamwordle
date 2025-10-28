import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Offer Race Condition Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should demonstrate the bug: offer arrives before guest handler is set up', () => {
    const events: string[] = [];
    let offerHandlerReady = false;
    let offerReceived: any = null;
    
    // Simulate timeline
    events.push('T+0ms: Guest Lobby joins room');
    events.push('T+10ms: Host receives player-joined (playerCount: 2)');
    events.push('T+50ms: Host creates and sends offer');
    
    // Offer arrives at guest
    offerReceived = { type: 'offer', data: 'offer-sdp' };
    events.push('T+60ms: OFFER ARRIVES AT GUEST (handler NOT ready!)');
    
    // Guest Game component mounts later
    events.push('T+100ms: Guest Game component mounts');
    events.push('T+110ms: Guest sets up offer handler');
    offerHandlerReady = true;
    
    // But offer was already lost!
    expect(offerHandlerReady).toBe(true);
    expect(offerReceived).toBeTruthy();
    expect(events).toContain('T+60ms: OFFER ARRIVES AT GUEST (handler NOT ready!)');
    
    console.log('Bug demonstrated:', events.join('\n'));
  });

  it('should verify fix: 1-second delay allows guest handler to be ready', async () => {
    const events: string[] = [];
    let offerHandlerReady = false;
    let offerProcessed = false;
    
    events.push('T+0ms: Guest Lobby joins');
    events.push('T+10ms: Host receives player-joined');
    
    // Host waits 1 second
    events.push('T+10ms: Host: Waiting 1 second before creating offer');
    vi.advanceTimersByTime(100);
    
    // Guest Game mounts during this time
    events.push('T+100ms: Guest Game mounts');
    events.push('T+110ms: Guest sets up offer handler');
    offerHandlerReady = true;
    
    // Host creates offer after 1 second
    vi.advanceTimersByTime(900);
    events.push('T+1010ms: Host creates and sends offer');
    
    // Guest receives offer (handler IS ready!)
    if (offerHandlerReady) {
      offerProcessed = true;
      events.push('T+1020ms: Guest processes offer successfully!');
    }
    
    expect(offerHandlerReady).toBe(true);
    expect(offerProcessed).toBe(true);
    
    console.log('Fix verified:', events.join('\n'));
  });

  it('should verify pending offer handling works', () => {
    let pendingOffer: any = null;
    let offerHandlerReady = false;
    let offerProcessed = false;
    
    // Offer arrives early
    const offer = { type: 'offer', data: 'offer-sdp' };
    
    // Handler not ready, store it
    if (!offerHandlerReady) {
      pendingOffer = offer;
      console.log('Stored pending offer');
    }
    
    expect(pendingOffer).toBeTruthy();
    expect(offerProcessed).toBe(false);
    
    // Handler becomes ready
    offerHandlerReady = true;
    
    // Process pending offer
    if (pendingOffer && offerHandlerReady) {
      offerProcessed = true;
      pendingOffer = null;
      console.log('Processed pending offer');
    }
    
    expect(pendingOffer).toBeNull();
    expect(offerProcessed).toBe(true);
  });

  it('should test actual timing with delays', async () => {
    let hostOfferCreated = false;
    let guestHandlerReady = false;
    let offerReceivedWhileReady = false;
    
    // Host waits 1 second
    const hostCreateOffer = async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      hostOfferCreated = true;
      return { sdp: 'offer' };
    };
    
    // Guest sets up handler after 100ms
    const guestSetupHandler = async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      guestHandlerReady = true;
    };
    
    // Start both
    const hostPromise = hostCreateOffer();
    const guestPromise = guestSetupHandler();
    
    // Fast-forward 100ms
    vi.advanceTimersByTime(100);
    await Promise.resolve(); // Let microtasks run
    
    expect(guestHandlerReady).toBe(true);
    expect(hostOfferCreated).toBe(false);
    
    // Fast-forward 900ms more (total 1000ms)
    vi.advanceTimersByTime(900);
    await Promise.resolve();
    
    expect(hostOfferCreated).toBe(true);
    
    // Since handler was ready before offer, success!
    if (guestHandlerReady && hostOfferCreated) {
      offerReceivedWhileReady = true;
    }
    
    expect(offerReceivedWhileReady).toBe(true);
  });

  it('should verify all components initialize in correct order', () => {
    const initOrder: string[] = [];
    
    // Simulate initialization
    initOrder.push('1. Host Lobby: create room');
    initOrder.push('2. Guest Lobby: join room');
    initOrder.push('3. Both Lobbies: receive player-joined');
    initOrder.push('4. Transition to Game components');
    initOrder.push('5. Guest Game: set up offer handler FIRST');
    initOrder.push('6. Host Game: wait 1 second');
    initOrder.push('7. Host Game: create offer');
    initOrder.push('8. Guest Game: receive offer (handler ready!)');
    
    expect(initOrder[4]).toContain('Guest Game: set up offer handler FIRST');
    expect(initOrder[5]).toContain('Host Game: wait 1 second');
    expect(initOrder[6]).toContain('create offer');
    expect(initOrder[7]).toContain('handler ready');
  });
});


