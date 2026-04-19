export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#111827',
        field: '#f8fafc',
        line: '#d1d5db',
        brand: '#0f766e',
        accent: '#b91c1c',
      },
      boxShadow: {
        soft: '0 10px 30px rgba(17, 24, 39, 0.08)',
      },
    },
  },
  plugins: [],
};
