/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        void: 'var(--bg-void)',
        surface: 'var(--bg-surface)',
        raised: 'var(--bg-raised)',
        overlay: 'var(--bg-overlay)',
        'border-subtle': 'var(--border-subtle)',
        'border-active': 'var(--border-active)',
        gold: {
          primary: 'var(--gold-primary)',
          dim: 'var(--gold-dim)',
        },
        crimson: {
          DEFAULT: 'var(--crimson)',
          glow: 'var(--crimson-glow)',
        },
        violet: {
          gate: 'var(--violet-gate)',
        },
        green: {
          clear: 'var(--green-clear)',
          dim: 'var(--green-dim)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
          system: 'var(--text-system)',
          danger: 'var(--text-danger)',
        },
        rank: {
          e: 'var(--rank-e)',
          d: 'var(--rank-d)',
          c: 'var(--rank-c)',
          b: 'var(--rank-b)',
          a: 'var(--rank-a)',
          s: 'var(--rank-s)',
        },
      },
      spacing: {
        '1': 'var(--space-1)',
        '2': 'var(--space-2)',
        '3': 'var(--space-3)',
        '4': 'var(--space-4)',
        '6': 'var(--space-6)',
        '8': 'var(--space-8)',
        '12': 'var(--space-12)',
        '16': 'var(--space-16)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        pill: 'var(--radius-pill)',
      },
      fontFamily: {
        system: ['"Share Tech Mono"', 'monospace'],
        display: ['"Rajdhani"', 'sans-serif'],
        data: ['"JetBrains Mono"', 'monospace'],
      },
      fontSize: {
        xs: '11px',
        sm: '13px',
        base: '15px',
        md: '17px',
        lg: '22px',
        xl: '32px',
        '2xl': '48px',
      },
      transitionDuration: {
        instant: 'var(--motion-instant)',
        fast: 'var(--motion-fast)',
        base: 'var(--motion-base)',
        slow: 'var(--motion-slow)',
        ceremony: 'var(--motion-ceremony)',
      },
      boxShadow: {
        'gold-glow': '0 0 12px rgba(201, 168, 76, 0.5)',
      },
    },
  },
  plugins: [],
}