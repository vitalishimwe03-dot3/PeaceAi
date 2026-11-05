import plugin from 'tailwindcss/plugin'
import type { Config } from 'tailwindcss'
import type { PluginAPI } from 'tailwindcss/types/config'

/**
 * The app historically used `dark:` for OS preference while being dark-only.
 * We drive theming from `data-theme` on `<html>`, so `dark:` must follow that
 * attribute instead of `.dark` or the raw media query.
 */
const themeVariant = plugin(({ addVariant }: PluginAPI) => {
  addVariant('dark', [
    '[data-theme="dark"] &',
    ':where([data-theme="dark"]) &',
    '@media (prefers-color-scheme: dark) { :where([data-theme="system"]) & }',
  ])
})

export default {
  // Theme is driven by the `themeVariant` plugin below (data-theme on <html>),
  // so Tailwind's built-in `darkMode` strategy is intentionally not set.
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        /*
         * Semantic tokens backed by CSS variables (see src/index.css). Every
         * `*-surface|content|field|line|tint` utility follows the active theme,
         * so components stay theme-agnostic. Raw palettes (ink, accent, iris,
         * slate, …) are reserved for accents that must not invert.
         */
        surface: {
          page: 'rgb(var(--surface-page) / <alpha-value>)',
          elevated: 'rgb(var(--surface-elevated) / <alpha-value>)',
          sunken: 'rgb(var(--surface-sunken) / <alpha-value>)',
          floating: 'rgb(var(--surface-floating) / <alpha-value>)',
        },
        content: {
          DEFAULT: 'rgb(var(--content) / <alpha-value>)',
          muted: 'rgb(var(--content-muted) / <alpha-value>)',
          subtle: 'rgb(var(--content-subtle) / <alpha-value>)',
          faint: 'rgb(var(--content-faint) / <alpha-value>)',
          strong: 'rgb(var(--content-strong) / <alpha-value>)',
        },
        field: {
          DEFAULT: 'rgb(var(--field) / <alpha-value>)',
          hover: 'rgb(var(--field-hover) / <alpha-value>)',
          active: 'rgb(var(--field-active) / <alpha-value>)',
        },
        line: {
          DEFAULT: 'rgb(var(--line) / <alpha-value>)',
          strong: 'rgb(var(--line-strong) / <alpha-value>)',
          subtle: 'rgb(var(--line-subtle) / <alpha-value>)',
        },
        tint: 'rgb(var(--tint) / <alpha-value>)',
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
  plugins: [themeVariant],
} satisfies Config
