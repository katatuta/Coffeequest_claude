/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fef3e2',
          100: '#fce7c5',
          200: '#f9cf8c',
          300: '#f5b753',
          400: '#f29f1a',
          500: '#d88716',
          600: '#be7012',
          700: '#9e5c0f',
          800: '#7e490c',
          900: '#5e3609',
        }
      }
    },
  },
  plugins: [],
}
