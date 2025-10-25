
import React from 'react';
import { KeyStatuses, KeyStatus } from '../types';

interface KeyboardProps {
  onKeyPress: (key: string) => void;
  keyStatuses: KeyStatuses;
}

const KEY_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Enter', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'Backspace'],
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

  const isWideKey = value === 'Enter' || value === 'Backspace';

  return (
    <button
      onClick={() => onClick(value)}
      className={`h-14 sm:h-16 md:h-20 rounded font-bold uppercase flex items-center justify-center text-base sm:text-lg ${
        isWideKey ? 'flex-grow px-3 sm:px-4' : 'flex-1 min-w-0'
      } ${statusClasses[status]}`}
    >
      {value === 'Backspace' ? (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 002.828 0L21 12M3 12l6.414-6.414a2 2 0 012.828 0L21 12" />
        </svg>
      ) : (
        value
      )}
    </button>
  );
};

export const Keyboard: React.FC<KeyboardProps> = ({ onKeyPress, keyStatuses }) => {
  return (
    // IMPORTANT: Keyboard layout settings - DO NOT CHANGE without explicit request
    // w-full: Makes keyboard take full available width
    // flex (not justify-center): Allows keys to stretch to fill width
    // px-1: Small padding for edge spacing
    <div className="flex flex-col gap-0.5 sm:gap-1 w-full keyboard-container" role="group" aria-label="On-screen keyboard">
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
    </div>
  );
};
