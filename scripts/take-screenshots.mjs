import { createRequire } from 'node:module';
import { resolve as resolvePath, extname, sep } from 'node:path';
import { spawn } from 'node:child_process';
import { readFile, mkdir, stat } from 'node:fs/promises';
const puppeteer = createRequire('/home/hatch/workspace/makefun/shot/package.json')('puppeteer-core');
const shots = JSON.parse(await readFile('shots.json', 'utf8'));
const server = spawn(process.execPath, ['serve.ts'], { stdio: ['ignore', 'pipe', 'pipe'] });
let browser;
let direct = false;
let serverError = '';
server.stderr.on('data', chunk => { serverError += chunk; });
try {
  await new Promise((resolve, reject) => {
    server.stdout.once('data', resolve);
    server.once('error', reject);
    server.once('exit', code => reject(new Error('Preview server exited: ' + code)));
  }).catch(error => {
    if (!serverError.includes('EPERM')) throw error;
    direct = true;
    console.log('Port blocked; using local request interception for screenshots.');
  });
  browser = await puppeteer.launch({
    executablePath: '/home/hatch/.cache/puppeteer/chrome-headless-shell/linux-157.0.8103.50/chrome-headless-shell-linux64/chrome-headless-shell',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
    headless: true
  });
  await mkdir('screenshots', { recursive: true });
  for (const shot of shots) {
    const page = await browser.newPage();
    const { width, height } = shot.viewport;
    if (Math.max(width, height) > 1280 || Math.min(width, height) < 480) throw new Error('Invalid screenshot dimensions');
    await page.setViewport(shot.viewport);
    if (direct) {
      await page.setRequestInterception(true);
      page.on('request', async request => {
        try {
          const url = new URL(request.url());
          const root = resolvePath('app');
          const file = resolvePath(root, '.' + (url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname)));
          if (url.origin !== 'http://127.0.0.1:8137' || !file.startsWith(root + sep)) return request.abort();
          const contentType = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json' }[extname(file)];
          await request.respond({ status: 200, contentType, body: await readFile(file) });
        } catch { await request.respond({ status: 404, body: 'Not found' }); }
      });
    }
    page.on('pageerror', error => { console.error(error); });
    await page.goto('http://127.0.0.1:8137/' + shot.query, { waitUntil: 'networkidle0' });
    await page.waitForSelector('#trophies .trophy-row');
    await page.evaluate(() => document.fonts.ready);
    const path = 'screenshots/' + shot.file;
    for (const quality of [82, 70, 55, 40]) {
      await page.screenshot({ path, type: 'jpeg', quality });
      if ((await stat(path)).size <= 256 * 1024) break;
    }
    const bytes = (await stat(path)).size;
    if (bytes > 256 * 1024) throw new Error(path + ' exceeds screenshot limit');
    console.log(path, bytes, 'bytes', shot.viewport.width + 'x' + shot.viewport.height);
    await page.close();
  }
} finally {
  await browser?.close();
  server.kill();
}
