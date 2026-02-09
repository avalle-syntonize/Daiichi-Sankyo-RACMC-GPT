import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react()],
  server: {
    port: 4281,
    proxy: {
      '/api': {
        target: 'http://localhost:7071', 
        changeOrigin: true,
        secure: false,
      }
    }
  },
});
