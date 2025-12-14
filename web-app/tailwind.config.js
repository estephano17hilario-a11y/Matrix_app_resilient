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
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      },
      colors: {
        glass: {
          10: 'rgba(255, 255, 255, 0.1)',
          20: 'rgba(255, 255, 255, 0.2)',
          5: 'rgba(255, 255, 255, 0.05)',
        }
      }
    },
  },
  plugins: [],
}
