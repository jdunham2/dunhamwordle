import React, { useContext } from 'react';
import { TileStatus } from '../types';
import { AppContext } from '../App';

interface TileProps {
  letter: string;
  status: TileStatus;
  isSubmitted: boolean;
  index: number;
  isCurrentRow: boolean;
}

const TileComponent: React.FC<TileProps> = ({ letter, status, isSubmitted, index, isCurrentRow }) => {
    const { hintIndices, solution } = useContext(AppContext);
    const isHint = isCurrentRow && hintIndices.has(index);
    const displayLetter = isHint ? solution[index] : letter;

    const statusClasses: Record<TileStatus, string> = {
        empty: 'border-tile-border bg-transparent',
        editing: 'border-gray-500 bg-transparent animate-pop',
        correct: 'bg-correct text-white border-correct',
        present: 'bg-present text-white border-present',
        absent: 'bg-absent text-white border-absent',
    };
    
    const animationDelay = `${index * 100}ms`;
    const animationClass = isSubmitted ? 'animate-flip' : '';
    const hintClass = isHint ? 'tile-hint' : '';
    
    const label = displayLetter.trim()
        ? `Letter ${displayLetter.toUpperCase()}, status: ${status}`
        : `Empty tile`;

    return (
        <div
            className={`w-14 h-14 sm:w-16 sm:h-16 border-2 flex items-center justify-center text-3xl font-bold uppercase ${statusClasses[status]} ${animationClass} ${hintClass}`}
            style={{ animationDelay }}
            aria-label={label}
            role="gridcell"
        >
            {displayLetter}
        </div>
    );
};

export const Tile = React.memo(TileComponent);
