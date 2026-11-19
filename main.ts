import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildDossier } from './vendor/makefun-frontend.ts';

const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Stage the static site and any captures together in the hand-in directory.
mkdirSync(outputDir, { recursive: true });
for (const folder of ['app', 'screenshots']) {
  const source = join(import.meta.dirname, folder);
  const destination = join(outputDir, folder);
  if (folder === 'screenshots' && !existsSync(source)) {
    mkdirSync(destination, { recursive: true });
  } else {
    cpSync(source, destination, { recursive: true });
  }
}

// Build the judge's dossier from the staged files using the competition limits.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
