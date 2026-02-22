import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        // 🌟 新增：代理配置（解决跨域核心）
        proxy: {
          // 匹配所有 /api 开头的请求，转发到后端地址
          '/api': {
            target: 'http://121.41.168.85:8009', // 你的后端地址 + 端口
            changeOrigin: true, // 关键：模拟请求的 Origin 为后端地址，绕过 CORS 检查
            secure: false, // 非 HTTPS 地址必须设为 false
            // 可选：如果后端接口不带 /api 前缀，取消下面注释重写路径
            // rewrite: (path) => path.replace(/^\/api/, '')
          }
        }
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});