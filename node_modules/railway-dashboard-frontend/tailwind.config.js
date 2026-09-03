/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{html,js}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Railway Dashboard Color Palette (Updated from Govt Indian Railways Palette)
        'navy': {
          DEFAULT: '#12355B',       // Primary Navy Blue
          'dark': '#0D2542',        // Deep Navy
          'light': '#1D4877',       // Accent Navy
        },
        'lightblue': '#EAF3F8',     // Section Background
        'saffron': '#FF9933',       // Highlights / Accent
        'railgreen': '#138808',     // Success / Status
        'railred': '#DC2626',       // Critical Delays / Alerts
        'railway': {
          'dark': '#12355B',         // Primary Navy background
          'darker': '#0D2542',       // Sidebar / Sub-header background
          'card': '#FFFFFF',         // White card background
          'border': '#D6E3EC',       // Light border color
          'hover': '#EAF3F8',        // Light blue hover state
          'text': '#475569',         // Secondary text
          'text-light': '#0F172A',   // Primary text
        },
        'accent': {
          'blue': '#12355B',         // Navy Primary
          'cyan': '#0284C7',         // Light cyan accent
          'indigo': '#1D4877',       // Navy light
          'purple': '#FF9933',       // Saffron highlight
          'saffron': '#FF9933',      // Saffron highlight
        },
        'status': {
          'success': '#138808',      // On Time / OK Green
          'warning': '#FF9933',      // Minor Delay / Warning Saffron
          'danger': '#DC2626',       // Major Delay / Critical Red
          'info': '#12355B',         // Information Navy
          'muted': '#64748B',        // Inactive
        },
        'kpi': {
          'total': '#12355B',        // Navy Total trains
          'ontime': '#138808',       // Green On-time
          'delayed': '#FF9933',      // Saffron Delayed
          'major': '#DC2626',        // Red Major delay
          'avg': '#1D4877',          // Average delay
          'ai': '#FF9933',           // Saffron AI indicator
        }
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        'heading': ['Outfit', 'Inter', 'sans-serif'],
        'mono': ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        'kpi': ['2rem', { lineHeight: '1', fontWeight: '700' }],
        'kpi-label': ['0.75rem', { lineHeight: '1.2', fontWeight: '500' }],
      },
      borderRadius: {
        'card': '12px',
        'widget': '16px',
      },
      boxShadow: {
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -2px rgba(0, 0, 0, 0.2)',
        'glow-blue': '0 0 20px rgba(59, 130, 246, 0.15)',
        'glow-green': '0 0 20px rgba(34, 197, 94, 0.15)',
        'glow-red': '0 0 20px rgba(239, 68, 68, 0.15)',
        'glow-yellow': '0 0 20px rgba(245, 158, 11, 0.15)',
        'inner-glow': 'inset 0 1px 0 rgba(255, 255, 255, 0.05)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'card-gradient': 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 100%)',
        'sidebar-gradient': 'linear-gradient(180deg, #0f1729 0%, #0a0e1a 100%)',
        'header-gradient': 'linear-gradient(90deg, rgba(15,23,41,0.95) 0%, rgba(10,14,26,0.95) 100%)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'live-dot': 'liveDot 1.5s ease-in-out infinite',
        'slide-in-left': 'slideInLeft 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'slide-in-up': 'slideInUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
        'count-up': 'countUp 1s ease-out',
        'train-move': 'trainMove 3s linear infinite',
      },
      keyframes: {
        liveDot: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.5', transform: 'scale(1.5)' },
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideInUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        trainMove: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
      spacing: {
        'sidebar': '260px',
        'sidebar-collapsed': '72px',
        'header': '64px',
      },
    },
  },
  plugins: [],
};
