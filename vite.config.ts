import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    host: '0.0.0.0', // Expose the server to the network
    // Proxy is no longer needed for production builds on Vercel,
    // but it's kept here for local development consistency.
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
      },
      '/files': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/upload': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/download': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
