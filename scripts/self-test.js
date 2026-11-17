'use strict';

// 실행 결과와 테스트 데모는 모두 OS 임시 폴더에 둔다.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { spawn } = require('node:child_process');
const lib = require('./lib');
const { validate } = require('./validate-demo');
const { capturePreview } = require('./capture-previews');
const { compose } = require('./create-contact-sheet');

const fixtureHead = '<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><style>html,body{margin:0;height:100%;overflow:hidden}canvas{display:block;width:100%;height:100%}</style><canvas></canvas>';
const canvasDemo = fixtureHead + `<script type="module">
import { start } from '/shared/runtime.js';
const canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d');
const mode=new URLSearchParams(location.search).get('mode');
function draw(t){
  const d=Math.min(2,devicePixelRatio);canvas.width=innerWidth*d;canvas.height=innerHeight*d;
  const w=canvas.width,h=canvas.height;
  ctx.fillStyle='#243b53';ctx.fillRect(0,0,w,h);
  if(mode==='blank')return;
  if(mode==='static')t=0;
  if(mode==='unstable')t=Math.random()*5;
  if(mode==='jump'&&t>4.95){ctx.fillStyle='#ffeeaa';ctx.fillRect(0,0,w,h);}
  if(mode==='flicker'&&Math.abs(t-2.5)<0.002){ctx.fillStyle='white';ctx.fillRect(0,0,w,h);}
  ctx.fillStyle='#49dcb1';ctx.fillRect(w*(0.4+0.2*Math.sin(t*Math.PI*2/5)),h*0.25,w*0.2,h*0.5);
}
start(draw);
if(mode==='error'){console.error('의도한 콘솔 오류');setTimeout(()=>{throw new Error('의도한 페이지 오류')},20);}
if(mode==='external')fetch('https://example.com/forbidden').catch(()=>{});
if(mode==='missing')fetch('/missing-test-file');
</script>`;
const webglDemo = fixtureHead + `<script type="module">
import * as THREE from '/vendor/three.module.min.js';
import { start } from '/shared/runtime.js';
const renderer=new THREE.WebGLRenderer({canvas:document.querySelector('canvas'),antialias:true});
renderer.setPixelRatio(Math.min(2,devicePixelRatio));
const scene=new THREE.Scene();scene.background=new THREE.Color('#172941');
const camera=new THREE.PerspectiveCamera(45,innerWidth/innerHeight,0.1,100);camera.position.z=4;
const cube=new THREE.Mesh(new THREE.BoxGeometry(1.4,1.4,1.4),new THREE.MeshNormalMaterial());scene.add(cube);
function resize(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}
addEventListener('resize',resize);resize();
start(t=>{cube.rotation.set(t*Math.PI*2/5,t*Math.PI*2/5,0);renderer.render(scene,camera);});
</script>`;

function childCommand(args) {
  const child = spawn(process.execPath, args, { cwd: lib.ROOT, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, NODE_PATH: [path.join(__dirname, 'node_modules'), process.env.NODE_PATH].filter(Boolean).join(path.delimiter) } });
  let output = '';
  child.stdout.on('data', chunk => { output += chunk; process.stdout.write(chunk); });
  child.stderr.on('data', chunk => { output += chunk; process.stderr.write(chunk); });
  const done = new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', code => resolve({ code, output }));
  });
  return { child, done, output: () => output };
}

async function cli(file, args, expected = 0) {
  const script = path.isAbsolute(file) ? file : path.join('scripts', file);
  console.log(`[명령] node ${script} ${args.join(' ')}`);
  const result = await childCommand([script, ...args]).done;
  assert.equal(result.code, expected, result.output);
  return result;
}

function rawGet(port, url) {
  return new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port, path: url }, res => {
      res.resume();res.on('end',()=>resolve(res.statusCode));
    }).on('error',reject);
  });
}

async function dimensions(file) {
  const bytes = await fs.readFile(file);
  return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
}

async function run() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'bmvd-self-test-'));
  console.log(`[테스트 폴더] ${root}`);
  let browser, server, cliServer;
  let oldSelection;
  try { oldSelection = await fs.readFile(lib.SELECTION); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  try {
    for (const folder of ['scripts', 'shared', 'vendor', 'gallery', 'styles/01-canvas', 'styles/02-webgl']) {
      await fs.mkdir(path.join(root, folder), { recursive: true });
    }
    for (const file of ['lib.js', 'serve.js', 'validate-demo.js', 'create-contact-sheet.js', 'capture-previews.js', 'render-demo.js']) {
      await fs.copyFile(path.join(__dirname, file), path.join(root, 'scripts', file));
    }
    await fs.copyFile(path.join(lib.ROOT, 'shared/runtime.js'), path.join(root, 'shared/runtime.js'));
    await fs.copyFile(path.join(lib.ROOT, 'vendor/three/build/three.module.min.js'), path.join(root, 'vendor/three.module.min.js'));
    await fs.writeFile(path.join(root, 'gallery/index.html'), '<!doctype html><meta charset="utf-8">테스트 갤러리');
    for (const [id, name, html, number] of [['01-canvas', '캔버스 테스트', canvasDemo, 1], ['02-webgl', 'WebGL 테스트', webglDemo, 2]]) {
      await fs.writeFile(path.join(root, 'styles', id, 'index.html'), html);
      await fs.writeFile(path.join(root, 'styles', id, 'style.json'), JSON.stringify({ id, name, number, duration: 5, preview_t: 1.5 }));
    }
    assert.deepEqual((await lib.listStyles(root)).map(style=>style.id), ['01-canvas', '02-webgl']);
    server = await lib.startServer(root);
    cliServer = childCommand(['scripts/serve.js', '--root', root, '--port', String(server.port), '--clear']);
    let match;
    const deadline = Date.now() + 10000;
    while (!(match = cliServer.output().match(/http:\/\/localhost:(\d+)\/gallery\//))) {
      if (Date.now() > deadline) throw new Error('serve.js 시작 시간 초과');
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    assert.equal(Number(match[1]), server.port + 1, '포트 충돌 시 다음 포트');
    const base = `http://localhost:${match[1]}`;
    assert.deepEqual(await (await fetch(`${base}/api/selection`)).json(), { id: null });
    const post = value => fetch(`${base}/api/select`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: value });
    const selection = await post(JSON.stringify({ id: '01-canvas', name: '캔버스 테스트' }));
    assert.equal(selection.status, 200);
    assert.equal((await selection.json()).file, lib.SELECTION);
    const saved = await (await fetch(`${base}/api/selection`)).json();
    assert.equal(saved.id, '01-canvas');assert.ok(Number.isFinite(Date.parse(saved.selectedAt)));
    await Promise.all(Array.from({ length: 8 }, async (_, i) => {
      assert.equal((await post(JSON.stringify({ id: '01-canvas', name: `동시 선택 ${i}` }))).status, 200);
      assert.equal((await (await fetch(`${base}/api/selection`)).json()).id, '01-canvas');
    }));
    assert.equal((await post(JSON.stringify({ id: '../outside', name: '경로 탈출' }))).status, 400);
    assert.equal((await post('bad json')).status, 400);
    assert.equal((await post('x'.repeat(4097))).status, 413);
    assert.equal((await post(JSON.stringify({ id: '01-canvas', name: '줄\n바꿈' }))).status, 400);
    assert.equal(await rawGet(Number(match[1]), '/%2e%2e/package.json'), 403);
    assert.equal(await rawGet(Number(match[1]), '/..%5cpackage.json'), 403);
    assert.equal(await rawGet(Number(match[1]), '/%E0%A4%A'), 400);
    const mime = { html: 'text/html', js: 'text/javascript', mjs: 'text/javascript', css: 'text/css', json: 'application/json',
      png: 'image/png', gif: 'image/gif', svg: 'image/svg+xml', mp4: 'video/mp4', woff2: 'font/woff2' };
    for (const [extension, type] of Object.entries(mime)) {
      await fs.writeFile(path.join(root, `mime.${extension}`), '테스트');
      const response = await fetch(`${base}/mime.${extension}`);
      assert.ok(response.headers.get('content-type').startsWith(type));
      assert.equal(response.headers.get('cache-control'), 'no-store');
    }
    cliServer.child.kill();await cliServer.done;cliServer = null;
    console.log('[통과] 서버 API, 포트 폴백, 경로 차단, MIME, 본문 제한, 종료');

    const canvasUrl = `${server.url}/styles/01-canvas/index.html`;
    const webglUrl = `${server.url}/styles/02-webgl/index.html`;
    await cli('validate-demo.js', ['--url', canvasUrl, '--duration', '5', '--out', path.join(root, 'validate-canvas')]);
    await cli('validate-demo.js', ['--url', webglUrl, '--duration', '5', '--out', path.join(root, 'validate-webgl')]);
    await cli('validate-demo.js', ['--url', `${canvasUrl}?mode=static`, '--out', path.join(root, 'validate-static')], 1);
    const seamOut = path.join(root, 'validate-seam');
    await cli('validate-demo.js', ['--url', `${canvasUrl}?mode=jump`, '--out', seamOut]);
    assert.ok(JSON.parse(await fs.readFile(path.join(seamOut, 'report.json'), 'utf8')).results[0].warnings.includes('루프 이음매 튐'));
    await cli('validate-demo.js', ['--url', `${canvasUrl}?mode=jump`, '--no-loop', '--out', path.join(root, 'validate-no-loop')]);
    const noLoop = JSON.parse(await fs.readFile(path.join(root, 'validate-no-loop/report.json'), 'utf8')).results[0];
    assert.ok(!noLoop.loop);assert.ok(!noLoop.warnings.includes('루프 이음매 튐'));
    browser = await lib.launchBrowser();
    const targets = (await lib.listStyles(root)).map(style => ({ ...style, url: `${server.url}/styles/${style.id}/index.html` }));
    for (const target of targets) {
      const result = await validate(browser, target, {}, path.join(root, 'style-playback'));
      assert.deepEqual(result.errors, [], JSON.stringify(result));assert.equal(result.playback.wraps, 1);
      console.log(`[통과] ${target.id} 실제 시간 재생·루프·리사이즈`);
      // 실제 스킬의 styles/를 쓰지 않고 같은 캡처 함수를 임시 스타일에 실행한다.
      await capturePreview(browser, target);
      assert.deepEqual(await dimensions(path.join(target.dir, 'preview.png')), [1280, 720]);
    }
    for (const [mode, expected] of [['blank', '비어'], ['unstable', '결정성'], ['error', '콘솔 오류'],
      ['external', '외부 네트워크'], ['missing', 'HTTP 오류']]) {
      const result = await validate(browser, { id: mode, name: mode, url: `${canvasUrl}?mode=${mode}` }, { url: true }, path.join(root, 'negative'));
      assert.ok(result.errors.some(message => message.includes(expected)), JSON.stringify(result));
      console.log(`[통과] ${mode} 실패 판정`);
    }
    const flicker = await validate(browser, { id: 'flicker', url: `${canvasUrl}?mode=flicker` }, { url: true }, path.join(root, 'negative'));
    assert.ok(flicker.warnings.some(message => message.includes('깜빡임')), JSON.stringify(flicker));
    console.log('[통과] 깜빡임 경고');
    const overviewImage = await fs.readFile(path.join(root, 'validate-canvas/custom/frame-2.0.png'));
    await compose(browser, '전체 스타일 테스트', Array.from({ length: 8 }, (_, i) => ({ label: String(i), image: overviewImage.toString('base64') })), 4, path.join(root, 'overview.png'));
    assert.deepEqual(await dimensions(path.join(root, 'overview.png')), [2560, 784]);
    await browser.close();browser = null;
    await cli('create-contact-sheet.js', ['--url', canvasUrl, '--duration', '5', '--out', path.join(root, 'sheets-canvas')]);
    await cli('create-contact-sheet.js', ['--url', webglUrl, '--times', '0,1,2,3,4,4.9', '--out', path.join(root, 'sheets-webgl')]);
    assert.deepEqual(await dimensions(path.join(root, 'sheets-canvas/custom/contact-sheet.png')), [1920, 784]);
    // 같은 CLI를 임시 스킬 루트에서 실행하여 실제 styles/에는 쓰지 않는다.
    await cli(path.join(root, 'scripts/capture-previews.js'), []);
    await cli(path.join(root, 'scripts/create-contact-sheet.js'), ['01-canvas', '--all-sheet', '--out', path.join(root, 'sheets-all')]);
    assert.deepEqual(await dimensions(path.join(root, 'sheets-all/overview.png')), [2560, 784]);
    await cli(path.join(root, 'scripts/validate-demo.js'), ['--out', path.join(root, 'validate-all')]);
    const renderFile = path.join(root, 'canvas.mp4');
    await cli('render-demo.js', ['--url', path.join(root, 'styles/01-canvas/index.html'), '--root', root, '--out', renderFile,
      '--duration', '0.5', '--fps', '6', '--width', '320', '--height', '180', '--scale', '2', '--keep-frames', '--thumbnail', '2']);
    assert.deepEqual(await dimensions(path.join(root, 'canvas.png')), [640, 360]);
    await cli('render-demo.js', ['--url', webglUrl, '--out', path.join(root, 'webgl.mp4'), '--duration', '0.5', '--fps', '6',
      '--width', '320', '--height', '180', '--keep-frames', '--thumbnail', '2']);
    const ffmpeg = lib.hasFFmpeg();
    if (ffmpeg) {
      assert.ok((await fs.stat(renderFile)).size > 0);
      for (const target of targets) assert.ok((await fs.stat(path.join(target.dir, 'preview.gif'))).size > 0);
    } else {
      await assert.rejects(fs.stat(renderFile), { code: 'ENOENT' });
      await cli('render-demo.js', ['--url', canvasUrl, '--out', path.join(root, 'skipped.mp4')]);
    }
    console.log(`[전체 통과] 결과: ${root}\n[ffmpeg] ${ffmpeg ? 'GIF·MP4 인코딩 검증 완료' : '없음: GIF·MP4 인코딩은 미검증, 생략 경로 확인'}`);
  } finally {
    if (cliServer) { cliServer.child.kill();await cliServer.done; }
    if (browser) await browser.close();
    if (server) await server.close();
    if (oldSelection) await fs.writeFile(lib.SELECTION, oldSelection);
    else await fs.rm(lib.SELECTION, { force: true });
  }
}

if (require.main === module) lib.main(run);
module.exports = { run };
