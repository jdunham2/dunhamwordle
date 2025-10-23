import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../App';

// Mock the word service
vi.mock('../../services/wordService', () => ({
  loadWordLists: vi.fn().mockResolvedValue({
    solutions: ['TESTS'],
    validWords: new Set(['TESTS', 'GUESS', 'WORDS'])
  })
}));

describe('Hint System - Automatic Addition Bug', () => {
  it('should NOT automatically add a new hint after submitting a guess', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Wait for game to load
    await screen.findByText('Loading...');
    await screen.findByText('Reveal');

    // Click reveal button to get a hint
    const revealButton = screen.getByText('Reveal');
    await user.click(revealButton);

    // Verify hint appears (should show 'T' for 'TESTS')
    await waitFor(() => {
      const tiles = screen.getAllByRole('gridcell');
      const firstTile = tiles[0];
      expect(firstTile).toHaveTextContent('T');
    });

    // Type a word that doesn't match the ghost letter (T)
    await user.keyboard('GUESS');
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

    // Check that NO new hint was automatically added to the new row
    const tiles = screen.getAllByRole('gridcell');
    const firstTileOfNewRow = tiles[5]; // Second row, first tile

    // This test should PASS - no automatic hint addition should happen
    // The tile should be empty, not showing a ghost letter
    expect(firstTileOfNewRow).toHaveTextContent('');

    // Also verify that clicking reveal again would add a hint
    await user.click(revealButton);
    await waitFor(() => {
      const tiles = screen.getAllByRole('gridcell');
      const firstTileOfNewRow = tiles[5];
      expect(firstTileOfNewRow).toHaveTextContent('T'); // Should show hint after manual click
    });
  });
});
