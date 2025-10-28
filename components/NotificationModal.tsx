import React from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface NotificationModalProps {
  isOpen: boolean;
  type: 'new-challenge' | 'challenge-completed';
  data: any;
  onView: () => void;
  onCancel: () => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  type,
  data,
  onView,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-zinc-800 rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-start gap-4 mb-6">
          {type === 'new-challenge' ? (
            <div className="bg-blue-600 rounded-full p-3">
              <AlertCircle className="h-8 w-8 text-white" />
            </div>
          ) : (
            <div className="bg-green-600 rounded-full p-3">
              <CheckCircle2 className="h-8 w-8 text-white" />
            </div>
          )}
          <div className="flex-1">
            {type === 'new-challenge' ? (
              <>
                <h2 className="text-2xl font-bold mb-2">New Challenge!</h2>
                <p className="text-gray-300">
                  <span className="font-semibold">{data.fromUsername}</span> sent you a challenge!
                </p>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-bold mb-2">Challenge Completed!</h2>
                <p className="text-gray-300">
                  <span className="font-semibold">{data.completerName}</span> completed your challenge
                </p>
                {data.solved && (
                  <p className="text-green-400 mt-2">
                    Solved in {data.guesses} {data.guesses === 1 ? 'guess' : 'guesses'}!
                  </p>
                )}
              </>
            )}
          </div>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={onView}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-semibold transition-colors"
          >
            View Challenge
          </button>
          <button
            onClick={onCancel}
            className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white px-4 py-3 rounded-lg font-semibold transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

