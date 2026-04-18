/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Pacifico', 'cursive'],
      },
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
        'buzzer-pulse': 'buzzerPulse 0.8s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        buzzerPulse: {
          '0%, 100%': { boxShadow: '0 0 30px rgba(255,0,0,0.6), 0 8px 24px rgba(0,0,0,0.5)' },
          '50%': { boxShadow: '0 0 60px rgba(255,0,0,0.9), 0 8px 24px rgba(0,0,0,0.5)' },
        },
      },
    },
  },
  plugins: [],
}
