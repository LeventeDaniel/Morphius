/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Cascadia Code', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        'bg-primary': '#0a0a0a',
        'bg-secondary': '#111111',
        'bg-panel': '#161616',
        'bg-panel-hover': '#1e1e1e',
        border: '#2a2a2a',
        'border-accent': '#3a3a3a',
        'text-primary': '#e8e8e8',
        'text-secondary': '#888888',
        'text-muted': '#555555',
        accent: '#ffffff',
        'accent-dim': '#cccccc',
        'status-ok': '#4ade80',
        'status-warn': '#facc15',
        'status-error': '#f87171',
      },
    },
  },
  plugins: [],
};
