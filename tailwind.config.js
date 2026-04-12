/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        neonPink: '#ff00ff',
        neonCyan: '#00ffff',
        neonYellow: '#f3ff00',
        darkBg: '#0a0a0a',
      },
      boxShadow: {
        'neon-pink': '0 0 10px #ff00ff, 0 0 20px #ff00ff',
        'neon-cyan': '0 0 10px #00ffff, 0 0 20px #00ffff',
      },
      animation: {
        'fadeIn': 'fadeIn 0.5s ease-in',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
