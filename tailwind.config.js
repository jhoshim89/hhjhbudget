/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
  	extend: {
      fontSize: {
        'xs': ['0.8125rem', { lineHeight: '1.25rem' }],    // 13px (was 12px)
        'sm': ['0.9375rem', { lineHeight: '1.375rem' }],   // 15px (was 14px)
        'base': ['1.0625rem', { lineHeight: '1.625rem' }], // 17px (was 16px)
        'lg': ['1.1875rem', { lineHeight: '1.75rem' }],    // 19px (was 18px)
        'xl': ['1.3125rem', { lineHeight: '1.875rem' }],   // 21px (was 20px)
        '2xl': ['1.5625rem', { lineHeight: '2.125rem' }],  // 25px (was 24px)
        '3xl': ['1.9375rem', { lineHeight: '2.375rem' }],  // 31px (was 30px)
      },
  		fontFamily: {
  			sans: [
  				'Plus Jakarta Sans',
                'Noto Sans KR',
  				'sans-serif'
  			],
            display: [
                'Outfit',
                'Plus Jakarta Sans',
                'sans-serif'
            ],
            mono: [
                'JetBrains Mono',
                'monospace'
            ]
  		},
  		colors: {
            // CSS variable-based colors for theme switching
            background: 'var(--color-background)',
            surface: 'var(--color-surface)',
            panel: 'var(--color-panel)',
            foreground: 'var(--color-foreground)',
            'foreground-muted': 'var(--color-foreground-muted)',

            // Updated semantic colors (2025 trends)
            income: '#10B981',      // Emerald-500
            expense: '#F43F5E',     // Rose-500
            investment: '#A78BFA',  // Violet-400
            primary: '#0EA5E9',     // Sky-500
            warning: '#FBBF24',     // Amber-400

            // Stock color palette
            stock: {
                1: '#06B6D4',  // Cyan
                2: '#10B981',  // Emerald
                3: '#A78BFA',  // Violet
                4: '#F97316',  // Orange
                5: '#EC4899',  // Pink
                6: '#14B8A6',  // Teal
                7: '#FBBF24',  // Amber
                8: '#818CF8',  // Indigo
            },

            // Legacy colors preserved
            elevated: '#3F3F46',
  			border: 'rgba(255,255,255,0.08)',
            'border-hover': 'rgba(255,255,255,0.15)',

            // Brand colors
            brand: {
                jaeho: '#3B82F6',
                hyanghwa: '#EC4899',
            },

            // Glass effect
            glass: {
                DEFAULT: 'rgba(39,39,42,0.4)',
                light: 'rgba(255,255,255,0.03)',
                border: 'rgba(255,255,255,0.08)',
            },

  			card: {
  				DEFAULT: '#27272A',
  				foreground: '#FAFAFA'
  			},
  			popover: {
  				DEFAULT: '#27272A',
  				foreground: '#FAFAFA'
  			},
  			secondary: {
  				DEFAULT: '#3F3F46',
  				foreground: '#FAFAFA'
  			},
  			muted: {
  				DEFAULT: '#3F3F46',
  				foreground: '#A1A1AA'
  			},
  			accent: {
  				DEFAULT: '#3F3F46',
  				foreground: '#FAFAFA'
  			},
  			destructive: {
  				DEFAULT: '#F43F5E',
  				foreground: '#FFFFFF'
  			},
  			input: '#18181B',
  			ring: '#3B82F6',
  			chart: {
  				'1': '#3B82F6',
  				'2': '#F43F5E',
  				'3': '#22C55E',
  				'4': '#F59E0B',
  				'5': '#8B5CF6'
  			}
  		},
  		borderRadius: {
  			lg: '0.75rem',
  			md: '0.5rem',
  			sm: '0.375rem',
            xl: '1rem',
            '2xl': '1rem',
            '3xl': '1.5rem',
  		},
        boxShadow: {
            'glass': '0 8px 32px rgba(0, 0, 0, 0.3)',
            'glass-sm': '0 4px 16px rgba(0, 0, 0, 0.2)',
            'glow-blue': '0 0 20px rgba(59, 130, 246, 0.3)',
            'glow-green': '0 0 20px rgba(34, 197, 94, 0.3)',
            'glow-rose': '0 0 20px rgba(244, 63, 94, 0.3)',
            'glow-violet': '0 0 20px rgba(167, 139, 250, 0.4)',
            'glow-cyan': '0 0 20px rgba(6, 182, 212, 0.4)',
            'glow-emerald': '0 0 20px rgba(16, 185, 129, 0.4)',
            'glow-orange': '0 0 20px rgba(249, 115, 22, 0.4)',
            'glow-pink': '0 0 20px rgba(236, 72, 153, 0.4)',
            'glow-teal': '0 0 20px rgba(20, 184, 166, 0.4)',
            'glow-amber': '0 0 20px rgba(251, 191, 36, 0.4)',
            'glow-indigo': '0 0 20px rgba(129, 140, 248, 0.4)',
        },
        backdropBlur: {
            xs: '2px',
        },
        animation: {
            'fade-in': 'fadeIn 0.5s ease-out forwards',
            'slide-up': 'slideUp 0.5s ease-out forwards',
            'pulse-slow': 'pulse 3s ease-in-out infinite',
        },
        keyframes: {
            fadeIn: {
                '0%': { opacity: '0' },
                '100%': { opacity: '1' },
            },
            slideUp: {
                '0%': { opacity: '0', transform: 'translateY(10px)' },
                '100%': { opacity: '1', transform: 'translateY(0)' },
            },
        },
  	}
  },
  plugins: [require("tailwindcss-animate")],
}
