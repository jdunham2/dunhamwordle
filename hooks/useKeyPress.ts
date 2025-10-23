
import { useEffect } from 'react';

const isLetter = (key: string): boolean => {
  return key.length === 1 && key.match(/[a-z]/i) !== null;
};

export const useKeyPress = (callback: (key: string) => void) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === 'Backspace' || isLetter(event.key)) {
        callback(event.key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [callback]);
};
