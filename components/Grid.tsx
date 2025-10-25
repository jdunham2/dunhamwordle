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
    <div className="grid grid-rows-6 gap-2 sm:gap-2.5 w-full max-w-sm mx-auto" role="grid" aria-label="Game board">
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
