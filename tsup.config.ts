import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/cli/index.ts',
    'plugins/vite': 'src/plugins/vite.ts',
    'plugins/next': 'src/plugins/next.ts'
  },
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  outDir: 'dist',
  minify: false,
  sourcemap: true,
  external: ['typescript', 'commander', 'fast-glob', 'picocolors', 'zod'],
});
