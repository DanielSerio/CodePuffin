import { defineConfig } from 'vite';
import codePuffinPlugin from '../../../../dist/plugins/vite.mjs';

export default defineConfig({
  plugins: [
    codePuffinPlugin({
      enabled: false
    })
  ]
});
