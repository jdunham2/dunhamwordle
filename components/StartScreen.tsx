import React from 'react';
import { Calendar, Play, BarChart3, Users, Globe, Trophy } from 'lucide-react';

interface StartScreenProps {
  onStartUnlimited: () => void;
  onStartWordOfTheDay: () => void;
  onShowStats: () => void;
  onChallenges: () => void;
  onMultiplayer: () => void;
  onSwitchUser?: () => void;
  unreadChallenges?: number;
}

export const StartScreen: React.FC<StartScreenProps> = ({
  onStartUnlimited,
  onStartWordOfTheDay,
  onShowStats,
  onChallenges,
  onMultiplayer,
  onSwitchUser,
  unreadChallenges = 0
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-zinc-800 p-8 rounded-lg shadow-xl max-w-md w-full relative text-center">
        <h1 className="text-4xl font-bold mb-6 text-white tracking-wider">
          WORDLE
        </h1>

        <p className="text-gray-300 mb-8 text-lg">
          Choose your game mode
        </p>

        <div className="space-y-4">
          <button
            onClick={onStartUnlimited}
            className="w-full px-6 py-4 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-3"
          >
            <Play className="h-6 w-6" />
            Play Unlimited
          </button>

          <button
            onClick={onStartWordOfTheDay}
            className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg font-bold text-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-3"
          >
            <Calendar className="h-6 w-6" />
            Word of the Day
          </button>

          <button
            onClick={onChallenges}
            className="relative w-full px-6 py-4 bg-purple-600 text-white rounded-lg font-bold text-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-3"
          >
            <Trophy className="h-6 w-6" />
            Challenges
            {unreadChallenges > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
                {unreadChallenges > 9 ? '9+' : unreadChallenges}
              </span>
            )}
          </button>

          <button
            onClick={onMultiplayer}
            className="w-full px-6 py-4 bg-orange-600 text-white rounded-lg font-bold text-lg hover:bg-orange-700 transition-colors flex items-center justify-center gap-3"
          >
            <Globe className="h-6 w-6" />
            Real-Time Multiplayer
          </button>

          <button
            onClick={onShowStats}
            className="w-full px-6 py-4 bg-gray-600 text-white rounded-lg font-bold text-lg hover:bg-gray-700 transition-colors flex items-center justify-center gap-3"
          >
            <BarChart3 className="h-6 w-6" />
            View Statistics
          </button>
        </div>

        <div className="mt-8 text-sm text-gray-400">
          <p>Family-friendly Wordle with boosts and no ads</p>
        </div>

        {onSwitchUser && (
          <button
            onClick={onSwitchUser}
            className="mt-4 text-gray-400 hover:text-white text-sm underline"
          >
            Switch User
          </button>
        )}
      </div>
    </div>
  );
};
