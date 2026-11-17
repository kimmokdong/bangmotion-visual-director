import { start, DURATION, TAU, loop, saw, smooth } from '../../shared/runtime.js';

export const PALETTE = Object.freeze({
  paper: '#f3e4c5', peach: '#edc2a2', sage: '#a6b493', olive: '#697d57',
  terracotta: '#bb7052', river: '#819f9f', ink: '#455c57',
});
export const MATERIAL = Object.freeze({ seed: 31729, paperOpacity: 0.12, washOpacity: 0.24, edgeSoftness: 0.65 });
export const LIGHTING = Object.freeze({ warm: '#ffe2ab', cool: '#657f7a', shadowOpacity: 0.16, vignette: 0.14 });
export const CAMERA = Object.freeze({ pan: 24, zoom: 0.009, depth: [0, 0.12, 0.24, 0.5, 0.72, 0.84, 1.05, 1.5] });
export const RENDERING = Object.freeze({ width: 1920, height: 1080, maxDpr: 2, cacheScale: 1 });

const { width: W, height: H } = RENDERING;
const canvas = document.querySelector('canvas');
// 프레임 추출 도중 GPU에서 CPU로 전환되며 생기는 미세한 색상 변화를 방지한다.
const ctx = canvas.getContext('2d', { alpha: false, willReadFrequently: true });
let pixelScale = 1;

function seeded(seed) {
  return () => {
    let n = seed += 0x6D2B79F5;
    n = Math.imul(n ^ n >>> 15, n | 1);
    n ^= n + Math.imul(n ^ n >>> 7, n | 61);
    return ((n ^ n >>> 14) >>> 0) / 4294967296;
  };
}
const random = seeded(MATERIAL.seed);
const rand = (a, b) => a + random() * (b - a);
const path = d => new Path2D(d);

function gradient(g, x, y, x2, y2, colors) {
  const paint = g.createLinearGradient(x, y, x2, y2);
  colors.forEach((color, i) => paint.addColorStop(i / (colors.length - 1), color));
  return paint;
}

function stroke(g, d, color, width = 2, alpha = 1) {
  g.save(); g.globalAlpha *= alpha; g.strokeStyle = color; g.lineWidth = width;
  g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke(typeof d === 'string' ? path(d) : d); g.restore();
}

function blob(x, y, rx, ry, phase = 0, lobes = 7) {
  const p = new Path2D();
  const points = Array.from({ length: 48 }, (_, i) => {
    const a = i / 48 * TAU;
    const r = 1 + 0.055 * Math.sin(a * lobes + phase) + 0.055 * Math.sin(a * 3 - phase) + 0.045 * Math.sin(a * 2 + phase);
    return [x + Math.cos(a) * rx * r, y + Math.sin(a) * ry * r];
  });
  p.moveTo((points[47][0] + points[0][0]) / 2, (points[47][1] + points[0][1]) / 2);
  points.forEach((v, i) => {
    const next = points[(i + 1) % points.length];
    p.quadraticCurveTo(v[0], v[1], (v[0] + next[0]) / 2, (v[1] + next[1]) / 2);
  });
  p.closePath(); return p;
}

function makePaper() {
  const c = document.createElement('canvas'); c.width = 960; c.height = 540;
  const g = c.getContext('2d'); const data = g.createImageData(c.width, c.height);
  for (let i = 0; i < data.data.length; i += 4) {
    const n = rand(160, 255);
    data.data[i] = n; data.data[i + 1] = n - 7; data.data[i + 2] = n - 18; data.data[i + 3] = 255;
  }
  g.putImageData(data, 0, 0);
  for (let i = 0; i < 6500; i++) {
    const x = rand(0, 960), y = rand(0, 540);
    stroke(g, `M${x} ${y}q${rand(1, 5)} ${rand(-1, 1)} ${rand(2, 9)} ${rand(-1, 1)}`, '#faf0d8', rand(0.25, 0.8), 0.17);
  }
  return c;
}

function makeWash() {
  const c = document.createElement('canvas'); c.width = c.height = 384;
  const g = c.getContext('2d');
  for (let i = 0; i < 480; i++) {
    const x = rand(-35, 419), y = rand(-35, 419), r = rand(4, 40);
    const fog = g.createRadialGradient(x, y, 0, x, y, r);
    fog.addColorStop(0, i % 2 ? 'rgba(242,229,192,.18)' : 'rgba(59,83,70,.09)');
    fog.addColorStop(1, 'rgba(120,130,100,0)');
    g.fillStyle = fog; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  return c;
}
const paper = makePaper();
const wash = makeWash();

function paint(g, d, color, texture = true) {
  const p = typeof d === 'string' ? path(d) : d;
  g.save(); g.fillStyle = color;
  g.shadowColor = typeof color === 'string' ? color : '#a6a78c'; g.shadowBlur = MATERIAL.edgeSoftness;
  g.fill(p); g.shadowBlur = 0;
  if (texture) {
    g.clip(p); g.globalAlpha *= MATERIAL.washOpacity;
    g.fillStyle = g.createPattern(wash, 'repeat'); g.fillRect(-200, -400, 2400, 1800);
  }
  g.restore();
}

function shadow(g, x, y, rx, ry, alpha = LIGHTING.shadowOpacity) {
  const shade = g.createRadialGradient(x, y, 0, x, y, rx);
  shade.addColorStop(0, LIGHTING.cool); shade.addColorStop(1, '#657f7a00');
  g.save(); g.translate(x, y); g.scale(1, ry / rx); g.translate(-x, -y);
  g.globalAlpha *= alpha; paint(g, blob(x, y, rx, rx, 1), shade, false); g.restore();
}

function cache(draw, width = 2200, height = 1240, ox = 140, oy = 80) {
  const c = document.createElement('canvas');
  c.width = width * RENDERING.cacheScale; c.height = height * RENDERING.cacheScale;
  const g = c.getContext('2d'); g.scale(RENDERING.cacheScale, RENDERING.cacheScale);
  g.translate(ox, oy); draw(g); return c;
}
const drawCache = (g, c) => g.drawImage(c, -140, -80, 2200, 1240);

const RIVER = path('M-180 514 C160 460 436 493 707 552 C948 586 1256 638 1340 775 C1425 917 1790 948 2110 1210 L1470 1210 C1320 1045 1025 981 1004 835 C977 705 770 665 590 627 C332 569 90 581-180 596 Z');
const LEFT_BANK = 'M-180 593 C103 578 310 626 504 673 C645 705 738 730 832 782 C940 838 958 989 1108 1190 L-180 1190 Z';
const RIGHT_BANK = 'M1378 807 C1461 910 1770 935 2100 1140 L2110 1200 C1790 955 1425 917 1340 775 Z';

function meadow(g, area, bounds, count, colors = [PALETTE.olive, '#c5c68f', '#e8d6a6']) {
  g.save(); g.clip(typeof area === 'string' ? path(area) : area);
  for (let i = 0; i < count; i++) {
    const x = rand(bounds[0], bounds[2]), y = rand(bounds[1], bounds[3]);
    const size = rand(2, 6);
    stroke(g, `M${x - size} ${y}q${size} ${-rand(1, 4)} ${size * 2.5} ${-rand(0, 3)}`, colors[i % colors.length], rand(0.7, 2.1), rand(0.12, 0.36));
  }
  g.restore();
}

function flowers(g, x, y, scale = 1, count = 5) {
  g.save(); g.translate(x, y); g.scale(scale, scale);
  for (let i = 0; i < count; i++) {
    const px = rand(-24, 24), py = rand(-8, 8), h = rand(9, 28);
    stroke(g, `M${px} ${py}q-5 -12 ${rand(-4, 4)} ${-h}`, PALETTE.olive, 1.5);
    paint(g, blob(px, py - h, 3.2, 2.6, i, 5), i % 3 ? '#f1dba7' : PALETTE.terracotta, false);
    paint(g, blob(px + 0.7, py - h + 0.5, 0.9, 1, i), '#af8851', false);
  }
  g.restore();
}

function rock(g, x, y, s, warm = false) {
  shadow(g, x + 3 * s, y + 3 * s, 17 * s, 4 * s, 0.19);
  paint(g, blob(x, y - 4 * s, 14 * s, 8 * s, x, 5), gradient(g, x - 12 * s, y - 12 * s, x + 9 * s, y + 5 * s, warm ? ['#d8c397', '#a8ab8d'] : ['#b8c1ac', '#889c92']));
  stroke(g, `M${x - 8 * s} ${y - 7 * s}q${8 * s} ${-4 * s} ${14 * s} ${-s}`, '#e2d9b8', s, 0.5);
}

function bush(g, x, y, size, color = PALETTE.olive) {
  shadow(g, x, y + 3, size, size * 0.12, 0.1);
  paint(g, blob(x, y - size * 0.23, size, size * 0.36, x), color);
  for (let i = 0; i < 17; i++) {
    const xx = x + rand(-size * 0.8, size * 0.7), yy = y - rand(0, size * 0.45);
    stroke(g, `M${xx} ${yy}q-3 -5 3 -5`, '#ccd19d', rand(2, 4), 0.35);
  }
}

function cottage(g, x, y, s, blue = false) {
  g.save(); g.translate(x, y); g.scale(s, s);
  shadow(g, 24, 5, 150, 27, 0.22);
  paint(g, 'M-95-134 Q-20-148 65-134 Q69-65 66 1 Q-10 10-94 2 Q-98-62-95-134 Z', gradient(g, -95, -135, 65, 10, ['#f1d7a2', '#d8bc8b', '#c9b58d']));
  paint(g, 'M65-134 Q89-149 112-159 Q119-93 114-8 Q91-2 66 1 Q68-66 65-134 Z', gradient(g, 65, -140, 113, 0, ['#c4af87', '#b4aa86']));
  const roof = blue ? ['#95ada7', '#718e90', '#58797b'] : ['#d99267', PALETTE.terracotta, '#955a46'];
  paint(g, 'M-117-130 Q-69-185-18-222 Q42-178 83-131 Q-8-119-117-130 Z', gradient(g, -70, -215, 50, -125, roof));
  paint(g, 'M-18-222 Q21-231 40-223 Q86-195 134-157 L83-131 Q32-178-18-222 Z', gradient(g, 10, -216, 120, -142, [roof[1], roof[2]]));
  stroke(g, 'M-115-130 Q-15-119 83-131 L132-157', roof[2], 4, 0.75);
  for (let row = 0; row < 5; row++) {
    const yy = -140 - row * 14, half = 87 - row * 13;
    stroke(g, `M${-18 - half} ${yy}Q-20 ${yy + 5} ${-18 + half} ${yy}`, '#edb28a', 1.8, blue ? 0.13 : 0.4);
    for (let col = 0; col < 8 - row; col++) {
      const xx = -18 - half + col * 22 + (row % 2) * 10;
      stroke(g, `M${xx} ${yy}q2 -7 8 -13`, roof[2], 1.4, 0.25);
    }
  }
  if (!blue) {
    paint(g, 'M44-193 L43-238 Q55-242 69-239 L71-177 Z', '#b67958');
    paint(g, 'M39-239 Q54-244 73-240 L75-231 Q54-229 40-232 Z', '#d8a57a');
    stroke(g, 'M49-222 Q59-224 67-222 M45-208 Q58-211 70-207', '#8d614e', 1.5, 0.6);
  }
  paint(g, 'M-18 2 L-19-68 Q3-88 22-67 L24 3 Z', '#67746a');
  stroke(g, 'M-13 0 L-14-64 Q4-77 17-63 L18 0', '#ddc292', 3, 0.8);
  paint(g, blob(12, -30, 2.2, 2.7, 2), '#e7c17d', false);
  const window = (wx, wy) => {
    paint(g, `M${wx - 18} ${wy - 22}q17 -3 35 0l1 37q-18 3-36 0Z`, '#f0d6a6');
    paint(g, `M${wx - 13} ${wy - 17}q12 -2 24 0l1 27q-13 2-25 0Z`, '#6e9391');
    stroke(g, `M${wx} ${wy - 17}q-1 12 0 27 M${wx - 13} ${wy - 3}q12 1 25 0`, '#e9d2a3', 2.8);
    stroke(g, `M${wx - 20} ${wy + 18}q18 2 40-1`, '#a78965', 4);
    paint(g, `M${wx - 28} ${wy - 20}l8-1 0 34-7-1Z`, blue ? '#9d9f80' : '#9baf8c');
    paint(g, `M${wx + 20} ${wy - 20}l8 1-1 32-7 1Z`, blue ? '#9d9f80' : '#9baf8c');
  };
  window(-62, -72); window(52, -72);
  paint(g, 'M84-111 L102-117 L102-80 L84-74 Z', '#6a8883');
  stroke(g, 'M93-114 L93-78 M84-94 L102-100', '#dac29b', 2.5);
  paint(g, blob(-19, -164, 12, 14, 2, 5), '#f0d5a0');
  paint(g, blob(-19, -164, 8, 9, 2, 5), '#7e9790');
  stroke(g, 'M-19-171 Q-20-164-19-156 M-26-164 Q-19-165-12-164', '#e1c496', 2);
  stroke(g, 'M-96-1 Q-10 7 65 1 L114-8', '#b19a72', 6, 0.7);
  paint(g, 'M-25 2 Q5 0 30 3 L35 12 Q3 17-29 12 Z', '#c5b795');
  bush(g, -89, 7, 36, '#899b71'); bush(g, 100, 2, 30, '#8c9e76');
  flowers(g, -82, 10, 0.8, 7); flowers(g, 82, 8, 0.6, 6);
  for (let i = 0; i < 14; i++) {
    const xx = rand(-92, 110), yy = rand(-48, -12);
    stroke(g, `M${xx} ${yy}q4-2 9-1`, '#aa9672', 1, 0.3);
  }
  g.restore();
}

function treeSprite(pine, seed, distant) {
  const rng = seeded(seed); const next = (a, b) => a + rng() * (b - a);
  return cache(g => {
    g.translate(180, 355);
    if (pine) {
      paint(g, 'M-9 2 Q-7-89-5-192 L4-194 Q11-92 9 3 Z', '#7a8060');
      for (let i = 0; i < 5; i++) {
        const yy = -92 - i * 37, w = 76 - i * 11;
        paint(g, `M${-w} ${yy}Q${-w * 0.44} ${yy - 38} 0 ${yy - 105}Q${w * 0.4} ${yy - 40} ${w} ${yy + 3}Q${w * 0.45} ${yy + 11} 12 ${yy + 5}Q-23 ${yy + 17} ${-w} ${yy}Z`, gradient(g, -w, yy - 70, w, yy + 15, ['#acb88c', '#7d946e', '#52715b']));
        for (let k = 0; k < 14; k++) {
          const xx = next(-w * 0.6, w * 0.65), dy = next(-35, 0);
          stroke(g, `M${xx} ${yy + dy}q8-5 14-4`, '#d4d5a4', 2, 0.23);
        }
      }
    } else {
      paint(g, 'M-13 4 Q-10-72-18-140 L-48-187 L-41-191 L-6-150 L3-230 L12-231 L12-162 L49-193 L55-186 L14-137 Q9-63 16 3 Z', gradient(g, -15, -160, 20, 0, ['#b09a6f', '#7c7e59']));
      const crown = blob(-4, -223, 106, 97, seed, 7);
      paint(g, crown, gradient(g, -80, -300, 90, -140, ['#c2c78f', '#95a775', '#54765b']));
      g.save(); g.clip(crown);
      for (let i = 0; i < 14; i++) {
        const xx = next(-85, 85), yy = next(-305, -155), r = next(21, 41);
        g.globalAlpha = next(0.12, 0.3);
        paint(g, blob(xx, yy, r, r * 0.8, seed + i, 5), gradient(g, xx - r, yy - r, xx + r, yy + r, ['#d8d5a0', '#718b63']), false);
      }
      for (let i = 0; i < 100; i++) {
        const xx = next(-105, 105), yy = next(-320, -130), r = next(5, 23);
        g.globalAlpha = next(0.04, 0.16);
        paint(g, blob(xx, yy, r, r * 0.65, i, 5), i % 3 ? '#e0d6a1' : '#516e58', false);
      }
      g.globalAlpha = 1;
      stroke(g, 'M-5-137 Q-4-162-25-191 M-24-189 Q-34-203-50-211 M-6-158 Q18-170 32-189 M-10-156 Q-16-177-9-200', '#637b58', 2.2, 0.35);
      for (let i = 0; i < 70; i++) {
        const xx = next(-90, 90), yy = next(-310, -150);
        stroke(g, `M${xx} ${yy}q4-6 9-3`, '#e7dba5', next(1.2, 3.2), next(0.12, 0.4));
      }
      g.restore();
      stroke(g, 'M-65-232 Q-39-249-17-241 M11-202 Q36-217 59-211 M-17-276 Q4-284 26-274', '#e0d3a0', 3.5, 0.3);
      stroke(g, 'M-6-11 Q-3-57-7-107 M5-28 Q7-60 3-83', '#d2bd86', 1.8, 0.4);
    }
    stroke(g, 'M-20 3 Q0-4 26 3', '#698060', 4, 0.65);
    if (distant) {
      g.resetTransform(); g.globalCompositeOperation = 'source-atop';
      g.fillStyle = '#dce0c447'; g.fillRect(0, 0, g.canvas.width, g.canvas.height);
    }
  }, 360, 400, 0, 0);
}

const trees = [
  { x: 140, y: 572, s: 0.73, pine: true, phase: 0.1, depth: 3 },
  { x: 638, y: 637, s: 0.72, pine: false, phase: 0.4, depth: 3 },
  { x: 1478, y: 569, s: 0.57, pine: true, phase: 0.6, depth: 3 },
  { x: 1800, y: 713, s: 0.94, pine: false, phase: 0.8, depth: 5 },
  { x: 120, y: 905, s: 1.39, pine: false, phase: 0.3, depth: 5 },
  { x: 541, y: 989, s: 0.96, pine: true, phase: 0.6, depth: 5 },
  { x: 1752, y: 957, s: 0.95, pine: false, phase: 0.7, depth: 5 },
  { x: 1910, y: 1007, s: 1.2, pine: true, phase: 0.9, depth: 5 },
].map((tree, i) => ({ ...tree, image: treeSprite(tree.pine, 43 + i * 379, tree.depth === 3) }));

const sky = cache(g => {
  g.fillStyle = gradient(g, 0, 0, 0, H, ['#edc1a2', '#f3d8b4', '#efe1c1']); g.fillRect(-140, -80, 2200, 1240);
  const light = g.createRadialGradient(360, 150, 0, 360, 150, 800);
  light.addColorStop(0, `${LIGHTING.warm}7a`); light.addColorStop(1, `${LIGHTING.warm}00`);
  g.fillStyle = light; g.fillRect(-140, -80, 2200, 1240);
  for (let i = 0; i < 100; i++) {
    const x = rand(-80, 2000), y = rand(0, 440);
    stroke(g, `M${x} ${y}q60-5 ${rand(100, 280)}-3`, '#f8e4c5', rand(3, 16), 0.04);
  }
});

const mountains = cache(g => {
  paint(g, 'M-160 446 Q-30 417 140 345 Q255 291 355 318 Q437 273 537 293 Q633 239 725 271 Q813 309 908 315 Q1076 382 1198 374 Q1350 297 1455 320 Q1580 365 1700 333 Q1860 292 2080 380 L2080 697 L-160 697 Z', gradient(g, 0, 285, 0, 650, ['#c1c9b8', '#d3d2b6']));
  stroke(g, 'M-70 437 Q230 335 355 350 Q530 291 699 309 Q859 368 1015 379', '#e9d9b9', 12, 0.2);
});

const hills = cache(g => {
  paint(g, 'M-160 497 C140 441 266 362 502 423 C699 480 813 465 1006 418 C1260 359 1450 406 1650 449 C1810 483 1940 403 2090 424 L2090 725 L-160 725 Z', gradient(g, 0, 410, 0, 690, ['#b2be9e', '#a5b28f']));
  paint(g, 'M-160 551 Q110 477 337 506 Q580 473 774 525 Q1030 444 1265 473 Q1545 518 1758 471 Q1960 430 2090 476 L2090 750 L-160 750 Z', gradient(g, 0, 480, 0, 720, ['#b1b992', '#a4b08b']));
  stroke(g, 'M1020 493 Q1240 446 1475 503 M1080 508 Q1290 467 1502 519 M1100 521 Q1312 485 1520 535', '#d9d0a3', 4, 0.24);
  stroke(g, 'M-50 498 Q196 427 403 482 M-32 510 Q196 447 420 495', '#dad5af', 5, 0.2);
  for (let i = 0; i < 26; i++) {
    const x = -70 + i * 84, y = 509 + 20 * Math.sin(i * 0.7), h = rand(12, 34);
    paint(g, blob(x, y, h * 0.55, h, i, 5), '#96aa8d');
  }
  meadow(g, 'M-160 510L2090 510L2090 680L-160 680Z', [-100, 510, 2050, 640], 360, ['#b9c3a1', '#8da48a']);
});

const ground = cache(g => {
  paint(g, 'M-160 531 Q135 494 324 530 Q618 497 864 560 Q1169 484 1430 551 Q1720 500 2090 567 L2090 1200 L-160 1200 Z', gradient(g, 250, 450, 1450, 1080, ['#c9c79b', '#b5bd88', '#8fA278']));
  stroke(g, 'M-70 544 C280 492 440 525 716 573 C977 608 1259 659 1330 782 C1430 938 1750 951 2100 1200', '#e4d3a7', 24);
  paint(g, RIVER, gradient(g, 350, 500, 1280, 1120, ['#a9bcb1', '#89a6a1', '#72989a']));
  g.save(); g.clip(RIVER);
  for (let i = 0; i < 210; i++) {
    const x = rand(-160, 2100), y = rand(500, 1180), w = rand(15, 100);
    stroke(g, `M${x} ${y}q${w * 0.45} -5 ${w} 0`, i % 4 ? '#d5d8ba' : '#597f81', rand(1, 5), rand(0.04, 0.17));
  }
  g.restore();
  meadow(g, 'M1370 535L2100 535L2100 890L1410 810Z', [1380, 560, 2050, 840], 600);
  meadow(g, 'M-150 558L720 600L760 750L-150 730Z', [-120, 580, 750, 730], 400);
  paint(g, 'M455 651 Q549 649 604 675 Q689 678 770 696 L774 722 Q679 699 604 694 Q526 674 447 673 Z', '#dbcb9e');
  stroke(g, 'M475 663 Q542 655 604 685 Q688 688 771 710', '#f0dfb6', 3, 0.45);
  cottage(g, 401, 653, 0.94);
  for (let i = 0; i < 12; i++) rock(g, 583 + i * 20, 664 + i * 6 + rand(-5, 5), rand(0.25, 0.65), true);
  for (let i = 0; i < 14; i++) {
    const x = 1460 + i * 37, y = 738 + i * 3;
    stroke(g, `M${x} ${y}q-3-14-1-31`, '#a69c75', 5);
  }
  stroke(g, 'M1454 718 Q1710 724 1956 758 M1454 732 Q1720 739 1956 771', '#c9ba91', 5);
  bush(g, 714, 650, 40, '#a5ad7c'); bush(g, 1918, 724, 64, '#8d9e76');
});

const BRIDGE_FACE = path('M760 675 C921 552 1190 552 1385 685 L1388 807 L1300 807 C1260 650 927 637 856 788 L755 785 Z');
const bridge = cache(g => {
  shadow(g, 820, 788, 93, 17, 0.28); shadow(g, 1344, 805, 80, 15, 0.25);
  stroke(g, 'M768 659 C938 535 1184 542 1381 671', '#999c7b', 14);
  for (let i = 0; i <= 16; i++) {
    const u = i / 16, x = 772 + u * 610, y = 660 - 91 * Math.sin(Math.PI * u) + 12 * u;
    stroke(g, `M${x} ${y}q-1-17-2-33`, '#c9b58c', 8);
  }
  stroke(g, 'M770 625 C946 502 1187 511 1380 638', '#d5c09a', 11);
  paint(g, 'M755 675 C920 552 1190 552 1390 685 L1384 702 C1185 577 923 573 763 695 Z', '#e7d1a5');
  paint(g, BRIDGE_FACE, gradient(g, 920, 570, 1160, 825, ['#e4cd9e', '#d3b589', '#a79d7d']));
  g.save(); g.clip(BRIDGE_FACE);
  for (let row = 0; row < 9; row++) {
    const yy = 605 + row * 24;
    stroke(g, `M742 ${yy}Q1075 ${yy - 31} 1400 ${yy + 8}`, '#a89472', 1.5, 0.48);
    for (let col = 0; col < 15; col++) {
      const xx = 745 + col * 49 + (row % 2) * 24;
      stroke(g, `M${xx} ${yy - 18}q-2 13 1 24`, '#a89472', 1.3, 0.4);
      if ((row + col) % 3 === 0) paint(g, blob(xx + 17, yy - 6, 15, 7, col), '#efe0b633', false);
    }
  }
  g.restore();
  stroke(g, 'M856 788 C927 637 1260 650 1300 807', '#8e937b', 12, 0.8);
  stroke(g, 'M853 777 C940 617 1247 638 1305 797', '#eddbb0', 19);
  for (let i = 0; i <= 20; i++) {
    const a = Math.PI + i / 20 * Math.PI;
    const x = 1080 + 223 * Math.cos(a), y = 790 + 118 * Math.sin(a);
    stroke(g, `M${x} ${y}q${Math.cos(a) * 9} ${Math.sin(a) * 9} ${Math.cos(a) * 20} ${Math.sin(a) * 20}`, '#a48e6b', 2.3, 0.75);
  }
  paint(g, 'M1055 650 Q1075 646 1097 651 Q1093 669 1090 684 Q1076 681 1064 684 Z', gradient(g, 1055, 650, 1095, 686, ['#efdbad', '#d2bb8c']));
  stroke(g, 'M1064 684 Q1061 666 1055 650 M1090 684 Q1093 669 1097 651', '#a88f6e', 1.8, 0.6);
  stroke(g, 'M760 672 C921 550 1190 550 1385 682', '#f3dfb5', 10);
  for (let i = 0; i <= 16; i++) {
    const u = i / 16, x = 762 + u * 625, y = 673 - 91 * Math.sin(Math.PI * u) + 10 * u;
    paint(g, `M${x - 5} ${y}q0-17-1-35l10-1 2 37Z`, gradient(g, x - 6, y - 36, x + 6, y, ['#e4d1a9', '#bca985']));
  }
  stroke(g, 'M759 635 C925 515 1187 515 1385 647', '#f0dab0', 13);
  stroke(g, 'M759 641 C925 521 1187 521 1385 653', '#c2ab84', 3, 0.65);
  bush(g, 779, 784, 28, '#8d9d70'); bush(g, 1377, 810, 29, '#8c9a6d');
  for (let i = 0; i < 13; i++) {
    const x = 768 + rand(0, 54), y = 728 + rand(0, 45);
    stroke(g, `M${x} ${y}q5-3 10-1`, '#929a6b', 3, 0.5);
  }
});

const front = cache(g => {
  paint(g, LEFT_BANK, gradient(g, 150, 650, 850, 1160, ['#bac38e', '#aab47b', '#7f976b']));
  stroke(g, 'M-170 596 C103 581 310 629 504 676 C645 708 738 733 832 785 C940 841 958 992 1108 1193', '#d1c795', 10);
  stroke(g, 'M-170 600 C103 585 310 633 504 680 C645 712 738 737 832 789 C940 845 958 996 1108 1197', '#7e977b', 3, 0.75);
  paint(g, RIGHT_BANK, '#a2ae7e');
  meadow(g, LEFT_BANK, [-100, 640, 1100, 1150], 1900);
  paint(g, 'M305 1110 C392 972 550 939 596 859 C634 807 681 791 776 770 L773 746 C660 766 606 790 566 844 C516 920 345 946 233 1100 Z', gradient(g, 300, 800, 600, 1100, ['#ddcca0', '#cbb98d']));
  stroke(g, 'M263 1108 C363 966 532 942 580 852 C622 799 686 778 770 760', '#e8d5ab', 4, 0.6);
  paint(g, 'M1383 718 Q1467 739 1532 709 Q1581 693 1616 694 L1628 708 Q1581 707 1543 724 Q1478 758 1388 739 Z', '#dccc9f');
  cottage(g, 1583, 704, 0.88, true);
  for (let i = 0; i < 25; i++) {
    const u = i / 24, x = 520 + u * 449, y = 688 + 55 * u + 211 * u * u;
    rock(g, x, y, rand(0.35, 1.0), true);
  }
  for (let i = 0; i < 20; i++) rock(g, 1395 + i * 22, 832 + i * 5 + rand(-5, 5), rand(0.45, 1.0));
  [[251, 778, 45], [577, 793, 34], [687, 922, 56], [898, 1036, 46], [1500, 842, 37], [1801, 974, 62]].forEach(v => bush(g, ...v));
  for (let i = 0; i < 26; i++) flowers(g, rand(130, 880), rand(748, 1060), rand(0.45, 1.1), 3);
  for (let i = 0; i < 13; i++) flowers(g, rand(1500, 1900), rand(774, 1040), rand(0.4, 0.9), 3);
  for (const tree of trees) if (tree.depth === 5) shadow(g, tree.x + 19, tree.y + 5, 82 * tree.s, 17 * tree.s, 0.18);
});

const framing = cache(g => {
  for (let i = 0; i < 100; i++) {
    const x = rand(-120, 2100), y = rand(1080, 1190), h = rand(40, 144);
    if (x > 840 && x < 1500) continue;
    const bend = rand(-30, 30);
    const leaf = `M${x} ${y}Q${x - 14 + bend} ${y - h * 0.65} ${x + bend} ${y - h}Q${x + 11 + bend} ${y - h * 0.46} ${x + 7} ${y}Z`;
    paint(g, leaf, i % 3 ? '#758962' : '#9aa575');
  }
  for (const side of [0, 1]) {
    const x = side ? 1870 : 44, y = 1122, sign = side ? -1 : 1;
    stroke(g, `M${x} ${y}Q${x + sign * 15} 1020 ${x + sign * 40} 919`, '#677f5c', 4);
    for (let i = 0; i < 8; i++) {
      const yy = 1100 - i * 21, xx = x + sign * (i * 3.5 + 2), direction = i % 2 ? sign : -sign;
      paint(g, `M${xx} ${yy}Q${xx + direction * 16} ${yy - 31} ${xx + direction * 42} ${yy - 30}Q${xx + direction * 37} ${yy - 5} ${xx} ${yy}Z`, gradient(g, xx, yy - 31, xx + direction * 40, yy, ['#b8be85', '#748d63']));
      stroke(g, `M${xx} ${yy}Q${xx + direction * 20} ${yy - 14} ${xx + direction * 36} ${yy - 25}`, '#d2cd98', 1, 0.4);
    }
    for (let i = 0; i < 3; i++) {
      const xx = x + sign * (25 + i * 8), yy = 971 - i * 24;
      paint(g, blob(xx, yy, 8 - i, 6 - i * 0.7, i, 5), side ? '#d9b47a' : '#c18663');
      paint(g, blob(xx - 1, yy - 1, 3, 2.5, i, 5), '#efdbab', false);
    }
  }
  [[85, 1100, 2.1], [185, 1120, 1.8], [716, 1116, 1.9], [1739, 1113, 1.8], [1836, 1115, 2.3]].forEach(v => flowers(g, ...v, 6));
});

const clouds = [
  { x: 190, y: 198, s: 1.0, phase: 0 }, { x: 720, y: 140, s: 0.78, phase: 0.14 },
  { x: 1160, y: 239, s: 0.87, phase: 0.3 }, { x: 1730, y: 154, s: 1.13, phase: 0.47 },
].map(c => ({ ...c, image: cache(g => {
  paint(g, 'M-123 7 Q-141-13-102-25 Q-106-54-65-58 Q-49-98-5-72 Q35-94 63-52 Q107-53 112-24 Q149-21 133 5 Q68 22-2 14 Q-79 25-123 7 Z', gradient(g, 0, -86, 0, 22, ['#f7e5c7', '#eee0c4', '#dfd7bd']));
  stroke(g, 'M-95-26 Q-65-40-34-26 M-13-48 Q22-63 49-42', '#fff0d4', 9, 0.38);
}, 340, 150, 160, 105) }));

const ripples = Array.from({ length: 90 }, () => ({ x: rand(-180, 1940), y: rand(520, 1170), w: rand(16, 89), phase: rand(0, 1), speed: random() > 0.5 ? 1 : 2 }));

function drawWater(g, t) {
  g.save(); g.clip(RIVER);
  for (const r of ripples) {
    const u = saw(t, r.speed, r.phase), eased = smooth(u);
    const fade = Math.sin(Math.PI * u) ** 2;
    const x = r.x + 70 * eased, y = r.y + 20 * eased;
    stroke(g, `M${x} ${y}q${r.w * 0.45} ${-3 + 2 * loop(t, 1, r.phase)} ${r.w} -1`, '#e3dfbe', 1.6 + r.w / 80, fade * 0.33);
  }
  g.restore();
}

function drawTrees(g, t, depth) {
  for (const tree of trees) {
    if (tree.depth !== depth) continue;
    if (depth === 3) shadow(g, tree.x + 12, tree.y + 3, 55 * tree.s, 11 * tree.s, 0.14);
    g.save(); g.translate(tree.x, tree.y); g.scale(tree.s, tree.s);
    g.transform(1, 0, 0.013 * loop(t, 1, tree.phase), 1 + 0.003 * loop(t, 1, tree.phase), 0, 0);
    g.drawImage(tree.image, -180, -355, 360, 400); g.restore();
  }
}

function drawSmoke(g, t) {
  for (let i = 0; i < 7; i++) {
    const u = saw(t, 1, i / 7), rise = smooth(u);
    const x = 453 + 32 * rise + 8 * loop(t, 1, i / 7), y = 431 - 128 * rise;
    g.save(); g.globalAlpha = Math.sin(Math.PI * u) ** 2 * 0.19;
    paint(g, blob(x, y, 8 + rise * 16, 12 + rise * 23, i), '#f4e7cd', false); g.restore();
  }
}

function drawButterflies(g, t) {
  for (let i = 0; i < 2; i++) {
    const a = TAU * (t / DURATION + i * 0.41);
    const x = 700 + i * 758 + 39 * Math.cos(a), y = 828 - i * 64 + 19 * Math.sin(a);
    const wing = 0.3 + 0.7 * (0.5 + 0.5 * Math.cos(a * 6));
    g.save(); g.translate(x, y); g.rotate(0.2 * Math.sin(a));
    paint(g, blob(-5 * wing, -3, 7 * wing, 9, i, 5), '#e6bb7b', false);
    paint(g, blob(5 * wing, -3, 6 * wing, 8, i + 2, 5), '#f2d59b', false);
    stroke(g, 'M0-6 Q-1 0 1 5', '#8c7756', 1.6); g.restore();
  }
}

function layer(depth, t, draw) {
  const travel = (1 - Math.cos(TAU * t / DURATION)) / 2;
  const zoom = 1 + CAMERA.zoom * travel * (0.5 + depth * 0.5);
  ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(zoom, zoom);
  ctx.translate(-W / 2 + CAMERA.pan * (2 * travel - 1) * depth, -H / 2 + depth * 2 * travel);
  draw(ctx); ctx.restore();
}

export function render(t) {
  ctx.setTransform(pixelScale, 0, 0, canvas.height / H, 0, 0);
  ctx.clearRect(0, 0, W, H);
  layer(CAMERA.depth[0], t, g => {
    drawCache(g, sky);
    for (const c of clouds) {
      g.save(); g.translate(c.x + 13 * loop(t, 1, c.phase), c.y + 2 * loop(t, 1, c.phase)); g.scale(c.s, c.s);
      g.globalAlpha = 0.85; g.drawImage(c.image, -160, -105, 340, 150); g.restore();
    }
  });
  layer(CAMERA.depth[1], t, g => drawCache(g, mountains));
  layer(CAMERA.depth[2], t, g => drawCache(g, hills));
  layer(CAMERA.depth[3], t, g => { drawCache(g, ground); drawWater(g, t); drawTrees(g, t, 3); drawSmoke(g, t); });
  layer(CAMERA.depth[4], t, g => drawCache(g, bridge));
  layer(CAMERA.depth[5], t, g => { drawCache(g, front); drawTrees(g, t, 5); });
  layer(CAMERA.depth[6], t, g => drawButterflies(g, t));
  layer(CAMERA.depth[7], t, g => drawCache(g, framing));
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = MATERIAL.paperOpacity;
  ctx.drawImage(paper, 0, 0, W, H); ctx.restore();
  const vignette = ctx.createRadialGradient(900, 490, 310, 960, 540, 1120);
  vignette.addColorStop(0, '#75634e00'); vignette.addColorStop(1, `rgba(100,85,63,${LIGHTING.vignette})`);
  ctx.fillStyle = vignette; ctx.fillRect(0, 0, W, H);
}

function resize() {
  const box = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, RENDERING.maxDpr);
  canvas.width = Math.max(1, Math.round(box.width * dpr));
  canvas.height = Math.max(1, Math.round(box.height * dpr));
  pixelScale = canvas.width / W;
  if (window.__demo) render(window.__demo.time);
}
window.addEventListener('resize', resize);
resize();
console.assert(trees.length === 8 && CAMERA.depth.length >= 7 && DURATION === 5, '장면의 나무·깊이·재생 계약을 확인하세요.');
start(render);
