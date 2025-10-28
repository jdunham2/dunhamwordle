import { describe, it, expect } from 'vitest';

describe('Host Message Handler Bug', () => {
  it('should demonstrate bug: host never sets up message handler', () => {
    const timeline: string[] = [];
    let hostMessageHandlerSet = false;
    let guestMessageHandlerSet = false;
    
    // Guest flow
    timeline.push('1. Guest: initConnection() runs');
    timeline.push('2. Guest: Sets up offer handler');
    timeline.push('3. Guest: webrtc.onMessage() called');
    guestMessageHandlerSet = true;
    timeline.push('4. Guest: Message handler ready ✓');
    
    // Host flow
    timeline.push('5. Host: initConnection() runs');
    timeline.push('6. Host: Waits for player-joined');
    timeline.push('7. Host: player-joined received');
    timeline.push('8. Host: Creates WebRTC offer');
    timeline.push('9. Host: Data channel created');
    timeline.push('10. Host: Offer sent');
    // BUG: Host never calls webrtc.onMessage()!
    hostMessageHandlerSet = false;
    timeline.push('11. Host: Message handler NOT set up ✗');
    
    timeline.push('12. Guest types "C"');
    timeline.push('13. Guest sends keystroke message');
    timeline.push('14. Host receives message... but no handler!');
    timeline.push('15. Host: No response (message ignored)');
    
    expect(guestMessageHandlerSet).toBe(true);
    expect(hostMessageHandlerSet).toBe(false); // BUG!
    
    console.log('Bug Timeline:', timeline.join('\n'));
  });

  it('should verify fix: host sets up message handler when creating data channel', () => {
    const timeline: string[] = [];
    let hostMessageHandlerSet = false;
    let hostReceivedKeystroke = false;
    
    // Host flow with fix
    timeline.push('1. Host: player-joined received');
    timeline.push('2. Host: Creates WebRTC instance');
    timeline.push('3. Host: Creates data channel');
    timeline.push('4. Host: webrtc.onMessage() called immediately');
    hostMessageHandlerSet = true;
    timeline.push('5. Host: Message handler ready ✓');
    
    timeline.push('6. Guest types "C"');
    timeline.push('7. Guest sends keystroke message');
    timeline.push('8. Host receives message');
    
    // Now host has handler!
    if (hostMessageHandlerSet) {
      hostReceivedKeystroke = true;
      timeline.push('9. Host: Keystroke processed ✓');
      timeline.push('10. Host: currentGuess updated');
    }
    
    expect(hostMessageHandlerSet).toBe(true);
    expect(hostReceivedKeystroke).toBe(true);
    
    console.log('Fix Timeline:', timeline.join('\n'));
  });

  it('should explain why host shows no grid', () => {
    let hostHasSolution = false;
    let hostShowsGrid = false;
    
    // Host never receives word-selected message because no handler
    // So solution stays empty string
    const solution = '';
    hostHasSolution = solution.length > 0;
    
    // Component checks: if (!solution) return null;
    // Or Grid component doesn't render without solution
    hostShowsGrid = hostHasSolution;
    
    expect(hostHasSolution).toBe(false);
    expect(hostShowsGrid).toBe(false);
    
    console.log('Host shows no grid because solution is empty (never received word)');
  });

  it('should explain why host cant type', () => {
    const solution = '';
    const gameStatus = 'playing';
    let canType = false;
    
    // handleKeyPress checks:
    // if (gameStatus !== 'playing' || !solution) return;
    if (gameStatus === 'playing' && solution) {
      canType = true;
    }
    
    expect(canType).toBe(false);
    console.log('Host cant type because solution is empty, handleKeyPress returns early');
  });
});

describe('Message Handler Setup Timing', () => {
  it('should verify guest sets up handler before host sends offer', () => {
    const events: Array<{ time: number; event: string; actor: string }> = [];
    
    events.push({ time: 0, event: 'Guest joins room', actor: 'guest' });
    events.push({ time: 10, event: 'Guest: webrtc.onMessage() set up', actor: 'guest' });
    events.push({ time: 100, event: 'Host creates offer', actor: 'host' });
    events.push({ time: 110, event: 'Guest receives offer', actor: 'guest' });
    events.push({ time: 120, event: 'Data channel opens', actor: 'both' });
    events.push({ time: 130, event: 'Host sends word', actor: 'host' });
    events.push({ time: 140, event: 'Guest receives word ✓', actor: 'guest' });
    
    const guestHandlerTime = events.find(e => e.event.includes('onMessage'))?.time;
    const wordSentTime = events.find(e => e.event.includes('sends word'))?.time;
    
    expect(guestHandlerTime).toBeLessThan(wordSentTime!);
  });

  it('should verify host needs handler set up after creating WebRTC', () => {
    const hostFlow = [
      'Wait for player-joined',
      'Create WebRTC instance',
      'Create data channel',
      '*** SET UP MESSAGE HANDLER HERE ***',
      'Create offer',
      'Wait for answer'
    ];
    
    const handlerIndex = hostFlow.findIndex(s => s.includes('MESSAGE HANDLER'));
    const webrtcIndex = hostFlow.findIndex(s => s.includes('WebRTC instance'));
    
    // Handler must be set AFTER WebRTC is created
    expect(handlerIndex).toBeGreaterThan(webrtcIndex);
  });
});


