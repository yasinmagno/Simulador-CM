import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'estado-normal':    '#22c55e',
        'estado-degradado': '#eab308',
        'estado-emergencia':'#f97316',
        'estado-critico':   '#ef4444',
        'estado-falha':     '#991b1b',
        'estado-inativo':   '#6b7280',
      },
    },
  },
  plugins: [],
};
export default config;
