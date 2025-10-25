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

describe('Easter Eggs - Basic Functionality', () => {
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
});
