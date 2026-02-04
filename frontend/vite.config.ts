import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://127.0.0.1:443',
        changeOrigin: true,
        secure: false, // Self-signed certs
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
