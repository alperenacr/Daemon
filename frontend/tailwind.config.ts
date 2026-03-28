import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './providers.tsx',
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['var(--font-mono)', 'Courier New', 'monospace'],
      },
      colors: {
        'neon-cyan':   '#00f5ff',
        'neon-green':  '#00ff41',
        'neon-purple': '#a855f7',
        'dark-bg':     '#050508',
        'dark-panel':  '#0d0d1a',
        'dark-border': '#1a1a2e',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'blink': 'blink 1s step-end infinite',
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0' },
        },
      },
    },
  },
  plugins: [],
}

export default config
