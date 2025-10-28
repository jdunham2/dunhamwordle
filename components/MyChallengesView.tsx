import React, { useState, useEffect } from 'react';
import { getMyChallenges, getChallengeCompletions, generateChallengeUrl } from '../services/challengeService';

interface MyChallengesViewProps {
  onClose: () => void;
}

interface ChallengeWithCompletions {
  challengeId: string;
  word: string;
  senderName: string;
  createdAt: number;
  completions: number;
  completionDetails: any[];
}

export const MyChallengesView: React.FC<MyChallengesViewProps> = ({ onClose }) => {
  const [challenges, setChallenges] = useState<ChallengeWithCompletions[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChallenge, setSelectedChallenge] = useState<ChallengeWithCompletions | null>(null);

  useEffect(() => {
    loadChallenges();
  }, []);

  const loadChallenges = async () => {
    setLoading(true);
    const myChallenges = getMyChallenges();
    
    // Load completion counts for each challenge
    const challengesWithCompletions = await Promise.all(
      myChallenges.map(async (challenge) => {
        const completions = await getChallengeCompletions(challenge.challengeId);
        return {
          ...challenge,
          completions: completions.length,
          completionDetails: completions,
        };
      })
    );

    // Sort by creation date (newest first)
    challengesWithCompletions.sort((a, b) => b.createdAt - a.createdAt);
    
    setChallenges(challengesWithCompletions);
    setLoading(false);
  };

  const handleShare = async (challenge: ChallengeWithCompletions) => {
    const url = generateChallengeUrl({
      word: challenge.word,
      guesses: [],
      gameMode: 'unlimited',
      createdAt: new Date(challenge.createdAt),
      challengeId: challenge.challengeId,
      senderName: challenge.senderName,
    });

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Challenge from ${challenge.senderName} - Dunham Wordle`,
          text: `Can you solve my Wordle challenge? Word: ${challenge.word}`,
          url: url,
        });
      } catch (err) {
        // User cancelled or error occurred
        console.log('Share cancelled or failed:', err);
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(url);
      alert('Challenge link copied to clipboard!');
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: 'numeric', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-zinc-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-zinc-700 flex justify-between items-center">
          <h2 className="text-2xl font-bold">My Challenges</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-400">Loading challenges...</p>
            </div>
          ) : challenges.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 mb-4">You haven't created any challenges yet.</p>
              <p className="text-sm text-gray-500">Create your first challenge to share with friends!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {challenges.map((challenge) => (
                <div
                  key={challenge.challengeId}
                  className="bg-zinc-700 rounded-lg p-4 hover:bg-zinc-600 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-xl font-bold text-green-400">{challenge.word}</h3>
                        {challenge.completions > 0 && (
                          <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                            {challenge.completions} {challenge.completions === 1 ? 'completion' : 'completions'}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400">Created {formatDate(challenge.createdAt)}</p>
                    </div>
                    <button
                      onClick={() => handleShare(challenge)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                    >
                      Share Again
                    </button>
                  </div>

                  {/* Completions Section */}
                  {challenge.completions > 0 && (
                    <div className="mt-3 pt-3 border-t border-zinc-600">
                      <button
                        onClick={() => setSelectedChallenge(
                          selectedChallenge?.challengeId === challenge.challengeId ? null : challenge
                        )}
                        className="text-sm text-blue-400 hover:text-blue-300"
                      >
                        {selectedChallenge?.challengeId === challenge.challengeId ? '▼' : '▶'} View Completions
                      </button>
                      
                      {selectedChallenge?.challengeId === challenge.challengeId && (
                        <div className="mt-2 space-y-2">
                          {challenge.completionDetails.map((completion: any, idx: number) => (
                            <div key={idx} className="bg-zinc-800 rounded p-3 text-sm">
                              <div className="flex justify-between items-center mb-1">
                                <span className="font-semibold text-gray-300">
                                  {completion.completerName || 'Anonymous'}
                                </span>
                                <span className={completion.solved ? 'text-green-400' : 'text-red-400'}>
                                  {completion.solved ? '✓ Solved' : '✗ Failed'}
                                </span>
                              </div>
                              <div className="text-gray-400">
                                {completion.attempts} {completion.attempts === 1 ? 'attempt' : 'attempts'} · {
                                  new Date(completion.completedAt).toLocaleDateString('en-US', { 
                                    month: 'short', 
                                    day: 'numeric', 
                                    hour: 'numeric', 
                                    minute: '2-digit' 
                                  })
                                }
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-zinc-700 bg-zinc-750">
          <button
            onClick={onClose}
            className="w-full bg-zinc-700 hover:bg-zinc-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

