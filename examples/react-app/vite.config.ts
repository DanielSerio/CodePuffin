import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// We import from the dist folder of our workspace root
import codePuffin from '../../dist/plugins/vite.mjs';

export default defineConfig({
  plugins: [
    react(),
    codePuffin({
      configPath: './puffin.json'
    })
  ]
});
