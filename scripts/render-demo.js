'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { launchBrowser, startServer, openDemo, captureAt, hasFFmpeg, runFFmpeg, parseArgs, positive, inside, main } = require('./lib');
const { muxInto } = require('./sound');

async function run(argv = process.argv.slice(2)) {
  const options = parseArgs(argv, { values: ['url', 'out', 'duration', 'fps', 'width', 'height', 'scale', 'thumbnail', 'root', 'sound'], flags: ['draft', 'keep-frames', 'no-sound'] });
  if (!options.url || (!options.out && !options.draft) || options.ids.length) throw new Error('--url과 --out이 필요합니다. (--draft는 --out 생략 가능)');
  const fps = options.draft ? 15 : positive(options.fps, 30, 'fps');
  const divisor = options.draft ? 2 : 1;
  const width = Math.max(1, Math.floor(positive(options.width, 1920, 'width', true) / divisor));
  const height = Math.max(1, Math.floor(positive(options.height, 1080, 'height', true) / divisor));
  const scale = positive(options.scale, 1, 'scale');
  if (options.duration !== undefined) positive(options.duration, 5, 'duration');
  const thumbnail = options.thumbnail === undefined ? undefined : Number(options.thumbnail);
  if (thumbnail !== undefined && (!Number.isFinite(thumbnail) || thumbnail < 0)) throw new Error('thumbnail은 음수가 아닌 시각이어야 합니다.');
  const remote = /^https?:\/\//i.test(options.url);
  const source = path.parse(remote ? new URL(options.url).pathname : path.resolve(options.url));
  const requested = path.parse(path.resolve(options.out ?? path.join(remote ? '.' : source.dir, 'out', `${source.name || 'video'}.mp4`)));
  const suffix = options.draft && !requested.name.endsWith('-draft') ? '-draft' : '';
  const out = path.join(requested.dir, `${requested.name}${suffix}${requested.ext}`);
  if (path.extname(out).toLowerCase() !== '.mp4') throw new Error('--out은 .mp4 파일이어야 합니다.');
  const ffmpeg = hasFFmpeg();
  if (!ffmpeg) console.warn('[경고] ffmpeg가 없어 MP4 인코딩을 건너뜁니다.');
  if (!ffmpeg && thumbnail === undefined && !options['keep-frames']) return;
  let browser, server, frames, encoded = false;
  let soundProject = options.sound;
  try {
    let url = options.url;
    if (!remote) {
      const file = await fs.realpath(path.resolve(url));
      soundProject ??= path.dirname(file);
      const root = await fs.realpath(path.resolve(options.root || path.dirname(file)));
      if (!inside(root, file)) throw new Error('로컬 HTML 파일이 --root 밖에 있습니다.');
      server = await startServer(root);
      url = `${server.url}/${path.relative(root, file).split(path.sep).map(encodeURIComponent).join('/')}`;
    }
    browser = await launchBrowser();
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: scale });
    await openDemo(page, url);
    const duration = positive(options.duration, await page.evaluate(() => window.__demo.duration), 'duration');
    await fs.mkdir(path.dirname(out), { recursive: true });
    // 출력 픽셀 수에도 배율을 적용한다.
    const frameAt = time => captureAt(page, time, 'device');
    if (thumbnail !== undefined) {
      const file = out.slice(0, -4) + '.png';
      await fs.writeFile(file, await frameAt(thumbnail));
      console.log(`[썸네일] ${file}`);
    }
    if (!ffmpeg && !options['keep-frames']) return;
    frames = await fs.mkdtemp(path.join(os.tmpdir(), 'bmvd-render-'));
    const count = Math.ceil(duration * fps);
    let lastPercent = -1;
    for (let i = 0; i < count; i++) {
      await fs.writeFile(path.join(frames, `${String(i).padStart(6, '0')}.png`), await frameAt(i / fps));
      const percent = Math.floor((i + 1) / count * 100);
      if (percent >= lastPercent + 5 || i === count - 1) {
        console.log(`[렌더링] ${percent}% (${i + 1}/${count})`); lastPercent = percent;
      }
    }
    if (ffmpeg) {
      await runFFmpeg(['-framerate', String(fps), '-i', path.join(frames, '%06d.png'), '-t', String(duration),
        '-vf', 'pad=ceil(iw/2)*2:ceil(ih/2)*2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', options.draft ? '23' : '16',
        '-movflags', '+faststart', out]);
      encoded = true;
      if (soundProject && !options['no-sound']) await muxInto(soundProject, out);
      console.log(`[생성] ${out}`);
    }
  } finally {
    if (browser) await browser.close();
    if (server) await server.close();
    if (frames) {
      if (options['keep-frames'] || (!encoded && ffmpeg)) console.log(`[프레임 보존] ${frames}`);
      else await fs.rm(frames, { recursive: true, force: true });
    }
  }
}

if (require.main === module) main(run);
module.exports = { run };
