import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Keep independently-versioned runtime libraries out of the entry
        // bundle. Auth and form/phone flows remain route-lazy; explicit
        // vendor chunks keep the initial dashboard shell cacheable and below
        // Vite's single-chunk warning threshold.
        manualChunks(id) {
          if (!id.includes('node_modules/')) return undefined;
          if (id.includes('react-phone-number-input') || id.includes('libphonenumber-js') || id.includes('country-flag-icons') || id.includes('input-format')) return 'vendor-phone';
          if (id.includes('@clerk/')) return 'vendor-clerk';
          if (id.includes('react-router') || id.includes('/react/') || id.includes('react-dom/')) return 'vendor-react';
          if (id.includes('react-hook-form') || id.includes('@hookform/') || id.includes('/zod/')) return 'vendor-forms';
          if (id.includes('recharts') || id.includes('/d3-') || id.includes('react-redux') || id.includes('@reduxjs/') || id.includes('immer') || id.includes('reselect') || id.includes('es-toolkit')) return 'vendor-charts';
          if (id.includes('@tanstack/') || id.includes('/zustand/')) return 'vendor-state';
          return undefined;
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
