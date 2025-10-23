// URLs for the word lists relative to the app root (works on GitHub Pages subpaths)
const SOLUTIONS_URL = './wordle-answers-alphabetical.txt';
const ALLOWED_GUESSES_URL = './wordle-allowed-guesses.txt';


interface WordLists {
  solutions: string[];
  validWords: Set<string>;
}

/**
 * Fetches and processes production-level word lists for the game.
 * @returns A promise that resolves to an object containing the solutions array and a set of all valid words.
 * @throws An error if the word lists cannot be fetched or are empty.
 */
export const loadWordLists = async (): Promise<WordLists> => {
  try {
    const [solutionsResponse, allowedGuessesResponse] = await Promise.all([
      fetch(SOLUTIONS_URL),
      fetch(ALLOWED_GUESSES_URL)
    ]);

    if (!solutionsResponse.ok || !allowedGuessesResponse.ok) {
      throw new Error(`Failed to fetch word lists. Status: ${solutionsResponse.status}, ${allowedGuessesResponse.status}`);
    }

    const solutionsText = await solutionsResponse.text();
    const allowedGuessesText = await allowedGuessesResponse.text();

    // Process and sanitize the word lists
    const solutions = solutionsText
      .split('\n')
      .map(word => word.trim().toUpperCase())
      .filter(word => word.length === 5);

    const allowedGuesses = allowedGuessesText
      .split('\n')
      .map(word => word.trim().toUpperCase())
      .filter(word => word.length === 5);

    // The set of valid words includes all possible solutions plus all other allowed guesses.
    const validWords = new Set([...solutions, ...allowedGuesses]);

    if (solutions.length === 0 || validWords.size === 0) {
        throw new Error('Word lists are empty after processing. The source may have changed.');
    }

    return {
      solutions,
      validWords,
    };
  } catch (error) {
    console.error("Error loading word lists:", error);
    // Re-throw the error to be caught by the calling component (App.tsx),
    // which will then display an error message to the user.
    throw new Error('Could not load word lists. Please check your network connection and try again.');
  }
};
