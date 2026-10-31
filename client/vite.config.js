import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      filename: 'dist/stats.html',
      template: 'treemap',
      gzipSize: true,
      brotliSize: true,
      open: false
    })
  ],
  server: {
    port: 5173,
    host: true
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/scheduler/') ||
            id.includes('node_modules/react-router')
          ) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/three') || id.includes('node_modules/@react-three')) {
            return 'three-bundle';
          }
        }
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['tests/**/*.spec.{js,jsx}']
  }
});
