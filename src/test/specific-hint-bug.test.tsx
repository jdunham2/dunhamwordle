import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../App';

// Mock the word service to force "VISOR" as the solution
vi.mock('../../services/wordService', () => ({
  loadWordLists: vi.fn().mockResolvedValue({
    solutions: ['VISOR'],
    validWords: new Set(['VISOR', 'VOTES', 'WORDS'])
  })
}));

describe('Hint System - Specific Bug Test', () => {
  it('should NOT show ghost letters on next row after correctly guessing a revealed letter', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Wait for game to load
    await screen.findByText('Loading...');
    await screen.findByText('Reveal');

    // Click reveal button to get a hint (should show "V" in first position)
    const revealButton = screen.getByText('Reveal');
    await user.click(revealButton);

    // Verify hint appears (should show 'V' for 'VISOR')
    await waitFor(() => {
      const tiles = screen.getAllByRole('gridcell');
      const firstTile = tiles[0];
      expect(firstTile).toHaveTextContent('V');
    });

    // Type "VOTES" - this should match the revealed V and turn it green
    await user.keyboard('VOTES');
    await user.keyboard('{Enter}');

    // Wait for the guess to be processed
    await waitFor(() => {
      // Check that we moved to the next row
      const tiles = screen.getAllByRole('gridcell');
      const firstTileOfNewRow = tiles[5]; // Second row, first tile
      expect(firstTileOfNewRow).toHaveTextContent(''); // Should be empty
    });

    // Wait a bit more to ensure no automatic hint addition happens
    await new Promise(resolve => setTimeout(resolve, 500));

    // Check that NO ghost letters appear on the new row
    const tiles = screen.getAllByRole('gridcell');
    const newRowTiles = tiles.slice(5, 10); // Second row tiles

    // All tiles in the new row should be empty (no ghost letters)
    newRowTiles.forEach((tile, index) => {
      expect(tile).toHaveTextContent('');
    });

    // Verify that clicking reveal again would add a hint
    await user.click(revealButton);
    await waitFor(() => {
      const tiles = screen.getAllByRole('gridcell');
      const firstTileOfNewRow = tiles[5];
      expect(firstTileOfNewRow).toHaveTextContent('I'); // Should show next hint after manual click
    });
  });
});
