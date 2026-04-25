import defaultTheme from 'tailwindcss/defaultTheme';

export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,css}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', ...defaultTheme.fontFamily.sans],
      },
      colors: {
        gray: defaultTheme.colors.gray,  // add default gray colors
        background: '#0a0a0a',
        foreground: '#ECEEF0',
        primary: '#3B82F6',
        accent: '#facc15',
        border: '#D1D5DB',
        card: '#1a1a2e',
        muted: '#9ca3af',
      },
    },
  },
  plugins: [
    function({ addVariant }) {
      addVariant('dark', '&:is(.dark *)');
    }
  ],
};
