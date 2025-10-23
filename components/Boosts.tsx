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
    return (
        <div className="flex justify-center items-center gap-4 my-4">
            <button
                onClick={onReveal}
                disabled={isRevealDisabled}
                aria-label="Reveal a correct letter"
                className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white font-bold rounded-lg disabled:bg-gray-500 disabled:cursor-not-allowed hover:bg-sky-700 transition-colors"
            >
                <FaSearch className="h-5 w-5" />
                <span>Reveal Letter</span>
            </button>
            <button
                onClick={onEliminate}
                disabled={isEliminateDisabled}
                aria-label="Eliminate 3 incorrect letters"
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg disabled:bg-gray-500 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors"
            >
                <FaBullseye className="h-5 w-5" />
                <span>Eliminate Letters</span>
            </button>
        </div>
    );
};