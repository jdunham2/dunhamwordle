import React, { useState, useEffect, useRef } from 'react';
import { createWordChallenge, generateChallengeUrl, WordChallenge } from '../services/challengeService';
import { GameMode } from '../types';

interface WordChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartChallenge: (challenge: WordChallenge) => void;
  validWords?: Set<string>;
  shareNative: (url: string, title: string, text: string) => Promise<boolean>;
}

export const WordChallengeModal: React.FC<WordChallengeModalProps> = ({
  isOpen,
  onClose,
  onStartChallenge,
  validWords,
  shareNative
}) => {
  const [customWord, setCustomWord] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleShareChallenge = async () => {
    if (customWord.length !== 5) {
      alert('Please enter a 5-letter word');
      return;
    }

    const wordToCheck = customWord.toUpperCase();

    // Validate word if validWords is available
    if (validWords && !validWords.has(wordToCheck)) {
      alert(`"${wordToCheck}" is not a valid word. Please enter a real 5-letter word.`);
      return;
    }

    // If validWords is not available, show a warning but allow sharing
    if (!validWords) {
      console.warn('Word validation not available - validWords is null');
      alert('Word validation not available. Please make sure the word is valid before sharing.');
      return;
    }

    setIsValidating(true);

    try {
      const challenge = createWordChallenge(customWord.toUpperCase(), GameMode.Unlimited);
      const url = generateChallengeUrl(challenge);

      // Try native share first
      const shared = await shareNative(
        url,
        'Word Challenge',
        `Can you guess my word? Try this Wordle challenge: ${customWord.toUpperCase()}`
      );

      if (!shared) {
        // Fallback to clipboard
        await navigator.clipboard.writeText(url);
        alert('Challenge link copied to clipboard!');
      }

      onClose();
    } catch (error) {
      // Final fallback for older browsers
      const challenge = createWordChallenge(customWord.toUpperCase(), GameMode.Unlimited);
      const url = generateChallengeUrl(challenge);

      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Challenge link copied to clipboard!');
      onClose();
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div
      className="absolute inset-0 bg-black bg-opacity-75 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onKeyDown={(e) => e.stopPropagation()}
      onKeyUp={(e) => e.stopPropagation()}
    >
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
        <h2 className="text-2xl font-bold text-gray-100 mb-4 text-center">
          Create Word Challenge
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Enter a 5-letter word:
            </label>
            <input
              ref={inputRef}
              type="text"
              value={customWord}
              onChange={(e) => setCustomWord(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.stopPropagation()}
              onKeyUp={(e) => e.stopPropagation()}
              maxLength={5}
              className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 text-center text-lg font-mono tracking-widest"
              placeholder="WORD"
            />
          </div>

          <div className="text-sm text-gray-400 bg-gray-700 p-3 rounded">
            <p className="font-medium mb-1">Challenge Rules:</p>
            <ul className="text-xs space-y-1">
              <li>• Recipients will play your custom word</li>
              <li>• The recipient will have the option to send you their results back to you</li>
            </ul>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleShareChallenge}
            disabled={customWord.length !== 5 || isValidating}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded"
          >
            {isValidating ? 'Creating...' : 'Share Challenge'}
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-3 bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
