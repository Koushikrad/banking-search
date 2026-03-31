import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    dts({
      include: ['src/**/*.ts'],
      rollupTypes: true,
      outDir: 'dist',
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'BankingSearch',
      fileName: 'banking-search',
      formats: ['es', 'umd'],
    },
    rollupOptions: {
      // Lit is an external peer dependency — don't bundle it
      // Consumers who use <script type="module"> or a bundler will have it.
      // For the UMD CDN drop-in, we bundle lit (override below via separate build).
      external: [],
    },
    // Minify for production
    minify: 'esbuild',
    sourcemap: true,
    target: 'es2021',
  },
});
