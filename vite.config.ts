import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

/**
 * Frontend dev server config.
 *
 * Axios talks to a relative `/api` path (set via `VITE_API_BASE_URL`),
 * which keeps every request same-origin (no CORS preflight, no
 * `Access-Control-Allow-Origin` to lose). The Vite dev server then
 * proxies `/api` to whatever backend you point `API_PROXY_TARGET` at —
 * either the local Nest service or an ngrok tunnel.
 *
 * Why the proxy: ngrok-free strips `Access-Control-Allow-Origin` from
 * responses (its proxy intercepts CORS for its browser-warning page),
 * which breaks direct axios → ngrok calls in the browser. Going through
 * Vite's same-origin proxy side-steps the problem entirely.
 */
export default defineConfig(({ mode }) => {
  // Load .env values WITHOUT the VITE_ prefix restriction so we can read
  // server-only vars like API_PROXY_TARGET.
  const env = loadEnv(mode, process.cwd(), '');
  const proxyTarget = env.API_PROXY_TARGET ?? 'http://localhost:3001';

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173,
      strictPort: false,
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true, // rewrite Host header so ngrok accepts the request
          secure: true,
          headers: {
            // Skip ngrok-free's HTML interstitial that would otherwise replace
            // the JSON response on a first browser-flavoured request.
            'ngrok-skip-browser-warning': '1',
          },
        },
      },
    },
  };
});
