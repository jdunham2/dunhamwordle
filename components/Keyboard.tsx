
import React from 'react';
import { KeyStatuses, KeyStatus } from '../types';

interface KeyboardProps {
  onKeyPress: (key: string) => void;
  keyStatuses: KeyStatuses;
  exploded?: boolean;
}

const KEY_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M', 'Backspace'],
];

const Key: React.FC<{
  value: string;
  status: KeyStatus;
  onClick: (key: string) => void;
}> = ({ value, status, onClick }) => {
  const statusClasses: Record<KeyStatus, string> = {
    unused: 'bg-key-bg hover:bg-gray-600',
    absent: 'bg-absent text-white',
    present: 'bg-present text-white',
    correct: 'bg-correct text-white',
  };

  const isWideKey = value === 'Backspace';

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onClick(value);
    // Blur the button to remove focus after click
    e.currentTarget.blur();
  };

  return (
    <button
      onClick={handleClick}
      className={`h-14 sm:h-16 md:h-20 rounded font-bold uppercase flex items-center justify-center text-base sm:text-lg ${
        isWideKey ? 'w-16 sm:w-20 md:w-24 px-2 sm:px-3' : 'flex-1 min-w-0'
      } ${statusClasses[status]}`}
    >
      {value === 'Backspace' ? (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7l-5 5 5 5M4 12h16" />
        </svg>
      ) : (
        value
      )}
    </button>
  );
};

export const Keyboard: React.FC<KeyboardProps> = ({ onKeyPress, keyStatuses, exploded = false }) => {
  return (
    // IMPORTANT: Keyboard layout settings - DO NOT CHANGE without explicit request
    // w-full: Makes keyboard take full available width
    // flex (not justify-center): Allows keys to stretch to fill width
    // px-1: Small padding for edge spacing
    <div className={`flex flex-col gap-0.5 sm:gap-1 w-full keyboard-container ${exploded ? 'game-exploded' : ''}`} role="group" aria-label="On-screen keyboard">
      {KEY_ROWS.map((row, i) => (
        <div key={i} className="flex gap-0.5 sm:gap-1 w-full px-1">
            {i === 1 && <div className="w-2 sm:w-3 md:w-4" />}
            {row.map((key) => (
                <Key
                    key={key}
                    value={key}
                    status={keyStatuses[key] || 'unused'}
                    onClick={onKeyPress}
                />
            ))}
            {i === 1 && <div className="w-2 sm:w-3 md:w-4" />}
        </div>
      ))}

      {/* Enter button - separate row */}
      <div className="flex justify-center px-1">
        <button
          onClick={(e) => {
            onKeyPress('Enter');
            e.currentTarget.blur();
          }}
          className="h-14 sm:h-16 md:h-20 px-8 sm:px-12 md:px-16 rounded font-bold uppercase flex items-center justify-center text-base sm:text-lg bg-key-bg hover:bg-gray-600 text-white"
        >
          ENTER
        </button>
      </div>
    </div>
  );
};
