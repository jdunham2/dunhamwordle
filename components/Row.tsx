import React from 'react';
import { Tile } from './Tile';
import { TileStatus } from '../types';

const WORD_LENGTH = 5;

interface RowProps {
  guess: string;
  solution: string;
  isSubmitted: boolean;
  isInvalid: boolean;
  isCurrentRow: boolean;
}

const getTileStatus = (letter: string, index: number, solution: string, guess: string): TileStatus => {
    if (!letter) return 'empty';
    if (!guess.includes(letter)) return 'editing'; // Should not happen with submitted rows
    
    if (solution[index] === letter) {
        return 'correct';
    }

    const solutionLetterCount = solution.split('').filter(l => l === letter).length;
    const guessCorrectCount = guess.split('').filter((l, i) => l === letter && solution[i] === l).length;
    const guessOccurrencesBefore = guess.substring(0, index).split('').filter(l => l === letter).length;

    if (guessOccurrencesBefore < (solutionLetterCount - guessCorrectCount)) {
        return 'present';
    }

    return 'absent';
};


const RowComponent: React.FC<RowProps> = ({ guess, solution, isSubmitted, isInvalid, isCurrentRow }) => {
  const paddedGuess = guess.padEnd(WORD_LENGTH, ' ');
  const animationClass = isInvalid ? 'animate-shake' : '';

  return (
    <div className={`grid grid-cols-5 gap-1.5 ${animationClass}`} role="row">
      {paddedGuess.split('').map((letter, i) => {
        const status: TileStatus = isSubmitted
          ? getTileStatus(letter, i, solution, guess)
          : letter.trim()
          ? 'editing'
          : 'empty';

        return <Tile key={i} letter={letter} status={status} isSubmitted={isSubmitted} index={i} isCurrentRow={isCurrentRow}/>;
      })}
    </div>
  );
};

export const Row = React.memo(RowComponent);
