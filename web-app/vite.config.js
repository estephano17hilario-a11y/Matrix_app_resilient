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
    proxy: {
      '/mp-api': {
        target: 'https://api.mercadopago.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/mp-api/, ''),
      },
    }
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
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('firebase')) return 'firebase';
            // UI Vendor first (specifics)
            if (id.includes('framer-motion') || id.includes('lucide-react') || id.includes('clsx') || id.includes('tailwind-merge')) return 'ui-vendor';
            // Supabase client
            if (id.includes('@supabase')) return 'supabase-vendor';
            // React Core last (catch-all)
            if (id.includes('react') || id.includes('react-dom')) return 'react-vendor';
            // Heavy chart lib
            if (id.includes('recharts') || id.includes('d3')) return 'charts-vendor';
          }
        },
      },
    },
    chunkSizeWarningLimit: 1200,
  },
})

