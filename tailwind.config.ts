import type { Config } from 'tailwindcss'

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#0e0913',
          900: '#151020',
          850: '#1b1429',
          800: '#241a35',
          700: '#332347',
          600: '#48325f',
        },
        accent: {
          DEFAULT: '#ff8a4c',
          light: '#ffb07d',
          dark: '#e0682c',
        },
        iris: {
          DEFAULT: '#a78bfa',
          light: '#c4b5fd',
          dark: '#7c5cf0',
        },
        sky: {
          450: '#a78bfa',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(255,138,76,.18), 0 28px 90px -26px rgba(255,138,76,.28)',
        card: '0 24px 60px -30px rgba(0,0,0,.72)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '0.55' },
          '50%': { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
      },
      animation: {
        'fade-up': 'fade-up .6s ease-out both',
        'pulse-soft': 'pulse-soft 2.4s ease-in-out infinite',
        shimmer: 'shimmer 2s linear infinite',
      },
    },
  },
  plugins: [],
} satisfies Config
