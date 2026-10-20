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
          50: '#f0f5fa',
          100: '#e1ecf5',
          200: '#c3d9eb',
          300: '#95bedc',
          400: '#609dc9',
          500: '#3c81b2',
          600: '#2d6796',
          700: '#25537b',
          800: '#1e3e62',
          900: '#133e87',
          950: '#0b2545',
        },
        brand: {
          navy: '#0b2545',
          navyDark: '#07182e',
          navyMid: '#133e87',
          orange: '#f97316',
          orangeDark: '#ea580c',
          orangeLight: '#fb923c',
          gold: '#f59e0b',
          surface: '#f8fafc',
          card: '#ffffff',
        }
      },
      boxShadow: {
        'glow-orange': '0 4px 20px -2px rgba(249, 115, 22, 0.35)',
        'glow-navy': '0 10px 25px -5px rgba(11, 37, 69, 0.35)',
        'glow-sm': '0 2px 10px -1px rgba(249, 115, 22, 0.25)',
      }
    },
  },
  plugins: [],
}
