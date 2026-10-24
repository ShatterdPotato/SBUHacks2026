import { mkdirSync, cpSync } from 'node:fs';
const source = new URL('../node_modules/pdfjs-dist/', import.meta.url);
const target = new URL('../public/vendor/pdfjs/', import.meta.url);
mkdirSync(target, { recursive: true });
for (const [from, to] of [['build/pdf.worker.min.mjs', 'pdf.worker.min.mjs'], ['standard_fonts', 'standard_fonts'], ['cmaps', 'cmaps'], ['LICENSE', 'LICENSE']])
    cpSync(new URL(from, source), new URL(to, target), { recursive: true });
