import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repoDir = import.meta.dirname;
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function stageFolders() {
  mkdirSync(outputDir, { recursive: true });
  cpSync(join(repoDir, 'app'), join(outputDir, 'app'), { recursive: true });

  const source = join(repoDir, 'screenshots');
  const destination = join(outputDir, 'screenshots');
  // The dossier still expects a staging folder before screenshots are captured.
  if (existsSync(source)) {
    cpSync(source, destination, { recursive: true });
  } else {
    mkdirSync(destination, { recursive: true });
  }
}

function writeDossier() {
  const dossier = buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
  });
  writeFileSync(join(outputDir, 'dossier.json'), dossier);
}

stageFolders();
writeDossier();
