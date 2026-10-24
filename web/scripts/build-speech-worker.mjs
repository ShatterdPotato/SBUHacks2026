import { build } from 'vite';
import { fileURLToPath } from 'node:url';

// Build outside the Vinext plugin pipeline. Its dev client transform injects
// window-based HMR code into worker dependencies and rewrites import.meta.url.
await build({
    configFile: false,
    root: fileURLToPath(new URL('../', import.meta.url)),
    publicDir: false,
    build: {
        outDir: fileURLToPath(new URL('../public/vendor/speech/', import.meta.url)),
        emptyOutDir: true,
        assetsInlineLimit: 0,
        rolldownOptions: {
            input: fileURLToPath(new URL('../lib/speech.worker.ts', import.meta.url)),
            output: { format: 'es', entryFileNames: 'speech.worker.js', chunkFileNames: '[name]-[hash].js', assetFileNames: '[name]-[hash][extname]' },
        },
    },
});
