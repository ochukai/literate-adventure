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
    // 简化的代码拆分配置
    rollupOptions: {
      output: {
        manualChunks(id) {
          // 简化的代码拆分策略
          if (id.includes('node_modules')) {
            // 只拆分大型库
            if (id.includes('exceljs')) {
              return 'vendor.exceljs';
            }
            // 其他所有依赖都放在一个vendor chunk中以确保加载顺序
            return 'vendor';
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
