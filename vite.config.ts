import path from 'node:path';
import { defineConfig } from 'vite';

// Le design system vit dans le dépôt voisin ../desys : composants, styles et
// stories sont importés depuis ses sources (alias @desys), avec une seule copie
// de React.
const desys = path.resolve(import.meta.dirname, '../desys');
export default defineConfig({
  build: { outDir: 'dist', emptyOutDir: true },
  resolve: {
    alias: { '@desys': path.join(desys, 'src/web') },
    dedupe: ['react', 'react-dom'],
  },
  server: {
    host: '127.0.0.1',
    fs: { allow: [import.meta.dirname, path.join(desys, 'src/web')] },
  },
});
