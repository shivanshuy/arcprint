import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  resolve: {
    alias: [
      {
        find: /^onnxruntime-web\/webgpu$/,
        replacement: path.resolve(root, 'node_modules/@huggingface/transformers/node_modules/onnxruntime-web/dist/ort.webgpu.bundle.min.mjs'),
      },
      {
        find: /^onnxruntime-web$/,
        replacement: path.resolve(root, 'node_modules/onnxruntime-web/dist/ort.wasm.min.js'),
      },
    ],
  },
  optimizeDeps: {
    exclude: ['@xenova/transformers', '@huggingface/transformers', 'open-jev', '@plantuml/core'],
  },
  assetsInclude: ['**/*.wasm'],
});
