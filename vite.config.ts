import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [preact()],
  esbuild: {
    jsxImportSource: 'preact',
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        simulation: resolve(__dirname, 'simulation.html'),
        docs: resolve(__dirname, 'docs.html'),
      },
    },
  },
});
