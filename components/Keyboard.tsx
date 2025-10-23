
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
      className={`h-14 rounded font-bold uppercase flex items-center justify-center text-sm ${
        isWideKey ? 'flex-grow px-2' : 'w-8 sm:w-11'
      } ${statusClasses[status]}`}
    >
      {value === 'Backspace' ? (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
    <div className="flex flex-col gap-2 w-full mt-4 keyboard-container" role="group" aria-label="On-screen keyboard">
      {KEY_ROWS.map((row, i) => (
        <div key={i} className="flex justify-center gap-1.5 w-full">
            {i === 1 && <div className="flex-grow max-w-[20px] sm:max-w-[30px]" />}
            {row.map((key) => (
                <Key
                    key={key}
                    value={key}
                    status={keyStatuses[key] || 'unused'}
                    onClick={onKeyPress}
                />
            ))}
            {i === 1 && <div className="flex-grow max-w-[20px] sm:max-w-[30px]" />}
        </div>
      ))}
    </div>
  );
};
