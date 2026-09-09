import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: './',
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    // Strip console/debugger statements from production builds.
    esbuild: {
      drop: mode === 'production' ? ['console', 'debugger'] : [],
    },
    build: {
      rollupOptions: {
        output: {
          // Split heavy dependencies into their own cacheable vendor chunks
          // instead of shipping one large monolithic bundle.
          manualChunks(id) {
            if (!id.includes('node_modules')) return;
            if (id.includes('@google/genai')) return 'genai';
            if (id.includes('@xyflow') || id.includes('dagre')) return 'flow';
            if (id.includes('/motion/') || id.includes('framer-motion'))
              return 'motion';
            if (
              id.includes('react-dom') ||
              id.includes('/react/') ||
              id.includes('/scheduler/')
            )
              return 'react';
            // Everything else (incl. lazy-only deps like react-markdown and
            // html-to-image) is left to Rollup so it can keep them in the
            // on-demand async chunks rather than the eager initial load.
            return undefined;
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
