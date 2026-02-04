import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react()],
  server: {
    port: 4280,
    proxy: {
      '/api': {
        target: 'http://localhost:7071', // puerto donde levantas tu backend local
        changeOrigin: true,
        secure: false,
      }
    }
  },
});
