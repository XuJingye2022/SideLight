import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  server: {
    port: 5173,
    strictPort: true,
    watch: {
      ignored: ['**/.edge-profile/**', '**/.npm-cache/**', '**/node_modules/**', '**/*.tmpdir/**'],
    },
  },
  plugins: [react()],
})
