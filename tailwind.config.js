/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./App.tsx",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'absent': '#3a3a3c',
        'present': '#b59f3b',
        'correct': '#538d4e',
        'tile-border': '#3a3a3c',
        'key-bg': '#818384',
      },
      animation: {
        'flip': 'flip 0.6s ease-in-out forwards',
        'pop': 'pop 0.1s ease-in-out',
        'shake': 'shake 0.5s ease-in-out'
      },
      keyframes: {
        flip: {
          '0%': { transform: 'rotateX(0deg)' },
          '50%': { transform: 'rotateX(90deg)' },
          '100%': { transform: 'rotateX(0deg)' },
        },
        pop: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.1)' },
        },
        shake: {
          '10%, 90%': { transform: 'translateX(-1px)' },
          '20%, 80%': { transform: 'translateX(2px)' },
          '30%, 50%, 70%': { transform: 'translateX(-4px)' },
          '40%, 60%': { transform: 'translateX(4px)' },
        }
      }
    },
  },
  plugins: [],
}

