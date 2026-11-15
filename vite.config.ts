import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import { woff2Only } from './scripts/vite-woff2-only.mjs'

export default defineConfig({
  server: {
    port: 5173,
    strictPort: true,
    watch: {
      // 浏览器配置目录别让 Vite 监听：几千个文件会刷 EBUSY，还会误触发整页刷新
      ignored: [
        '**/.edge-profile*/**',
        '**/.tmp/**',
        '**/.npm-cache/**',
        '**/node_modules/**',
        '**/*.tmpdir/**',
        // B 组反复重建 host/bin 与打包 release/，别让它们触发整页刷新
        '**/host/bin/**',
        '**/release/**',
      ],
    },
  },
  plugins: [react(), woff2Only()],
})
