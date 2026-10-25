import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
await build({entryPoints:[fileURLToPath(new URL('../gearwell/avatar.js',import.meta.url))],bundle:true,minify:true,format:'esm',outfile:fileURLToPath(new URL('../public/assets/avatar.js',import.meta.url))});
