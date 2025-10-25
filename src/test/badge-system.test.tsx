import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../App';

// Mock the word service
vi.mock('../../services/wordService', () => ({
  loadWordLists: vi.fn().mockResolvedValue({
    solutions: ['TESTS', 'WORDS'],
    validWords: new Set(['TESTS', 'WORDS'])
  })
}));

// Mock Math.random to always return 0, which will select the first solution (TESTS)
vi.spyOn(Math, 'random').mockReturnValue(0);

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

describe('Badge System', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockReturnValue(null);
    vi.clearAllMocks();
  });

  it('should unlock first win badge when winning a game', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Wait for game to load
    await screen.findByText('Loading...');
    await screen.findByText('Reveal');

    // Type the solution word using keyboard events
    await user.keyboard('TESTS{Enter}');

    // Wait for win state - check for the title change
    await waitFor(() => {
      expect(document.title).toBe('You Won! - Dunham Wordle');
    });

    // Check if badge notification appears
    await waitFor(() => {
      expect(screen.getByText('New Badge Unlocked!')).toBeInTheDocument();
    });

    // Check if it's the first win badge
    expect(screen.getByText('First Victory')).toBeInTheDocument();
  });

  it('should show badges in statistics modal', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Wait for game to load
    await screen.findByText('Loading...');
    await screen.findByText('Reveal');

    // Win a game to unlock a badge
    await user.keyboard('TESTS{Enter}');

    // Wait for win state - check for the title change
    await waitFor(() => {
      expect(document.title).toBe('You Won! - Dunham Wordle');
    });

    // Close badge notification
    await user.click(screen.getByText('Awesome!'));

    // Open statistics
    const statsButton = screen.getByLabelText('View statistics');
    await user.click(statsButton);

    // Check if badges section appears
    await waitFor(() => {
      expect(screen.getByText('Badges')).toBeInTheDocument();
    });

    // Check if the unlocked badge is shown
    expect(screen.getByText('First Victory')).toBeInTheDocument();
  });
});
