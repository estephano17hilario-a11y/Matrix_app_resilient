import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true,
    port: 5174,
  },
  esbuild: {
    drop: ['console', 'debugger'],
    // Remove dead code paths in production
    treeShaking: true,
    // Optimize for smallest output
    legalComments: 'none',
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    target: 'esnext', // Use modern JS for smallest bundles
    minify: 'esbuild', // Fastest + smallest
    cssMinify: true,
    // Increase inline limit for small assets (saves HTTP requests)
    assetsInlineLimit: 8192,
    rollupOptions: {
      output: {
        // Compact attribute names
        compact: true,
        // Stable vendor chunks: they change rarely, so the WebView/browser cache keeps them across app updates.
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          const inPkg = (...names) => names.some(n => id.includes('/node_modules/' + n + '/'));
          if (inPkg('react', 'react-dom', 'scheduler')) return 'react-vendor';
          if (inPkg('framer-motion', 'motion-dom', 'motion-utils', 'lucide-react', 'clsx', 'tailwind-merge')) return 'ui-vendor';
          if (id.includes('/@supabase/')) return 'supabase-vendor';
          if (inPkg('recharts', 'recharts-scale', 'victory-vendor', 'decimal.js-light', 'reselect', 'immer', 'redux') || id.includes('/node_modules/d3-') || id.includes('/@reduxjs/')) return 'charts-vendor';
          if (inPkg('i18next', 'react-i18next', 'i18next-browser-languagedetector')) return 'i18n-vendor';
          if (inPkg('date-fns')) return 'date-vendor';
        },
      },
    },
    chunkSizeWarningLimit: 1200,
  },
})

