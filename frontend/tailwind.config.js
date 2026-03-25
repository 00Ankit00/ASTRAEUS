/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        astraeus: {
          bg: '#0B0F14',          // Primary background
          panel: '#121821',       // Secondary panels
          border: '#1E293B',      // Borders/dividers
          primary: '#3B82F6',     // Primary accent
          success: '#22C55E',     // Secondary accent
          warning: '#F59E0B',     // Warning/alert
          danger: '#EF4444',      // Danger/change highlight
          text: '#E5E7EB',        // Text primary
          textMuted: '#94A3B8',   // Text secondary
        }
      }
    },
  },
  plugins: [],
}
