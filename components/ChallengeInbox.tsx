import React, { useState, useEffect } from 'react';
import { getUserChallenges, markChallengeAsRead, User } from '../services/userService';
import { Inbox, Trophy, Clock, CheckCircle, XCircle } from 'lucide-react';
import { WordChallenge, extractChallengeFromUrl, generateChallengeUrl } from '../services/challengeService';

interface ChallengeInboxProps {
  user: User;
  onClose: () => void;
  onStartChallenge: (challenge: WordChallenge) => void;
}

interface ReceivedChallenge {
  challengeId: string;
  fromUserId: string;
  fromUsername: string;
  fromAvatar: string;
  word: string;
  sentAt: number;
  read: boolean;
  completed: boolean;
  completedAt?: number;
  result?: any;
}

export const ChallengeInbox: React.FC<ChallengeInboxProps> = ({ user, onClose, onStartChallenge }) => {
  const [challenges, setChallenges] = useState<ReceivedChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

  useEffect(() => {
    loadChallenges();
  }, [user.userId]);

  const loadChallenges = async () => {
    setLoading(true);
    const received = await getUserChallenges(user.userId);
    setChallenges(received);
    setLoading(false);
  };

  const handleChallengeClick = async (challenge: ReceivedChallenge) => {
    // Mark as read if not already
    if (!challenge.read) {
      await markChallengeAsRead(challenge.challengeId, user.userId);
      challenge.read = true;
      setChallenges([...challenges]);
    }

    // If not completed, start the challenge
    if (!challenge.completed) {
      // Create WordChallenge object from the data
      const wordChallenge: WordChallenge = {
        word: challenge.word,
        guesses: [],
        gameMode: 'unlimited',
        createdAt: new Date(challenge.sentAt),
        challengeId: challenge.challengeId,
        senderName: challenge.fromUsername,
      };
      
      onClose();
      onStartChallenge(wordChallenge);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const filteredChallenges = challenges.filter(c => {
    if (filter === 'pending') return !c.completed;
    if (filter === 'completed') return c.completed;
    return true;
  });

  const unreadCount = challenges.filter(c => !c.read).length;
  const pendingCount = challenges.filter(c => !c.completed).length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-zinc-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-zinc-700">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <Inbox className="h-6 w-6 text-blue-400" />
              <h2 className="text-2xl font-bold">Challenge Inbox</h2>
              {unreadCount > 0 && (
                <span className="bg-red-600 text-white text-xs px-2 py-1 rounded-full font-semibold">
                  {unreadCount} new
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-700 text-gray-300 hover:bg-zinc-600'
              }`}
            >
              All ({challenges.length})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                filter === 'pending'
                  ? 'bg-orange-600 text-white'
                  : 'bg-zinc-700 text-gray-300 hover:bg-zinc-600'
              }`}
            >
              Pending ({pendingCount})
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                filter === 'completed'
                  ? 'bg-green-600 text-white'
                  : 'bg-zinc-700 text-gray-300 hover:bg-zinc-600'
              }`}
            >
              Completed ({challenges.length - pendingCount})
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
              <p className="text-gray-400 mt-4">Loading challenges...</p>
            </div>
          ) : filteredChallenges.length === 0 ? (
            <div className="text-center py-12">
              <Inbox className="h-20 w-20 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-400 mb-2">
                {filter === 'pending' ? 'No pending challenges' : 
                 filter === 'completed' ? 'No completed challenges' : 
                 'No challenges yet'}
              </h3>
              <p className="text-gray-500">
                {challenges.length === 0 
                  ? 'Wait for friends to send you challenges!' 
                  : 'Try changing the filter above.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredChallenges.map((challenge) => (
                <button
                  key={challenge.challengeId}
                  onClick={() => handleChallengeClick(challenge)}
                  className={`w-full bg-zinc-700 hover:bg-zinc-600 rounded-lg p-4 transition-all text-left ${
                    !challenge.read ? 'ring-2 ring-blue-500' : ''
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="text-4xl flex-shrink-0">
                      {challenge.fromAvatar}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-white">
                          {challenge.fromUsername}
                        </span>
                        {!challenge.read && (
                          <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                            NEW
                          </span>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-400 mb-2">
                        Sent you a challenge
                      </p>

                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        {formatDate(challenge.sentAt)}
                      </div>
                    </div>

                    {/* Status */}
                    <div className="flex-shrink-0">
                      {challenge.completed ? (
                        <div className="flex items-center gap-1 text-green-400 text-sm">
                          <CheckCircle className="h-4 w-4" />
                          Completed
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-orange-400 text-sm">
                          <Trophy className="h-4 w-4" />
                          Play Now
                        </div>
                      )}
                    </div>
                  </div>
                </button>
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

