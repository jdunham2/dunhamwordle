import React from 'react';
import { Badge, UserBadges } from '../types';
import { BADGES } from '../services/badgeService';

interface BadgeGalleryProps {
  userBadges: UserBadges;
  onClose: () => void;
}

export const BadgeGallery: React.FC<BadgeGalleryProps> = ({ userBadges, onClose }) => {
  const categories = ['streak', 'speed', 'accuracy', 'special'] as const;
  
  const categoryNames = {
    streak: 'Streak Badges',
    speed: 'Speed Badges',
    accuracy: 'Accuracy Badges',
    special: 'Special Badges'
  };

  const getBadgesByCategory = (category: string) => {
    return Object.values(BADGES).filter(badge => badge.category === category);
  };

  return (
    <div className="absolute inset-0 bg-black bg-opacity-75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-zinc-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-100">Badge Gallery</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
            aria-label="Close badge gallery"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-8">
          {categories.map(category => {
            const badges = getBadgesByCategory(category);
            if (badges.length === 0) return null;

            return (
              <div key={category}>
                <h3 className="text-lg font-semibold text-gray-300 mb-3">{categoryNames[category]}</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {badges.map(badge => {
                    const isEarned = userBadges[badge.id]?.unlockedAt;
                    
                    return (
                      <div
                        key={badge.id}
                        className={`relative p-3 rounded-lg border-2 transition-all ${
                          isEarned
                            ? 'bg-zinc-700 border-green-500 opacity-100'
                            : 'bg-zinc-900 border-zinc-600 opacity-40'
                        }`}
                      >
                        {isEarned && (
                          <div className="absolute top-1 right-1 bg-green-500 rounded-full w-5 h-5 flex items-center justify-center">
                            <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                        <div className={`text-4xl mb-2 flex items-center justify-center ${
                          isEarned ? 'grayscale-0' : 'grayscale'
                        }`}>
                          {badge.icon}
                        </div>
                        <div className="text-xs font-semibold text-center text-gray-200 mb-1">
                          {badge.name}
                        </div>
                        <div className={`text-xs text-center ${
                          isEarned ? 'text-gray-300' : 'text-gray-500'
                        }`}>
                          {badge.description}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
