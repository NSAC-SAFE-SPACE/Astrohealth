/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0B4F8A',
          hover: '#093F6E',
          light: '#E8F1F8',
          fixed: '#D3E4FF'
        },
        accent: {
          DEFAULT: '#2A9D8F',
          hover: '#238276',
          light: '#E6F6F4'
        },
        surface: {
          DEFAULT: '#F5F8FB',
          subtle: '#F8F9FF',
          container: '#EEF4FF'
        },
        slate: {
          text: '#1F2A37',
          muted: '#5B6B7B',
          border: '#E3E9EF'
        },
        status: {
          normal: {
            DEFAULT: '#2E9E6B',
            text: '#1F7A50',
            bg: 'rgba(46, 158, 107, 0.12)'
          },
          watch: {
            DEFAULT: '#D9A400',
            text: '#8A6500',
            bg: 'rgba(217, 164, 0, 0.12)'
          },
          action: {
            DEFAULT: '#E07B00',
            text: '#B35F00',
            bg: 'rgba(224, 123, 0, 0.12)'
          },
          contact_flight_surgeon: {
            DEFAULT: '#C93C3C',
            text: '#A82F2F',
            bg: 'rgba(201, 60, 60, 0.12)'
          }
        }
      },
      fontFamily: {
        serif: ['"Source Serif 4"', 'Georgia', 'serif'],
        sans: ['"Source Sans 3"', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif']
      },
      fontSize: {
        h1: ['44px', { lineHeight: '52px', fontWeight: '700' }],
        h2: ['32px', { lineHeight: '40px', fontWeight: '600' }],
        h3: ['24px', { lineHeight: '32px', fontWeight: '600' }],
        body: ['18px', { lineHeight: '28px', fontWeight: '400' }],
        'body-sm': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        caption: ['14px', { lineHeight: '20px', fontWeight: '400' }]
      },
      minHeight: {
        touch: '48px'
      },
      minWidth: {
        touch: '48px'
      },
      maxWidth: {
        prose: '65ch'
      }
    }
  },
  plugins: []
};
