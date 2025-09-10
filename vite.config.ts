import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    host: '0.0.0.0', // Expose the server to the network
    // The proxy is essential for local development. It forwards API
    // and WebSocket requests from the client (on port 5173)
    // to the backend server (on port 3000), avoiding CORS issues.
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
