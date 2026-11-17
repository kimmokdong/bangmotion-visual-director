'use strict';

const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { ROOT, launchBrowser, startServer, getTargets, openDemo, captureAt, hasFFmpeg, runFFmpeg, parseArgs, main } = require('./lib');

async function capturePreview(browser, target, { ffmpeg = hasFFmpeg() } = {}) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  let frames;
  try {
    await openDemo(page, target.url);
    const time = target.preview_t === undefined ? 2 : Number(target.preview_t);
    if (!Number.isFinite(time) || time < 0 || time >= 5) throw new Error(`${target.id}: preview_t는 0 이상 5 미만이어야 합니다.`);
    const png = path.join(target.dir, 'preview.png');
    await fs.writeFile(png, await captureAt(page, time));
    console.log(`[생성] ${png}`);
    if (!ffmpeg) return;
    frames = await fs.mkdtemp(path.join(os.tmpdir(), 'bmvd-preview-'));
    await page.setViewportSize({ width: 480, height: 270 });
    for (let i = 0; i < 60; i++) {
      await fs.writeFile(path.join(frames, `${String(i).padStart(5, '0')}.png`), await captureAt(page, i / 12));
    }
    const gif = path.join(target.dir, 'preview.gif');
    await runFFmpeg(['-framerate', '12', '-i', path.join(frames, '%05d.png'), '-filter_complex',
      '[0:v]split[a][b];[a]palettegen[p];[b][p]paletteuse', '-loop', '0', gif]);
    console.log(`[생성] ${gif}`);
  } finally {
    await page.close();
    if (frames) await fs.rm(frames, { recursive: true, force: true });
  }
}

async function run(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const ffmpeg = hasFFmpeg();
  if (!ffmpeg) console.warn('[경고] ffmpeg가 없어 GIF를 건너뛰고 PNG만 생성합니다.');
  let browser, server;
  try {
    server = await startServer(ROOT);
    const targets = await getTargets(options, server);
    browser = await launchBrowser();
    for (const target of targets) await capturePreview(browser, target, { ffmpeg });
  } finally {
    if (browser) await browser.close();
    if (server) await server.close();
  }
}

if (require.main === module) main(run);
module.exports = { run, capturePreview };
