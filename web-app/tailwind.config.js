/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter', 
          '-apple-system', 
          'BlinkMacSystemFont', 
          'Segoe UI', 
          'Roboto', 
          'Helvetica', 
          'Arial', 
          'sans-serif'
        ],
      },
      backdropBlur: {
        xs: '0px',
        sm: '0px',
        DEFAULT: '0px',
        md: '0px',
        lg: '0px',
        xl: '0px',
        '2xl': '0px', 
        '3xl': '0px', 
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      },
      boxShadow: {
        'glass-inset': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.15)',
        'glass-sm': '0 20px 50px -12px rgba(79, 70, 229, 0.15)',
        'neon-emerald': '0 0 20px -5px rgba(16, 185, 129, 0.5)',
        'neon-rose': '0 0 20px -5px rgba(244, 63, 94, 0.5)',
      },
      colors: {
        theme: {
          bg: 'rgb(var(--color-bg-depth) / <alpha-value>)',
          primary: 'rgb(var(--color-primary-glow) / <alpha-value>)',
          secondary: 'rgb(var(--color-secondary-glow) / <alpha-value>)',
          text: 'rgb(var(--color-text-primary) / <alpha-value>)',
          avatar: 'rgb(var(--color-avatar-accent) / <alpha-value>)',
        },
        glass: {
          10: 'rgba(255, 255, 255, 0.1)',
          20: 'rgba(255, 255, 255, 0.2)',
          5: 'rgba(255, 255, 255, 0.05)',
        },
        aurora: {
          bg: '#020204',
          indigo: '#4f46e5',
          cyan: '#06b6d4',
          pink: '#ec4899',
          violet: '#8b5cf6',
        }
      },
      animation: {
        'pulse-slow': 'pulse 6s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 10s ease-in-out infinite',
        'shimmer-slow': 'shimmer 5s linear infinite',
        'gradient-x': 'gradient-x 3s ease infinite',
        'spin-slow': 'spin 8s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' }
        },
        'gradient-x': {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': 'left center'
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center'
          },
        },
      }
    },
  },
  plugins: [
    function({ addVariant }) {
      addVariant('desktop-hover', '@media (hover: hover) { &:hover }');
    }
  ],
}
