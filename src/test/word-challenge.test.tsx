import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../App';

// Mock the word service
vi.mock('../../services/wordService', () => ({
  loadWordLists: vi.fn().mockResolvedValue({
    solutions: ['TESTS', 'WORDS', 'HELLO'],
    validWords: new Set(['TESTS', 'WORDS', 'HELLO'])
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

describe('Word Challenge System', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockReturnValue(null);
    vi.clearAllMocks();
    mockLocation.pathname = '/';
    mockWriteText.mockClear();
  });

  it('should not allow Word of the Day challenges', async () => {
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

    // Check that challenge rules are displayed
    expect(screen.getByText('Challenge Rules:')).toBeInTheDocument();
    expect(screen.getByText('• Recipients will play your custom word')).toBeInTheDocument();
    expect(screen.getByText('• The recipient will have the option to send you their results back to you')).toBeInTheDocument();

    // Check that there's no game mode selector (since we removed it)
    expect(screen.queryByText('Game Mode:')).not.toBeInTheDocument();
  });

  it('should create and share a challenge', async () => {
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

    // Enter a custom word
    const wordInput = screen.getByPlaceholderText('WORD');
    await user.type(wordInput, 'HELLO');

    // Click share challenge button
    const shareChallengeButton = screen.getByText('Share Challenge');
    await user.click(shareChallengeButton);

    // Wait for the alert to be called (indicating successful sharing)
    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('Challenge link copied to clipboard!');
    });

    // The modal should close after sharing
    await waitFor(() => {
      expect(screen.queryByText('Create Word Challenge')).not.toBeInTheDocument();
    });
  });

  it('should bypass start screen when challenge URL is detected', async () => {
    // Mock a challenge URL with TESTS as the word
    mockLocation.pathname = '/challenge/eyJ3IjoiVEVTVFMiLCJnIjpbXSwibSI6InVubGltaXRlZCIsInQiOjE3MzQ5NjQ4MDAwMDAsImkiOiJ0ZXN0LWlkIn0';

    const user = userEvent.setup();
    render(<App />);

    // Wait for game to load
    await screen.findByText('Loading...');

    // Should not show start screen
    expect(screen.queryByText('Choose Your Game Mode')).not.toBeInTheDocument();

    // Should show the game directly
    await waitFor(() => {
      expect(screen.getByText('Reveal')).toBeInTheDocument();
    });
  });

  it('should handle challenge completion and offer result sharing', async () => {
    // Mock a challenge URL with TESTS as the word (which is in our mock solutions)
    mockLocation.pathname = '/challenge/eyJ3IjoiVEVTVFMiLCJnIjpbXSwibSI6InVubGltaXRlZCIsInQiOjE3MzQ5NjQ4MDAwMDAsImkiOiJ0ZXN0LWlkIn0';

    const user = userEvent.setup();
    render(<App />);

    // Wait for game to load
    await screen.findByText('Loading...');
    await screen.findByText('Reveal');

    // Type the solution word (TESTS from the challenge)
    await user.keyboard('TESTS{Enter}');

    // Wait for win state
    await waitFor(() => {
      expect(document.title).toBe('You Won! - Dunham Wordle');
    });

    // The challenge should be completed successfully
    // (We can't easily test the confirm dialog and clipboard in this environment)
  });

  it('should handle challenge result URLs', async () => {
    // Mock a result URL
    mockLocation.pathname = '/result/eyJpIjoidGVzdC1pZCIsImciOlsiSEVMTE8iXSwicyI6dHJ1ZSwidCI6MTAwMCwiYyI6MTczNDk2NDgwMDAwMH0';

    const user = userEvent.setup();
    render(<App />);

    // Wait for game to load
    await screen.findByText('Loading...');

    // Should not show start screen
    expect(screen.queryByText('Choose Your Game Mode')).not.toBeInTheDocument();

    // Should show the game directly
    await waitFor(() => {
      expect(screen.getByText('Reveal')).toBeInTheDocument();
    });
  });
});
