import React, { useState } from 'react';
import { User, LogOut, Edit2, Image as ImageIcon } from 'lucide-react';

interface UserAccountMenuProps {
  user: {
    username: string;
    avatar: string;
    userId: string;
  };
  onUpdateUsername: (newUsername: string) => Promise<void>;
  onUpdateAvatar: (newAvatar: string) => Promise<void>;
  onSignOut: () => void;
  onClose: () => void;
}

export const UserAccountMenu: React.FC<UserAccountMenuProps> = ({
  user,
  onUpdateUsername,
  onUpdateAvatar,
  onSignOut,
  onClose,
}) => {
  const [showUsernameEdit, setShowUsernameEdit] = useState(false);
  const [showAvatarEdit, setShowAvatarEdit] = useState(false);
  const [newUsername, setNewUsername] = useState(user.username);
  const [loading, setLoading] = useState(false);

  const handleUpdateUsername = async () => {
    if (newUsername.trim() === user.username) {
      setShowUsernameEdit(false);
      return;
    }

    setLoading(true);
    try {
      await onUpdateUsername(newUsername.trim());
      setShowUsernameEdit(false);
    } catch (error) {
      alert('Failed to update username. It may already be taken.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAvatar = async (avatar: string) => {
    setLoading(true);
    try {
      await onUpdateAvatar(avatar);
      setShowAvatarEdit(false);
    } catch (error) {
      alert('Failed to update avatar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-zinc-800 p-6 rounded-lg shadow-xl max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-4 mb-6">
          <div className="text-5xl">{user.avatar}</div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white">{user.username}</h2>
            <p className="text-gray-400 text-sm">Manage your account</p>
          </div>
        </div>

        <div className="space-y-2">
          {/* Change Username */}
          <button
            onClick={() => {
              setNewUsername(user.username);
              setShowUsernameEdit(true);
            }}
            disabled={showUsernameEdit}
            className="w-full px-4 py-3 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600 transition-colors flex items-center gap-3 disabled:opacity-50"
          >
            <Edit2 className="h-5 w-5" />
            Change Username
          </button>

          {showUsernameEdit && (
            <div className="bg-zinc-700 p-3 rounded-lg">
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleUpdateUsername()}
                disabled={loading}
                className="w-full px-3 py-2 bg-zinc-800 text-white rounded border border-zinc-600 focus:border-blue-500 focus:outline-none"
                placeholder="Enter new username"
                autoFocus
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleUpdateUsername}
                  disabled={loading || !newUsername.trim()}
                  className="flex-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  onClick={() => setShowUsernameEdit(false)}
                  disabled={loading}
                  className="flex-1 px-3 py-2 bg-zinc-600 text-white rounded hover:bg-zinc-500"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Change Avatar */}
          <button
            onClick={() => setShowAvatarEdit(!showAvatarEdit)}
            className="w-full px-4 py-3 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600 transition-colors flex items-center gap-3"
          >
            <ImageIcon className="h-5 w-5" />
            Change Avatar
          </button>

          {showAvatarEdit && (
            <div className="bg-zinc-700 p-3 rounded-lg">
              <div className="grid grid-cols-8 gap-2 max-h-48 overflow-y-auto">
                {['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '😶‍🌫️', '🥳', '😎', '🤓', '🧐', '🤠', '🥸', '😟', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾', '🦀', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🙈', '🙉', '🙊', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟', '🦗', '🕷️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦦', '🦧', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘', '🦬', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🦙', '🐐', '🦌', '🐕', '🐩', '🐈', '🐓', '🦃', '🦤', '🦚', '🦜', '🦢', '🦩', '🕊️', '🐇', '🦝', '🦨', '🦡', '🦫', '🦭', '🐁', '🐀', '🐿️'].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleUpdateAvatar(emoji)}
                    disabled={loading}
                    className="text-2xl hover:bg-zinc-600 rounded p-1 transition-colors disabled:opacity-50"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sign Out */}
          <button
            onClick={() => {
              onSignOut();
              onClose();
            }}
            className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-3"
          >
            <LogOut className="h-5 w-5" />
            Sign Out
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-zinc-600 text-white rounded-lg hover:bg-zinc-500 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

