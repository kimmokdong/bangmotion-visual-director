import { start, DURATION, TAU, saw, smooth } from '../../shared/runtime.js';

// 7개 색상 계열 × 명도 단계. 그라데이션 대신 같은 계열의 밝음·기본·그늘 단계만으로 깊이를 만든다.
export const PALETTE = Object.freeze({
  cream: { white: '#FFFFFF', light: '#FBF5EA', base: '#F5EBD8', shade: '#E8D9BF' },
  gold: { light: '#F7DC9F', base: '#EEC167', shade: '#D49F4C' },
  green: { light: '#B4D295', base: '#93BB76', shade: '#749F5E', deep: '#55834D', dark: '#3D6644' },
  teal: { foam: '#E4F4EC', light: '#83CDBE', base: '#41A19D', shade: '#2D8087' },
  coral: { light: '#F29A7C', base: '#DE7156', shade: '#B9533F' },
  blue: { light: '#7EA9D4', base: '#4C80B7', shade: '#365F90' },
  ink: { light: '#4B6883', base: '#243C50' },
});
export const MATERIAL = Object.freeze({ stroke: 6, corner: 8, grid: 8 });
// 광원 계산 대신 "오른쪽 위 해" 한 방향에 맞춰 그늘 면을 왼쪽·아래쪽에 단색으로 깐다.
export const LIGHTING = Object.freeze({ sun: 'upper-right', shadeFill: '#244A3A', shadeOpacity: 0.16, gradients: false });
// 레이어별 배율: 하늘은 덜, 전경은 더 움직여 정면 2D 안에서 깊이를 만든다.
export const CAMERA = Object.freeze({ x: 976, y: 700, zoom: 0.06, pan: -28, hold: 0.42, layers: { sky: 0.3, far: 0.6, main: 1, front: 1.25 } });
export const RENDERING = Object.freeze({ width: 1920, height: 1080 });

const C = PALETTE;
const svg = document.querySelector('#scene');
const line = (d, color, w = MATERIAL.stroke) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const rect = (x, y, w, h, fill, r = 0) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}"/>`;
const circle = (x, y, r, fill) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
const path = (d, fill) => `<path d="${d}" fill="${fill}"/>`;
const shade = d => `<path d="${d}" fill="${LIGHTING.shadeFill}" fill-opacity="${LIGHTING.shadeOpacity}"/>`;
const clamp01 = x => Math.min(1, Math.max(0, x));
// 0에서 출발해 목표를 약 10% 넘었다가 1에 안착한다.
export const backOut = x => 1 + 2.70158 * (x - 1) ** 3 + 1.70158 * (x - 1) ** 2;

// 원을 합친 덩어리에 왼쪽 아래 그늘 면과 오른쪽 위 밝은 면을 잘라 넣는다(나무 수관·덤불 공용).
function blob(id, circles, tone) {
  const xs = circles.flatMap(([x, , r]) => [x - r, x + r]), ys = circles.flatMap(([, y, r]) => [y - r, y + r]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const R = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) / 2;
  return `<clipPath id="${id}">${circles.map(([x, y, r]) => circle(x, y, r, '#000')).join('')}</clipPath>`
    + circles.map(([x, y, r]) => circle(x, y, r, tone[0])).join('')
    + `<g clip-path="url(#${id})">${circle(cx - R * 0.55, cy + R * 0.6, R * 0.92, tone[1])}${circle(cx + R * 0.5, cy - R * 0.55, R * 0.42, tone[2])}</g>`;
}

export function makeCloud(x, y, scale, i) {
  const parts = [[0, 32, 232, 48, 24], [40, 0, 104, 80, 40], [120, 16, 80, 64, 32]];
  // 아래쪽 크림 그늘 띠 위에 흰 면을 8px 올려 겹친다.
  return `<g class="cloud" data-x="${x}" data-y="${y}" data-scale="${scale}" data-i="${i}">${parts.map(([px, py, w, h, r]) => rect(px, py, w, h, C.cream.shade, r)).join('')}${parts.map(([px, py, w, h, r]) => rect(px, py - 8, w, h, C.cream.white, r)).join('')}</g>`;
}

let windowCount = 0;
function makeWindow(wx, wy, ww, wh, sill, warm) {
  const k = windowCount++;
  const glass = warm
    ? `${rect(wx, wy, ww, wh, C.gold.base, 4)}<rect class="lamp" data-k="${k}" x="${wx}" y="${wy}" width="${ww}" height="${wh}" rx="4" fill="${C.gold.light}"/>`
    : rect(wx, wy, ww, wh, C.ink.base, 4) + rect(wx, wy + wh / 2, ww, wh / 2, C.ink.light);
  return `<clipPath id="win-${k}">${rect(wx, wy, ww, wh, '#000', 4)}</clipPath>${rect(wx - 4, wy - 4, ww + 8, wh + 8, C.cream.shade, 6)}${glass}`
    + `<g clip-path="url(#win-${k})"><path class="glint" data-k="${k}" data-x="${wx}" data-w="${ww}" d="M8 ${wy - 8} h12 l-20 ${wh + 16} h-12 Z" fill="${C.cream.white}" fill-opacity="0.75"/></g>`
    + rect(wx + ww / 2 - 2, wy, 4, wh, C.cream.light) + rect(wx - 6, wy + wh, ww + 12, 8, sill, 4);
}

// 앞쪽 박공면(흰색) + 왼쪽 옆면(그늘색) + 경사 지붕 평행사변형으로 정면 2D 안에서 두께를 만든다.
export function makeHouse(x, y, tone, { w, s, chimney = false, flag = false }) {
  const H = 112, peak = -H - 88;
  const roof = `M${w / 2} ${peak} L-14 ${-H + 8} H${-s - 14} L${w / 2 - s} ${peak} Z`;
  // 지붕 면 안쪽에 처마와 평행한 기와 줄 2개.
  const tiles = [0.34, 0.67].map(f => {
    const y1 = -H + 8 + (peak + H - 8) * f;
    return line(`M${-s - 14 + (w / 2 + 14) * f + 12} ${y1} L${-14 + (w / 2 + 14) * f - 6} ${y1}`, tone.shade, 6);
  }).join('');
  const chim = chimney ? `${rect(-96, peak - 8, 30, 96, tone.base)}${rect(-96, peak - 8, 12, 96, tone.shade)}${rect(-102, peak - 18, 42, 14, C.ink.base, 4)}` : '';
  const pole = flag ? `${rect(w / 2 - 3, peak - 84, 6, 84, C.ink.base, 3)}${circle(w / 2, peak - 86, 7, C.gold.base)}` : '';
  return `<g transform="translate(${x} ${y})">
    ${shade(`M${-s} 0 H${w + 8} L${w - 40} 24 H${-s - 72} Z`)}
    ${chim}${pole}
    ${rect(-s, -H, s, H, C.cream.shade)}${shade(`M${-s} ${-H} H0 V${-H + 22} H${-s} Z`)}
    ${rect(0, -H, w, H, C.cream.white)}${path(`M0 ${-H} L${w / 2} ${peak + 10} L${w} ${-H} Z`, C.cream.white)}
    ${path(roof, tone.base)}${tiles}${rect(-s - 14, -H + 2, s, 10, tone.shade, 4)}
    ${line(`M-12 ${-H + 6} L${w / 2} ${peak + 4} L${w + 12} ${-H + 6}`, tone.light, 16)}
    ${circle(w / 2, -H - 30, 15, C.cream.shade)}${circle(w / 2, -H - 30, 10, C.ink.base)}
    ${makeWindow(-s + 18, -86, 28, 40, C.cream.base, false)}${makeWindow(-s + 58, -86, 28, 40, C.cream.base, false)}
    ${makeWindow(18, -88, 32, 44, tone.light, true)}${makeWindow(w - 50, -88, 32, 44, tone.light, false)}
    ${rect(w / 2 - 26, -74, 52, 74, C.cream.shade, 6)}${rect(w / 2 - 20, -68, 40, 68, tone.shade, 4)}${rect(w / 2 - 20, -68, 14, 68, C.ink.base, 0)}${circle(w / 2 + 10, -34, 4, C.gold.light)}
    ${rect(-s - 4, -10, s + 4, 10, C.gold.shade, 3)}${rect(0, -10, w + 4, 10, C.gold.base, 3)}${rect(w / 2 - 30, -6, 60, 10, C.gold.light, 4)}
  </g>`;
}

const ROUND = [[-40, -170, 56], [34, -178, 62], [0, -226, 64]];
const TONES = {
  mid: [C.green.shade, C.green.deep, C.green.base],
  front: [C.green.deep, C.green.dark, C.green.shade],
  pine: [C.green.deep, C.green.dark],
  gold: [C.gold.base, C.gold.shade],
};
export const TREES = [
  { x: 128, y: 620, size: 1.08, type: 'round', tone: 'mid' },
  { x: 244, y: 872, size: 0.9, type: 'pine', tone: 'pine' },
  { x: 618, y: 590, size: 0.7, type: 'round', tone: 'mid' },
  { x: 1808, y: 628, size: 1, type: 'round', tone: 'mid' },
  { x: 1690, y: 566, size: 0.84, type: 'pine', tone: 'pine' },
  { x: 1452, y: 1000, size: 0.96, type: 'round', tone: 'front' },
  { x: 452, y: 992, size: 1.02, type: 'round', tone: 'front' },
  { x: 108, y: 980, size: 0.74, type: 'pine', tone: 'gold' },
];

export function makeTree({ x, y, size, type, tone }, i) {
  const crown = type === 'round'
    ? blob(`crown-${i}`, ROUND, TONES[tone])
    : [[-312, -184, 66], [-258, -122, 86], [-202, -56, 106]].map(([top, bottom, hw]) =>
      path(`M0 ${top} L${-hw} ${bottom} H${hw} Z`, TONES[tone][0]) + path(`M0 ${top} L${-hw} ${bottom} H${-hw * 0.12} Z`, TONES[tone][1])).join('');
  const pivot = type === 'round' ? -150 : -60;
  return shade(`M${x - 20 * size} ${y + 2} h${44 * size} l-26 ${16 * size} h${-90 * size} Z`)
    + `<g class="tree" data-tree="${i}" data-pivot="${pivot}" transform="translate(${x} ${y}) scale(${size})">${rect(-9, pivot - 10, 18, -pivot + 10, C.ink.light, 6)}${rect(-9, pivot - 10, 9, -pivot + 10, C.ink.base, 0)}<g class="crown">${crown}</g></g>`;
}

export function makeFence(x, y, count) {
  return `<g transform="translate(${x} ${y})">${shade(`M0 2 H${count * 48 + 8} l-24 14 H-24 Z`)}${rect(0, -48, count * 48 + 8, 8, C.cream.white, 4)}${rect(0, -24, count * 48 + 8, 8, C.cream.white, 4)}${Array.from({ length: count + 1 }, (_, i) => rect(i * 48, -64, 10, 72, C.cream.white, 4) + rect(i * 48, -64, 4, 72, C.cream.shade, 2)).join('')}</g>`;
}

export function makeMeadow() {
  const tufts = [[48, 800], [168, 824], [336, 792], [480, 720], [592, 896], [688, 976], [816, 1016], [1328, 592], [1408, 752], [1600, 816], [1680, 960], [1840, 872], [1720, 1032], [216, 1032], [536, 1040], [1200, 1008], [1520, 1040], [760, 548], [1060, 560], [1560, 720]];
  const stones = [[544, 832, 32], [648, 944, 24], [784, 1008, 32], [1296, 896, 32], [1384, 960, 24], [1580, 1048, 40], [184, 784, 24], [1360, 712, 24]];
  const flowers = [[208, 888], [568, 952], [688, 1040], [1552, 800], [1664, 888], [1840, 1000], [300, 760], [1500, 880]];
  return tufts.map(([x, y]) => line(`M${x - 8} ${y} l-8-16 M${x} ${y} v-22 M${x + 8} ${y} l8-16`, C.green.shade)).join('')
    + stones.map(([x, y, w]) => rect(x, y, w, 14, C.gold.shade, 7) + rect(x + 4, y, w - 12, 7, C.cream.light, 4)).join('')
    + flowers.map(([x, y], i) => `${line(`M${x} ${y + 22} V${y}`, C.green.deep)}${circle(x, y - 4, 12, i % 3 ? C.coral.base : C.cream.white)}${circle(x, y - 4, 5, C.gold.base)}`).join('');
}

const riverBand = 'M-96 784 C304 784 624 720 832 752 C896 784 832 832 864 896 C912 1008 1168 1008 1328 1160 L1728 1160 C1536 960 1200 968 1136 880 C1088 824 1160 744 1088 688 C880 584 432 624-96 624 Z';
const waterMarks = [
  [32, 680, 80], [224, 716, 56], [448, 664, 88], [640, 708, 56], [800, 732, 40],
  [976, 748, 40], [944, 808, 48], [992, 856, 56], [1048, 916, 72],
  [1184, 972, 88], [1376, 1036, 64], [1512, 1084, 80], [320, 752, 48], [1120, 1040, 56],
];
const GLINTS = [[152, 700], [540, 690], [884, 772], [1008, 900], [1192, 1008], [1330, 1070], [700, 736], [380, 732]];
const BUNTING = 11;
const BUNTING_COLORS = [C.coral.base, C.gold.base, C.blue.base, C.cream.white];

const arcPoint = (r, a) => [976 + r * Math.cos(a * Math.PI / 180), 864 + r * Math.sin(a * Math.PI / 180)];
function arcBlock(r1, r2, a0, a1, fill) {
  const [p0, p1, p2, p3] = [arcPoint(r2, a0), arcPoint(r2, a1), arcPoint(r1, a1), arcPoint(r1, a0)];
  return path(`M${p0} A${r2} ${r2} 0 0 1 ${p1} L${p2} A${r1} ${r1} 0 0 0 ${p3} Z`, fill);
}

function makeBridge() {
  const step = 180 / 11;
  const voussoirs = Array.from({ length: 11 }, (_, i) => arcBlock(176, i === 5 ? 224 : 208, 180 + i * step + 0.9, 180 + (i + 1) * step - 0.9, i === 5 ? C.coral.shade : i % 2 ? C.coral.light : C.coral.base)).join('');
  const stones = [[672, 704, 72, 24], [680, 744, 48, 24], [704, 792, 56, 24], [664, 824, 40, 24]]
    .flatMap(([x, y, w, h]) => [rect(x, y, w, h, C.gold.light, 6), rect(1952 - x - w, y, w, h, C.gold.light, 6)]).join('');
  const posts = Array.from({ length: 13 }, (_, i) => rect(674 + i * 48, 606, 10, 46, C.ink.base, 5)).join('');
  const lamp = x => `${rect(x - 6, 480, 12, 172, C.ink.base, 6)}${rect(x - 16, 448, 32, 36, C.gold.light, 8)}${rect(x - 16, 448, 12, 36, C.gold.base, 0)}${path(`M${x - 22} 452 L${x} 428 L${x + 22} 452 Z`, C.ink.base)}`;
  const pennants = Array.from({ length: BUNTING }, (_, i) => `<path class="pennant" data-i="${i}" d="M-14 0 H14 L0 36 Z" fill="${BUNTING_COLORS[i % 4]}"/>`).join('');
  return `
    ${shade('M624 872 H1328 L1300 896 H592 Z')}
    ${path('M656 680 H1296 V872 H1152 V864 A176 176 0 0 0 800 864 V872 H656 Z', C.gold.base)}
    ${shade('M800 872 V864 A176 176 0 0 1 1152 864 V872 Z')}
    ${arcBlock(152, 176, 180, 360, C.gold.shade)}
    ${stones}${voussoirs}
    ${rect(656, 680, 640, 14, C.gold.shade)}
    ${rect(640, 852, 168, 20, C.gold.shade, 6)}${rect(1144, 852, 168, 20, C.gold.shade, 6)}
    ${rect(648, 646, 656, 36, C.coral.base, 8)}${rect(648, 646, 656, 10, C.coral.light, 5)}
    ${rect(652, 636, 648, 10, C.ink.light, 5)}${posts}${rect(644, 598, 664, 14, C.ink.base, 7)}
    ${lamp(662)}${lamp(1290)}
    <path id="bunting-line" fill="none" stroke="${C.ink.base}" stroke-width="4"/>${pennants}`;
}

export function buildScene() {
  const rings = [[172, C.cream.base], [132, C.gold.light], [88, C.gold.base]].map(([r, fill], k) => `<circle class="sun-ring" data-k="${k}" cx="0" cy="0" r="${r}" fill="${fill}"/>`).join('');
  const birds = [[0, 0], [-64, -30], [-112, 20]].map(([dx, dy], k) => `<path class="bird" data-k="${k}" data-dx="${dx}" data-dy="${dy}" fill="none" stroke="${C.ink.base}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`).join('');
  return `<defs>
    <clipPath id="water-clip">${path(riverBand, '#000')}</clipPath>
    <clipPath id="land-clip"><path d="M-200-200 H2120 V1280 H-200 Z ${riverBand}" clip-rule="evenodd"/></clipPath>
    ${waterMarks.map(([x, y], i) => `<clipPath id="ripple-${i}">${rect(x - 96, y - 8, 192, 24, '#000')}</clipPath>`).join('')}
    <clipPath id="stage-clip">${rect(0, 0, 1920, 1080, '#000')}</clipPath>
  </defs>
  <g clip-path="url(#stage-clip)">
  <g id="layer-sky">
    ${rect(-200, -200, 2320, 1480, C.cream.light)}${rect(-200, 330, 2320, 260, C.cream.base)}
    <g transform="translate(1488 208)">${rings}</g>
    ${makeCloud(120, 136, 0.96, 0)}${makeCloud(612, 236, 0.76, 1)}${makeCloud(1040, 104, 0.7, 2)}${makeCloud(1660, 318, 0.82, 3)}
  </g>
  <g id="layer-far">
    ${path('M-200 520 C-40 404 140 368 320 424 C460 344 640 336 800 432 C940 384 1060 366 1180 420 C1340 334 1560 326 1720 412 C1840 372 1980 384 2120 440 V760 H-200 Z', C.green.light)}
    ${path('M-200 512 C60 452 300 452 520 494 C760 452 1000 452 1220 494 C1440 440 1720 440 2120 506 V760 H-200 Z', C.gold.base)}
    ${path('M-200 540 C60 482 300 482 520 520 C760 482 1000 482 1220 520 C1440 470 1720 470 2120 532 V760 H-200 Z', C.gold.light)}
    <g id="birds">${birds}</g>
  </g>
  <g id="layer-main">
    ${path('M-200 548 C80 476 320 476 560 528 C760 488 900 488 1040 528 C1260 462 1520 462 1720 516 C1860 488 1960 494 2120 506 V1280 H-200 Z', C.green.base)}
    ${path('M-200 744 Q208 696 464 872 T1024 1280 H-200 Z', C.green.light)}
    ${path('M1264 712 Q1512 664 1760 768 T2120 784 V1280 H1456 Q1440 968 1264 872 Z', C.green.light)}
    ${path('M300 652 H384 Q544 652 640 696 H712 V744 H632 Q536 704 384 704 H300 Z', C.gold.shade)}
    ${path('M300 644 H384 Q544 644 640 688 H712 V728 H632 Q536 692 384 692 H300 Z', C.gold.light)}
    ${path(riverBand, C.teal.shade)}
    <g clip-path="url(#water-clip)">
      <g transform="translate(0 18)">${path(riverBand, C.teal.base)}</g>
      ${waterMarks.map(([x, y, w], i) => `<g clip-path="url(#ripple-${i})"><g class="ripple" data-x="${x}" data-y="${y}">${rect(0, 0, w, 8, C.teal.light, 4)}${rect(-192, 0, w, 8, C.teal.light, 4)}${rect(192, 0, w, 8, C.teal.light, 4)}</g></g>`).join('')}
      ${GLINTS.map((_, i) => `<path class="glint-water" data-i="${i}" d="M0-18 L7 0 L0 18 L-7 0 Z" fill="${C.teal.foam}"/>`).join('')}
      ${[0, 1].map(k => `<ellipse class="boat-ring" data-k="${k}" cx="1240" cy="1012" fill="none" stroke="${C.teal.light}" stroke-width="6"/>`).join('')}
    </g>
    <g id="boat">${path('M-70-18 H70 L46 14 H-46 Z', C.coral.base)}${path('M-70-18 H70 L64-8 H-64 Z', C.coral.light)}${path('M-46 14 L-58-2 H58 L46 14 Z', C.coral.shade)}${rect(-4, -122, 8, 106, C.ink.base, 4)}${path('M8-112 L8-26 L62-26 Z', C.cream.white)}${path('M-6-104 L-6-26 L-46-26 Z', C.cream.shade)}</g>
    ${path('M452 568 H500 Q500 600 540 612 Q600 628 640 646 L668 656 V690 L636 680 Q580 662 520 648 Q452 630 452 590 Z', C.gold.shade)}
    ${path('M452 560 H500 Q500 592 540 604 Q600 620 640 638 L668 648 V680 L636 672 Q580 654 520 640 Q452 622 452 582 Z', C.gold.light)}
    ${path('M1288 662 Q1420 650 1548 656 H1596 Q1600 674 1596 690 Q1440 686 1296 700 Z', C.gold.shade)}
    ${path('M1288 652 Q1420 640 1548 646 H1596 Q1600 664 1596 680 Q1440 676 1296 690 Z', C.gold.light)}
    ${makeTree(TREES[0], 0)}
    ${makeFence(40, 608, 3)}
    ${makeHouse(400, 568, C.coral, { w: 152, s: 104, chimney: true })}
    <g id="smoke">${[0, 1, 2, 3].map(i => `<g class="smoke" data-i="${i}">${circle(0, 0, 26, C.cream.shade)}${circle(4, -4, 22, C.cream.white)}</g>`).join('')}</g>
    ${makeTree(TREES[2], 2)}${makeTree(TREES[3], 3)}${makeTree(TREES[4], 4)}
    ${makeHouse(1504, 648, C.blue, { w: 168, s: 112, flag: true })}
    <path id="flag" fill="${C.coral.base}"/>
    ${makeFence(1656, 812, 4)}
    ${makeBridge()}
    <g clip-path="url(#land-clip)">${makeMeadow()}</g>
    <g transform="translate(560 616)">${blob('bush-a', [[-24, 0, 24], [8, -10, 32], [40, 0, 24]], TONES.mid)}</g>
  </g>
  <g id="layer-front">
    ${[1, 5, 6, 7].map(i => makeTree(TREES[i], i)).join('')}
    <g transform="translate(1840 952)">${blob('bush-b', [[-28, 0, 34], [16, -18, 44], [54, 6, 28]], TONES.front)}</g>
    <g transform="translate(-8 1060)">${blob('bush-c', [[0, 0, 56], [64, 16, 40]], TONES.front)}</g>
  </g>
  </g>`;
}

svg.insertAdjacentHTML('beforeend', buildScene());
const $$ = sel => [...svg.querySelectorAll(sel)];
const layers = Object.keys(CAMERA.layers).map(name => [svg.querySelector(`#layer-${name}`), CAMERA.layers[name]]);
const clouds = $$('.cloud'), trees = $$('.tree'), smoke = $$('.smoke'), ripples = $$('.ripple');
const sunRings = $$('.sun-ring'), birds = $$('.bird'), pennants = $$('.pennant'), glints = $$('.glint'), lamps = $$('.lamp');
const waterGlints = $$('.glint-water'), boatRings = $$('.boat-ring');
const boat = svg.querySelector('#boat'), flag = svg.querySelector('#flag'), buntingLine = svg.querySelector('#bunting-line');
const crowns = trees.map(node => node.querySelector('.crown'));

// 준비 동작(-) → 신장(+) → 반동 → 작은 반동 → 안착. 양 끝 값과 속도가 0이다.
export function spring(phase) {
  const keys = [[0, 0], [0.12, -0.045], [0.30, 0.09], [0.48, -0.026], [0.64, 0.012], [0.8, 0], [1, 0]];
  const i = keys.findIndex((key, index) => index < keys.length - 1 && phase >= key[0] && phase <= keys[index + 1][0]);
  const [a, b] = [keys[Math.max(0, i)], keys[Math.max(0, i) + 1]];
  return a[1] + (b[1] - a[1]) * smooth((phase - a[0]) / (b[0] - a[0]));
}

// 바람 한 번이 화면 왼쪽에서 오른쪽으로 지나간다(x에 비례한 스태거). lag는 부속물이 늦게 따라오는 초 단위 지연.
export const gust = (t, x, lag = 0) => spring(clamp01(saw(t, 1, -0.18 - x / 1920 * 0.14 - lag / DURATION) / 0.5));
// 들어가서 잠시 머물렀다 돌아오는 카메라. 양 끝과 중간 정지 구간에서 속도가 0이다.
export const cameraCurve = p => smooth(clamp01((p < 0.5 ? p : 1 - p) / CAMERA.hold));

export function render(t) {
  const phase = saw(t);
  const push = cameraCurve(phase);
  for (const [node, f] of layers) {
    const z = 1 + CAMERA.zoom * push * f;
    node.setAttribute('transform', `translate(${CAMERA.x + CAMERA.pan * push * f} ${CAMERA.y}) scale(${z}) translate(${-CAMERA.x} ${-CAMERA.y})`);
  }
  sunRings.forEach((node, k) => node.setAttribute('transform', `scale(${1 + 0.03 * Math.sin(TAU * phase - k * 0.7)})`));
  clouds.forEach(node => {
    const { x, y, scale, i } = node.dataset;
    node.setAttribute('transform', `translate(${Number(x) + (18 + 10 * (i % 2)) * Math.sin(TAU * phase + i * 1.3)} ${y}) scale(${scale})`);
  });

  // 새 떼는 화면 밖(-220, 2180)에서만 순환해 이음매가 보이지 않는다. 날갯짓은 5초에 8번.
  const flock = saw(t, 1, 0.12);
  birds.forEach(node => {
    const k = Number(node.dataset.k);
    const bx = -220 + 2400 * flock + Number(node.dataset.dx), by = 250 - 80 * flock + Number(node.dataset.dy) + 10 * Math.sin(TAU * 2 * phase + k);
    const flap = Math.sin(TAU * 8 * phase + k * 1.1);
    node.setAttribute('d', `M${bx - 24} ${by - 4 - 12 * flap} Q${bx - 10} ${by - 8} ${bx} ${by} Q${bx + 10} ${by - 8} ${bx + 24} ${by - 4 - 12 * flap}`);
  });

  trees.forEach((node, n) => {
    const tree = TREES[Number(node.dataset.tree)];
    const g = gust(t, tree.x), late = gust(t, tree.x, 0.15);
    const idle = 0.8 * Math.sin(TAU * 2 * phase + tree.x * 0.004);
    node.setAttribute('transform', `translate(${tree.x} ${tree.y}) rotate(${idle + 60 * g}) scale(${tree.size * (1 - 0.5 * g)} ${tree.size * (1 + 0.5 * g)})`);
    crowns[n].setAttribute('transform', `rotate(${0.6 * idle + 36 * late} 0 ${node.dataset.pivot})`);
  });

  // 가랜드: 줄은 2번 출렁이고, 깃발은 바람이 다리에 닿을 때 순서대로 날린다.
  const sag = 48 + 4 * Math.sin(TAU * 2 * phase), [x0, x1, y0] = [662, 1290, 462];
  buntingLine.setAttribute('d', `M${x0} ${y0} Q976 ${y0 + 2 * sag} ${x1} ${y0}`);
  pennants.forEach((node, i) => {
    const u = (i + 1) / (BUNTING + 1), px = x0 + (x1 - x0) * u, py = y0 + 4 * sag * u * (1 - u);
    const angle = 5 * Math.sin(TAU * 2 * phase - i * 0.45) - 150 * gust(t, px, 0.1);
    node.setAttribute('transform', `translate(${px} ${py}) rotate(${angle})`);
  });

  const fx = 1592, fy = 368, fg = Math.max(0, gust(t, fx, 0.12));
  const wave = x => (3 + 36 * fg) * Math.sin(x / 14 - TAU * 4 * phase) * (x / 60);
  const xs = Array.from({ length: 7 }, (_, j) => j * 10);
  flag.setAttribute('d', `M${fx} ${fy} ${xs.map(x => `L${fx + x} ${(fy + wave(x)).toFixed(2)}`).join(' ')} ${[...xs].reverse().map(x => `L${fx + x} ${(fy + 34 + wave(x)).toFixed(2)}`).join(' ')} Z`);

  glints.forEach(node => {
    const { k, x, w } = node.dataset;
    const sweep = smooth(clamp01((phase - 0.56 - k * 0.025) / 0.16));
    node.setAttribute('transform', `translate(${Number(x) - 24 + (Number(w) + 48) * sweep} 0)`);
  });
  lamps.forEach(node => node.setAttribute('fill-opacity', (0.55 + 0.45 * (0.5 + 0.5 * Math.sin(TAU * 2 * phase + Number(node.dataset.k)))).toFixed(4)));

  ripples.forEach(node => node.setAttribute('transform', `translate(${Number(node.dataset.x) + 192 * phase} ${node.dataset.y})`));
  waterGlints.forEach((node, i) => {
    const s = Math.sin(Math.PI * clamp01(saw(t, 2, i * 0.29) / 0.4)) ** 2;
    node.setAttribute('transform', `translate(${GLINTS[i][0]} ${GLINTS[i][1]}) scale(${s.toFixed(5)})`);
  });

  boat.setAttribute('transform', `translate(1240 ${1000 + 4 * Math.sin(TAU * 2 * phase)}) rotate(${2.5 * Math.sin(TAU * 2 * phase + 0.9)})`);
  boatRings.forEach((node, k) => {
    const p = saw(t, 2, k / 2);
    node.setAttribute('rx', (64 + 72 * p).toFixed(3));
    node.setAttribute('ry', (12 + 14 * p).toFixed(3));
    node.setAttribute('stroke-opacity', (0.9 * Math.sin(Math.PI * p)).toFixed(4));
  });

  // 연기: 튀어나오며 커지고(오버슈트) 바람 쪽으로 흘러가다 0으로 줄어든다. 주기 양 끝 크기가 0이라 이음매가 없다.
  smoke.forEach((node, i) => {
    const p = saw(t, 1, i / 4);
    const s = backOut(clamp01(p / 0.2)) * (1 - smooth(clamp01((p - 0.6) / 0.4))) * (0.5 + 0.9 * p);
    node.setAttribute('transform', `translate(${322 + 64 * smooth(p) + 8 * Math.sin(TAU * p)} ${348 - 176 * p}) scale(${s.toFixed(5)})`);
  });
}

console.assert(TREES.length === 8 && Object.keys(PALETTE).length === 7 && DURATION === 5, '장면 계약을 확인합니다.');
console.assert(spring(0) === 0 && spring(1) === 0 && Math.abs(backOut(0)) < 1e-4 && backOut(1) === 1, '탄성 곡선의 양 끝이 일치해야 합니다.');
console.assert(cameraCurve(0) === 0 && cameraCurve(0.5) === 1 && cameraCurve(0.9999) < 1e-3, '카메라는 닫힌 경로여야 합니다.');
start(render);
