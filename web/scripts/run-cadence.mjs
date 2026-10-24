// Keep PDF parsing assets on the same origin in development and production.
import './copy-pdf-assets.mjs';
await import('./build-speech-worker.mjs');
await import('./run-framework.mjs');
