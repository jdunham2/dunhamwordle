import React from 'react';

// Create SVG icons locally to avoid new dependencies, matching the style of other icons in App.tsx
const createIcon = (svg: React.ReactNode) => (props: React.SVGProps<SVGSVGElement>) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
    >
        {svg}
    </svg>
);

const FaSearch = createIcon(
    <>
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </>
);

const FaBullseye = createIcon(
    <>
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
    </>
);


interface BoostsProps {
    onReveal: () => void;
    onEliminate: () => void;
    isRevealDisabled: boolean;
    isEliminateDisabled: boolean;
}

export const Boosts: React.FC<BoostsProps> = ({
    onReveal,
    onEliminate,
    isRevealDisabled,
    isEliminateDisabled,
}) => {
    const handleRevealClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        onReveal();
        // Blur the button after clicking to prevent Enter key from triggering it again
        e.currentTarget.blur();
    };

    const handleEliminateClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        onEliminate();
        // Blur the button after clicking to prevent Enter key from triggering it again
        e.currentTarget.blur();
    };

    return (
        <div className="flex justify-center items-center gap-2 sm:gap-4 my-2 sm:my-4 px-2">
            <button
                onClick={handleRevealClick}
                disabled={isRevealDisabled}
                aria-label="Reveal a correct letter"
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 bg-sky-600 text-white font-bold rounded-lg disabled:bg-gray-500 disabled:cursor-not-allowed hover:bg-sky-700 transition-colors text-sm sm:text-base"
            >
                <FaSearch className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden sm:inline">Reveal Letter</span>
                <span className="sm:hidden">Reveal</span>
            </button>
            <button
                onClick={handleEliminateClick}
                disabled={isEliminateDisabled}
                aria-label="Eliminate 3 incorrect letters"
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg disabled:bg-gray-500 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors text-sm sm:text-base"
            >
                <FaBullseye className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden sm:inline">Eliminate Letters</span>
                <span className="sm:hidden">Eliminate</span>
            </button>
        </div>
    );
};
