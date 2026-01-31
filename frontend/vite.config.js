import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    cssCodeSplit: false, // Combine all CSS into one file
    rollupOptions: {
      output: {
        manualChunks: undefined,
      }
    }
  },
  css: {
    devSourcemap: false
  }
})
