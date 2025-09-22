import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  // 设置基础路径，适应GitHub Pages
  base: 'literate-adventure',
  plugins: [react()],
  build: {
    // 输出目录改为docs，用于GitHub Pages
    outDir: 'docs',
    chunkSizeWarningLimit: 1000,
    cssCodeSplit: true,
    cssMinify: 'esbuild',
    target: ['es2020']
  },
  css: {
    preprocessorOptions: {
      less: {
        javascriptEnabled: true
      }
    }
  }
})
