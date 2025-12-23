/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ["class"],
    content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
  	extend: {
  		fontFamily: {
  			sans: [
  				'Inter',
                'Noto Sans KR',
  				'sans-serif'
  			],
            mono: [
                'JetBrains Mono',
                'monospace'
            ]
  		},
  		colors: {
  			background: '#0F1115',
  			panel: '#161920',
  			border: '#2B303B',
            'panel-dark': '#1A1D24',
  			foreground: '#E2E8F0',
            brand: {
                jaeho: '#2563EB',
                hyanghwa: '#EC4899',
            },
  			card: {
  				DEFAULT: '#161920',
  				foreground: '#E2E8F0'
  			},
  			popover: {
  				DEFAULT: '#161920',
  				foreground: '#E2E8F0'
  			},
  			primary: {
  				DEFAULT: '#2563EB',
  				foreground: '#FFFFFF'
  			},
  			secondary: {
  				DEFAULT: '#2B303B',
  				foreground: '#E2E8F0'
  			},
  			muted: {
  				DEFAULT: '#2B303B',
  				foreground: '#94A3B8'
  			},
  			accent: {
  				DEFAULT: '#2B303B',
  				foreground: '#E2E8F0'
  			},
  			destructive: {
  				DEFAULT: '#EF4444',
  				foreground: '#FFFFFF'
  			},
  			input: '#1A1D24',
  			ring: '#2563EB',
  			chart: {
  				'1': '#3B82F6',
  				'2': '#EF4444',
  				'3': '#10B981',
  				'4': '#F59E0B',
  				'5': '#8B5CF6'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}