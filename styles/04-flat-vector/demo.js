import { start, DURATION, TAU, saw, smooth } from '../../shared/runtime.js';

export const PALETTE = Object.freeze({
  ink: '#243C50', water: '#339C9A', leaf: '#83AB72',
  sun: '#EBC36C', coral: '#D7765C', paper: '#F4ECDC', white: '#FFFFFF',
});
export const MATERIAL = Object.freeze({ stroke: 8, corner: 8, grid: 8 });
export const LIGHTING = Object.freeze({ shadows: false, gradients: false });
export const CAMERA = Object.freeze({ x: 960, y: 640, zoom: 0.05 });
export const RENDERING = Object.freeze({ width: 1920, height: 1080 });

const C = PALETTE;
const svg = document.querySelector('#scene');
const line = (d, color = C.ink) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${MATERIAL.stroke}" stroke-linecap="round" stroke-linejoin="round"/>`;
const rect = (x, y, w, h, fill, r = 0) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}"/>`;
const circle = (x, y, r, fill) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
const path = (d, fill) => `<path d="${d}" fill="${fill}"/>`;

export function makeCloud(x, y, scale) {
  return `<g class="cloud" data-x="${x}" data-y="${y}" data-scale="${scale}">${rect(0, 32, 224, 48, C.white, 24)}${rect(40, 0, 104, 80, C.white, 40)}${rect(120, 16, 72, 64, C.white, 32)}</g>`;
}

export function makeHouse(x, y, roof, wide = false) {
  const w = wide ? 208 : 176;
  const window = (wx, wy) => `${rect(wx, wy, 48, 48, C.ink, 8)}${rect(wx + 8, wy + 8, 12, 16, C.sun)}${rect(wx + 28, wy + 8, 12, 16, C.paper)}${rect(wx + 8, wy + 32, 32, 8, C.paper)}`;
  return `<g transform="translate(${x} ${y})">${rect(w - 48, -192, 24, 72, roof, 0)}${rect(0, -120, w, 144, C.white, 8)}${path(`M-24-112 L${w / 2}-208 L${w + 24}-112 Z`, roof)}${rect(-24, -120, w + 48, 16, roof, 8)}${window(24, -88)}${window(w - 72, -88)}${rect(w / 2 - 24, -24, 48, 48, C.ink, 8)}${circle(w / 2 + 8, 0, 4, C.sun)}${rect(-8, 16, w + 16, 16, C.sun, 8)}${rect(16, -40, 64, 8, roof, 4)}${rect(w - 80, -40, 64, 8, roof, 4)}</g>`;
}

const TREES = [
  { x: 128, y: 608, size: 1.12, type: 'round', color: C.leaf },
  { x: 232, y: 856, size: 0.88, type: 'pine', color: C.ink },
  { x: 624, y: 584, size: 0.72, type: 'round', color: C.leaf },
  { x: 1600, y: 608, size: 1.04, type: 'round', color: C.leaf },
  { x: 1784, y: 744, size: 1.12, type: 'pine', color: C.ink },
  { x: 1440, y: 984, size: 1, type: 'round', color: C.ink },
  { x: 448, y: 976, size: 1.04, type: 'round', color: C.ink },
  { x: 112, y: 968, size: 0.72, type: 'pine', color: C.sun },
];

export function makeTree({ x, y, size, type, color }, i) {
  const crown = type === 'round'
    ? `${circle(-40, -168, 56, color)}${circle(32, -176, 64, color)}${circle(0, -224, 64, color)}${line('M0-216 V-96 M0-152 L-32-184 M0-128 L40-168', color === C.ink ? C.leaf : C.ink)}`
    : `${path('M0-280 L-80-136 H-56 L-104-64 H104 L56-136 H80 Z', color)}${line('M0-208 V-56 M0-112 L32-144', color === C.ink ? C.leaf : C.ink)}`;
  return `<g class="tree" data-tree="${i}" transform="translate(${x} ${y}) scale(${size})">${rect(-8, -144, 16, 144, C.ink, 8)}${crown}</g>`;
}

export function makeFence(x, y, count) {
  return `<g transform="translate(${x} ${y})">${rect(0, -48, count * 48, 8, C.paper, 4)}${rect(0, -24, count * 48, 8, C.paper, 4)}${Array.from({ length: count + 1 }, (_, i) => rect(i * 48, -64, 8, 72, C.paper, 4)).join('')}</g>`;
}

export function makeMeadow() {
  const tufts = [[48,800],[168,824],[336,792],[480,720],[592,896],[688,976],[816,1016],[1328,592],[1408,752],[1600,816],[1680,960],[1840,872],[1720,1032],[216,1032],[536,1040],[1200,1008],[1520,1016],[744,536]];
  const stones = [[544,832,24],[648,944,16],[784,1008,24],[1296,896,24],[1384,960,16],[1560,1048,32],[184,784,16],[1360,584,16]];
  const flowers = [[208,888],[568,952],[688,1040],[1552,800],[1664,888],[1840,1000]];
  return tufts.map(([x,y]) => line(`M${x-8} ${y} l-8-16 M${x} ${y} v-24 M${x+8} ${y} l8-16`, C.leaf)).join('')
    + stones.map(([x,y,w]) => rect(x, y, w, 8, C.paper, 4)).join('')
    + flowers.map(([x,y]) => `${rect(x-4, y, 8, 24, C.leaf, 4)}${circle(x, y-4, 12, C.coral)}${circle(x, y-4, 4, C.sun)}`).join('');
}

const riverBand = 'M-96 784 C304 784 624 720 832 752 C896 784 832 832 864 896 C912 1008 1168 1008 1328 1160 L1728 1160 C1536 960 1200 968 1136 880 C1088 824 1160 744 1088 688 C880 584 432 624-96 624 Z';
const waterMarks = [
  [32, 672, 80], [224, 712, 64], [448, 656, 80], [640, 704, 64], [800, 728, 48],
  [976, 744, 48], [944, 800, 48], [992, 848, 64], [1048, 912, 64],
  [1184, 968, 80], [1376, 1032, 64], [1512, 1080, 80],
];

export function buildScene() {
  const rays = Array.from({ length: 12 }, (_, i) => `<g transform="rotate(${i * 30})">${rect(-4, -136, 8, 24, C.sun, 4)}</g>`).join('');
  const posts = Array.from({ length: 13 }, (_, i) => rect(672 + i * 48, 616, 8, 48, C.ink, 4)).join('');
  const archBlocks = Array.from({ length: 9 }, (_, i) => `<g transform="translate(976 864) rotate(${-180 + i * 22.5})">${rect(184, -4, 16, 8, C.sun, 4)}</g>`).join('');
  return `<defs>
    <clipPath id="water-clip">${path(riverBand, C.water)}</clipPath>
    <clipPath id="land-clip"><path d="M0 0 H1920 V1080 H0 Z ${riverBand}" clip-rule="evenodd"/></clipPath>
    ${waterMarks.map(([x,y],i) => `<clipPath id="ripple-${i}">${rect(x - 96, y - 8, 192, 24, C.white)}</clipPath>`).join('')}
    <clipPath id="stage-clip">${rect(0, 0, 1920, 1080, C.white)}</clipPath>
  </defs>
  <g clip-path="url(#stage-clip)"><g id="camera">
    ${rect(-96, -96, 2112, 1272, C.paper)}
    <g transform="translate(1488 216)">${circle(0, 0, 80, C.sun)}<g id="sun-rays">${rays}</g></g>
    ${makeCloud(144, 144, 0.96)}${makeCloud(624, 232, 0.8)}${makeCloud(1032, 112, 0.72)}${makeCloud(1656, 312, 0.8)}
    ${path('M-96 488 Q144 264 384 488 Q640 280 896 488 Q1120 304 1376 488 Q1616 280 2016 488 V640 H-96 Z', C.sun)}
    ${path('M-96 488 Q192 368 480 488 Q736 368 992 488 Q1296 344 1600 488 Q1824 392 2016 488 V1176 H-96 Z', C.leaf)}
    ${path('M-96 744 Q208 696 464 872 T1024 1152 H-96 Z', C.paper)}
    ${path('M1264 712 Q1512 664 1760 768 T2016 784 V1176 H1456 Q1440 968 1264 872 Z', C.paper)}
    ${path('M320 648 H384 Q544 648 632 688 H704 V736 H632 Q536 696 384 696 H320 Z', C.sun)}
    ${path('M1248 688 H1344 Q1408 688 1456 656 L1488 688 Q1416 736 1344 736 H1248 Z', C.sun)}
    ${path(riverBand, C.water)}
    <g clip-path="url(#water-clip)">
      ${waterMarks.map(([x,y,w], i) => `<g clip-path="url(#ripple-${i})"><g class="ripple" data-x="${x}" data-y="${y}">${rect(0, 0, w, 8, C.paper, 4)}${rect(-192, 0, w, 8, C.paper, 4)}${rect(192, 0, w, 8, C.paper, 4)}</g></g>`).join('')}
    </g>
    ${path('M408 584 H456 V600 Q456 616 488 616 H624 Q648 616 672 640 L688 656 V680 H656 L624 648 H488 Q408 648 408 600 Z', C.sun)}
    ${TREES.slice(0, 1).map(makeTree).join('')}
    ${makeHouse(344, 560, C.coral)}
    <g id="smoke">${[0,1,2].map(i => circle(0, 0, 16 + i * 4, C.white).replace('<circle', `<circle class="smoke" data-index="${i}"`)).join('')}</g>
    ${TREES.slice(2, 4).map((tree, i) => makeTree(tree, i + 2)).join('')}
    ${makeHouse(1424, 640, C.ink, true)}
    ${makeFence(48, 600, 3)}${makeFence(1680, 808, 4)}
    ${rect(656, 648, 640, 32, C.coral, 8)}
    ${path('M656 680 H1296 V872 H1152 V864 A176 176 0 0 0 800 864 V872 H656 Z', C.sun)}
    ${path('M768 864 A208 208 0 0 1 1184 864 H1152 A176 176 0 0 0 800 864 Z', C.coral)}
    ${archBlocks}
    ${rect(640, 856, 160, 16, C.coral, 8)}${rect(1152, 856, 160, 16, C.coral, 8)}
    <g id="car">${rect(-56, -40, 112, 32, C.coral, 8)}${path('M-40-40 L-24-64 H24 L40-40 Z', C.coral)}${path('M-24-56 H-8 V-40 H-32 Z', C.paper)}${path('M8-56 H24 L32-40 H8 Z', C.paper)}${circle(-32, -8, 16, C.ink)}${circle(32, -8, 16, C.ink)}${circle(-32, -8, 8, C.sun)}${circle(32, -8, 8, C.sun)}${rect(40, -32, 16, 8, C.sun, 4)}${rect(-56, -32, 16, 8, C.sun, 4)}</g>
    ${rect(648, 608, 656, 16, C.ink, 8)}${posts}
    <g clip-path="url(#land-clip)">${makeMeadow()}</g>
    ${TREES.filter((_,i) => [1,4,5,6,7].includes(i)).map(tree => makeTree(tree, TREES.indexOf(tree))).join('')}
    <g transform="translate(1832 944)">${circle(-24, 0, 32, C.leaf)}${circle(16, -16, 40, C.leaf)}${circle(48, 8, 24, C.leaf)}</g>
    <g transform="translate(568 608)">${circle(-24, 0, 24, C.leaf)}${circle(8, -8, 32, C.leaf)}${circle(40, 0, 24, C.leaf)}</g>
    ${line('M32 1040 H72 M40 1024 H64', C.leaf)}${line('M1760 520 H1808 M1784 504 V536', C.paper)}
  </g></g>`;
}

svg.insertAdjacentHTML('beforeend', buildScene());
const camera = svg.querySelector('#camera');
const clouds = [...svg.querySelectorAll('.cloud')];
const trees = [...svg.querySelectorAll('.tree')];
const smoke = [...svg.querySelectorAll('.smoke')];
const ripples = [...svg.querySelectorAll('.ripple')];
const car = svg.querySelector('#car');
const rays = svg.querySelector('#sun-rays');

// 밑동을 고정해 준비 동작과 반동만으로 탄성을 표현한다.
export function spring(phase) {
  const keys = [[0,0],[0.12,-0.045],[0.30,0.09],[0.48,-0.026],[0.64,0.012],[0.8,0],[1,0]];
  const i = keys.findIndex((key, index) => index < keys.length - 1 && phase >= key[0] && phase <= keys[index + 1][0]);
  const [a, b] = [keys[Math.max(0, i)], keys[Math.max(0, i) + 1]];
  return a[1] + (b[1] - a[1]) * smooth((phase - a[0]) / (b[0] - a[0]));
}

export function render(t) {
  const phase = saw(t);
  const swell = (1 - Math.cos(TAU * phase)) / 2;
  const zoom = 1 + CAMERA.zoom * swell;
  camera.setAttribute('transform', `translate(${CAMERA.x} ${CAMERA.y}) scale(${zoom}) translate(${-CAMERA.x} ${-CAMERA.y})`);
  rays.setAttribute('transform', `rotate(${8 * Math.sin(TAU * phase)})`);
  clouds.forEach((node, i) => {
    const { x, y, scale } = node.dataset;
    node.setAttribute('transform', `translate(${Number(x) + 24 * Math.sin(TAU * phase + i * 0.6)} ${y}) scale(${scale})`);
  });
  trees.forEach(node => {
    const i = Number(node.dataset.tree);
    const tree = TREES[i];
    const bounce = spring(saw(t, 1, -i * 0.075));
    const sway = 1.6 * Math.sin(TAU * phase + i * 0.5);
    node.setAttribute('transform', `translate(${tree.x} ${tree.y}) rotate(${sway}) scale(${tree.size * (1 - bounce * 0.42)} ${tree.size * (1 + bounce)})`);
  });
  ripples.forEach(node => {
    const { x, y } = node.dataset;
    node.setAttribute('transform', `translate(${Number(x) + 192 * phase} ${y})`);
  });
  smoke.forEach((node, i) => {
    const p = saw(t, 1, i / 3);
    node.setAttribute('transform', `translate(${480 + 16 * Math.sin(TAU * p)} ${360 - 104 * smooth(p)}) scale(${0.4 + p * 0.8})`);
    node.setAttribute('opacity', (0.72 * Math.sin(Math.PI * p) ** 2).toFixed(5));
  });
  // 왕복 경로는 화면 밖 순간 이동 없이 같은 위치로 돌아온다.
  car.setAttribute('transform', `translate(${720 + 512 * swell} 640)`);
}

console.assert(TREES.length === 8 && Object.keys(PALETTE).length === 7 && DURATION === 5, '장면 계약을 확인합니다.');
console.assert(spring(0) === 0 && spring(1) === 0, '탄성 주기의 양 끝이 일치해야 합니다.');
start(render);
