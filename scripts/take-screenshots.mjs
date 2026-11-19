import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const chromePath = '/home/hatch/.cache/puppeteer/chrome-headless-shell/linux-157.0.8103.50/chrome-headless-shell-linux64/chrome-headless-shell';
const maxBytes = 262144;
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

function connect(browser) {
  const writer = browser.stdio[3];
  const reader = browser.stdio[4];
  const pending = new Map();
  let nextId = 0;
  let failure;
  let buffer = '';

  function disconnect(error) {
    failure ??= error;
    for (const request of pending.values()) request.finish(failure);
  }

  browser.on('error', disconnect);
  browser.on('close', (code, signal) => {
    disconnect(new Error('Chrome closed (' + (signal ?? code) + ')'));
  });
  writer.on('error', disconnect);
  reader.on('error', disconnect);
  reader.on('end', () => disconnect(new Error('Chrome closed the DevTools pipe')));

  reader.setEncoding('utf8');
  reader.on('data', (chunk) => {
    buffer += chunk;
    let end;
    while ((end = buffer.indexOf('\0')) !== -1) {
      const frame = buffer.slice(0, end);
      buffer = buffer.slice(end + 1);
      if (!frame) continue;
      let message;
      try {
        message = JSON.parse(frame);
      } catch (error) {
        disconnect(error);
        return;
      }

      if (message.id !== undefined) {
        const request = pending.get(message.id);
        if (!request) continue;
        const error = message.error
          ? new Error(request.method + ': ' + message.error.message)
          : null;
        request.finish(error, message.result);
      } else if (message.method === 'Target.detachedFromTarget') {
        for (const request of pending.values()) {
          if (request.sessionId === message.params.sessionId) {
            request.finish(new Error('Chrome detached from the capture target'));
          }
        }
      }
    }
  });

  return function send(method, params = {}, sessionId, timeoutMs = 15000) {
    if (failure) return Promise.reject(failure);
    const id = ++nextId;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => finish(new Error(method + ' timed out')), timeoutMs);
      function finish(error, result) {
        clearTimeout(timer);
        pending.delete(id);
        if (error) reject(error);
        else resolve(result);
      }
      pending.set(id, { method, sessionId, finish });
      writer.write(JSON.stringify({ id, method, params, sessionId }) + '\0', (error) => {
        if (error) finish(error);
      });
    });
  };
}

async function waitForRender(send, sessionId, file) {
  const deadline = Date.now() + 15000;
  const expression = "document.readyState === 'complete' && Boolean(document.querySelectorAll('.trophy-row').length > 0 || document.querySelector('.roadmap'))";
  while (Date.now() < deadline) {
    const { result } = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
    }, sessionId, Math.max(1, deadline - Date.now()));
    if (result.value === true) return;
    await sleep(100);
  }
  throw new Error(file + ': app did not render within 15 seconds');
}

async function captureScenes() {
  const scenes = JSON.parse(readFileSync('shots.json', 'utf8'));
  const pageUrl = 'file://' + resolve('app/index.html').split('/').map(encodeURIComponent).join('/');
  mkdirSync('screenshots', { recursive: true });
  const profile = mkdtempSync('/tmp/gta6-screenshots-');

  try {
    const browser = spawn(chromePath, [
      '--remote-debugging-pipe',
      '--allow-file-access-from-files',
      '--no-sandbox',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      '--user-data-dir=' + profile,
      'about:blank',
    ], { stdio: ['ignore', 'pipe', 'pipe', 'pipe', 'pipe'] });
    const closed = new Promise((done) => browser.once('close', done));
    browser.stdout.resume();
    browser.stderr.pipe(process.stderr, { end: false });
    const send = connect(browser);

    try {
      for (const { file, query, viewport } of scenes) {
        // Isolate localStorage so one preset cannot seed the next capture.
        const { browserContextId } = await send('Target.createBrowserContext');
        const { targetId } = await send('Target.createTarget', { url: 'about:blank', browserContextId });
        const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
        await send('Emulation.setDeviceMetricsOverride', {
          ...viewport,
          deviceScaleFactor: 1,
          mobile: false,
        }, sessionId);
        const { errorText } = await send('Page.navigate', { url: pageUrl + query }, sessionId);
        if (errorText) throw new Error(file + ': ' + errorText);
        await waitForRender(send, sessionId, file);
        await sleep(600);

        let bytes;
        for (const quality of [82, 60, 45]) {
          const { data } = await send('Page.captureScreenshot', { format: 'jpeg', quality }, sessionId);
          bytes = Buffer.from(data, 'base64');
          if (bytes.length <= maxBytes) break;
        }
        if (bytes.length > maxBytes) {
          throw new Error(file + ': ' + bytes.length + ' bytes exceeds the ' + maxBytes + ' byte limit');
        }
        writeFileSync(join('screenshots', file), bytes);
        console.log(file + ' (' + bytes.length + ' bytes)');
        await send('Target.disposeBrowserContext', { browserContextId });
      }
    } finally {
      const killTimer = setTimeout(() => browser.kill('SIGKILL'), 2000);
      browser.kill();
      await closed;
      clearTimeout(killTimer);
    }
  } finally {
    rmSync(profile, { recursive: true, force: true });
  }
}

try {
  await captureScenes();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
