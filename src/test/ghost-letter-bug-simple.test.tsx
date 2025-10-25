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

describe('Ghost Letter Bug - New Game', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockReturnValue(null);
    vi.clearAllMocks();
  });

  it('should NOT carry ghost letters over to the next game', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Wait for game to load
    await screen.findByText('Loading...');
    await screen.findByText('Reveal');

    // Click reveal button to get a ghost letter
    const revealButton = screen.getByText('Reveal');
    await user.click(revealButton);

    // Verify ghost letter appears
    await waitFor(() => {
      const tiles = screen.getAllByRole('gridcell');
      const firstTile = tiles[0];
      expect(firstTile).toHaveTextContent(/[A-Z]/); // Any letter
    });

    // Use the New Game button to start a fresh game
    const newGameButton = screen.getByLabelText('New Game');
    await user.click(newGameButton);

    // Wait for new game to load
    await waitFor(() => {
      expect(screen.getByText('Reveal')).toBeInTheDocument();
    });

    // Check that NO ghost letters are showing in the new game
    const newTiles = screen.getAllByRole('gridcell');
    const newFirstTile = newTiles[0];
    
    // The first tile should be empty - no ghost letter from previous game
    expect(newFirstTile).toHaveTextContent('');
    
    // All tiles in the first row should be empty
    const firstRowTiles = newTiles.slice(0, 5);
    firstRowTiles.forEach((tile, index) => {
      expect(tile).toHaveTextContent('');
    });
  });
});
