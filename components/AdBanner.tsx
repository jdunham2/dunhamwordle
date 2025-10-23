
import React, { useState, useEffect } from 'react';

interface AdBannerProps {
  triggerShow: boolean;
}

export const AdBanner: React.FC<AdBannerProps> = ({ triggerShow }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('ads') === 'off') {
      setIsVisible(false);
    } else if (triggerShow) {
      setIsVisible(true);
    }
  }, [triggerShow]);

  if (!isVisible || isMinimized) {
    return null;
  }

  return (
    <div className="relative bg-gradient-to-r from-blue-500 to-orange-500 text-white p-3 my-4 rounded-lg text-center shadow-lg">
      <p className="font-semibold">Enjoying the game? Check out our other amazing puzzles!</p>
      <button
        onClick={() => setIsMinimized(true)}
        className="absolute top-1 right-1 text-white hover:text-gray-200"
        aria-label="Close ad"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};
