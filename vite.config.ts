import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    watch: {
      usePolling: true
    }
  },
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          'three-vendor': ['three', '@react-three/fiber', '@react-three/drei'],
          'anim-vendor': ['gsap', 'framer-motion'],
          'ui-vendor': ['lucide-react', 'react-icons', 'react-parallax-tilt'],
          'core-vendor': ['react', 'react-dom', 'react-router-dom', 'zustand']
        }
      }
    }
  }
})