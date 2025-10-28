import React, { useState, useEffect } from 'react';
import { getUserChallenges, User } from '../services/userService';
import { getChallengeCompletions, generateResultUrl } from '../services/challengeService';
import { getWebSocketUrl } from '../services/wsConfig';
import { WordChallenge } from '../services/challengeService';
import { Mail, Trophy, Plus, Clock, CheckCircle, Trash2 } from 'lucide-react';

interface ChallengesViewProps {
  user: User;
  onClose: () => void;
  onStartChallenge: (challenge: WordChallenge) => void;
  onCreateNew: () => void;
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
}

interface SentChallenge {
  challengeId: string;
  toUserId: string;
  toUsername: string;
  toAvatar: string;
  word: string;
  sentAt: number;
  completions?: Array<{
    completerName: string;
    solved: boolean;
    attempts: number;
    completedAt: number;
    result?: string;
  }>;
}

export const ChallengesView: React.FC<ChallengesViewProps> = ({ user, onClose, onStartChallenge, onCreateNew }) => {
  const [activeTab, setActiveTab] = useState<'inbox' | 'sent'>('inbox');
  const [receivedChallenges, setReceivedChallenges] = useState<ReceivedChallenge[]>([]);
  const [sentChallenges, setSentChallenges] = useState<(SentChallenge & { completions: number; completionDetails: any[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedChallenge, setExpandedChallenge] = useState<string | null>(null);

  useEffect(() => {
    loadChallenges();
  }, [user.userId, activeTab]);

  const loadChallenges = async () => {
    setLoading(true);
    
    if (activeTab === 'inbox') {
      const received = await getUserChallenges(user.userId);
      setReceivedChallenges(received);
    } else {
      try {
        const wsUrl = getWebSocketUrl();
        const httpUrl = wsUrl.replace('wss://', 'https://').replace('ws://', 'http://');
        const response = await fetch(`${httpUrl}/api/user/${user.userId}/sent-challenges`);
        if (response.ok) {
          const sent: SentChallenge[] = await response.json();
          
          // Load completion counts and details for each sent challenge
          const withCompletions = await Promise.all(
            sent.map(async (c) => {
              const completionData = await getChallengeCompletions(c.challengeId);
              return {
                ...c,
                completions: completionData.length,
                completionDetails: completionData,
              };
            })
          );
          
          setSentChallenges(withCompletions);
        }
      } catch (error) {
        console.error('[ChallengesView] Failed to load sent challenges:', error);
        setSentChallenges([]);
      }
    }
    
    setLoading(false);
  };

  const handleSentChallengeClick = (challenge: (SentChallenge & { completions: number; completionDetails: any[] })) => {
    if (challenge.completions > 0 && challenge.completionDetails.length > 0) {
      // Get the first completion's replay URL
      const firstCompletion = challenge.completionDetails[0];
      if (firstCompletion.result) {
        const replayUrl = generateResultUrl(firstCompletion.result);
        window.open(replayUrl, '_blank');
      }
    }
  };

  const handleChallengeClick = async (challenge: ReceivedChallenge) => {
    if (!challenge.completed) {
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

  const handleDeleteReceived = async (challengeId: string) => {
    if (!confirm('Are you sure you want to delete this challenge?')) return;
    
    try {
      const wsUrl = getWebSocketUrl();
      const httpUrl = wsUrl.replace('wss://', 'https://').replace('ws://', 'http://');
      const response = await fetch(`${httpUrl}/api/challenge/${challengeId}/received`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.userId }),
      });
      
      if (response.ok) {
        setReceivedChallenges(receivedChallenges.filter(c => c.challengeId !== challengeId));
      }
    } catch (error) {
      console.error('[ChallengesView] Failed to delete received challenge:', error);
      alert('Failed to delete challenge. Please try again.');
    }
  };

  const handleDeleteSent = async (challengeId: string) => {
    if (!confirm('Are you sure you want to delete this challenge?')) return;
    
    try {
      const wsUrl = getWebSocketUrl();
      const httpUrl = wsUrl.replace('wss://', 'https://').replace('ws://', 'http://');
      const response = await fetch(`${httpUrl}/api/challenge/${challengeId}/sent`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.userId }),
      });
      
      if (response.ok) {
        setSentChallenges(sentChallenges.filter(c => c.challengeId !== challengeId));
      }
    } catch (error) {
      console.error('[ChallengesView] Failed to delete sent challenge:', error);
      alert('Failed to delete challenge. Please try again.');
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

  const unreadCount = receivedChallenges.filter(c => !c.read).length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-zinc-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-zinc-700">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Challenges</h2>
            <div className="flex gap-2">
              <button
                onClick={onCreateNew}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <Plus className="h-4 w-4" />
                Create New
              </button>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white text-2xl"
                aria-label="Close"
              >
                ×
              </button>
            </div>
          </div>
          
          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('inbox')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'inbox'
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-700 text-gray-300 hover:bg-zinc-600'
              }`}
            >
              <Mail className="h-5 w-5" />
              Inbox {unreadCount > 0 && <span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded-full">{unreadCount}</span>}
            </button>
            <button
              onClick={() => setActiveTab('sent')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'sent'
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-700 text-gray-300 hover:bg-zinc-600'
              }`}
            >
              <Trophy className="h-5 w-5" />
              Sent
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-400">Loading challenges...</p>
            </div>
          ) : activeTab === 'inbox' ? (
            receivedChallenges.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400 text-lg mb-2">No challenges yet!</p>
                <p className="text-sm text-gray-500">Wait for friends to send you challenges or create your own.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {receivedChallenges.map((challenge) => (
                  <div
                    key={challenge.challengeId}
                    className={`bg-zinc-700 rounded-lg p-4 hover:bg-zinc-600 transition-colors border-l-4 ${
                      !challenge.read ? 'border-blue-500' : 'border-transparent'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-3xl cursor-pointer" onClick={() => handleChallengeClick(challenge)}>{challenge.fromAvatar}</div>
                      <div className="flex-1 cursor-pointer" onClick={() => handleChallengeClick(challenge)}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">{challenge.fromUsername}</span>
                          {!challenge.read && <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">New</span>}
                          {challenge.completed && <CheckCircle className="h-4 w-4 text-green-400" />}
                        </div>
                        {challenge.completed ? (
                          <div className="text-2xl font-bold text-green-400 mb-1">{challenge.word}</div>
                        ) : (
                          <div className="text-2xl font-bold text-gray-500 mb-1">?????</div>
                        )}
                        <div className="flex items-center gap-3 text-sm text-gray-400">
                          <Clock className="h-4 w-4" />
                          {formatDate(challenge.sentAt)}
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteReceived(challenge.challengeId); }}
                        className="text-red-400 hover:text-red-300 transition-colors"
                        aria-label="Delete challenge"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            sentChallenges.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400 text-lg mb-2">You haven't sent any challenges yet</p>
                <button
                  onClick={onCreateNew}
                  className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
                >
                  Create Your First Challenge
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {sentChallenges.map((challenge) => (
                  <div
                    key={challenge.challengeId}
                    onClick={() => handleSentChallengeClick(challenge)}
                    className={`bg-zinc-700 rounded-lg p-4 hover:bg-zinc-600 transition-colors ${
                      challenge.completions > 0 ? 'cursor-pointer' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <div className="text-3xl">{challenge.toAvatar}</div>
                          <div>
                            <div className="font-semibold">Sent to {challenge.toUsername}</div>
                            <div className="text-xl font-bold text-green-400">{challenge.word}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-400">
                          <Clock className="h-4 w-4" />
                          {formatDate(challenge.sentAt)}
                        </div>
                        {challenge.completions > 0 && (
                          <div className="mt-2 text-sm text-blue-400">
                            {challenge.completions} completion{challenge.completions !== 1 ? 's' : ''} - Click to view replay
                          </div>
                        )}
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteSent(challenge.challengeId); }}
                        className="text-red-400 hover:text-red-300 transition-colors"
                        aria-label="Delete challenge"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

