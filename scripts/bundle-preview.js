'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { fileURLToPath, pathToFileURL } = require('node:url');
const { build } = require('esbuild');
const { hasFFmpeg, inside, main, parseArgs, readJSON, runFFmpeg } = require('./lib');
const { buildMix, previewTracks } = require('./sound');

const assetTypes = {
  '.avif': 'image/avif', '.gif': 'image/gif', '.ico': 'image/x-icon', '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
  '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.opus': 'audio/ogg', '.wav': 'audio/wav',
  '.m4a': 'audio/mp4', '.aac': 'audio/aac', '.flac': 'audio/flac',
  '.mp4': 'video/mp4', '.webm': 'video/webm',
};
const dataLoaders = Object.fromEntries(Object.keys(assetTypes).map(ext => [ext, 'dataurl']));
const attribute = (tag, key) => {
  const match = tag.match(new RegExp('(?:^|\\s)' + key + '\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\'|([^\\s>]+))', 'i'));
  return match?.slice(1).find(value => value !== undefined);
};
const rawText = (text, tag) => text.replace(new RegExp('</' + tag, 'gi'), match => '<\\/' + match.slice(2));
const inlineJSON = value => JSON.stringify(value).replaceAll('<', '\\u003c');
const optional = promise => promise.catch(error => { if (error.code !== 'ENOENT') throw error; });

async function bundleAudio(project, external) {
  const mix = path.join(project, 'out', 'sound', 'mix.wav');
  const mixStat = await optional(fs.stat(mix));
  if (external) return { src: mixStat?.isFile() ? './out/sound/mix.wav' : '' };

  const configFile = path.join(project, 'sound.json');
  const cfg = await optional(readJSON(configFile));
  if (cfg?.mode === 'none') return {};
  if (!mixStat?.isFile() && cfg === undefined) return {};

  let bytes = 0;
  let encodedBytes = 0;
  async function embed(file, type) {
    const data = await fs.readFile(file);
    const encoded = data.toString('base64');
    bytes += data.length;
    encodedBytes += encoded.length;
    return 'data:' + type + ';base64,' + encoded;
  }

  let result;
  if (process.env.BMVD_NO_FFMPEG !== '1' && hasFFmpeg()) {
    const work = await fs.mkdtemp(path.join(__dirname, '.preview-audio-'));
    try {
      const configStat = cfg === undefined ? undefined : await fs.stat(configFile);
      const fresh = mixStat?.isFile() && (!configStat || mixStat.mtimeMs >= configStat.mtimeMs);
      const input = fresh ? mix : (await buildMix(project, { quiet: true, outputDir: work }))?.mix;
      if (!input) return {};
      const mp3 = path.join(work, 'preview.mp3');
      await runFFmpeg(['-i', input, '-vn', '-c:a', 'libmp3lame', '-b:a', '128k', mp3]);
      result = { src: await embed(mp3, 'audio/mpeg') };
    } finally {
      await fs.rm(work, { recursive: true, force: true });
    }
  } else if (cfg !== undefined) {
    const files = new Map();
    const assets = [];
    const tracks = [];
    for (const { file, ...track } of previewTracks(cfg, project)) {
      if (!files.has(file)) {
        const type = assetTypes[path.extname(file).toLowerCase()];
        if (!type?.startsWith('audio/') && !type?.startsWith('video/')) {
          throw new Error('브라우저에 내장할 수 없는 소리 파일입니다: ' + path.basename(file));
        }
        files.set(file, assets.length);
        assets.push(await embed(file, type));
      }
      tracks.push({ ...track, asset: files.get(file) });
    }
    if (!tracks.length) return {};
    result = { webAudio: { assets, tracks } };
    console.log('[소리] ffmpeg 없음 — 원본을 내장해 음량 측정 없이 재생합니다.');
  }
  if (result) console.log(`[소리 내장] ${bytes} bytes · HTML base64 ${encodedBytes} bytes`);
  return result ?? {};
}

async function run(directory, externalAudio) {
  const project = await fs.realpath(path.resolve(directory));
  const entry = path.join(project, 'index.html');
  let html = await fs.readFile(entry, 'utf8');
  const manifest = await optional(readJSON(path.join(project, 'scenes.json')));
  const { fps = 30, aspect = '16:9', scenes = [] } = manifest ?? {};
  const invalidManifest = manifest !== undefined && (!manifest || typeof manifest !== 'object' || Array.isArray(manifest));
  if (invalidManifest || !Number.isFinite(fps) || fps <= 0 || !['16:9', '9:16'].includes(aspect) ||
      !Array.isArray(scenes) || scenes.some(scene => !scene || typeof scene.id !== 'string' || !scene.id ||
        typeof scene.label !== 'string' || !scene.label.trim() || !Number.isFinite(scene.start) ||
        !Number.isFinite(scene.end) || scene.start < 0 || scene.end <= scene.start)) {
    throw new Error('scenes.json의 fps, aspect, scenes 형식을 확인하세요.');
  }
  const { src, webAudio } = await bundleAudio(project, externalAudio);
  const config = { fps, scenes, missingScenes: manifest === undefined, projectName: path.basename(project), webAudio };
  const sources = new Map();
  const imports = {};
  const modules = [];
  const styles = [];
  let usedSkillRuntime = false;

  function localPath(url, directory = project) {
    if (!url) throw new Error('리소스 경로가 비어 있습니다.');
    if (url.startsWith('/') && !url.startsWith('//')) {
      const pathname = new URL(url, 'http://localhost').pathname;
      return path.resolve(project, '.' + decodeURIComponent(pathname));
    }
    const resolved = new URL(url, pathToFileURL(directory + path.sep));
    if (resolved.protocol !== 'file:' || resolved.host) throw new Error('로컬 파일 경로가 필요합니다: ' + url);
    return fileURLToPath(resolved);
  }

  function inlineSource(contents, loader) {
    const name = 'bmvd-inline:' + sources.size;
    sources.set(name, { contents, loader, resolveDir: project });
    return name;
  }

  function entryPath(url) {
    return './' + path.relative(project, localPath(url)).replaceAll('\\', '/');
  }

  // 스킬의 HTML 재생 계약에서 쓰는 스크립트·스타일 태그를 번들 진입점으로 모은다.
  html = html.replace(/<!--[\s\S]*?-->|<(script|style)\b([^>]*)>([\s\S]*?)<\/\1\s*>|<link\b[^>]*>/gi,
    (tag, kind, attrs, contents) => {
      if (tag.startsWith('<!--')) return tag;
      if (kind?.toLowerCase() === 'style') {
        styles.push({ source: inlineSource(contents, 'css'), media: attribute(attrs, 'media') });
        return '';
      }
      if (!kind) {
        const rel = attribute(tag, 'rel')?.toLowerCase();
        if (rel === 'modulepreload' || rel === 'preload') return '';
        if (rel !== 'stylesheet') return tag;
        styles.push({ source: entryPath(attribute(tag, 'href')), media: attribute(tag, 'media') });
        return '';
      }
      const type = attribute(attrs, 'type')?.toLowerCase();
      if (type === 'importmap') {
        Object.assign(imports, JSON.parse(contents).imports);
        return '';
      }
      const src = attribute(attrs, 'src');
      if (type === 'module') {
        modules.push(src ? entryPath(src) : inlineSource(contents, 'js'));
        return '';
      }
      if (src && (!type || /^(text|application)\/javascript$/.test(type))) {
        throw new Error('외부 스크립트는 index.html에서 type="module"로 연결하세요: ' + src);
      }
      return tag;
    });
  if (!modules.length) throw new Error('index.html에 type="module" 진입점이 필요합니다.');

  const mappedNames = Object.keys(imports).sort((a, b) => b.length - a.length);
  const options = {
    absWorkingDir: project, bundle: true, write: false, outdir: project,
    logLevel: 'silent', minify: true, charset: 'utf8', legalComments: 'inline', loader: dataLoaders,
    plugins: [{
      name: 'preview-entry',
      setup(plugin) {
        plugin.onResolve({ filter: /^bmvd-inline:/ }, args => ({ path: args.path, namespace: 'preview' }));
        plugin.onLoad({ filter: /.*/, namespace: 'preview' }, args => sources.get(args.path));
        plugin.onLoad({ filter: /[\\/]runtime\.js$/, namespace: 'file' }, async args => {
          if (!inside(project, args.path)) return;
          const contents = await fs.readFile(args.path, 'utf8');
          if (contents.includes('__bmvdPreview')) return;
          const runtime = path.join(__dirname, '..', 'shared', 'runtime.js');
          usedSkillRuntime = true;
          return { contents: await fs.readFile(runtime, 'utf8'), loader: 'js', resolveDir: path.dirname(runtime) };
        });
        plugin.onResolve({ filter: /.*/ }, args => {
          if (args.path.startsWith('data:')) return;
          if (/^(https?:)?\/\//i.test(args.path)) throw new Error('원격 리소스를 로컬 파일로 바꾸세요: ' + args.path);
          const key = mappedNames.find(name => name === args.path || (name.endsWith('/') && args.path.startsWith(name)));
          if (key) return { path: localPath(imports[key] + args.path.slice(key.length)) };
          if (args.kind === 'url-token' && args.path.startsWith('#')) return { path: args.path, external: true };
          // HTML에서처럼 확장자가 있는 상대 경로는 디렉터리 탐색 없이 연결한다.
          if (/^(?:\.{1,2})?\//.test(args.path) || args.kind === 'url-token' || args.kind === 'import-rule') {
            const file = localPath(args.path, args.resolveDir);
            if (path.extname(file)) return { path: file, suffix: args.path.match(/[?#].*$/)?.[0] };
          }
        });
      },
    }],
  };
  const css = styles.map(({ source, media }) => '@import ' + JSON.stringify(source) +
    (media ? ' ' + media : '') + ';').join('\n');
  const [video, sheet, player, controls] = await Promise.all([
    build({
      ...options, format: 'iife',
      // 미리보기에서는 창 크기를 사용하는 데모도 조작부를 뺀 스테이지에 맞춘다.
      define: { innerWidth: '__bmvdViewport.width', innerHeight: '__bmvdViewport.height',
        'window.innerWidth': '__bmvdViewport.width', 'window.innerHeight': '__bmvdViewport.height' },
      stdin: { contents: modules.map(source => 'import ' + JSON.stringify(source) + ';').join('\n'), resolveDir: project },
    }),
    build({ ...options, stdin: { contents: css, loader: 'css', resolveDir: project } }),
    fs.readFile(path.join(__dirname, 'preview-player.js'), 'utf8'),
    fs.readFile(path.join(__dirname, 'preview-player.css'), 'utf8'),
  ]);

  // CSS의 창 기준 크기를 영상 영역 기준으로 바꾼다. 문자열과 URL은 그대로 둔다.
  const stageCSS = [...sheet.outputFiles, ...video.outputFiles.filter(file => file.path.endsWith('.css'))]
    .map(file => file.text).join('\n').replace(/url\([^)]*\)|"[^"]*"|'[^']*'|(\d)(?:[dsl])?v(w|h|min|max)\b/gi,
      (match, digit, unit) => digit ? digit + 'cq' + unit.toLowerCase() : match);
  const videoJS = video.outputFiles.find(file => file.path.endsWith('.js')).text;

  // HTML에 직접 연결한 이미지·글꼴 아이콘·미디어도 파일에 포함한다.
  const assetTags = [...new Set(html.match(/<(?:img|image|video|audio|source|link)\b[^>]*>/gi))];
  for (const tag of assetTags) {
    if (/^<link\b/i.test(tag) && !/\bicon\b/i.test(attribute(tag, 'rel') ?? '')) continue;
    let inlined = tag;
    for (const key of ['src', 'href', 'poster']) {
      const url = attribute(tag, key);
      if (!url || url.startsWith('data:') || url.startsWith('#')) continue;
      const file = localPath(url);
      const type = assetTypes[path.extname(file).toLowerCase()];
      if (!type) throw new Error('지원하지 않는 HTML 리소스 형식입니다: ' + url);
      const data = await fs.readFile(file);
      inlined = inlined.replace(url, () => 'data:' + type + ';base64,' + data.toString('base64'));
    }
    html = html.replaceAll(tag, () => inlined);
  }

  if (!/<body\b[^>]*>/i.test(html) || !/<\/body\s*>/i.test(html) || !/<\/head\s*>/i.test(html)) {
    throw new Error('index.html에 head와 body 태그가 필요합니다.');
  }
  const ratio = aspect === '9:16' ? 9 / 16 : 16 / 9;
  const stage = '<div id="bmvd-shell" style="--bmvd-aspect:' + ratio + '"><div id="bmvd-viewport"><div id="bmvd-stage">';
  const audioSrc = src ? ' src="' + src + '"' : '';
  html = html
    .replace(/<\/head\s*>/i, () => '<style>' + rawText(stageCSS + '\n' + controls, 'style') + '</style>\n</head>')
    .replace(/<body\b[^>]*>/i, match => match + '\n' + stage)
    .replace(/<\/body\s*>/i, () => '</div></div>\n' + playerMarkup(audioSrc) + '\n</div>\n' +
      '<script>window.__bmvdConfig = ' + inlineJSON(config) + ';\n' + rawText(player, 'script') + '</script>\n' +
      '<script>' + rawText(videoJS, 'script') + '</script>\n</body>');

  const output = path.join(project, 'preview.html');
  await fs.writeFile(output, html, 'utf8');
  if (usedSkillRuntime) {
    console.log('[안내] 프로젝트의 runtime.js 가 예전 버전이라 미리보기에는 스킬의 최신 runtime.js 를 넣었습니다(프로젝트 파일은 그대로).');
  }
  console.log('[생성] ' + output);
}

function playerMarkup(audioSrc) {
  return [
    '<section id="bmvd-controls" aria-label="영상 재생 조작">',
    '  <div class="bmvd-timeline"><div class="bmvd-track">',
    '    <div id="bmvd-segments" aria-hidden="true"></div>',
    '    <input id="bmvd-range" type="range" aria-label="재생 위치" min="0" max="0" step="any" value="0" disabled>',
    '  </div><output id="bmvd-time" for="bmvd-range" aria-live="off">0.00초 · 0프레임</output></div>',
    '  <div class="bmvd-actions">',
    '    <button type="button" id="bmvd-play" title="재생 / 일시정지 (Space)" disabled>▶ 재생</button>',
    '    <button type="button" id="bmvd-back" aria-label="한 프레임 뒤로" title="한 프레임 뒤로 (←)">◀</button>',
    '    <button type="button" id="bmvd-next" aria-label="한 프레임 앞으로" title="한 프레임 앞으로 (→)">▶</button>',
    '    <select id="bmvd-speed" aria-label="재생 속도">',
    '      <option value="0.25">0.25×</option><option value="0.5">0.5×</option><option value="1" selected>1×</option>',
    '    </select>',
    '    <label><input id="bmvd-loop" type="checkbox"> 반복</label>',
    '    <button type="button" id="bmvd-sound" title="소리 켜기 / 끄기 (M)" aria-pressed="true" hidden>🔊 소리</button>',
    '    <button type="button" id="bmvd-present" aria-label="상영 (F)" title="전체화면 상영 (F)" disabled>⛶ 상영</button>',
    '    <button type="button" id="bmvd-record" disabled>● 영상으로 저장</button>',
    '    <button type="button" id="bmvd-copy" title="지금 시각 복사 (C)">📋 지금 시각 복사</button>',
    '    <button type="button" id="bmvd-reload" title="현재 시각에서 다시 읽기 (R)">↻ 다시 읽기</button>',
    '  </div>',
    '  <div id="bmvd-scenes" role="group" aria-label="장면별 재생"></div>',
    '  <p id="bmvd-note" hidden></p>',
    '  <audio id="bmvd-audio" preload="auto"' + audioSrc + '></audio>',
    '  <div id="bmvd-toast" role="status"></div>',
    '</section>',
  ].join('\n');
}

if (require.main === module) main(async () => {
  const options = parseArgs(process.argv.slice(2), { flags: ['no-embed-audio'] });
  if (options.ids.length !== 1) throw new Error('사용법: node scripts/bundle-preview.js <프로젝트> [--no-embed-audio]');
  await run(options.ids[0], options['no-embed-audio']);
});
