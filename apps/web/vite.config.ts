import { fileURLToPath, URL } from 'node:url';
import vue from '@vitejs/plugin-vue';
import UnoCSS from 'unocss/vite';
import { defineConfig, loadEnv } from 'vite';

const DEFAULT_API_PROXY_TARGET = 'http://127.0.0.1:3001';

export default defineConfig(({ mode }) => {
  // 允许用 `WEB_API_PROXY_TARGET`（`.env.local` 或环境变量）把开发代理指向其他本地 API 实例，
  // 默认仍是 `pnpm dev` 启动的 http://127.0.0.1:3001。
  const env = loadEnv(mode, process.cwd(), '');
  const apiProxyTarget = env.WEB_API_PROXY_TARGET || DEFAULT_API_PROXY_TARGET;

  return {
    plugins: [vue(), UnoCSS()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      host: '127.0.0.1',
      port: 5173,
      proxy: {
        '/api': {
          changeOrigin: true,
          target: apiProxyTarget,
        },
      },
      strictPort: true,
    },
  };
});
