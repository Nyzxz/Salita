import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Deep night-sea tones, evoking the balangay boats that first
        // carried trade languages into the archipelago after dark.
        night: {
          DEFAULT: '#0A1419',
          deep: '#070E12',
          panel: '#112129',
          raised: '#172B34',
          border: '#22393F',
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
      boxShadow: {
        card: '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 8px 24px -12px rgba(0,0,0,0.55)',
        lift: '0 1px 0 0 rgba(255,255,255,0.06) inset, 0 18px 40px -16px rgba(0,0,0,0.7)',
        glow: '0 8px 28px -8px rgba(232,169,60,0.45)',
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
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.97)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        drift: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '50%': { transform: 'translate(3%, -4%) scale(1.05)' },
        },
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.5s ease-out both',
        'fade-in': 'fadeIn 0.35s ease-out both',
        'scale-in': 'scaleIn 0.3s cubic-bezier(0.2,0.8,0.2,1) both',
        drift: 'drift 14s ease-in-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
