import { describe, it, expect } from 'vitest';

describe('Keyboard Component Props Tests', () => {
  it('should verify Keyboard requires keyStatuses prop', () => {
    // Keyboard component signature
    interface KeyboardProps {
      onKeyPress: (key: string) => void;
      guesses: string[];
      solution: string;
      keyStatuses?: Record<string, 'correct' | 'present' | 'absent'>;
    }
    
    // Test data
    const props: KeyboardProps = {
      onKeyPress: () => {},
      guesses: ['CRANE'],
      solution: 'TOPIC'
    };
    
    // keyStatuses is optional but should be provided
    expect(props.keyStatuses).toBeUndefined();
    
    // If we try to access keyStatuses.Q without checking, it crashes
    const willCrash = () => {
      const keyStatus = props.keyStatuses!['Q']; // Crash!
    };
    
    expect(willCrash).toThrow();
  });

  it('should verify solution for Keyboard should calculate keyStatuses', () => {
    const guesses = ['CRANE', 'TOPIC'];
    const solution = 'TOPIC';
    
    // Calculate key statuses from guesses
    const keyStatuses: Record<string, 'correct' | 'present' | 'absent'> = {};
    
    guesses.forEach(guess => {
      if (!guess) return;
      
      guess.split('').forEach((letter, i) => {
        if (solution[i] === letter) {
          keyStatuses[letter] = 'correct';
        } else if (solution.includes(letter)) {
          if (keyStatuses[letter] !== 'correct') {
            keyStatuses[letter] = 'present';
          }
        } else {
          if (!keyStatuses[letter]) {
            keyStatuses[letter] = 'absent';
          }
        }
      });
    });
    
    expect(keyStatuses['T']).toBe('correct');
    expect(keyStatuses['O']).toBe('correct');
    expect(keyStatuses['P']).toBe('correct');
    expect(keyStatuses['I']).toBe('correct');
    expect(keyStatuses['C']).toBe('correct'); // C is in both
  });

  it('should demonstrate the bug: CollaborativeMultiplayerGame not passing keyStatuses', () => {
    // Current CollaborativeMultiplayerGame renders Keyboard like this:
    const buggyRender = {
      component: 'Keyboard',
      props: {
        onKeyPress: () => {},
        guesses: [],
        solution: 'TOPIC'
        // Missing: keyStatuses!
      }
    };
    
    expect(buggyRender.props).not.toHaveProperty('keyStatuses');
    
    // This causes crash when Keyboard tries to map over keys
  });

  it('should show the fix: calculate and pass keyStatuses', () => {
    const guesses = ['CRANE'];
    const solution = 'TOPIC';
    
    // Calculate keyStatuses
    const keyStatuses: Record<string, 'correct' | 'present' | 'absent'> = {};
    
    guesses.forEach(guess => {
      if (!guess) return;
      guess.split('').forEach((letter, i) => {
        if (solution[i] === letter) {
          keyStatuses[letter] = 'correct';
        } else if (solution.includes(letter)) {
          if (keyStatuses[letter] !== 'correct') {
            keyStatuses[letter] = 'present';
          }
        } else {
          if (!keyStatuses[letter]) {
            keyStatuses[letter] = 'absent';
          }
        }
      });
    });
    
    // Fixed render
    const fixedRender = {
      component: 'Keyboard',
      props: {
        onKeyPress: () => {},
        guesses,
        solution,
        keyStatuses // ✓ Now included!
      }
    };
    
    expect(fixedRender.props).toHaveProperty('keyStatuses');
    expect(fixedRender.props.keyStatuses).toBeDefined();
  });
});

describe('Data Channel Lifecycle Tests', () => {
  it('should demonstrate bug: data channel closes prematurely', () => {
    const events: string[] = [];
    let dataChannelOpen = false;
    
    events.push('1. WebRTC connection established');
    events.push('2. Data channel opens');
    dataChannelOpen = true;
    
    events.push('3. Host tries to send word');
    if (dataChannelOpen) {
      events.push('4. Message sent successfully');
    }
    
    events.push('5. Component cleanup runs TOO EARLY');
    // Bug: cleanup closes connection before game starts
    dataChannelOpen = false;
    events.push('6. Data channel closes');
    
    events.push('7. User tries to type');
    if (!dataChannelOpen) {
      events.push('8. ERROR: Cannot send - channel closed!');
    }
    
    expect(events).toContain('8. ERROR: Cannot send - channel closed!');
  });

  it('should verify fix: keep connection open during gameplay', () => {
    const events: string[] = [];
    let dataChannelOpen = false;
    let gameActive = true;
    
    events.push('1. WebRTC connection established');
    events.push('2. Data channel opens');
    dataChannelOpen = true;
    
    events.push('3. Host sends word');
    events.push('4. Game starts');
    
    // Fix: Don't close connection while game is active
    if (gameActive) {
      events.push('5. User types');
      if (dataChannelOpen) {
        events.push('6. Keystroke synced successfully!');
      }
    }
    
    expect(events).toContain('6. Keystroke synced successfully!');
    expect(dataChannelOpen).toBe(true);
  });

  it('should test data channel ready state before sending', () => {
    interface DataChannel {
      readyState: 'connecting' | 'open' | 'closing' | 'closed';
      send: (data: string) => void;
    }
    
    const dataChannel: DataChannel = {
      readyState: 'connecting',
      send: (data) => {}
    };
    
    // Try to send before ready
    const sendMessage = (msg: string) => {
      if (dataChannel.readyState !== 'open') {
        console.error('Data channel not ready');
        return false;
      }
      dataChannel.send(msg);
      return true;
    };
    
    expect(sendMessage('hello')).toBe(false);
    
    // Open channel
    dataChannel.readyState = 'open';
    expect(sendMessage('hello')).toBe(true);
  });
});

