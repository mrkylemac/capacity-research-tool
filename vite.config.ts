import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    proxy: {
      // Glofox API proxy (avoids CORS in dev; prod uses Vercel serverless /api/glofox/events)
      '/api/glofox': {
        target: 'https://api.glofox.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/glofox/, '/2.0'),
        secure: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            const auth = req.headers.authorization;
            if (auth) proxyReq.setHeader('Authorization', auth);
            const branchId = req.headers['x-glofox-branch-id'];
            if (branchId) proxyReq.setHeader('x-glofox-branch-id', branchId);
            const tz = req.headers['x-glofox-branch-timezone'];
            if (tz) proxyReq.setHeader('x-glofox-branch-timezone', tz);
            const source = req.headers['x-glofox-source'];
            if (source) proxyReq.setHeader('x-glofox-source', source);
          });
        },
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
