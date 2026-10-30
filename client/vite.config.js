import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Loads client/.env (unprefixed keys stay server-side and never reach the bundle).
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.API_PROXY_TARGET || 'http://localhost:4000';

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: apiTarget,
          // When the API is down (not started yet, crashed, or restarting under --watch), answer with a
          // readable 503 instead of a bare ECONNREFUSED stack trace.
          configure(proxy) {
            proxy.on('error', (err, req, res) => {
              console.warn(`[api proxy] ${req.method} ${req.url} → ${apiTarget} failed (${err.code || err.message}). Is the server running? cd server && npm run dev`);
              if (res.headersSent || typeof res.writeHead !== 'function') return;
              res.writeHead(503, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                error: { code: 'API_UNAVAILABLE', message: 'Cannot reach the API server. Start it with "npm run dev" in server/ and try again.' },
              }));
            });
          },
        },
      },
    },
    test: { environment: 'jsdom', globals: true, setupFiles: './src/test/setup.js' },
  };
});
