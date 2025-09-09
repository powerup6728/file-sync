import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    host: '0.0.0.0', // Expose the server to the network
    proxy: {
      // Proxying websockets and http for socket.io
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
      },
      // Proxy API requests to the Express server
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
