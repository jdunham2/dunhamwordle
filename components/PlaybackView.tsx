import React from 'react';
import { ChallengeResult } from '../services/challengeService';
import { Grid } from './Grid';

interface PlaybackViewProps {
  result: ChallengeResult;
  solution: string;
  onClose: () => void;
}

export const PlaybackView: React.FC<PlaybackViewProps> = ({
  result,
  solution,
  onClose
}) => {
  console.log('PlaybackView props:', { result, solution });
  console.log('Result guesses:', result.guesses);
  console.log('Solution:', solution);

  return (
    <div className="flex flex-col h-screen max-w-lg mx-auto p-2 sm:p-4 font-sans overflow-hidden lg:justify-center">
      {/* Close Button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={onClose}
          aria-label="Close"
          className="h-8 w-8 text-gray-400 hover:text-white"
        >
          <svg
            className="h-8 w-8"
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

      {/* Game Grid */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-white mb-2">
            Challenge Playback
          </h2>
          <p className="text-sm text-gray-300">
            {result.solved ? 'Solved!' : 'Not solved'} • {result.guesses.filter(guess => guess.trim() !== '').length} guesses
          </p>
        </div>

        <Grid
          guesses={result.guesses}
          currentGuess=""
          currentGuessIndex={result.guesses.length}
          solution={solution}
          isInvalidGuess={false}
        />
      </div>

      {/* Close Button (where keyboard would be) */}
      <div className="mt-4 flex-shrink-0">
        <button
          onClick={onClose}
          className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded-lg text-lg"
        >
          Close Playback
        </button>
      </div>
    </div>
  );
};
