import { start, DURATION, TAU, smooth } from '../../shared/runtime.js';

export const PALETTE = Object.freeze({
  ink: '#13162d', indigo: '#323957', plum: '#704473', rose: '#d36b92',
  peach: '#ffb58b', sage: '#424f50', ivory: '#ffecd2',
});
export const MATERIAL = Object.freeze({ glassBlur: 32, glassSaturation: 1.65, glassTintTop: .18, glassTintBottom: .10, waterAlpha: .32, stone: '#514557' });
export const LIGHTING = Object.freeze({ sunX: 1110, sunY: 428, sunRadius: 60, window: '#ffcf93', vignette: .3 });
export const CAMERA = Object.freeze({ width: 1920, height: 1080, panX: 24, panY: -8, zoom: 1.035 });

const W = CAMERA.width, H = CAMERA.height;
const canvas = document.querySelector('#scene');
const ctx = canvas.getContext('2d', { alpha: false });
const stage = document.querySelector('#stage');
const hero = document.querySelector('#hero');
const bridgeCard = document.querySelector('#bridge-card');
const flowCard = document.querySelector('#flow-card');
const progress = document.querySelector('#progress');
const fill = document.querySelector('#fill');
const wave = document.querySelector('#wave');
const glass = [...document.querySelectorAll('.glass')];
const sheens = [...document.querySelectorAll('.sheen')];
stage.style.setProperty('--glass-tint-top', MATERIAL.glassTintTop);
stage.style.setProperty('--glass-tint-bottom', MATERIAL.glassTintBottom);
const chips = ['a', 'b'].map(id => ({
  node: document.querySelector(`#chip-${id}`),
  line: document.querySelector(`#pointer-${id}`),
  dot: document.querySelector(`#point-${id}`),
}));
glass.forEach(node => {
  node.style.backdropFilter = `blur(${MATERIAL.glassBlur}px) saturate(${MATERIAL.glassSaturation})`;
  node.style.webkitBackdropFilter = node.style.backdropFilter;
});

function mulberry32(seed) {
  return () => {
    let n = seed += 0x6D2B79F5;
    n = Math.imul(n ^ n >>> 15, n | 1);
    n ^= n + Math.imul(n ^ n >>> 7, n | 61);
    return ((n ^ n >>> 14) >>> 0) / 4294967296;
  };
}
const random = mulberry32(80824);
const stars = Array.from({ length: 65 }, () => ({ x: random() * W, y: random() * 400, r: .6 + random() * 1.1, phase: random() * TAU }));
const ripples = Array.from({ length: 175 }, () => ({ x: random() * 2200 - 120, y: 545 + random() * 615, w: 7 + random() * 75, phase: random() * TAU }));
const particles = Array.from({ length: 34 }, () => ({ x: random() * 2080 - 80, y: 460 + random() * 620, r: 1 + random() * 4, phase: random() * TAU, depth: random() }));
const grassSeeds = Array.from({ length: 250 }, () => ({ x: random() * 1300 - 100, y: 700 + random() * 440, h: 5 + random() * 15, phase: random() * TAU }));
const trees = [
  { x: 208, y: 665, s: 1.15, pine: true }, { x: 366, y: 641, s: .79 },
  { x: 702, y: 725, s: .78, pine: true }, { x: 1574, y: 608, s: .93, pine: true },
  { x: 1668, y: 674, s: 1.22 }, { x: 1810, y: 744, s: 1.55, pine: true },
  { x: 262, y: 891, s: 1.64 }, { x: 63, y: 1013, s: 2, pine: true },
];
const river = new Path2D('M-150 565C140 520 312 535 520 570C712 612 823 637 1010 675C1245 719 1230 834 1450 887C1620 935 1810 923 2070 990L2070 1210L1040 1210C1070 1035 1120 977 1050 882C976 782 930 750 793 724C561 580 306 590-150 650Z');
const land = new Path2D('M-100 622Q140 569 390 592Q620 593 800 611Q960 624 1130 601Q1360 543 1570 577Q1750 595 2020 673L2020 1200H-100Z');
let pixelRatio = 1;
let renderedTime = 0;

function path(d, color, stroke, width = 1) {
  const p = new Path2D(d);
  if (color) { ctx.fillStyle = color; ctx.fill(p); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(p); }
}
function ellipse(x, y, rx, ry, color) {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fillStyle = color; ctx.fill();
}
function gradient(x0, y0, x1, y1, stops) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  stops.forEach(([at, color]) => g.addColorStop(at, color));
  return g;
}
function halo(x, y, radius, color) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
  g.addColorStop(0, color); g.addColorStop(1, 'transparent');
  ctx.fillStyle = g; ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}
function cameraOffset(phase) {
  const eased = (1 - Math.cos(phase)) / 2;
  return { x: CAMERA.panX * eased, y: CAMERA.panY * eased };
}
function worldPoint(x, y, offset) {
  return { x: W / 2 + (x - W / 2) * CAMERA.zoom + offset.x, y: H / 2 + (y - H / 2) * CAMERA.zoom + offset.y };
}

function drawSky(p, camera) {
  ctx.fillStyle = gradient(0, 0, 0, 690, [[0, PALETTE.ink], [.28, '#462754'], [.53, '#a14c7e'], [.76, PALETTE.rose], [1, PALETTE.peach]]);
  ctx.fillRect(-100, -100, W + 200, H + 200);
  ctx.save(); ctx.translate(camera.x * .16, camera.y * .16);
  halo(LIGHTING.sunX, 460, 485, '#ffbc9878');
  halo(1730, 340, 390, '#c1688c26');
  for (const s of stars) ellipse(s.x, s.y, s.r, s.r, `rgba(255,236,217,${.13 + .1 * (1 + Math.sin(p + s.phase))})`);
  ellipse(LIGHTING.sunX, LIGHTING.sunY, LIGHTING.sunRadius, LIGHTING.sunRadius, '#ffcca2');
  ellipse(LIGHTING.sunX, LIGHTING.sunY, LIGHTING.sunRadius - 5, LIGHTING.sunRadius - 5, '#ffdaac');
  const clouds = [[290, 260, 1.12, .4], [870, 178, 1.1, 2.1], [1420, 316, .95, 4], [1690, 115, .7, 5.3]];
  clouds.forEach(([x, y, size, phase]) => {
    ctx.save(); ctx.translate(x + 22 * Math.sin(p + phase), y + 3 * Math.cos(p + phase)); ctx.scale(size, size);
    path('M-170 21Q-124 2-94 9Q-57-20-13-7Q17-29 59-8Q111-13 141 10Q185 9 206 25Q32 43-170 31Z', gradient(0, -25, 0, 48, [[0, '#b19ab323'], [.72, '#e2adbb39'], [1, '#f6bfa235']]));
    path('M-147 29Q-24 15 163 27', null, '#f7bdad20', 1);
    ctx.restore();
  });
  ctx.restore();
  ctx.save(); ctx.translate(camera.x * .3, camera.y * .3);
  path('M-120 559Q50 512 120 529Q260 450 382 500Q470 455 612 517Q737 422 864 473Q1020 365 1177 466Q1305 416 1430 482Q1570 427 1710 480Q1890 414 2030 499L2030 720H-120Z', gradient(0, 420, 0, 660, [[0, '#51405f'], [1, '#946b80']]));
  path('M-100 610Q110 536 277 563Q444 510 594 570Q738 503 910 565Q1040 523 1179 560Q1340 503 1490 543Q1700 524 2040 586L2040 730H-100Z', gradient(0, 510, 0, 740, [[0, '#38394f'], [1, '#756074']]));
  ctx.restore();
}

function drawGround(p) {
  ctx.fillStyle = gradient(0, 550, 0, 1100, [[0, '#50515b'], [.38, '#303c43'], [1, '#1b2834']]); ctx.fill(land);
  path('M-80 693C203 629 480 681 714 745Q869 788 1044 913L1039 970C875 833 708 799 535 768Q206 717-80 779Z', '#26333d');
  path('M1990 686Q1750 631 1557 631Q1431 635 1270 666', null, '#666263', 15);
  path('M526 660C611 680 706 681 805 678Q826 674 854 660', null, '#9b858364', 30);
  path('M527 657C640 678 730 677 853 656', null, '#b79b8a35', 7);
  path('M1291 638Q1366 625 1471 615', null, '#a68a7e5c', 25);
  path('M1310 638Q1400 620 1482 615', null, '#d5b89e33', 5);
  ctx.save(); ctx.clip(land);
  for (const g of grassSeeds) {
    const sway = Math.sin(p + g.phase) * 2;
    path(`M${g.x} ${g.y}q${-3 + sway} ${-g.h} ${-6 + sway} ${-g.h - 4}m6 ${g.h + 4}q4 -10 8 -12`, null, g.y > 860 ? '#63807732' : '#bba48e1c', 1.2);
  }
  ctx.restore();
  for (let i = 0; i < 18; i++) {
    const u = .54 + i * .024, v = 1 - u;
    const x = v ** 3 * -150 + 3 * v * v * u * 306 + 3 * v * u * u * 561 + u ** 3 * 793;
    const y = v ** 3 * 650 + 3 * v * v * u * 590 + 3 * v * u * u * 580 + u ** 3 * 724 + 7;
    ellipse(x, y + 2, 8 + i % 3 * 3, 4, '#121f2a66');
    ellipse(x, y, 7 + i % 3 * 3, 4 + i % 2, i % 2 ? '#6b6868' : '#7c7372');
  }
}

function drawWater(p) {
  ctx.save(); ctx.clip(river);
  ctx.fillStyle = gradient(850, 550, 1200, 1180, [[0, '#dc92a0'], [.2, '#a56588'], [.48, '#71547e'], [.78, '#3a405e'], [1, '#252d49']]); ctx.fillRect(-150, 490, W + 300, 750);
  halo(1150, 778, 350, '#efa37d3b');
  ctx.save(); ctx.translate(1140, 814); ctx.scale(.63, 1.7); halo(0, 0, 160, '#ffd0a44a'); ctx.restore();
  for (let i = 0; i < 36; i++) {
    const y = 675 + i * 11, drift = Math.sin(p + i * .64);
    const x = 1040 + Math.max(0, y - 740) * 1.04 + drift * 15;
    const width = 15 + i * 2.1 + Math.sin(i * 5.3) * 24;
    path(`M${x - width} ${y}q${width} ${2 * drift} ${width * 2} 0`, null, `rgba(255,201,159,${.1 + .12 * (.5 + .5 * Math.sin(p + i))})`, i % 3 ? 1.7 : 3);
  }
  for (const r of ripples) {
    const drift = Math.sin(p + r.phase), x = r.x + 19 * drift, y = r.y + 2 * Math.cos(p + r.phase);
    path(`M${x} ${y}q${r.w / 2} ${2 * drift} ${r.w} 0`, null, `rgba(246,213,219,${MATERIAL.waterAlpha * (.16 + .45 * (.5 + .5 * Math.sin(p + r.phase)))})`, r.y > 900 ? 1.5 : 1);
  }
  for (const [x, y] of [[552, 718], [1445, 726]]) {
    for (let i = 0; i < 8; i++) {
      const xx = x + Math.sin(p + i * 1.6) * 9;
      path(`M${xx - 9 - i * 3} ${y + i * 6}h${18 + i * 6}`, null, `rgba(255,192,128,${.21 - i * .021})`, 2);
    }
  }
  path('M788 761Q1040 798 1300 741', null, '#211e344d', 17);
  ctx.restore();
  path('M-150 650C306 590 561 580 793 724C930 750 976 782 1050 882C1120 977 1070 1035 1040 1150', null, '#16293499', 11);
  path('M-150 648C306 588 561 578 793 722C930 748 976 780 1050 880C1120 975 1070 1033 1040 1150', null, '#ba9b943d', 2);
  path('M-150 565C140 520 312 535 520 570C712 612 823 637 1010 675C1245 719 1230 834 1450 887C1620 935 1810 923 2070 990', null, '#e2aa922b', 2);
}

function drawShrub(x, y, s, p) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ellipse(0, 3, 43, 9, '#101e2c55');
  for (let i = 0; i < 5; i++) ellipse((i - 2) * 13, -8 - Math.sin(i * 2) * 5 + Math.sin(p + i) * .6, 18, 14, i % 2 ? '#37494c' : '#425052');
  path('M-24-18Q-18-24-12-22M9-22Q21-25 28-17', null, '#a6a19038', 1.5);
  ctx.restore();
}

function drawHouse(x, y, s, blue, p) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ellipse(1, 3, 101, 14, '#121e2e70');
  path('M-82-1L-82-93L20-123L83-89V-1Z', '#373440');
  path('M20-123L83-89V-1H20Z', '#282c3b');
  path('M-82-93L-30-143L29-111L29-1H-82Z', gradient(-90, -130, 40, 10, [[0, '#77707a'], [1, '#4d4c58']]));
  path('M-94-91L-32-153L38-111L27-101L-31-139L-82-82Z', blue ? '#3f5572' : '#8e5969');
  path('M-32-153L25-166L99-113L38-111Z', blue ? '#384969' : '#684657');
  path('M-94-91L-32-153L25-166L99-113', null, blue ? '#a1afc16b' : '#e5a2947d', 2.5);
  path('M-94-89L-31-150L38-108L97-110', null, '#172132', 3);
  for (let i = 0; i < 5; i++) path(`M${-70 + i * 12} ${-113 - i * 7}l61 38`, null, '#2b26352b', 1.3);
  if (!blue) {
    path('M46-145V-184H65V-131Z', '#514353');
    path('M42-185H69V-179H42Z', '#82717a');
    for (let i = 0; i < 5; i++) {
      const u = ((p / TAU + i / 5) % 1 + 1) % 1, fade = Math.sin(Math.PI * u) ** 2;
      ellipse(54 + 16 * Math.sin(u * 2 + p) + 30 * u, -188 - u * 94, 5 + u * 18, 5 + u * 11, `rgba(217,188,207,${fade * .18})`);
    }
  }
  ctx.fillStyle = '#282c3a'; ctx.fillRect(-13, -44, 25, 44);
  ctx.fillStyle = '#b2a195'; ctx.fillRect(-15, -45, 2, 44); ctx.fillRect(-16, -2, 31, 4);
  ellipse(6, -21, 1.6, 1.6, '#f6d3a3');
  const windows = [[-65, -69, 26, 31], [43, -65, 24, 29], [-40, -112, 15, 17]];
  for (const [wx, wy, ww, wh] of windows) {
    halo(wx + ww / 2, wy + wh / 2, 40, '#ffb36d20');
    ctx.fillStyle = '#202637'; ctx.fillRect(wx - 3, wy - 3, ww + 6, wh + 6);
    ctx.fillStyle = gradient(0, wy, 0, wy + wh, [[0, LIGHTING.window], [1, '#d99467']]); ctx.fillRect(wx, wy, ww, wh);
    path(`M${wx + ww / 2} ${wy}v${wh}M${wx} ${wy + wh / 2}h${ww}`, null, '#725854', 2);
    path(`M${wx - 4} ${wy + wh + 3}h${ww + 8}`, null, '#bba390', 3);
  }
  path('M-79-51H-40M-79-29H-38M26-20H78M26-83H72', null, '#b5a0a21c', 1);
  ctx.restore();
}

function drawTree(tree, p, i) {
  const { x, y, s, pine } = tree;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ellipse(6, 3, pine ? 39 : 53, 8, '#111e2c6b');
  ctx.transform(1, 0, Math.sin(p + i * .8) * .009, 1, 0, 0);
  path('M-7 0L-5-110L4-135L8 0Z', '#232a37');
  path('M-2-30L-30-76M2-61L29-102', null, '#30353e', 4);
  if (pine) {
    const shade = gradient(-44, -130, 50, -10, [[0, '#4d5558'], [.45, '#2d3b44'], [1, '#222c3a']]);
    path('M0-205L-27-153L-14-156L-42-108L-25-113L-58-57L-36-64L-65-20Q0-2 65-20L36-64L56-57L25-113L41-108L14-156L27-153Z', shade);
    path('M0-202L-23-155M-16-146L-37-111M-28-101L-51-62M-40-49L-57-24', null, '#c0a0a135', 1.3);
    path('M-35-72Q-11-65 12-74M-22-118Q-2-111 19-118', null, '#938a9219', 2);
  } else {
    const crowns = [[-30, -124, 43, 46], [8, -159, 45, 43], [43, -128, 42, 45], [-9, -106, 47, 43]];
    for (const [cx, cy, rx, ry] of crowns) ellipse(cx, cy, rx, ry, gradient(cx - rx, cy - ry, cx + rx, cy + ry, [[0, '#596064'], [.35, '#3d4c50'], [1, '#273440']]));
    for (let n = 0; n < 15; n++) {
      const angle = n * 2.399, r = 16 + n * 2.2;
      const lx = Math.cos(angle) * r, ly = -137 + Math.sin(angle) * r * .8;
      path(`M${lx - 8} ${ly + 3}q8 -8 17 -2`, null, n % 3 ? '#bd9d9d1a' : '#182b363b', 2);
    }
    path('M-53-149Q-38-167-22-164M-19-189Q0-202 18-190M37-163Q58-160 65-143', null, '#d1b2ab36', 1.5);
  }
  ctx.restore();
}

function bridgeTop(x) { const u = (x - 790) / 530; return 650 - 126 * u * (1 - u) - 30 * u; }
function drawBridge() {
  path('M774 759Q810 746 885 751M1246 731Q1289 728 1336 732', null, '#132130a6', 15);
  path('M790 650Q1045 572 1320 620L1320 730L1238 739C1208 594 945 607 895 755L790 775Z', gradient(850, 590, 1200, 775, [[0, '#8f7680'], [.25, '#6a5969'], [.7, MATERIAL.stone], [1, '#373644']]));
  path('M895 755C945 607 1208 594 1238 739', null, '#2d2b40', 13);
  path('M894 750C947 602 1207 592 1240 733', null, '#bba09676', 4);
  path('M790 650Q1045 572 1320 620', null, '#d5b6a099', 10);
  path('M790 659Q1045 581 1320 629', null, '#3c384e', 5);
  for (let i = 0; i < 19; i++) {
    const x = 800 + i * 28, y = bridgeTop(x);
    path(`M${x} ${y - 3}l0 -37`, null, '#333044', 4);
    path(`M${x - 1} ${y - 3}l0 -37`, null, '#a99191', 1.2);
  }
  path('M785 612Q1045 535 1325 582', null, '#332d42', 6);
  path('M785 609Q1045 532 1325 579', null, '#dfb4a19c', 2);
  path('M790 630Q1045 553 1320 600', null, '#b3979673', 2);
  for (let i = 0; i < 15; i++) {
    const u = (i + .5) / 15, a = Math.PI * (1 - u);
    const x = 1066 + 171 * Math.cos(a), y = 748 - 104 * Math.sin(a);
    path(`M${x} ${y}l${Math.cos(a) * 14} ${-Math.sin(a) * 19}`, null, '#322c4070', 2);
  }
  path('M806 702L849 691M805 732L856 719M1278 651L1307 648M1287 677L1308 675M1289 703L1307 702', null, '#e5b9a11f', 1);
  path('M828 697v14M816 727v17M1296 651v22M1281 678v23', null, '#292b3e42', 1.4);
  path('M802 687L855 676M802 719L838 710M803 748L840 739M1270 665L1308 659M1273 695L1308 689', null, '#c5a49332', 1.4);
  for (const x of [796, 1316]) {
    const y = bridgeTop(x) - 41;
    path(`M${x - 7} ${y + 4}h14v46h-14Z`, '#56485d');
    path(`M${x - 10} ${y}h20v6h-20Z`, '#a68b89');
    halo(x, y - 15, 42, '#ffbb7142');
    ctx.fillStyle = '#242b3b'; ctx.fillRect(x - 4, y - 28, 8, 27);
    ctx.fillStyle = '#ffd3a0'; ctx.fillRect(x - 3, y - 26, 6, 15);
    path(`M${x - 6} ${y - 28}l6 -5 6 5Z`, '#313043');
  }
}

function drawFence() {
  for (let i = 0; i < 10; i++) {
    const x = 345 + i * 26, y = 661 + i * 2.9;
    path(`M${x} ${y}v-28`, null, '#2a303b', 4);
    path(`M${x - 1} ${y - 28}h3`, null, '#cda98f77', 2);
  }
  path('M342 640L583 666M342 650L583 676', null, '#7e77776b', 2.5);
  path('M1550 635L1680 679M1550 645L1680 689', null, '#92908b52', 2.5);
  for (let i = 0; i < 6; i++) path(`M${1550 + i * 26} ${655 + i * 8.8}v-30`, null, '#343b43', 4);
}

function drawForeground(p) {
  drawShrub(710, 773, 1.1, p); drawShrub(493, 871, .75, p); drawShrub(894, 915, .9, p);
  drawShrub(1642, 778, 1.2, p); drawShrub(1850, 869, 1.5, p); drawShrub(386, 978, 1.25, p);
  for (let i = 0; i < 19; i++) {
    const x = 492 + i * 17 + Math.sin(i * 2.1) * 22, y = 825 + Math.sin(i * 1.7) * 30;
    const bend = Math.sin(p + i) * 2;
    path(`M${x} ${y + 10}q-1 -8 ${bend} -14`, null, '#84917b50', 1);
    ellipse(x + bend, y - 4, 1.6, 1.5, i % 3 ? '#dba5a575' : '#f3cd9e85');
  }
  for (let i = 0; i < 21; i++) {
    const x = 800 + Math.sin(i * .54) * 45 + i * 12, y = 798 + i * 13;
    const bend = Math.sin(p + i * .7) * 4, height = 18 + i % 5 * 6;
    path(`M${x} ${y}q${bend - 4} ${-height / 2} ${bend - 8} ${-height}`, null, '#62706a', 1.5);
    path(`M${x} ${y}q7 -12 13 -17`, null, '#31464b', 2);
    if (i % 3 === 0) { ellipse(x + bend - 8, y - height - 2, 2.3, 7, '#ae9190'); }
  }
  path('M-60 1053Q180 1007 320 1070Q516 1040 657 1120H-60Z', '#192a33');
  for (let i = 0; i < 37; i++) {
    const x = i * 19 - 40, y = 1065 + 34 * Math.sin(i * .2), bend = 4 * Math.sin(p + i);
    path(`M${x} 1120Q${x - 3} ${y + 6} ${x + bend - 20} ${y - 32}M${x} 1120Q${x + 13} ${y} ${x + bend + 24} ${y - 15}`, null, i % 3 ? '#263b40' : '#5d6261', 2);
  }
}

function drawParticles(p) {
  for (const b of particles) {
    const x = b.x + Math.sin(p + b.phase) * (9 + b.depth * 13), y = b.y + Math.cos(p + b.phase) * 12;
    const alpha = .14 + .19 * (.5 + .5 * Math.sin(p + b.phase));
    if (b.r > 3) {
      halo(x, y, b.r * 4, `rgba(255,199,153,${alpha * .25})`);
      ellipse(x, y, b.r, b.r, `rgba(255,203,164,${alpha * .45})`);
    } else {
      halo(x, y, 11, `rgba(255,201,147,${alpha * .35})`);
      ellipse(x, y, b.r * .65, b.r * .65, `rgba(255,221,174,${alpha + .12})`);
    }
  }
}

function drawScene(p, camera) {
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  drawSky(p, camera);
  ctx.save(); ctx.translate(W / 2 + camera.x, H / 2 + camera.y); ctx.scale(CAMERA.zoom, CAMERA.zoom); ctx.translate(-W / 2, -H / 2);
  drawGround(p); drawWater(p);
  drawShrub(410, 631, .6, p); drawShrub(1533, 618, .62, p); drawShrub(1381, 626, .65, p);
  trees.slice(0, 6).forEach((tree, i) => drawTree(tree, p, i));
  drawHouse(543, 655, .95, false, p); drawHouse(1432, 622, 1.05, true, p);
  drawFence(); drawBridge();
  trees.slice(6).forEach((tree, i) => drawTree(tree, p, i + 6));
  drawForeground(p); drawParticles(p);
  ctx.restore();
  const vignette = ctx.createRadialGradient(1010, 540, 270, 960, 540, 1160);
  vignette.addColorStop(0, 'transparent'); vignette.addColorStop(1, `rgba(13,15,35,${LIGHTING.vignette})`);
  ctx.fillStyle = vignette; ctx.fillRect(0, 0, W, H);
}

function updateChip(index, x, y, p, camera) {
  const chip = chips[index], target = worldPoint(x, y, camera);
  const dx = index ? 103 : -164, bob = Math.sin(p + index * 1.4) * 5;
  const left = target.x + dx - 56, top = target.y - (index ? 108 : 76) + bob;
  chip.node.style.transform = `translate(${left}px,${top}px)`;
  chip.line.setAttribute('d', `M${left + 56} ${top + 47}V${target.y - 23}L${target.x} ${target.y}`);
  chip.dot.setAttribute('cx', target.x); chip.dot.setAttribute('cy', target.y);
}

export function render(t) {
  renderedTime = t;
  const p = TAU * t / DURATION, camera = cameraOffset(p);
  drawScene(p, camera);
  hero.style.transform = `translate(${Math.sin(p) * 5}px,${Math.cos(p) * 6}px)`;
  bridgeCard.style.transform = `translate(${Math.sin(p + .7) * 9}px,${Math.cos(p + .7) * 9}px)`;
  flowCard.style.transform = `translate(${Math.sin(p + 2) * 7}px,${Math.cos(p + 2) * 7}px)`;
  sheens.forEach((node, i) => {
    const u = ((t / DURATION + .22 - i * .07) % 1 + 1) % 1;
    node.style.left = `${-90 + u * 270}%`;
    node.style.opacity = `${Math.sin(Math.PI * u) ** 4}`;
  });
  fill.style.transform = `scaleX(${t / DURATION})`;
  // 시간 막대의 리셋은 경계 양쪽에서 가려야 풍경 루프까지 끊겨 보이지 않는다.
  const seam = Math.min(t, DURATION - t) / .35;
  fill.style.opacity = smooth(Math.min(1, seam));
  progress.setAttribute('aria-valuenow', t.toFixed(2));
  let d = '';
  for (let x = 0; x <= 316; x += 2) {
    const envelope = Math.sin(Math.PI * x / 316) ** .8;
    const y = 32 + envelope * (12 * Math.sin(x * .047 - p) + 4 * Math.sin(x * .094 + p));
    d += `${x ? 'L' : 'M'}${x} ${y.toFixed(2)}`;
  }
  wave.setAttribute('d', d);
  updateChip(0, 565, 552, p, camera); updateChip(1, 1448, 468, p, camera);
}

function resize() {
  const scale = Math.min(innerWidth / W, innerHeight / H);
  stage.style.transform = `translate(-50%,-50%) scale(${scale})`;
  pixelRatio = Math.min(devicePixelRatio || 1, 2);
  canvas.width = W * pixelRatio; canvas.height = H * pixelRatio;
  render(renderedTime);
}
window.addEventListener('resize', resize);
resize();
start(render);
