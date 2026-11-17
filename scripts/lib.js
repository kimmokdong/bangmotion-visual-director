'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const fsSync = require('node:fs');
const os = require('node:os');
const http = require('node:http');
const { randomUUID } = require('node:crypto');
const { spawn, spawnSync } = require('node:child_process');
const { chromium } = require('playwright-core');

const ROOT = path.resolve(__dirname, '..');
const TEMP = path.join(os.tmpdir(), 'bangmotion-visual-director');
const SELECTION = path.join(TEMP, 'selection.json');
let selectionQueue = Promise.resolve();

// Windows에서는 파일을 읽는 중에도 교체가 거부될 수 있어 선택 파일 접근을 직렬화한다.
function accessSelection(action) {
  const next = selectionQueue.then(action);
  selectionQueue = next.catch(() => {});
  return next;
}

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.gif': 'image/gif',
  '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };

async function launchBrowser() {
  const failures = [];
  const base = ['--ignore-gpu-blocklist', '--enable-gpu'];
  const modes = [
    { name: 'd3d11', args: [...base, '--use-angle=d3d11'] },
    { name: 'swiftshader', args: [...base, '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
  ];
  for (const channel of ['chrome', 'msedge']) {
    for (const mode of modes) {
      let browser;
      try {
        browser = await chromium.launch({ channel, headless: true, args: mode.args });
        const page = await browser.newPage();
        const gl = await page.evaluate(() => {
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('webgl2') || canvas.getContext('webgl');
          if (!context || context.isContextLost()) return null;
          context.clearColor(0.25, 0.5, 0.75, 1);
          context.clear(context.COLOR_BUFFER_BIT);
          const pixel = new Uint8Array(4);
          context.readPixels(0, 0, 1, 1, context.RGBA, context.UNSIGNED_BYTE, pixel);
          if (pixel[0] < 60 || pixel[2] < 185) return null;
          return context.getParameter(context.VERSION);
        });
        await page.close();
        if (!gl) throw new Error('WebGL 컨텍스트 생성 또는 픽셀 읽기 실패');
        console.log(`[브라우저] ${channel} / ${mode.name} / ${gl}`);
        return browser;
      } catch (error) {
        failures.push(`${channel}/${mode.name}: ${error.message}`);
        if (browser) await browser.close().catch(() => {});
      }
    }
  }
  throw new Error(`Chrome/Edge의 WebGL 실행에 실패했습니다.\n${failures.join('\n')}`);
}

async function listStyles(rootDir = ROOT) {
  const directory = path.join(rootDir, 'styles');
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const styles = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const dir = path.join(directory, entry.name);
    let metadata;
    try { metadata = JSON.parse(await fs.readFile(path.join(dir, 'style.json'), 'utf8')); }
    catch (error) { if (error.code === 'ENOENT') continue; throw error; }
    styles.push({ ...metadata, id: entry.name, name: metadata.name || entry.name, dir });
  }
  const number = style => Number.isFinite(Number(style.number)) ? Number(style.number) : parseInt(style.id, 10) || 0;
  return styles.sort((a, b) => number(a) - number(b) || a.id.localeCompare(b.id, 'en', { numeric: true }));
}

function inside(root, target) {
  const relative = path.relative(root, target);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

async function startServer(rootDir = ROOT, { port = 0, clear = false } = {}) {
  const root = await fs.realpath(path.resolve(rootDir));
  if (!(await fs.stat(root)).isDirectory()) throw new Error(`서버 루트가 폴더가 아닙니다: ${root}`);
  if (clear) await accessSelection(() => fs.rm(SELECTION, { force: true }));
  const server = http.createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const json = (status, body) => {
      res.writeHead(status, { 'Content-Type': MIME['.json'] });
      res.end(JSON.stringify(body));
    };
    try {
      const pathname = decodeURIComponent(req.url.split('?')[0]).replaceAll('\\', '/');
      if (pathname.includes('\0') || pathname.split('/').includes('..')) return json(403, { error: '경로 탈출 금지' });
      if (pathname === '/api/select') {
        if (req.method !== 'POST') return json(405, { error: 'POST만 허용됩니다.' });
        if (!(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) {
          req.resume(); return json(415, { error: 'JSON 본문이 필요합니다.' });
        }
        let size = 0;
        const chunks = [];
        for await (const chunk of req) {
          size += chunk.length;
          if (size > 4096) { req.resume(); return json(413, { error: '본문은 4KB 이하여야 합니다.' }); }
          chunks.push(chunk);
        }
        let value;
        try { value = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
        catch { return json(400, { error: '잘못된 JSON입니다.' }); }
        if (!value || typeof value.id !== 'string' || typeof value.name !== 'string' ||
          !value.name.trim() || value.name.length > 200 || /[\x00-\x1f\x7f]/.test(value.name)) {
          return json(400, { error: '올바른 id와 name이 필요합니다.' });
        }
        const styles = await listStyles(root);
        if (!styles.some(style => style.id === value.id)) return json(400, { error: '존재하지 않는 스타일입니다.' });
        const selection = { id: value.id, name: value.name, selectedAt: new Date().toISOString() };
        await accessSelection(async () => {
          await fs.mkdir(TEMP, { recursive: true });
          const temporary = path.join(TEMP, `selection-${randomUUID()}.json`);
          try {
            await fs.writeFile(temporary, JSON.stringify(selection, null, 2), 'utf8');
            await fs.rename(temporary, SELECTION);
          } finally { await fs.rm(temporary, { force: true }); }
        });
        console.log(`[선택됨] ${selection.id} ${selection.name}`);
        return json(200, { ok: true, file: SELECTION });
      }
      if (pathname === '/api/styles') {
        // 갤러리가 styles/*/style.json 을 한 번에 읽는다(dir 은 로컬 경로라 빼고 보낸다).
        return json(200, (await listStyles(root)).map(({ dir, ...style }) => style));
      }
      if (pathname === '/api/selection') {
        if (req.method !== 'GET') return json(405, { error: 'GET만 허용됩니다.' });
        try { return json(200, JSON.parse(await accessSelection(() => fs.readFile(SELECTION, 'utf8')))); }
        catch (error) { if (error.code === 'ENOENT') return json(200, { id: null }); throw error; }
      }
      if (!['GET', 'HEAD'].includes(req.method)) return json(405, { error: '허용되지 않는 메서드입니다.' });
      let file = path.resolve(root, `.${pathname}`);
      if (!inside(root, file)) return json(403, { error: '경로 탈출 금지' });
      file = await fs.realpath(file);
      if (!inside(root, file)) return json(403, { error: '루트 밖 링크 금지' });
      if ((await fs.stat(file)).isDirectory()) file = await fs.realpath(path.join(file, 'index.html'));
      if (!inside(root, file)) return json(403, { error: '루트 밖 링크 금지' });
      const content = await fs.readFile(file);
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
        'Content-Length': content.length });
      res.end(req.method === 'HEAD' ? undefined : content);
    } catch (error) {
      if (res.headersSent) { res.end(); return; }
      const status = error instanceof URIError ? 400 : ['ENOENT', 'ENOTDIR', 'EISDIR'].includes(error.code) ? 404 : 500;
      json(status, { error: status === 500 ? '서버 처리 중 오류가 발생했습니다.' : '요청한 파일을 찾을 수 없습니다.' });
      if (status === 500) console.error(error.message);
    }
  });
  let candidate = port;
  for (;;) {
    try {
      await new Promise((resolve, reject) => {
        const onError = error => { server.off('listening', onListen); reject(error); };
        const onListen = () => { server.off('error', onError); resolve(); };
        server.once('error', onError);
        server.once('listening', onListen);
        server.listen(candidate, '127.0.0.1');
      });
      break;
    } catch (error) {
      if (error.code !== 'EADDRINUSE' || candidate === 0 || candidate === 65535) throw error;
      candidate++;
    }
  }
  return { url: `http://localhost:${server.address().port}`, port: server.address().port,
    close: () => new Promise((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve());
      server.closeAllConnections();
    }) };
}

async function openDemo(page, url) {
  const response = await page.goto(url, { waitUntil: 'load', timeout: 30000 });
  if (response && !response.ok()) throw new Error(`페이지 로드 실패: HTTP ${response.status()}`);
  await page.waitForFunction(() => window.__demoReady === true, null, { timeout: 30000 });
  await page.evaluate(async () => {
    if (typeof window.__demo?.seek !== 'function') throw new Error('__demo.seek 계약이 없습니다.');
    window.__demo.pause?.();
    await document.fonts.ready;
  });
}

async function captureAt(page, t, scale = 'css') {
  if (!Number.isFinite(t)) throw new Error('캡처 시각은 유한한 숫자여야 합니다.');
  await page.evaluate(async time => {
    await window.__demo.seek(time);
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }, t);
  return page.screenshot({ type: 'png', scale, timeout: 30000 });
}

function hasFFmpeg() { return spawnSync('ffmpeg', ['-version'], { stdio: 'ignore', windowsHide: true }).status === 0; }

function runFFmpeg(args) {
  return new Promise((resolve, reject) => {
    const child = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { windowsHide: true });
    let errors = '';
    child.stderr.on('data', chunk => { errors = (errors + chunk).slice(-12000); });
    child.on('error', reject);
    child.on('close', code => code === 0 ? resolve() : reject(new Error(`ffmpeg 실패 (${code}): ${errors}`)));
  });
}

function parseArgs(argv, { values = [], flags = [] } = {}) {
  const options = { ids: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) { options.ids.push(arg); continue; }
    const key = arg.slice(2);
    if (flags.includes(key)) options[key] = true;
    else if (values.includes(key)) {
      if (!argv[i + 1] || argv[i + 1].startsWith('--')) throw new Error(`${arg} 값이 필요합니다.`);
      options[key] = argv[++i];
    } else throw new Error(`알 수 없는 옵션: ${arg}`);
  }
  return options;
}

function positive(value, fallback, name, integer = false) {
  const number = value === undefined ? fallback : Number(value);
  if (!Number.isFinite(number) || number <= 0 || (integer && !Number.isInteger(number))) {
    throw new Error(`${name}: ${integer ? '양의 정수' : '양수'}가 필요합니다.`);
  }
  return number;
}

// --url 에 로컬 HTML 경로가 오면 그 폴더를 임시 서버로 띄우고 options.url 을 http 주소로 바꾼다.
async function serveLocalUrl(options) {
  if (!options.url || /^https?:/i.test(options.url)) return null;
  const file = path.resolve(options.url.replace(/^file:\/\/\/?/i, ''));
  if (!fsSync.existsSync(file)) throw new Error(`데모 파일이 없습니다: ${file}`);
  const server = await startServer(path.dirname(file));
  options.url = `${server.url}/${encodeURIComponent(path.basename(file))}`;
  return server;
}

async function getTargets(options, server) {
  if (options.url) {
    if (options.ids.length) throw new Error('--url과 스타일 ID는 함께 사용할 수 없습니다.');
    const url = new URL(options.url);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('http(s) 데모 주소가 필요합니다.');
    return [{ id: 'custom', name: '사용자 데모', url: url.href, duration: options.duration ? positive(options.duration, 5, 'duration') : undefined }];
  }
  const styles = await listStyles();
  for (const id of options.ids) if (!styles.some(style => style.id === id)) throw new Error(`없는 스타일: ${id}`);
  const chosen = options.ids.length ? styles.filter(style => options.ids.includes(style.id)) : styles;
  if (!chosen.length) throw new Error('style.json이 있는 스타일이 없습니다.');
  return chosen.map(style => ({ ...style, url: `${server.url}/styles/${encodeURIComponent(style.id)}/index.html`, duration: 5 }));
}

function sampleTimes(duration) { return [0, 0.2, 0.4, 0.6, 0.8, 0.98].map(ratio => ratio * duration); }

async function imageMetrics(page, buffers, pairs = []) {
  return page.evaluate(async ({ images, pairs }) => {
    const pixels = [];
    const deviations = [];
    for (const image of images) {
      const img = new Image();
      img.src = `data:image/png;base64,${image}`;
      await img.decode();
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let sum = 0, square = 0;
      for (let i = 0; i < data.length; i += 4) {
        const luminance = data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722;
        sum += luminance; square += luminance * luminance;
      }
      const count = data.length / 4;
      deviations.push(Math.sqrt(Math.max(0, square / count - (sum / count) ** 2)));
      pixels.push(data);
    }
    const differences = pairs.map(([a, b]) => {
      if (pixels[a].length !== pixels[b].length) throw new Error('비교 이미지 크기가 다릅니다.');
      let sum = 0;
      for (let i = 0; i < pixels[a].length; i += 4) {
        for (let c = 0; c < 3; c++) sum += Math.abs(pixels[a][i + c] - pixels[b][i + c]);
      }
      return sum / (pixels[a].length / 4 * 3);
    });
    return { deviations, differences };
  }, { images: buffers.map(buffer => buffer.toString('base64')), pairs });
}

function main(fn) {
  fn().catch(error => { console.error(`[오류] ${error.message}`); process.exitCode = 1; });
}

module.exports = { ROOT, TEMP, SELECTION, launchBrowser, startServer, listStyles, openDemo, captureAt,
  hasFFmpeg, runFFmpeg, parseArgs, positive, getTargets, serveLocalUrl, sampleTimes, imageMetrics, inside, main };
