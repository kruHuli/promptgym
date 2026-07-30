/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          base: '#06050E',
          surface: '#0D0A1A',
          elevated: '#150F2A',
          border: '#2D1F5E',
        },
        accent: {
          primary: '#A855F7',
          cyan: '#06B6D4',
          score: '#F97316',
          success: '#22C55E',
          warning: '#F59E0B',
          danger: '#EF4444',
          purple: '#A855F7',
        },
        text: {
          primary: '#F1F0F5',
          secondary: '#9D8FC7',
          muted: '#4A3F6B',
        },
      },
      fontFamily: {
        sans: ['Geist Variable', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        mono: ['Geist Mono Variable', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      keyframes: {
        'grade-pop': {
          '0%': { transform: 'scale(0.2) rotate(-12deg)', opacity: '0' },
          '70%': { transform: 'scale(1.15) rotate(3deg)', opacity: '1' },
          '100%': { transform: 'scale(1) rotate(0deg)', opacity: '1' },
        },
      },
      animation: {
        'grade-pop': 'grade-pop 0.55s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
      },
    },
  },
  plugins: [],
}
