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
  build: {
    // 主 chunk 约 840 KB 是首屏必需的：KaTeX 不能拆。@tiptap/extension-mathematics 顶层
    // 静态 import katex，扩展在编辑器首帧就要注册；拆包必须 alias 到惰性 shim、删掉
    // main.tsx 的 CSS 静态 import、改 woff2 插件、再把三处渲染异步化（独立 spike，0.18.0 不做）。
    // 主 chunk 约 1.10 MB（第 05 轮实测 1,100–1,104 kB），900 是历史估计、已不够用。
    // 1200 是为此显式设定的告警线，留约 100 kB 余量；不是放任体积增长。
    // 不设 manualChunks：桌面端从本地回环读盘，拆 vendor 只增加请求数、不减首屏字节。
    // cssCodeSplit 与 sourcemap 保持默认（CSS 与 JS 同源同生命周期）。
    chunkSizeWarningLimit: 1200,
  },
})
