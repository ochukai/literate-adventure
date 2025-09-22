import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// 自定义插件：移除HTML中的type="module"属性
function removeModuleTypePlugin() {
  return {
    name: 'remove-module-type',
    transformIndexHtml(html) {
      // 将<script type="module"替换为<script>
      return html.replace(/<script type="module" crossorigin/g, '<script defer')
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  // 设置为相对路径
  base: './',
  plugins: [
    react(),
    removeModuleTypePlugin()
  ],
  build: {
    // 禁用代码分割，生成单个文件
    rollupOptions: {
      output: {
        // 配置为IIFE格式，不使用ES模块
        format: 'iife',
        // 禁用代码分割
        manualChunks: undefined,
        // 生成的chunk文件名格式
        chunkFileNames: 'assets/[name].[hash].js',
        // 入口文件名格式
        entryFileNames: 'assets/[name].[hash].js',
        // 资产文件名格式
        assetFileNames: 'assets/[name].[hash].[ext]',
        // 全局变量名
        name: 'App',
        // 禁用PreserveModules
        preserveModules: false
      }
    },
    // 减小chunk体积警告阈值到2500KB
    chunkSizeWarningLimit: 2500,
    // 配置CSS代码分割
    cssCodeSplit: true,
    // 启用CSS提取
    cssMinify: 'esbuild',
    // 配置CSS模块
    cssModules: {
      scopeBehaviour: 'local',
      generateScopedName: '[name]__[local]__[hash:base64:5]'
    },
    // 设置目标浏览器
    target: ['es2015'],
    // 禁用模块预加载
    modulePreload: {
      polyfill: false
    }
  },
  // 配置CSS预处理器
  css: {
    preprocessorOptions: {
      less: {
        // 如果使用less，可以在这里配置
        javascriptEnabled: true
      }
    }
  },
  // 禁用模块联合
  experimental: {
    moduleFederation: false
  }
})
