'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { ROOT, TEMP, launchBrowser, startServer, openDemo, captureAt, parseArgs, positive,
  getTargets, serveLocalUrl, sampleTimes, imageMetrics, main } = require('./lib');

const THRESHOLDS = { determinism: 0.1, blankDeviation: 1, seamMultiplier: 6, seamOffset: 0.5,
  flickerMultiplier: 8, flickerMinimum: 3 };

async function validate(browser, target, options, out) {
  const result = { id: target.id, name: target.name, url: target.url, errors: [], warnings: [],
    consoleErrors: [], pageErrors: [], failedRequests: [], externalRequests: [], httpErrors: [], frames: [] };
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const metricsPage = await browser.newPage();
  page.on('console', message => { if (message.type() === 'error') result.consoleErrors.push(message.text()); });
  page.on('pageerror', error => result.pageErrors.push(error.message));
  page.on('requestfailed', request => result.failedRequests.push({ url: request.url(), error: request.failure()?.errorText }));
  page.on('response', response => { if (response.status() >= 400) result.httpErrors.push({ url: response.url(), status: response.status() }); });
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol) &&
      !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
      result.externalRequests.push(url.href);
      return route.abort('blockedbyclient');
    }
    return route.continue();
  });
  // WebSocket 요청도 외부 접속 검사에 포함한다.
  await context.routeWebSocket('**/*', socket => {
    const url = new URL(socket.url());
    if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
      result.externalRequests.push(url.href); socket.close();
    } else socket.connectToServer();
  });
  try {
    const dir = path.join(out, target.id);
    await fs.mkdir(dir, { recursive: true });
    await openDemo(page, target.url);
    result.ready = true;
    const runtimeDuration = await page.evaluate(() => window.__demo.duration);
    const duration = positive(target.duration ?? runtimeDuration, 5, 'duration');
    result.duration = duration;
    if (!options.url && (!Number.isFinite(runtimeDuration) || Math.abs(runtimeDuration - 5) > 0.001)) result.errors.push('스타일 재생 길이가 5초가 아닙니다.');
    const times = sampleTimes(duration);
    const labels = times.map(time => time.toFixed(1));
    const preciseLabels = new Set(labels).size < times.length;
    const buffers = [];
    for (const [index, time] of times.entries()) {
      const buffer = await captureAt(page, time);
      const file = path.join(dir, `frame-${preciseLabels ? Number(time.toPrecision(6)) : labels[index]}.png`);
      await fs.writeFile(file, buffer);
      result.frames.push({ time, file }); buffers.push(buffer);
    }
    const frames = await imageMetrics(metricsPage, buffers, times.slice(1).map((_, i) => [i, i + 1]));
    result.frameDeviations = frames.deviations;
    result.adjacentDifferences = frames.differences;
    if (!frames.differences.some(value => value > 0)) result.errors.push('애니메이션이 움직이지 않습니다.');
    if (frames.deviations.some(value => value < THRESHOLDS.blankDeviation)) result.errors.push('비어 있거나 거의 단색인 프레임입니다.');
    const deterministicTime = 2;
    const first = await captureAt(page, deterministicTime);
    const second = await captureAt(page, deterministicTime);
    result.determinismDifference = (await imageMetrics(metricsPage, [first, second], [[0, 1]])).differences[0];
    if (result.determinismDifference > THRESHOLDS.determinism) result.errors.push('같은 시각의 프레임이 달라 결정성이 없습니다.');
    if (!options['no-loop']) {
      const delta = Math.min(0.02, duration / 10);
      const images = [await captureAt(page, duration - delta), await captureAt(page, 0), await captureAt(page, delta)];
      const [seam, start] = (await imageMetrics(metricsPage, images, [[0, 1], [1, 2]])).differences;
      result.loop = { difference: seam, baseline: start, limit: start * THRESHOLDS.seamMultiplier + THRESHOLDS.seamOffset };
      if (seam > result.loop.limit) result.warnings.push('루프 이음매 튐');
    }
    const flickerFrames = [];
    const span = Math.min(0.2, duration * 0.5);
    for (let i = 0; i <= 12; i++) flickerFrames.push(await captureAt(page, duration / 2 - span / 2 + i * span / 12));
    const differences = (await imageMetrics(metricsPage, flickerFrames,
      flickerFrames.slice(1).map((_, i) => [i, i + 1]))).differences;
    const sorted = [...differences].sort((a, b) => a - b);
    const median = (sorted[5] + sorted[6]) / 2;
    const maximum = Math.max(...differences);
    result.flicker = { median, maximum, differences };
    if (maximum > THRESHOLDS.flickerMinimum && maximum > median * THRESHOLDS.flickerMultiplier) {
      result.warnings.push('중간 구간에 과도한 깜빡임이 있습니다.');
    }
    if (!options.url) {
      result.playback = await page.evaluate(async duration => {
        window.__demo.seek(0);
        window.__demo.play();
        let previous = 0, wraps = 0, invalid = false, maximum = 0, samples = 0;
        const started = performance.now();
        let active = true;
        function check() {
          const t = window.__demo.time;
          if (!Number.isFinite(t) || t < 0 || t >= duration) invalid = true;
          if (previous - t > duration / 2) wraps++;
          maximum = Math.max(maximum, t); previous = t; samples++;
          if (active) requestAnimationFrame(check);
        }
        check();
        await new Promise(resolve => setTimeout(resolve, (duration + 0.4) * 1000));
        active = false;
        window.__demo.pause();
        return { time: window.__demo.time, wraps, invalid, maximum, samples, elapsed: (performance.now() - started) / 1000 };
      }, duration);
      if (result.playback.invalid || result.playback.wraps < 1 || result.playback.maximum < duration * 0.85 ||
        result.playback.time > 1 || result.playback.wraps > 1) result.errors.push('실제 시간 재생의 범위 또는 한 바퀴 반복 검증에 실패했습니다.');
    }
    result.resizes = [];
    for (const [width, height] of [[1280, 720], [800, 600]]) {
      await page.setViewportSize({ width, height });
      const buffer = await captureAt(page, deterministicTime);
      const file = path.join(dir, `resize-${width}x${height}.png`);
      await fs.writeFile(file, buffer);
      const deviation = (await imageMetrics(metricsPage, [buffer])).deviations[0];
      result.resizes.push({ width, height, file, deviation });
      if (deviation < THRESHOLDS.blankDeviation) result.errors.push(`${width}x${height} 크기에서 화면이 비어 있습니다.`);
    }
  } catch (error) {
    result.errors.push(error.message);
  } finally {
    await context.close();
    await metricsPage.close();
  }
  for (const [field, label] of [['consoleErrors', '콘솔 오류'], ['pageErrors', '페이지 오류'],
    ['failedRequests', '실패한 요청'], ['externalRequests', '외부 네트워크 요청'], ['httpErrors', 'HTTP 오류']]) {
    if (result[field].length) result.errors.push(`${label} ${result[field].length}건`);
  }
  result.status = result.errors.length ? '실패' : result.warnings.length ? '경고' : '통과';
  return result;
}

async function run(argv = process.argv.slice(2)) {
  const options = parseArgs(argv, { values: ['out', 'url', 'duration'], flags: ['no-loop'] });
  if (options.duration) positive(options.duration, 5, 'duration');
  const out = path.resolve(options.out || path.join(TEMP, 'validate'));
  await fs.mkdir(out, { recursive: true });
  let server, browser;
  const results = [];
  try {
    server = options.url ? await serveLocalUrl(options) : await startServer(ROOT);
    const targets = await getTargets(options, server);
    browser = await launchBrowser();
    for (const target of targets) {
      console.log(`[검증 중] ${target.id}`);
      results.push(await validate(browser, target, options, out));
    }
    await fs.writeFile(path.join(out, 'report.json'), JSON.stringify({ generatedAt: new Date().toISOString(),
      thresholds: THRESHOLDS, results }, null, 2), 'utf8');
    console.table(results.map(result => ({ 스타일: result.id, 결과: result.status,
      실패: result.errors.join(' / ') || '-', 경고: result.warnings.join(' / ') || '-' })));
    console.log(`[보고서] ${path.join(out, 'report.json')}`);
    if (results.some(result => result.errors.length)) process.exitCode = 1;
    return results;
  } finally {
    if (browser) await browser.close();
    if (server) await server.close();
  }
}

if (require.main === module) main(run);
module.exports = { run, validate, THRESHOLDS };
