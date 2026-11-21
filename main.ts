import { buildDossier } from './vendor/makefun-frontend.ts';
import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';

const output = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');
if (output === resolve('.') || output === resolve('app') || output === resolve('screenshots')) {
  throw new Error('Output must be separate from the source directories.');
}
await mkdir(output, { recursive: true });
await rm(join(output, 'app'), { recursive: true, force: true });
await rm(join(output, 'screenshots'), { recursive: true, force: true });
await cp(resolve('app'), join(output, 'app'), { recursive: true });
await cp(resolve('screenshots'), join(output, 'screenshots'), { recursive: true });
const dossier = buildDossier(output, {
  text_max_bytes: 120000,
  screenshots: { max: 4, max_bytes: 256 * 1024 },
});
await writeFile(join(output, 'dossier.json'), dossier);
console.log('Dossier written:', join(output, 'dossier.json'), dossier.byteLength, 'bytes');
