import type {Config} from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        brand: {
          gold: '#C8952E',
          'gold-soft': '#F5E9CC',
          'gold-deep': '#A37619',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          warm: '#F7F5EF',
          soft: '#EFEBE0',
        },
        ink: {
          DEFAULT: '#141414',
          muted: '#4A4A4A',
          subtle: '#8A8A8A',
        },
        line: {
          DEFAULT: '#E6E1D3',
          strong: '#D9D2BF',
        },
        status: {
          success: '#2F8F3F',
          'success-soft': '#E4F1E2',
          danger: '#C0392B',
          'danger-soft': '#FBE7E3',
          info: '#2563EB',
          'info-soft': '#E5EDFB',
          warn: '#A37619',
          'warn-soft': '#FCF3DC',
        },
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },
        primary: {
          DEFAULT: '#C8952E',
          foreground: '#FFFFFF',
        },
        secondary: {
          DEFAULT: '#EFEBE0',
          foreground: '#141414',
        },
        muted: {
          DEFAULT: '#EFEBE0',
          foreground: '#4A4A4A',
        },
        accent: {
          DEFAULT: '#F5E9CC',
          foreground: '#A37619',
        },
        destructive: {
          DEFAULT: '#C0392B',
          foreground: '#FFFFFF',
        },
        border: 'var(--border)',
        input: 'var(--input)',
        ring: '#C8952E',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        sm: '10px',
        md: '14px',
        lg: '20px',
      },
      boxShadow: {
        'sm-card': '0 1px 2px rgba(20,20,20,.04)',
        'card': '0 1px 3px rgba(20,20,20,.04), 0 8px 24px -12px rgba(20,20,20,.08)',
        'pop': '0 4px 12px rgba(20,20,20,.06), 0 24px 48px -20px rgba(20,20,20,.12)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;
