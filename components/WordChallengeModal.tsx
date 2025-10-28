import React, { useState, useEffect, useRef } from 'react';
import { createWordChallenge, generateChallengeUrl, WordChallenge, storeChallengeOnBackend, saveMyChallenge } from '../services/challengeService';
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
  const [senderName, setSenderName] = useState('');
  const [sentToName, setSentToName] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [hasShared, setHasShared] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the input when modal opens and reset state when closed
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
    if (!isOpen) {
      // Reset form when modal closes
      setCustomWord('');
      setSenderName('');
      setSentToName('');
      setHasShared(false);
      setShareUrl(null);
      setCopyStatus('idle');
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
      const challenge = createWordChallenge(customWord.toUpperCase(), GameMode.Unlimited, senderName.trim() || undefined);
      
      // Store challenge on backend
      await storeChallengeOnBackend(challenge);
      
      // Save to localStorage with "sent to" tracking
      saveMyChallenge(
        challenge.challengeId,
        challenge.word,
        senderName.trim() || 'Me',
        sentToName.trim() || 'Friend',
        challenge.createdAt.getTime()
      );
      
      const url = generateChallengeUrl(challenge);
      setShareUrl(url);

      // Try native share first
      const shared = await shareNative(
        url,
        'Dunham Wordle — Play with Friends',
        `I made you a Play with Friends challenge in Dunham Wordle! Tap to play and then send me your results.`
      );

      if (!shared) {
        // Fallback to clipboard
        try {
          await navigator.clipboard.writeText(url);
          setCopyStatus('copied');
        } catch {
          const textArea = document.createElement('textarea');
          textArea.value = url;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          setCopyStatus('copied');
        }
      }

      // Show success state so it's clear they're done
      setHasShared(true);
    } catch (error) {
      // Final fallback for older browsers
      const challenge = createWordChallenge(customWord.toUpperCase(), GameMode.Unlimited, senderName.trim() || undefined);
      const url = generateChallengeUrl(challenge);
      setShareUrl(url);

      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopyStatus('copied');
      setHasShared(true);
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
        {!hasShared ? (
          <>
            <h2 className="text-2xl font-bold text-gray-100 mb-1 text-center">
              Send Challenge
            </h2>
            <p className="text-center text-gray-400 mb-4">Create a custom word and share it!</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Your name (optional):
                </label>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  onKeyDown={(e) => e.stopPropagation()}
                  onKeyUp={(e) => e.stopPropagation()}
                  maxLength={20}
                  className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 text-center"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Send to (optional):
                </label>
                <input
                  type="text"
                  value={sentToName}
                  onChange={(e) => setSentToName(e.target.value)}
                  onKeyDown={(e) => e.stopPropagation()}
                  onKeyUp={(e) => e.stopPropagation()}
                  maxLength={20}
                  className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 text-center"
                  placeholder="Friend's name"
                />
              </div>
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

              <div className="text-sm text-gray-300 bg-gray-700 p-3 rounded">
                <p className="font-medium mb-1">How it works:</p>
                <ul className="text-xs space-y-1 text-gray-300">
                  <li>• Enter your word and tap "Send Challenge"</li>
                  <li>• Share it with your friend through Messages, etc.</li>
                  <li>• See their completion in "Sent Challenges"</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleShareChallenge}
                disabled={customWord.length !== 5 || isValidating}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded"
              >
                {isValidating ? 'Creating…' : 'Send Challenge'}
              </button>
            </div>

            <button
              onClick={onClose}
              className="w-full mt-3 bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">✅</div>
              <h2 className="text-2xl font-bold text-gray-100">Challenge Shared</h2>
              <p className="text-sm text-gray-300 mt-2">You can close this window now. If the share dialog didn’t open, copy your link below.</p>
            </div>

            {shareUrl && (
              <div className="bg-gray-700 p-3 rounded mb-4">
                <label className="block text-xs text-gray-300 mb-2">Your challenge link</label>
                <div className="flex gap-2 items-center">
                  <input
                    readOnly
                    value={shareUrl}
                    className="flex-1 px-3 py-2 border border-gray-600 rounded-md bg-gray-800 text-gray-100 text-xs"
                  />
                  <button
                    onClick={async () => {
                      if (!shareUrl) return;
                      try {
                        await navigator.clipboard.writeText(shareUrl);
                        setCopyStatus('copied');
                      } catch {
                        const textArea = document.createElement('textarea');
                        textArea.value = shareUrl;
                        document.body.appendChild(textArea);
                        textArea.select();
                        document.execCommand('copy');
                        document.body.removeChild(textArea);
                        setCopyStatus('copied');
                      }
                    }}
                    className="bg-gray-600 hover:bg-gray-500 text-white text-sm font-semibold py-2 px-3 rounded whitespace-nowrap"
                  >
                    {copyStatus === 'copied' ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={onClose}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Done
            </button>
          </>
        )}
      </div>
    </div>
  );
};
