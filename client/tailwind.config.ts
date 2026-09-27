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
    },
  },
  plugins: [],
} satisfies Config;
