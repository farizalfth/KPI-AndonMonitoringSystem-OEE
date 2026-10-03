import type { Config } from 'tailwindcss';

/**
 * Industrial dashboard palette: neutral slate surfaces, a single blue accent and
 * four restrained status colours (running / idle / down / setup). Colours are
 * also encoded as text/border variants so the UI never relies on colour alone.
 */
export default {
  content: ['./index.html', './src/**/*.{vue,ts}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        status: {
          running: '#16a34a',
          idle: '#64748b',
          down: '#dc2626',
          setup: '#d97706',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(15 23 42 / 0.06), 0 1px 3px 0 rgb(15 23 42 / 0.1)',
      },
    },
  },
  plugins: [],
} satisfies Config;