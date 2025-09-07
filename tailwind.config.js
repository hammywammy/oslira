module.exports = {
  content: [
    "./public/**/*.{html,js}",
    "./public/pages/**/*.{html,js,css}",
    "./public/core/**/*.{html,js,css}",
    "./src/**/*.css"  // Added to scan CSS files for @apply usage
  ],
  safelist: [
    // Remove existing safelist - @apply pattern eliminates need
  ],
  theme: {
    extend: {
      colors: {
        'oslira-blue': '#2D6CDF',
        'oslira-purple': '#8A6DF1'
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'blob': 'blob 7s infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' }
        },
        blob: {
          '0%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
          '100%': { transform: 'translate(0px, 0px) scale(1)' }
        }
      }
    }
  },
  plugins: []
}
