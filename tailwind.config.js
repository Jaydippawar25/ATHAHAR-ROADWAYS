/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#F6F7F9',
          100: '#E1E5EE',
          200: '#c2cbe0',
          300: '#94a3cc',
          400: '#5a73b8',
          500: '#3956D4',
          600: '#2D3661',
          700: '#1f274a',
          800: '#121835',
          900: '#061944',
          950: '#061944',
        },
        brand: {
          navy: '#061944',
          navyDark: '#061944',
          navyMid: '#2D3661',
          slate: '#2D3661',
          blue: '#3956D4',
          border: '#E1E5EE',
          bg: '#F6F7F9',
          white: '#FFFFFF',
          red: '#CF1113',
          amber: '#7A4F05',
          gold: '#7A4F05',
          surface: '#F6F7F9',
          card: '#FFFFFF',
          // Backwards compatibility mappings
          orange: '#3956D4',
          orangeDark: '#2D3661',
          orangeLight: '#5a73b8',
        }
      },
      boxShadow: {
        'glow-blue': '0 4px 20px -2px rgba(57, 86, 212, 0.35)',
        'glow-navy': '0 10px 25px -5px rgba(6, 25, 68, 0.35)',
        'glow-sm': '0 2px 10px -1px rgba(57, 86, 212, 0.25)',
        'glow-orange': '0 4px 20px -2px rgba(57, 86, 212, 0.35)',
      }
    },
  },
  plugins: [],
}
