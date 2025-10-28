import React, { useState, useEffect, useRef } from 'react';
import { createWordChallenge } from '../services/challengeService';
import { GameMode } from '../types';
import { User, getAllUsers, sendChallengeToUser } from '../services/userService';
import { Search, Send, X } from 'lucide-react';

interface SendChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  validWords?: Set<string>;
}

export const SendChallengeModal: React.FC<SendChallengeModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  validWords
}) => {
  const [customWord, setCustomWord] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [sending, setSending] = useState(false);
  const [hasSent, setHasSent] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadUsers();
      inputRef.current?.focus();
    }
    if (!isOpen) {
      // Reset on close
      setCustomWord('');
      setSearchTerm('');
      setSelectedUser(null);
      setHasSent(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredUsers(users.filter(u => u.userId !== currentUser.userId));
    } else {
      const filtered = users.filter(u =>
        u.userId !== currentUser.userId &&
        u.username.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [searchTerm, users, currentUser.userId]);

  const loadUsers = async () => {
    const allUsers = await getAllUsers();
    setUsers(allUsers);
    setFilteredUsers(allUsers.filter(u => u.userId !== currentUser.userId));
  };

  const handleSendChallenge = async () => {
    if (customWord.length !== 5) {
      alert('Please enter a 5-letter word');
      return;
    }

    if (!selectedUser) {
      alert('Please select a user to send the challenge to');
      return;
    }

    const wordToCheck = customWord.toUpperCase();

    // Validate word if validWords is available
    if (validWords && !validWords.has(wordToCheck)) {
      alert(`"${wordToCheck}" is not a valid word. Please enter a real 5-letter word.`);
      return;
    }

    if (!validWords) {
      console.warn('Word validation not available');
      alert('Word validation not available. Please make sure the word is valid before sending.');
      return;
    }

    setSending(true);

    try {
      const challenge = createWordChallenge(
        wordToCheck,
        GameMode.Unlimited,
        currentUser.username
      );
      
      // Send challenge to user
      const success = await sendChallengeToUser(
        currentUser.userId,
        selectedUser.username,
        wordToCheck,
        challenge.challengeId
      );

      if (success) {
        setHasSent(true);
      } else {
        alert('Failed to send challenge. Please try again.');
      }
    } catch (error) {
      console.error('Error sending challenge:', error);
      alert('Failed to send challenge. Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onKeyDown={(e) => e.stopPropagation()}
      onKeyUp={(e) => e.stopPropagation()}
    >
      <div className="bg-zinc-800 rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col">
        {!hasSent ? (
          <>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-white">
                Send Challenge
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4 flex-1 overflow-y-auto">
              {/* Word Input */}
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
                  className="w-full px-3 py-3 border border-zinc-600 rounded-md bg-zinc-700 text-white text-center text-xl font-mono tracking-widest"
                  placeholder="WORD"
                />
              </div>

              {/* User Search */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Send to:
                </label>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.stopPropagation()}
                    onKeyUp={(e) => e.stopPropagation()}
                    placeholder="Search username..."
                    className="w-full pl-10 pr-4 py-2 border border-zinc-600 rounded-md bg-zinc-700 text-white"
                  />
                </div>

                {/* User List */}
                <div className="max-h-48 overflow-y-auto bg-zinc-700 rounded-lg p-2 space-y-2">
                  {filteredUsers.length === 0 ? (
                    <p className="text-center text-gray-400 py-4">No users found</p>
                  ) : (
                    filteredUsers.map((user) => (
                      <button
                        key={user.userId}
                        onClick={() => setSelectedUser(user)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                          selectedUser?.userId === user.userId
                            ? 'bg-blue-600 text-white'
                            : 'bg-zinc-800 text-gray-200 hover:bg-zinc-600'
                        }`}
                      >
                        <div className="text-3xl">{user.avatar}</div>
                        <div className="flex-1 text-left">
                          <div className="font-semibold">{user.username}</div>
                        </div>
                        {selectedUser?.userId === user.userId && (
                          <div className="text-white text-xl">✓</div>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div className="text-sm text-gray-400 bg-zinc-700 p-3 rounded">
                <p className="font-medium mb-1">How it works:</p>
                <ul className="text-xs space-y-1 text-gray-300">
                  <li>• Enter your word and select a user</li>
                  <li>• The challenge will be sent instantly</li>
                  <li>• They'll be notified when they sign in</li>
                  <li>• See their completion in "Sent Challenges"</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={handleSendChallenge}
                disabled={customWord.length !== 5 || !selectedUser || sending}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {sending ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5" />
                    Send Challenge
                  </>
                )}
              </button>
              <button
                onClick={onClose}
                className="px-6 bg-zinc-700 hover:bg-zinc-600 text-white font-bold py-3 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold text-white mb-2">Challenge Sent!</h2>
              <p className="text-gray-300">
                {selectedUser?.username} will be notified
              </p>
            </div>

            <button
              onClick={onClose}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              Done
            </button>
          </>
        )}
      </div>
    </div>
  );
};

