import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/auth": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
      "/properties": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
      "/tenants": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
      "/leases": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
      "/payments": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
      "/agencies": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
})
