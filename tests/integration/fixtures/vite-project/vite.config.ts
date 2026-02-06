import { defineConfig } from 'vite';
import codePuffin from '../../../../dist/plugins/vite.mjs';

export default defineConfig({
  plugins: [
    codePuffin({ configPath: './puffin.json' })
  ]
});
