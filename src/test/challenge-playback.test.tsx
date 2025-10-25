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

describe('Challenge Result Playback System', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockReturnValue(null);
    vi.clearAllMocks();
    mockLocation.pathname = '/';
    mockWriteText.mockClear();
  });

  it('should show result playback screen when result URL is opened', async () => {
    // Mock a result URL with solved challenge
    mockLocation.pathname = '/result/eyJpIjoidGVzdC1pZCIsInciOiJDUkFaRSIsImciOlsiQVBQTEUiLCJIT1VTRSIsIkNSQVpFIl0sInMiOnRydWUsInQiOjEwMDAsImMiOjE3MzQ5NjQ4MDAwMDB9';

    render(<App />);

    // Wait for result playback screen to appear
    await waitFor(() => {
      expect(screen.getByText('Someone guessed your word!')).toBeInTheDocument();
    });

    // Should show solved status
    expect(screen.getByText('They solved it!')).toBeInTheDocument();
    expect(screen.getByText('3 guesses used')).toBeInTheDocument();
    expect(screen.getByText('See Playback')).toBeInTheDocument();
  });

  it('should show unsolved status when challenge was not solved', async () => {
    // Mock a result URL with unsolved challenge
    mockLocation.pathname = '/result/eyJpIjoidGVzdC1pZCIsInciOiJDUkFaRSIsImciOlsiQVBQTEUiLCJIT1VTRSIsIk1PVVNFIiwiQ0hBSUIiLCJUQUJMRSIsIkZJUlNUIl0sInMiOmZhbHNlLCJ0IjoxMDAwLCJjIjoxNzM0OTY0ODAwMDB9';

    render(<App />);

    // Wait for result playback screen to appear
    await waitFor(() => {
      expect(screen.getByText('Someone guessed your word!')).toBeInTheDocument();
    });

    // Should show unsolved status
    expect(screen.getByText('They ran out of guesses.')).toBeInTheDocument();
    expect(screen.getByText('6 guesses used')).toBeInTheDocument();
  });

  it('should navigate to playback view when See Playback is clicked', async () => {
    // Mock a result URL
    mockLocation.pathname = '/result/eyJpIjoidGVzdC1pZCIsInciOiJDUkFaRSIsImciOlsiQVBQTEUiLCJIT1VTRSIsIkNSQVpFIl0sInMiOnRydWUsInQiOjEwMDAsImMiOjE3MzQ5NjQ4MDAwMDB9';

    const user = userEvent.setup();
    render(<App />);

    // Wait for result playback screen
    await waitFor(() => {
      expect(screen.getByText('Someone guessed your word!')).toBeInTheDocument();
    });

    // Click See Playback button
    const seePlaybackButton = screen.getByText('See Playback');
    await user.click(seePlaybackButton);

    // Should show playback view
    await waitFor(() => {
      expect(screen.getByText('Challenge Playback')).toBeInTheDocument();
    });

    // Should show solved status and guess count
    expect(screen.getByText('Solved! • 3 guesses')).toBeInTheDocument();
  });

  it('should display all guesses in playback view', async () => {
    // Mock a result URL with multiple guesses
    mockLocation.pathname = '/result/eyJpIjoidGVzdC1pZCIsInciOiJDUkFaRSIsImciOlsiQVBQTEUiLCJIT1VTRSIsIkNSQVpFIl0sInMiOnRydWUsInQiOjEwMDAsImMiOjE3MzQ5NjQ4MDAwMDB9';

    const user = userEvent.setup();
    render(<App />);

    // Navigate to playback view
    await waitFor(() => {
      expect(screen.getByText('Someone guessed your word!')).toBeInTheDocument();
    });

    await user.click(screen.getByText('See Playback'));

    await waitFor(() => {
      expect(screen.getByText('Challenge Playback')).toBeInTheDocument();
    });

    // Check that all guesses are displayed
    const tiles = screen.getAllByRole('gridcell');

    // First guess: APPLE
    expect(tiles[0]).toHaveTextContent('A');
    expect(tiles[1]).toHaveTextContent('P');
    expect(tiles[2]).toHaveTextContent('P');
    expect(tiles[3]).toHaveTextContent('L');
    expect(tiles[4]).toHaveTextContent('E');

    // Second guess: HOUSE
    expect(tiles[5]).toHaveTextContent('H');
    expect(tiles[6]).toHaveTextContent('O');
    expect(tiles[7]).toHaveTextContent('U');
    expect(tiles[8]).toHaveTextContent('S');
    expect(tiles[9]).toHaveTextContent('E');

    // Third guess: CRAZE
    expect(tiles[10]).toHaveTextContent('C');
    expect(tiles[11]).toHaveTextContent('R');
    expect(tiles[12]).toHaveTextContent('A');
    expect(tiles[13]).toHaveTextContent('Z');
    expect(tiles[14]).toHaveTextContent('E');
  });

  it('should show Close Playback button instead of keyboard', async () => {
    // Mock a result URL
    mockLocation.pathname = '/result/eyJpIjoidGVzdC1pZCIsInciOiJDUkFaRSIsImciOlsiQVBQTEUiLCJIT1VTRSIsIkNSQVpFIl0sInMiOnRydWUsInQiOjEwMDAsImMiOjE3MzQ5NjQ4MDAwMDB9';

    const user = userEvent.setup();
    render(<App />);

    // Navigate to playback view
    await waitFor(() => {
      expect(screen.getByText('Someone guessed your word!')).toBeInTheDocument();
    });

    await user.click(screen.getByText('See Playback'));

    await waitFor(() => {
      expect(screen.getByText('Challenge Playback')).toBeInTheDocument();
    });

    // Should show Close Playback button instead of keyboard
    expect(screen.getByText('Close Playback')).toBeInTheDocument();
    expect(screen.queryByText('ENTER')).not.toBeInTheDocument(); // No keyboard
  });

  it('should close playback and return to start screen when Close Playback is clicked', async () => {
    // Mock a result URL
    mockLocation.pathname = '/result/eyJpIjoidGVzdC1pZCIsInciOiJDUkFaRSIsImciOlsiQVBQTEUiLCJIT1VTRSIsIkNSQVpFIl0sInMiOnRydWUsInQiOjEwMDAsImMiOjE3MzQ5NjQ4MDAwMDB9';

    const user = userEvent.setup();
    render(<App />);

    // Navigate to playback view
    await waitFor(() => {
      expect(screen.getByText('Someone guessed your word!')).toBeInTheDocument();
    });

    await user.click(screen.getByText('See Playback'));

    await waitFor(() => {
      expect(screen.getByText('Challenge Playback')).toBeInTheDocument();
    });

    // Click Close Playback button
    await user.click(screen.getByText('Close Playback'));

    // Should return to start screen
    await waitFor(() => {
      expect(screen.getByText('Play Unlimited Wordle')).toBeInTheDocument();
    });
  });

  it('should close result playback screen and return to start screen when close button is clicked', async () => {
    // Mock a result URL
    mockLocation.pathname = '/result/eyJpIjoidGVzdC1pZCIsInciOiJDUkFaRSIsImciOlsiQVBQTEUiLCJIT1VTRSIsIkNSQVpFIl0sInMiOnRydWUsInQiOjEwMDAsImMiOjE3MzQ5NjQ4MDAwMDB9';

    const user = userEvent.setup();
    render(<App />);

    // Wait for result playback screen
    await waitFor(() => {
      expect(screen.getByText('Someone guessed your word!')).toBeInTheDocument();
    });

    // Click close button (X)
    const closeButton = screen.getByLabelText('Close');
    await user.click(closeButton);

    // Should return to start screen
    await waitFor(() => {
      expect(screen.getByText('Play Unlimited Wordle')).toBeInTheDocument();
    });
  });

  it('should handle single guess correctly', async () => {
    // Mock a result URL with single guess
    mockLocation.pathname = '/result/eyJpIjoidGVzdC1pZCIsInciOiJDUkFaRSIsImciOlsiQ1JBWkUiXSwicyI6dHJ1ZSwidCI6MTAwMCwiYyI6MTczNDk2NDgwMDAwfQ';

    const user = userEvent.setup();
    render(<App />);

    // Navigate to playback view
    await waitFor(() => {
      expect(screen.getByText('Someone guessed your word!')).toBeInTheDocument();
    });

    await user.click(screen.getByText('See Playback'));

    await waitFor(() => {
      expect(screen.getByText('Challenge Playback')).toBeInTheDocument();
    });

    // Should show single guess
    expect(screen.getByText('Solved! • 1 guess')).toBeInTheDocument();

    const tiles = screen.getAllByRole('gridcell');
    expect(tiles[0]).toHaveTextContent('C');
    expect(tiles[1]).toHaveTextContent('R');
    expect(tiles[2]).toHaveTextContent('A');
    expect(tiles[3]).toHaveTextContent('Z');
    expect(tiles[4]).toHaveTextContent('E');
  });

  it('should handle empty guesses array gracefully', async () => {
    // Mock a result URL with no guesses
    mockLocation.pathname = '/result/eyJpIjoidGVzdC1pZCIsInciOiJDUkFaRSIsImciOltdLCJzIjpmYWxzZSwidCI6MTAwMCwiYyI6MTczNDk2NDgwMDAwfQ';

    const user = userEvent.setup();
    render(<App />);

    // Navigate to playback view
    await waitFor(() => {
      expect(screen.getByText('Someone guessed your word!')).toBeInTheDocument();
    });

    await user.click(screen.getByText('See Playback'));

    await waitFor(() => {
      expect(screen.getByText('Challenge Playback')).toBeInTheDocument();
    });

    // Should show no guesses
    expect(screen.getByText('Not solved • 0 guesses')).toBeInTheDocument();
  });
});
