/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        base: {
          darkest: '#0f1419',
          darker: '#1a1f2e',
          dark: '#2d3748',
          DEFAULT: '#4a5568',
          light: '#718096',
          lighter: '#a0aec0',
          lightest: '#e2e8f0'
        },
        primary: {
          50: '#e3f2fd',
          100: '#bbdefb',
          500: '#4299e1',
          600: '#3182ce',
          700: '#2c5282'
        },
        success: '#48bb78',
        warning: '#f6ad55',
        error: '#f56565',
        openai: '#10a37f',
        anthropic: '#d97757',
        google: '#4285f4',
        openrouter: '#8b5cf6'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace']
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '100': '25rem',
        '120': '30rem'
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px'
      },
      boxShadow: {
        'soft': '0 2px 8px rgba(0, 0, 0, 0.15)',
        'elevated': '0 4px 16px rgba(0, 0, 0, 0.25)',
        'floating': '0 8px 24px rgba(0, 0, 0, 0.4)'
      },
      animation: {
        'fadeIn': 'fadeIn 200ms ease-in',
        'slideUp': 'slideUp 300ms ease-out',
        'slideDown': 'slideDown 300ms ease-out'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        }
      }
    }
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms')
  ]
}
