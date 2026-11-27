import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// During development Vite runs on port 5173 and forwards /api to Express on 3000.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
