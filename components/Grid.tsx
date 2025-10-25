import React from 'react';
import { Row } from './Row';

const MAX_GUESSES = 6;
const WORD_LENGTH = 5;

interface GridProps {
  guesses: string[];
  currentGuess: string;
  currentGuessIndex: number;
  solution: string;
  isInvalidGuess: boolean;
}

export const Grid: React.FC<GridProps> = ({ guesses, currentGuess, currentGuessIndex, solution, isInvalidGuess }) => {
  return (
    // IMPORTANT: Grid layout settings - DO NOT CHANGE without explicit request
    // Centered grid with tight internal spacing, most spacing on outside
    // gap-1 sm:gap-1.5: Tight spacing between rows (Row component has gap-0 to avoid double spacing)
    <div className="grid grid-rows-6 gap-1 sm:gap-1.5 mx-auto" role="grid" aria-label="Game board">
      {Array.from({ length: MAX_GUESSES }).map((_, i) => {
        const isCurrentGuessRow = i === currentGuessIndex;
        const guess = isCurrentGuessRow ? currentGuess : guesses[i] ?? '';

        return (
          <Row
            key={i}
            guess={guess}
            solution={solution}
            isSubmitted={!isCurrentGuessRow && guesses[i] !== ''}
            isInvalid={isCurrentGuessRow && isInvalidGuess}
            isCurrentRow={isCurrentGuessRow}
          />
        );
      })}
    </div>
  );
};
