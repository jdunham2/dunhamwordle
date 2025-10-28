import React, { useState, useEffect } from 'react';
import { User, AVATARS, getAllUsers, createUser, loginUser, checkUsernameAvailable, deleteUser } from '../services/userService';
import { UserPlus, LogIn, Search, Trash2, Shield } from 'lucide-react';

interface UserAuthScreenProps {
  onAuthenticated: (user: User) => void;
}

export const UserAuthScreen: React.FC<UserAuthScreenProps> = ({ onAuthenticated }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreateNew, setShowCreateNew] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  const [creating, setCreating] = useState(false);
  const [adminMode, setAdminMode] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    // Check for admin mode
    if (searchTerm.toLowerCase() === 'admin') {
      setAdminMode(true);
      setFilteredUsers(users);
      setShowCreateNew(false);
      return;
    }
    
    setAdminMode(false);
    setSelectedUsers(new Set());
    
    if (searchTerm.trim() === '') {
      setFilteredUsers(users);
      setShowCreateNew(false);
    } else {
      const filtered = users.filter(user =>
        user.username.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
      
      // Show "create new" if search doesn't match any existing username exactly
      const exactMatch = users.some(
        u => u.username.toLowerCase() === searchTerm.toLowerCase()
      );
      setShowCreateNew(!exactMatch && searchTerm.length >= 2);
    }
  }, [searchTerm, users]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const allUsers = await getAllUsers();
      setUsers(allUsers);
      setFilteredUsers(allUsers);
      console.log(`[UserAuth] Loaded ${allUsers.length} users`);
    } catch (error) {
      console.error('[UserAuth] Failed to load users:', error);
      // If backend fails, still allow the UI to work with empty state
      setUsers([]);
      setFilteredUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUserClick = async (user: User) => {
    const loggedInUser = await loginUser(user.userId);
    if (loggedInUser) {
      onAuthenticated(loggedInUser);
    }
  };

  const handleCreateNew = async () => {
    if (searchTerm.length < 2) {
      alert('Username must be at least 2 characters');
      return;
    }

    setCreating(true);
    
    try {
      // Check if username is available
      const available = await checkUsernameAvailable(searchTerm);
      
      // If backend is unavailable, allow creation anyway
      if (available === null) {
        console.warn('[UserAuth] Backend unavailable, allowing user creation');
      } else if (!available) {
        alert('Username is already taken. Please try another.');
        setCreating(false);
        return;
      }

      // Create new user
      const newUser = await createUser(searchTerm.trim(), selectedAvatar);
      if (newUser) {
        onAuthenticated(newUser);
      } else {
        alert('Failed to create account. Backend may be unavailable. Please refresh and try again.');
        setCreating(false);
      }
    } catch (error) {
      console.error('[UserAuth] Error creating user:', error);
      alert('Failed to create account. Backend may be unavailable. Please refresh and try again.');
      setCreating(false);
    }
  };
  
  const handleToggleSelectUser = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };
  
  const handleDeleteUsers = async () => {
    if (selectedUsers.size === 0) return;
    
    const count = selectedUsers.size;
    const confirmed = confirm(
      `⚠️ Are you sure you want to delete ${count} user${count > 1 ? 's' : ''}?\n\n` +
      `This will permanently delete:\n` +
      `• User accounts\n` +
      `• All their challenges\n` +
      `• All their statistics\n\n` +
      `This action cannot be undone!`
    );
    
    if (!confirmed) return;
    
    setDeleting(true);
    
    try {
      // Delete each selected user
      const deletePromises = Array.from(selectedUsers).map((userId: string) => deleteUser(userId));
      await Promise.all(deletePromises);
      
      // Reload users
      await loadUsers();
      setSelectedUsers(new Set());
      alert(`✅ Successfully deleted ${count} user${count > 1 ? 's' : ''}!`);
    } catch (error) {
      console.error('Error deleting users:', error);
      alert('❌ Failed to delete some users. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 flex items-center justify-center p-4 z-50">
      <div className="bg-zinc-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className={`p-6 text-center ${adminMode ? 'bg-gradient-to-r from-red-600 to-orange-600' : 'bg-gradient-to-r from-blue-600 to-purple-600'}`}>
          {adminMode ? (
            <>
              <div className="flex items-center justify-center gap-2 mb-2">
                <Shield className="h-8 w-8" />
                <h1 className="text-4xl font-bold">Admin Mode</h1>
              </div>
              <p className="text-red-100">Select users to delete • {selectedUsers.size} selected</p>
            </>
          ) : (
            <>
              <h1 className="text-4xl font-bold mb-2">Welcome to Dunham Wordle</h1>
              <p className="text-blue-100">Sign in or create an account to start playing</p>
            </>
          )}
        </div>

        {/* Search Bar */}
        <div className="p-6 border-b border-zinc-700">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search username or create new..."
              className="w-full pl-12 pr-4 py-4 bg-zinc-700 border border-zinc-600 rounded-xl text-white text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>
          
          {searchTerm && (
            <p className="text-sm text-gray-400 mt-2">
              {filteredUsers.length > 0 
                ? `Found ${filteredUsers.length} ${filteredUsers.length === 1 ? 'user' : 'users'}`
                : showCreateNew 
                  ? 'No users found. Create a new account below.' 
                  : 'Type to search...'}
            </p>
          )}
        </div>

        {/* User Grid / Create New */}
        <div className="p-6 overflow-y-auto max-h-[500px]">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
              <p className="text-gray-400 mt-4">Loading users...</p>
            </div>
          ) : showCreateNew ? (
            /* Create New User Card */
            <div className="max-w-md mx-auto">
              <div className="bg-zinc-700 rounded-xl p-8 text-center border-2 border-dashed border-blue-500">
                <UserPlus className="h-16 w-16 text-blue-400 mx-auto mb-4" />
                <h3 className="text-2xl font-bold mb-2">Create New Account</h3>
                <p className="text-gray-400 mb-6">
                  Username: <span className="font-semibold text-white">{searchTerm}</span>
                </p>
                
                {/* Avatar Selector */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Choose Your Avatar
                  </label>
                  <div className="grid grid-cols-8 gap-2 max-h-48 overflow-y-auto p-2 bg-zinc-800 rounded-lg">
                    {AVATARS.map((avatar) => (
                      <button
                        key={avatar}
                        onClick={() => setSelectedAvatar(avatar)}
                        className={`text-3xl p-2 rounded-lg transition-all hover:scale-110 ${
                          selectedAvatar === avatar
                            ? 'bg-blue-600 ring-2 ring-blue-400'
                            : 'bg-zinc-700 hover:bg-zinc-600'
                        }`}
                      >
                        {avatar}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleCreateNew}
                  disabled={creating}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500 text-white font-bold py-4 px-6 rounded-xl transition-colors text-lg flex items-center justify-center gap-2"
                >
                  {creating ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-5 w-5" />
                      Create Account
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : filteredUsers.length === 0 ? (
            /* Empty State */
            <div className="text-center py-12">
              <UserPlus className="h-20 w-20 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-400 mb-2">No users yet</h3>
              <p className="text-gray-500">Type a username above to create the first account!</p>
            </div>
          ) : (
            /* User Grid */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredUsers.map((user) => {
                const isSelected = selectedUsers.has(user.userId);
                return (
                  <button
                    key={user.userId}
                    onClick={() => adminMode ? handleToggleSelectUser(user.userId) : handleUserClick(user)}
                    className={`rounded-xl p-6 transition-all hover:scale-105 hover:shadow-lg group relative ${
                      adminMode
                        ? isSelected
                          ? 'bg-red-700 ring-4 ring-red-500'
                          : 'bg-zinc-700 hover:bg-red-800'
                        : 'bg-zinc-700 hover:bg-zinc-600'
                    }`}
                  >
                    {adminMode && isSelected && (
                      <div className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1">
                        <Trash2 className="h-4 w-4 text-white" />
                      </div>
                    )}
                    <div className="text-6xl mb-3 group-hover:scale-110 transition-transform">
                      {user.avatar}
                    </div>
                    <div className="text-sm font-semibold text-gray-200 truncate">
                      {user.username}
                    </div>
                    <div className="flex items-center justify-center gap-1 mt-2 text-xs text-gray-400">
                      {adminMode ? (
                        <>
                          <Trash2 className="h-3 w-3" />
                          {isSelected ? 'Selected' : 'Select'}
                        </>
                      ) : (
                        <>
                          <LogIn className="h-3 w-3" />
                          Sign in
                        </>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {!showCreateNew && filteredUsers.length > 0 && (
          <div className="p-6 border-t border-zinc-700 bg-zinc-750">
            {adminMode ? (
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => setSearchTerm('')}
                  className="px-6 py-3 bg-zinc-700 hover:bg-zinc-600 text-white rounded-xl transition-colors"
                >
                  Exit Admin Mode
                </button>
                <button
                  onClick={handleDeleteUsers}
                  disabled={selectedUsers.size === 0 || deleting}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors flex items-center gap-2"
                >
                  {deleting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-5 w-5" />
                      Delete {selectedUsers.size > 0 && `(${selectedUsers.size})`} User{selectedUsers.size !== 1 && 's'}
                    </>
                  )}
                </button>
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center">
                Don't see your account? Type your username above to create a new one.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

