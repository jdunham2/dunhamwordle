import React from 'react';
import { ChallengeResult } from '../services/challengeService';

interface ResultPlaybackScreenProps {
  result: ChallengeResult;
  onViewPlayback: () => void;
  onClose: () => void;
}

export const ResultPlaybackScreen: React.FC<ResultPlaybackScreenProps> = ({
  result,
  onViewPlayback,
  onClose
}) => {
  return (
    <div className="flex flex-col h-screen max-w-lg mx-auto p-2 sm:p-4 font-sans overflow-hidden lg:justify-center">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-gray-600 pb-1 mb-1 flex-shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            aria-label="Close"
            className="h-5 w-5 text-gray-400 hover:text-white"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              height="24"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              width="24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M18 6L6 18" />
              <path d="M6 6l12 12" />
            </svg>
          </button>
        </div>
        <h1 className="text-xl sm:text-2xl md:text-4xl font-bold tracking-wider">
          WORDLE
        </h1>
        <div className="flex items-center gap-2">
          {/* Empty space for symmetry */}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <div className="mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Someone guessed your word!
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-2">
            {result.solved ? 'They solved it!' : 'They ran out of guesses.'}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            {result.guesses.length} {result.guesses.length === 1 ? 'guess' : 'guesses'} used
          </p>
        </div>

        <button
          onClick={onViewPlayback}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg text-lg"
        >
          See Playback
        </button>
      </div>
    </div>
  );
};
