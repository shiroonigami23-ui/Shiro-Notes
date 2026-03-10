/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{ts,tsx,js,jsx}',
    './*.js'
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f2f6ff',
          100: '#e2eaff',
          200: '#c6d7ff',
          300: '#9eb9ff',
          400: '#6f92ff',
          500: '#3f6bff',
          600: '#2950e5',
          700: '#213fbd',
          800: '#1f3797',
          900: '#1f3277'
        }
      },
      boxShadow: {
        glass: '0 10px 40px rgba(14, 22, 46, 0.18)'
      }
    }
  },
  plugins: []
};