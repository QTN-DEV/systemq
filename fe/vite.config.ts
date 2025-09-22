import path from "path"

import tailwindcss from "@tailwindcss/vite"
import react from '@vitejs/plugin-react-swc'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 1000, // Increase the limit to 1000 kB
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor chunks
          vendor: ['react', 'react-dom', 'react-router-dom'],
          // Split UI library chunks
          ui: ['lucide-react', 'sweetalert2'],
          // Split utility chunks
          utils: ['clsx', 'tailwind-merge', 'class-variance-authority']
        }
      }
    }
  }
})
