import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../../App';

// Mock the word service
vi.mock('../../services/wordService', () => ({
  loadWordLists: vi.fn().mockResolvedValue({
    solutions: ['HELLO', 'WORLD', 'MILES', 'TRACEY'],
    validWords: new Set(['HELLO', 'WORLD', 'MILES', 'TRACEY', 'TEST'])
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

describe('Game Explosion Effect', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockReturnValue(null);
    vi.clearAllMocks();
  });

  it('should apply explosion classes to grid and keyboard when Miles Easter egg is triggered', async () => {
    render(<App />);

    // Wait for the game to load
    await waitFor(() => {
      expect(screen.getByRole('grid')).toBeInTheDocument();
    });

    // Type MILES to trigger explosion
    const letters = ['M', 'I', 'L', 'E', 'S'];
    letters.forEach(letter => {
      fireEvent.keyDown(document, { key: letter });
    });

    // Check if explosion classes are applied
    await waitFor(() => {
      const grid = screen.getByRole('grid');
      const keyboard = screen.getByRole('group', { name: /keyboard/i });

      // The explosion classes should be applied
      expect(grid).toHaveClass('game-exploded');
      expect(keyboard).toHaveClass('game-exploded');
    });
  });

  it('should show explosion visual effects when Miles Easter egg is triggered', async () => {
    render(<App />);

    // Wait for the game to load
    await waitFor(() => {
      expect(screen.getByRole('grid')).toBeInTheDocument();
    });

    // Type MILES to trigger explosion
    const letters = ['M', 'I', 'L', 'E', 'S'];
    letters.forEach(letter => {
      fireEvent.keyDown(document, { key: letter });
    });

    // Check if explosion visual elements are rendered
    await waitFor(() => {
      expect(screen.getByText('💥 BOOM! 💥')).toBeInTheDocument();
    });
  });
});
