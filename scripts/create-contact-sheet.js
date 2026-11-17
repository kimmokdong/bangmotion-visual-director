'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { ROOT, TEMP, launchBrowser, startServer, openDemo, captureAt, parseArgs, positive, getTargets, serveLocalUrl, main } = require('./lib');

async function compose(browser, title, cells, columns, file) {
  const width = columns * 640, height = 64 + Math.max(columns === 4 ? 2 : 1, Math.ceil(cells.length / columns)) * 360;
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  try {
    await page.setContent(`<style>
      *{box-sizing:border-box}body{margin:0;background:#111827;color:white;font-family:'Malgun Gothic',system-ui,sans-serif}
      h1{height:64px;margin:0;padding:14px 24px;font-size:26px;line-height:36px}
      main{display:grid;grid-template-columns:repeat(${columns},640px)}
      section{position:relative;width:640px;height:360px}img{display:block;width:640px;height:360px;object-fit:contain}
      span{position:absolute;left:12px;top:12px;padding:5px 10px;border-radius:5px;background:#111c;font-size:20px}
      </style><h1></h1><main></main>`);
    await page.evaluate(async ({ title, cells }) => {
      document.querySelector('h1').textContent = title;
      for (const cell of cells) {
        const section = document.createElement('section');
        const img = new Image(); img.src = `data:image/png;base64,${cell.image}`;
        const label = document.createElement('span'); label.textContent = cell.label;
        section.append(img, label); document.querySelector('main').append(section);
        await img.decode();
      }
      await document.fonts.ready;
    }, { title, cells });
    await fs.writeFile(file, await page.screenshot({ type: 'png', scale: 'css' }));
    console.log(`[생성] ${file}`);
  } finally { await page.close(); }
}

async function run(argv = process.argv.slice(2)) {
  const options = parseArgs(argv, { values: ['out', 'times', 'url', 'duration'], flags: ['all-sheet'] });
  if (options.url && options['all-sheet']) throw new Error('--all-sheet는 스타일 목록에만 사용할 수 있습니다.');
  if (options.duration) positive(options.duration, 5, 'duration');
  let explicitTimes;
  if (options.times !== undefined) {
    explicitTimes = options.times.split(',').map(value => value.trim() === '' ? NaN : Number(value));
    if (explicitTimes.some(value => !Number.isFinite(value) || value < 0)) throw new Error('--times는 음수가 아닌 시각의 쉼표 목록이어야 합니다.');
  }
  const out = path.resolve(options.out || path.join(TEMP, 'sheets'));
  await fs.mkdir(out, { recursive: true });
  let browser, server;
  try {
    server = options.url ? await serveLocalUrl(options) : await startServer(ROOT);
    const targets = await getTargets(options, server);
    browser = await launchBrowser();
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
    for (const target of targets) {
      await openDemo(page, target.url);
      const duration = positive(target.duration ?? await page.evaluate(() => window.__demo.duration), 5, 'duration');
      const times = explicitTimes || (options.url ? Array.from({ length: 6 }, (_, i) => i === 5 ?
        Math.max(0, duration - 0.1) : duration * i / 5) : [0, 1, 2, 3, 4, 4.9]);
      const cells = [];
      for (const time of times) cells.push({ label: `${time.toFixed(1)}s`, image: (await captureAt(page, time)).toString('base64') });
      const directory = path.join(out, target.id);
      await fs.mkdir(directory, { recursive: true });
      await compose(browser, target.name, cells, 3, path.join(directory, 'contact-sheet.png'));
    }
    if (options['all-sheet']) {
      const all = await getTargets({ ids: [] }, server);
      const cells = [];
      for (const target of all) {
        await openDemo(page, target.url);
        cells.push({ label: `${target.id} ${target.name}`, image: (await captureAt(page, 2)).toString('base64') });
      }
      await compose(browser, '전체 스타일 · 2.0s', cells, 4, path.join(out, 'overview.png'));
    }
  } finally {
    if (browser) await browser.close();
    if (server) await server.close();
  }
}

if (require.main === module) main(run);
module.exports = { run, compose };
