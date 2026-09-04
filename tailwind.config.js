/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        accent: {
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
        },
        dark: {
          bg:     '#080b14',
          card:   '#111827',
          border: '#1f2937',
          input:  '#1a2234',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        '3d':       '0 10px 30px -10px rgba(79,70,229,0.25), 0 4px 6px -2px rgba(0,0,0,0.08)',
        '3d-hover': '0 20px 40px -10px rgba(79,70,229,0.4),  0 8px 10px -5px rgba(0,0,0,0.1)',
        'glass':    '0 8px 32px 0 rgba(31,38,135,0.1)',
        'glow':     '0 0 20px rgba(79,70,229,0.35)',
        'glow-sm':  '0 0 10px rgba(79,70,229,0.2)',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'fade-in':     'fadeIn 0.3s ease-out',
        'slide-up':    'slideUp 0.35s cubic-bezier(0.16,1,0.3,1)',
        'slide-down':  'slideDown 0.35s cubic-bezier(0.16,1,0.3,1)',
        'scale-in':    'scaleIn 0.25s cubic-bezier(0.34,1.56,0.64,1)',
        'ping-slow':   'ping 2s cubic-bezier(0,0,0.2,1) infinite',
        'float':       'float 3s ease-in-out infinite',
        'glow-pulse':  'glowPulse 2s ease-in-out infinite',
        'shimmer':     'shimmer 1.5s infinite',
      },
      keyframes: {
        fadeIn:    { from: { opacity: '0' },                      to: { opacity: '1' } },
        slideUp:   { from: { transform: 'translateY(100%)' },     to: { transform: 'translateY(0)' } },
        slideDown: { from: { transform: 'translateY(-100%)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
        scaleIn:   { from: { transform: 'scale(0.8)', opacity: '0' }, to: { transform: 'scale(1)', opacity: '1' } },
        float:     { '0%,100%': { transform: 'translateY(0)' },  '50%': { transform: 'translateY(-6px)' } },
        glowPulse: { '0%,100%': { boxShadow: '0 0 10px rgba(79,70,229,0.2)' }, '50%': { boxShadow: '0 0 25px rgba(79,70,229,0.5)' } },
        shimmer:   { from: { backgroundPosition: '-200% 0' },    to: { backgroundPosition: '200% 0' } },
      }
    }
  },
  plugins: []
}
