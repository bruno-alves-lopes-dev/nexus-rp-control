export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular']
      },
      boxShadow: {
        glow: '0 0 45px rgba(99,102,241,.22)',
        gold: '0 0 40px rgba(245,158,11,.18)'
      }
    }
  },
  plugins: [],
};
