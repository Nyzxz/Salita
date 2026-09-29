import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Deep night-sea tones, evoking the balangay boats that first
        // carried trade languages into the archipelago after dark.
        night: {
          DEFAULT: '#0E1B22',
          panel: '#152B34',
          raised: '#1C3640',
          border: '#28454F',
        },
        parchment: '#F3EFE4',
        muted: '#9FB3B8',
        // Warm harvest-sun gold, used as the single bold accent.
        gold: {
          DEFAULT: '#E8A93C',
          soft: '#F0C170',
        },
        // Baked clay / brick, a secondary warm accent distinct from gold.
        clay: '#C1502D',
        // Banana-leaf green, reserved for correct/positive quiz feedback.
        leaf: '#4C9A6A',
      },
      fontFamily: {
        display: ['"Fraunces"', 'ui-serif', 'Georgia', 'serif'],
        body: ['"Public Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        prose: '68ch',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        drift: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '50%': { transform: 'translate(3%, -4%) scale(1.05)' },
        },
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.5s ease-out both',
        'fade-in': 'fadeIn 0.35s ease-out both',
        drift: 'drift 14s ease-in-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
