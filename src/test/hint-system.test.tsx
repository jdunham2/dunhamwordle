import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

// Mock the word service
vi.mock('../services/wordService', () => ({
  loadWordLists: vi.fn().mockResolvedValue({
    solutions: ['TESTS'],
    validWords: new Set(['TESTS', 'GUESS', 'WORDS'])
  })
}));

describe('Hint System', () => {
  it('should show ghost letter when reveal button is clicked', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Wait for game to load
    await screen.findByText('Loading...');
    await screen.findByText('Reveal');

    // Click reveal button
    const revealButton = screen.getByText('Reveal');
    await user.click(revealButton);

    // Check that a ghost letter appears (should show 'T' for 'TESTS')
    const tiles = screen.getAllByRole('gridcell');
    const firstTile = tiles[0];
    expect(firstTile).toHaveTextContent('T');
  });

  it('should allow typing over ghost letters', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Wait for game to load and click reveal
    await screen.findByText('Loading...');
    const revealButton = screen.getByText('Reveal');
    await user.click(revealButton);

    // Type a letter in the first position
    await user.keyboard('G');

    // The ghost letter should be replaced with 'G'
    const tiles = screen.getAllByRole('gridcell');
    const firstTile = tiles[0];
    expect(firstTile).toHaveTextContent('G');
  });

  it('should remove hints for correctly guessed positions', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Wait for game to load and click reveal
    await screen.findByText('Loading...');
    const revealButton = screen.getByText('Reveal');
    await user.click(revealButton);

    // Type the correct word
    await user.keyboard('TESTS');
    await user.keyboard('{Enter}');

    // Wait for the guess to be processed
    await new Promise(resolve => setTimeout(resolve, 100));

    // Click reveal again - should not show hint in position 0 (already correct)
    await user.click(revealButton);

    // Check that no ghost letter appears in the first position of the new row
    const tiles = screen.getAllByRole('gridcell');
    const firstTileOfNewRow = tiles[5]; // Second row, first tile
    expect(firstTileOfNewRow).not.toHaveTextContent('T');
  });

  it('should not automatically add hints after guess submission', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Wait for game to load and click reveal
    await screen.findByText('Loading...');
    const revealButton = screen.getByText('Reveal');
    await user.click(revealButton);

    // Type a word that doesn't match the ghost letter
    await user.keyboard('GUESS');
    await user.keyboard('{Enter}');

    // Wait for the guess to be processed
    await new Promise(resolve => setTimeout(resolve, 100));

    // Check that no new hint was automatically added
    const tiles = screen.getAllByRole('gridcell');
    const firstTileOfNewRow = tiles[5]; // Second row, first tile
    expect(firstTileOfNewRow).toHaveTextContent(''); // Should be empty, not showing a ghost letter
  });
});
