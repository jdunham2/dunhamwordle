import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../App';

// Mock the word service with a comprehensive word list
vi.mock('../../services/wordService', () => ({
  loadWordLists: vi.fn().mockResolvedValue({
    solutions: ['TESTS', 'WORDS', 'CRAZE'],
    validWords: new Set(['TESTS', 'WORDS', 'CRAZE', 'APPLE', 'HOUSE', 'MOUSE', 'CHAIR', 'TABLE'])
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

// Mock URL methods
const mockLocation = {
  pathname: '/',
  origin: 'http://localhost:3000'
};
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true
});

// Mock clipboard API
const mockWriteText = vi.fn().mockResolvedValue(undefined);
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: mockWriteText
  },
  writable: true,
  configurable: true
});

// Mock document.execCommand for fallback clipboard
Object.defineProperty(document, 'execCommand', {
  value: vi.fn().mockReturnValue(true),
  writable: true,
  configurable: true
});

// Mock alert function
global.alert = vi.fn();

describe('Challenge Word Validation', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockReturnValue(null);
    vi.clearAllMocks();
    mockLocation.pathname = '/';
    mockWriteText.mockClear();
  });

  it('should validate real words in share dialog', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Wait for game to load
    await screen.findByText('Loading...');
    await screen.findByText('Reveal');

    // Click the share button to open challenge modal
    const shareButton = screen.getByLabelText('Create word challenge');
    await user.click(shareButton);

    // Wait for modal to appear
    await waitFor(() => {
      expect(screen.getByText('Create Word Challenge')).toBeInTheDocument();
    });

    // Enter a valid word
    const wordInput = screen.getByPlaceholderText('WORD');
    await user.type(wordInput, 'APPLE');

    // Click share challenge button
    const shareChallengeButton = screen.getByText('Share Challenge');
    await user.click(shareChallengeButton);

    // Should succeed (no validation error)
    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('Challenge link copied to clipboard!');
    });
  });

  it('should reject invalid words in share dialog', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Wait for game to load
    await screen.findByText('Loading...');
    await screen.findByText('Reveal');

    // Click the share button to open challenge modal
    const shareButton = screen.getByLabelText('Create word challenge');
    await user.click(shareButton);

    // Wait for modal to appear
    await waitFor(() => {
      expect(screen.getByText('Create Word Challenge')).toBeInTheDocument();
    });

    // Enter an invalid word
    const wordInput = screen.getByPlaceholderText('WORD');
    await user.type(wordInput, 'XYZAB');

    // Click share challenge button
    const shareChallengeButton = screen.getByText('Share Challenge');
    await user.click(shareChallengeButton);

    // Should show validation error
    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('"XYZAB" is not a valid word. Please enter a real 5-letter word.');
    });
  });

  it('should accept both challenge word and other valid words when playing a challenge', async () => {
    // Mock a challenge URL with CRAZE as the word
    mockLocation.pathname = '/challenge/eyJ3IjoiQ1JBWkUiLCJnIjpbXSwibSI6InVubGltaXRlZCIsInQiOjE3MzQ5NjQ4MDAwMDAsImkiOiJ0ZXN0LWlkIn0';

    const user = userEvent.setup();
    render(<App />);

    // Wait for game to load
    await screen.findByText('Loading...');
    await screen.findByText('Reveal');

    // Try typing the challenge word (CRAZE) - should be accepted
    await user.keyboard('CRAZE{Enter}');

    // Should win the game
    await waitFor(() => {
      expect(document.title).toBe('You Won! - Dunham Wordle');
    });
  });

  it('should accept other valid words when playing a challenge', async () => {
    // Mock a challenge URL with CRAZE as the word
    mockLocation.pathname = '/challenge/eyJ3IjoiQ1JBWkUiLCJnIjpbXSwibSI6InVubGltaXRlZCIsInQiOjE3MzQ5NjQ4MDAwMDAsImkiOiJ0ZXN0LWlkIn0';

    const user = userEvent.setup();
    render(<App />);

    // Wait for game to load
    await screen.findByText('Loading...');
    await screen.findByText('Reveal');

    // Try typing a valid word that's not the answer (APPLE) - should be accepted
    await user.keyboard('APPLE{Enter}');

    // Should not show "Not in word list" error
    await waitFor(() => {
      expect(screen.queryByText('Not in word list')).not.toBeInTheDocument();
    });

    // Should show the word in the grid
    const tiles = screen.getAllByRole('gridcell');
    expect(tiles[0]).toHaveTextContent('A');
    expect(tiles[1]).toHaveTextContent('P');
    expect(tiles[2]).toHaveTextContent('P');
    expect(tiles[3]).toHaveTextContent('L');
    expect(tiles[4]).toHaveTextContent('E');
  });

  it('should reject invalid words when playing a challenge', async () => {
    // Mock a challenge URL with CRAZE as the word
    mockLocation.pathname = '/challenge/eyJ3IjoiQ1JBWkUiLCJnIjpbXSwibSI6InVubGltaXRlZCIsInQiOjE3MzQ5NjQ4MDAwMDAsImkiOiJ0ZXN0LWlkIn0';

    const user = userEvent.setup();
    render(<App />);

    // Wait for game to load
    await screen.findByText('Loading...');
    await screen.findByText('Reveal');

    // Try typing an invalid word (XYZAB) - should be rejected
    await user.keyboard('XYZAB{Enter}');

    // Should show "Not in word list" error
    await waitFor(() => {
      const errorMessages = screen.getAllByText('Not in word list');
      // Should have at least one visible error message
      expect(errorMessages.length).toBeGreaterThan(0);
    });
  });

  it('should prevent input focus issues in share dialog', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Wait for game to load
    await screen.findByText('Loading...');
    await screen.findByText('Reveal');

    // Click the share button to open challenge modal
    const shareButton = screen.getByLabelText('Create word challenge');
    await user.click(shareButton);

    // Wait for modal to appear
    await waitFor(() => {
      expect(screen.getByText('Create Word Challenge')).toBeInTheDocument();
    });

    // Type in the modal input
    const wordInput = screen.getByPlaceholderText('WORD');
    await user.type(wordInput, 'APPLE');

    // The input should have the word, but the main game should not
    expect(wordInput).toHaveValue('APPLE');

    // Check that the main game grid is still empty
    const tiles = screen.getAllByRole('gridcell');
    tiles.slice(0, 5).forEach(tile => {
      expect(tile).toHaveTextContent('');
    });
  });
});
