module.exports = {
  content: [
    "./public/**/*.{html,js}",
    "./public/pages/**/*.{html,js,css}",
    "./public/core/**/*.{html,js,css}"
  ],
  safelist: [
    // Ensure all utility classes used in @apply are included
    'bg-gradient-to-r',
    'from-blue-600',
    'to-blue-700', 
    'hover:from-blue-700',
    'hover:to-blue-800',
    'shadow-lg',
    'backdrop-blur-xl',
    'bg-white/80',
    'border-white/20',
    'transform',
    'hover:-translate-y-1',
    'transition-all',
    'duration-300',
    'will-change-transform',
    'will-change-auto',
    'bg-slate-50/50',
    'sr-only',
    'focus:not-sr-only',
    'focus:absolute',
    'focus:top-4',
    'focus:left-4',
    'focus:bg-blue-600',
    'focus:text-white',
    'focus:px-4',
    'focus:py-2',
    'focus:rounded-md',
    'focus:z-50',
    // Add pattern matching for dynamic classes
    { pattern: /bg-(slate|blue|purple|green|yellow|pink)-(50|100|200|300|400|500|600|700|800|900)/ },
    { pattern: /text-(slate|blue|purple|green|yellow|pink)-(50|100|200|300|400|500|600|700|800|900)/ },
    { pattern: /border-(slate|blue|purple|green|yellow|pink)-(50|100|200|300|400|500|600|700|800|900)/ },
    { pattern: /shadow-(blue|purple|green|yellow|pink)-(500|600|700)\/\d+/ }
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
