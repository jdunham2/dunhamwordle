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

describe('Easter Eggs', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockReturnValue(null);
    vi.clearAllMocks();
  });

  it('should trigger Miles explosion when typing MILES', async () => {
    render(<App />);

    // Wait for the game to load
    await waitFor(() => {
      expect(screen.getByRole('grid')).toBeInTheDocument();
    });

    // Type MILES
    const letters = ['M', 'I', 'L', 'E', 'S'];
    letters.forEach(letter => {
      fireEvent.keyDown(document, { key: letter });
    });

    // Check if explosion elements are rendered
    await waitFor(() => {
      expect(screen.getByText('💥 BOOM! 💥')).toBeInTheDocument();
    });
  });

  it('should trigger Tracey message when typing TRACEY', async () => {
    render(<App />);

    // Wait for the game to load
    await waitFor(() => {
      expect(screen.getByRole('grid')).toBeInTheDocument();
    });

    // Type TRACEY
    const letters = ['T', 'R', 'A', 'C', 'E', 'Y'];
    letters.forEach(letter => {
      fireEvent.keyDown(document, { key: letter });
    });

    // Check if Tracey message appears
    await waitFor(() => {
      expect(screen.getByText('I love you Mom!')).toBeInTheDocument();
    });
  });

  it('should not trigger Easter eggs for partial sequences', async () => {
    render(<App />);

    // Wait for the game to load
    await waitFor(() => {
      expect(screen.getByRole('grid')).toBeInTheDocument();
    });

    // Type partial sequences
    fireEvent.keyDown(document, { key: 'M' });
    fireEvent.keyDown(document, { key: 'I' });
    fireEvent.keyDown(document, { key: 'L' });

    // Should not trigger explosion
    expect(screen.queryByText('I love you Mom!')).not.toBeInTheDocument();
  });

  it('should reset key sequence after non-letter keys', async () => {
    render(<App />);

    // Wait for the game to load
    await waitFor(() => {
      expect(screen.getByRole('grid')).toBeInTheDocument();
    });

    // Type M and then press Enter
    fireEvent.keyDown(document, { key: 'M' });
    fireEvent.keyDown(document, { key: 'Enter' });

    // Now type MILES - should not trigger because sequence was reset
    const letters = ['I', 'L', 'E', 'S'];
    letters.forEach(letter => {
      fireEvent.keyDown(document, { key: letter });
    });

    // Should not trigger explosion
    expect(screen.queryByText('I love you Mom!')).not.toBeInTheDocument();
  });

  it('should handle case insensitive Easter egg detection', async () => {
    render(<App />);

    // Wait for the game to load
    await waitFor(() => {
      expect(screen.getByRole('grid')).toBeInTheDocument();
    });

    // Type miles in lowercase
    const letters = ['m', 'i', 'l', 'e', 's'];
    letters.forEach(letter => {
      fireEvent.keyDown(document, { key: letter });
    });

    // Should still trigger explosion
    await waitFor(() => {
      expect(screen.getByText('💥 BOOM! 💥')).toBeInTheDocument();
    });
  });
});
