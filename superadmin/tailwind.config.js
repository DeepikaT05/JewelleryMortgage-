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
          50: '#faf5eb',
          100: '#f3e4cb',
          200: '#e3c59a',
          300: '#cda16d',
          400: '#b37e45',
          500: '#9c642b',
          600: '#875522',
          700: '#724619',
          800: '#5d3811',
          900: '#4b2b09',
        },
        slate: {
          50: '#0f0902',
          100: '#1a1208',
          200: '#33281b',
          300: '#524434',
          400: '#6e5e4d',
          500: '#8c7b68',
          600: '#bfae9a',
          700: '#dfd5c6',
          800: '#eaddcd',
          850: '#f5f0e6',
          900: '#fffdfa',
          950: '#fbf9f4',
        }
      }
    },
  },
  plugins: [],
}
