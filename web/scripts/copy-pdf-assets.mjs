import { mkdirSync, cpSync } from 'node:fs';
const source = new URL('../node_modules/pdfjs-dist/', import.meta.url);
const target = new URL('../public/vendor/pdfjs/', import.meta.url);
mkdirSync(target, { recursive: true });
for (const [from, to] of [['build/pdf.worker.min.mjs', 'pdf.worker.min.mjs'], ['standard_fonts', 'standard_fonts'], ['cmaps', 'cmaps'], ['LICENSE', 'LICENSE']])
    cpSync(new URL(from, source), new URL(to, target), { recursive: true });
const visionTarget = new URL('../public/vendor/mediapipe/', import.meta.url);
mkdirSync(visionTarget, { recursive: true });
cpSync(new URL('../node_modules/@mediapipe/tasks-vision/wasm/', import.meta.url), visionTarget, { recursive: true });
cpSync(new URL('../node_modules/@mediapipe/tasks-vision/vision_bundle.mjs', import.meta.url), new URL('vision_bundle.mjs', visionTarget));
cpSync(new URL('../lib/eye-contact-metrics.mjs', import.meta.url), new URL('eye-contact-metrics.mjs', visionTarget));
