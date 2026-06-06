import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ccd: {
          bg:       '#0a0d14',
          surface:  '#111520',
          card:     '#161b2e',
          border:   '#1e2740',
          muted:    '#2a3352',
          accent:   '#3b82f6',
          'accent-light': '#60a5fa',
          cyan:     '#06b6d4',
          success:  '#22c55e',
          warning:  '#f59e0b',
          danger:   '#ef4444',
          info:     '#8b5cf6',
          text:     '#e2e8f0',
          'text-muted': '#64748b',
          'text-dim':   '#94a3b8',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'spin-slow':    'spin 3s linear infinite',
        'pulse-slow':   'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in':      'fadeIn 0.3s ease-in-out',
        'slide-down':   'slideDown 0.3s ease-out',
        'slide-up':     'slideUp 0.2s ease-in',
        'glow':         'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn:    { from: { opacity: '0' }, to: { opacity: '1' } },
        slideDown: { from: { transform: 'translateY(-8px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
        slideUp:   { from: { transform: 'translateY(8px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
        glow:      { from: { boxShadow: '0 0 5px rgba(59,130,246,0.3)' }, to: { boxShadow: '0 0 20px rgba(59,130,246,0.6)' } },
      },
    },
  },
  plugins: [],
} satisfies Config
