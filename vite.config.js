import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  // 设置基础路径，适应GitHub Pages
  base: '/literate-adventure/',
  plugins: [react()],
  build: {
    // 输出目录改为docs，用于GitHub Pages
    outDir: 'docs',
    chunkSizeWarningLimit: 1000,
    cssCodeSplit: true,
    cssMinify: 'esbuild',
    target: ['es2020'],
    // 新增代码拆分配置
    rollupOptions: {
      output: {
        manualChunks(id) {
          // 将第三方库拆分为独立chunk
          if (id.includes('node_modules')) {
            if (id.includes('antd')) {
              return 'vendor.antd';
            } else if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor.react';
            } else if (id.includes('@reduxjs')) {
              return 'vendor.redux';
            } else if (id.includes('exceljs')) {
              return 'vendor.exceljs';
            }
            return 'vendor.other';
          }
        }
      }
    }
  },
  css: {
    preprocessorOptions: {
      less: {
        javascriptEnabled: true
      }
    }
  }
})
