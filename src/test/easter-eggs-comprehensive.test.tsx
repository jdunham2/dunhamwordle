import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../App';

// Mock the word service
vi.mock('../../services/wordService', () => ({
  loadWordLists: vi.fn().mockResolvedValue({
    solutions: ['TESTS', 'WORDS', 'GHOST'],
    validWords: new Set(['TESTS', 'WORDS', 'GHOST', 'TEST'])
  })
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('Easter Eggs - Comprehensive Tests', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockReturnValue(null);
    vi.clearAllMocks();
  });

  it('should trigger Miles explosion when typing MILES', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Wait for game to load
    await screen.findByText('Loading...');
    await screen.findByText('Reveal');

    // Type MILES
    await user.keyboard('MILES');

    // Check for explosion elements
    await waitFor(() => {
      expect(screen.getByText('💥 BOOM! 💥')).toBeInTheDocument();
      expect(screen.getByText('SIQUIJOR!')).toBeInTheDocument();
    });

    // Check for explosion background
    const explosionBackground = document.querySelector('.bg-gradient-to-r.from-red-500.via-yellow-500.to-orange-500');
    expect(explosionBackground).toBeInTheDocument();

    // Check for explosion particles
    const particles = document.querySelectorAll('.animate-ping');
    expect(particles.length).toBeGreaterThan(0);
  });

  it('should trigger Tracey message when typing TRACEY', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Wait for game to load
    await screen.findByText('Loading...');
    await screen.findByText('Reveal');

    // Type TRACEY
    await user.keyboard('TRACEY');

    // Check for Tracey message
    await waitFor(() => {
      expect(screen.getByText('I love you Mom!')).toBeInTheDocument();
    });

    // Check for solution display
    const solutionText = screen.getByText('The word was:');
    expect(solutionText).toBeInTheDocument();
  });

  it('should handle case insensitive Easter egg detection', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Wait for game to load
    await screen.findByText('Loading...');
    await screen.findByText('Reveal');

    // Type miles (lowercase)
    await user.keyboard('miles');

    // Check for explosion elements
    await waitFor(() => {
      expect(screen.getByText('💥 BOOM! 💥')).toBeInTheDocument();
    });
  });

  it('should reset key sequence after Easter egg activation', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Wait for game to load
    await screen.findByText('Loading...');
    await screen.findByText('Reveal');

    // Type MILES to trigger Easter egg
    await user.keyboard('MILES');

    // Wait for explosion to appear
    await waitFor(() => {
      expect(screen.getByText('💥 BOOM! 💥')).toBeInTheDocument();
    });

    // Wait for explosion to reset (should happen after 3 seconds)
    await waitFor(() => {
      expect(screen.queryByText('💥 BOOM! 💥')).not.toBeInTheDocument();
    }, { timeout: 5000 });

    // Type MILES again - should trigger again since sequence was reset
    await user.keyboard('MILES');

    // Check for explosion elements again
    await waitFor(() => {
      expect(screen.getByText('💥 BOOM! 💥')).toBeInTheDocument();
    });
  });

  it('should not trigger Easter eggs for partial sequences', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Wait for game to load
    await screen.findByText('Loading...');
    await screen.findByText('Reveal');

    // Type partial sequences
    await user.keyboard('MIL');
    await user.keyboard('TRAC');

    // Check that no Easter eggs were triggered
    expect(screen.queryByText('💥 BOOM! 💥')).not.toBeInTheDocument();
    expect(screen.queryByText('I love you Mom!')).not.toBeInTheDocument();
  });

  it('should reset key sequence after non-letter keys', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Wait for game to load
    await screen.findByText('Loading...');
    await screen.findByText('Reveal');

    // Type partial sequence
    await user.keyboard('MIL');

    // Press Enter (non-letter key)
    await user.keyboard('{Enter}');

    // Type ES - should not complete MILES
    await user.keyboard('ES');

    // Check that no Easter egg was triggered
    expect(screen.queryByText('💥 BOOM! 💥')).not.toBeInTheDocument();
  });

  it('should apply explosion classes to grid and keyboard', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Wait for game to load
    await screen.findByText('Loading...');
    await screen.findByText('Reveal');

    // Type MILES
    await user.keyboard('MILES');

    // Wait for explosion to trigger
    await waitFor(() => {
      expect(screen.getByText('💥 BOOM! 💥')).toBeInTheDocument();
    });

    // Check for explosion classes on grid and keyboard
    const grid = document.querySelector('.game-exploded');
    const keyboard = document.querySelector('.keyboard-container.game-exploded');
    
    expect(grid).toBeInTheDocument();
    expect(keyboard).toBeInTheDocument();
  });

  it('should show explosion visual effects', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Wait for game to load
    await screen.findByText('Loading...');
    await screen.findByText('Reveal');

    // Type MILES
    await user.keyboard('MILES');

    // Wait for explosion to trigger
    await waitFor(() => {
      expect(screen.getByText('💥 BOOM! 💥')).toBeInTheDocument();
    });

    // Check for various explosion visual elements
    expect(screen.getByText('SIQUIJOR!')).toBeInTheDocument();
    
    // Check for explosion particles
    const pingParticles = document.querySelectorAll('.animate-ping');
    const pulseParticles = document.querySelectorAll('.animate-pulse');
    const bounceParticles = document.querySelectorAll('.animate-bounce');
    
    expect(pingParticles.length).toBeGreaterThan(0);
    expect(pulseParticles.length).toBeGreaterThan(0);
    expect(bounceParticles.length).toBeGreaterThan(0);
  });

  it('should close Tracey message when close button is clicked', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Wait for game to load
    await screen.findByText('Loading...');
    await screen.findByText('Reveal');

    // Type TRACEY
    await user.keyboard('TRACEY');

    // Wait for message to appear
    await waitFor(() => {
      expect(screen.getByText('I love you Mom!')).toBeInTheDocument();
    });

    // Click close button
    const closeButton = screen.getByText('Close');
    await user.click(closeButton);

    // Check that message is gone
    expect(screen.queryByText('I love you Mom!')).not.toBeInTheDocument();
  });
});
