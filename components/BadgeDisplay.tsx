import React from 'react';
import { Badge } from '../types';

interface BadgeDisplayProps {
  badge: Badge;
  size?: 'sm' | 'md' | 'lg';
  showDescription?: boolean;
}

export const BadgeDisplay: React.FC<BadgeDisplayProps> = ({
  badge,
  size = 'md',
  showDescription = false
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-12 h-12 text-lg',
    lg: 'w-16 h-16 text-2xl'
  };

  const descriptionSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  return (
    <div className="flex flex-col items-center p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
      <div className={`${sizeClasses[size]} flex items-center justify-center bg-yellow-100 dark:bg-yellow-900 rounded-full border-2 border-yellow-300 dark:border-yellow-600`}>
        <span className="text-yellow-600 dark:text-yellow-400">
          {badge.icon}
        </span>
      </div>
      <div className="mt-2 text-center">
        <div className={`font-semibold text-gray-900 dark:text-gray-100 ${descriptionSizeClasses[size]}`}>
          {badge.name}
        </div>
        {showDescription && (
          <div className={`text-gray-600 dark:text-gray-400 ${descriptionSizeClasses[size]}`}>
            {badge.description}
          </div>
        )}
        {badge.unlockedAt && (
          <div className={`text-gray-500 dark:text-gray-500 ${descriptionSizeClasses[size]}`}>
            {badge.unlockedAt.toLocaleDateString()}
          </div>
        )}
      </div>
    </div>
  );
};

interface BadgeGridProps {
  badges: { [badgeId: string]: Badge };
  unlockedOnly?: boolean;
}

export const BadgeGrid: React.FC<BadgeGridProps> = ({ badges, unlockedOnly = true }) => {
  const badgeList = Object.values(badges);
  const displayBadges = unlockedOnly ? badgeList.filter(badge => badge.unlockedAt) : badgeList;

  const categories = {
    streak: displayBadges.filter(b => b.category === 'streak'),
    speed: displayBadges.filter(b => b.category === 'speed'),
    accuracy: displayBadges.filter(b => b.category === 'accuracy'),
    special: displayBadges.filter(b => b.category === 'special')
  };

  return (
    <div className="space-y-6">
      {Object.entries(categories).map(([category, categoryBadges]) => {
        if (categoryBadges.length === 0) return null;

        return (
          <div key={category}>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 capitalize">
              {category} Badges
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {categoryBadges.map(badge => (
                <BadgeDisplay key={badge.id} badge={badge} />
              ))}
            </div>
          </div>
        );
      })}

      {displayBadges.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          {unlockedOnly ? 'No badges unlocked yet!' : 'No badges available.'}
        </div>
      )}
    </div>
  );
};

interface NewBadgeNotificationProps {
  badge: Badge;
  onClose: () => void;
}

export const NewBadgeNotification: React.FC<NewBadgeNotificationProps> = ({ badge, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm mx-4 text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          New Badge Unlocked!
        </h2>
        <div className="text-4xl mb-4">{badge.icon}</div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          {badge.name}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          {badge.description}
        </p>
        <button
          onClick={onClose}
          className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold"
        >
          Awesome!
        </button>
      </div>
    </div>
  );
};
