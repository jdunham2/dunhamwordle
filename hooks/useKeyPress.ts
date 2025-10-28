
import { useEffect } from 'react';

const isLetter = (key: string): boolean => {
  return key.length === 1 && key.match(/[a-z]/i) !== null;
};

export const useKeyPress = (callback: (key: string) => void) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't handle keypresses when user is typing in an input/textarea
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }
      
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
