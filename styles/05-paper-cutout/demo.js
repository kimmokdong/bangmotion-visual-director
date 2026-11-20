import { start, DURATION, TAU } from '../../shared/runtime.js';

const PALETTE = Object.freeze({
  cream: '#eee2c6', mustard: '#d2a347', brick: '#ad5945',
  olive: '#7e8a59', teal: '#508b89', navy: '#355b77', kraft: '#b99a70',
});
const MATERIAL = Object.freeze({
  seed: 52173, tile: 384, cacheScale: 1.5, edge: '#fff3dc', jitter: 1.3,
  waterPapers: ['#79aaa2', '#436f72', '#91b8ac'],
});
const LIGHTING = Object.freeze({ color: '#3a2e22', opacity: 0.5, x: 1.15, y: 1.55 });
const CAMERA = Object.freeze({ width: 1920, height: 1080, travelX: 22, travelY: 7, zoom: 0.004 });
const RENDERING = Object.freeze({ maxDpr: 2, fps: 12 });
const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d', { alpha: false });
const layers = [];
let backingScale = 1;

function mulberry32(seed) {
  return () => {
    let n = seed += 0x6D2B79F5;
    n = Math.imul(n ^ n >>> 15, n | 1);
    n ^= n + Math.imul(n ^ n >>> 7, n | 61);
    return ((n ^ n >>> 14) >>> 0) / 4294967296;
  };
}
const random = mulberry32(MATERIAL.seed);
const range = (a, b) => a + random() * (b - a);
const wave = (t, phase = 0) => Math.sin(TAU * (t / DURATION + phase));
const rect = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
function ellipse(x, y, rx, ry, count = 28) {
  return Array.from({ length: count }, (_, i) => [x + Math.cos(i / count * TAU) * rx, y + Math.sin(i / count * TAU) * ry]);
}
function bezier(a, b, c, d, count = 24) {
  return Array.from({ length: count + 1 }, (_, i) => {
    const t = i / count, u = 1 - t;
    return [u ** 3 * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t ** 3 * d[0],
      u ** 3 * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t ** 3 * d[1]];
  });
}
function cut(points, jitter = MATERIAL.jitter) {
  const path = new Path2D();
  const phase = range(0, TAU);
  let distance = 0;
  points.forEach((p, i) => {
    const prev = points[(i + points.length - 1) % points.length];
    const length = Math.hypot(p[0] - prev[0], p[1] - prev[1]);
    const steps = Math.max(1, Math.ceil(length / 3));
    for (let j = 1; j <= steps; j++) {
      const d = distance + length * j / steps;
      const offset = jitter * (Math.sin(d / 23 + phase) * 0.8 + Math.sin(d / 9 + phase * 2) * 0.35 + range(-0.35, 0.35));
      const x = prev[0] + (p[0] - prev[0]) * j / steps - (p[1] - prev[1]) / (length || 1) * offset;
      const y = prev[1] + (p[1] - prev[1]) * j / steps + (p[0] - prev[0]) / (length || 1) * offset;
      if (i === 0 && j === 1) path.moveTo(x, y); else path.lineTo(x, y);
    }
    distance += length;
  });
  path.closePath();
  return path;
}

function createPaperTexture(kind) {
  const tile = document.createElement('canvas');
  tile.width = tile.height = MATERIAL.tile;
  const g = tile.getContext('2d');
  for (let i = 0; i < 21000; i++) {
    const x = range(0, tile.width), y = range(0, tile.height);
    g.fillStyle = i % 3 ? `rgba(55,40,20,${kind === 'kraft' ? 0.15 : 0.075})` : 'rgba(255,251,229,0.23)';
    g.fillRect(x, y, range(0.4, 1.8), range(0.4, 1.5));
  }
  for (let i = 0; i < 2100; i++) {
    const x = range(0, tile.width), y = range(0, tile.height);
    g.strokeStyle = i % 2 ? `rgba(73,56,30,${kind === 'kraft' ? 0.27 : 0.13})` : 'rgba(255,247,223,0.29)';
    g.lineWidth = range(0.35, kind === 'kraft' ? 1.15 : 0.85);
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 6, y - 2, x + range(3, 19), y + range(-5, 5)); g.stroke();
  }
  for (let i = 0; i < 130; i++) {
    g.fillStyle = 'rgba(82,63,35,0.025)';
    g.beginPath(); g.ellipse(range(0, 384), range(0, 384), range(3, 15), range(1, 5), range(0, TAU), 0, TAU); g.fill();
  }
  if (kind === 'kraft') {
    for (let i = 0; i < 330; i++) {
      g.fillStyle = 'rgba(65,42,23,0.24)';
      g.fillRect(range(0, 384), range(0, 384), range(0.8, 2.5), range(1, 4));
    }
  }
  if (kind === 'corrugated') {
    for (let x = 0; x < 384; x += 12) {
      const ridge = g.createLinearGradient(x, 0, x + 12, 0);
      ridge.addColorStop(0, 'rgba(64,43,23,0.21)'); ridge.addColorStop(0.38, 'rgba(255,243,207,0.19)');
      ridge.addColorStop(1, 'rgba(64,43,23,0.21)');
      g.fillStyle = ridge; g.fillRect(x, 0, 12, 384);
    }
  }
  return tile;
}
const textures = Object.fromEntries(['color', 'kraft', 'corrugated'].map(kind => [kind, createPaperTexture(kind)]));

function cachedCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.ceil(w * MATERIAL.cacheScale); c.height = Math.ceil(h * MATERIAL.cacheScale);
  return c;
}
function shadowCache(face, depth) {
  const shadow = cachedCanvas(face.width / MATERIAL.cacheScale, face.height / MATERIAL.cacheScale);
  const s = shadow.getContext('2d'), scale = MATERIAL.cacheScale;
  // 넓은 그림자와 짙은 접촉 코어를 미리 구워 재생 중 블러를 피한다.
  for (const [blur, distance, opacity] of [[3 + depth * 1.65, depth, LIGHTING.opacity], [0.8 + depth * 0.23, Math.max(0.6, depth * 0.25), 0.49]]) {
    s.shadowColor = LIGHTING.color; s.shadowBlur = blur * scale;
    s.shadowOffsetX = distance * LIGHTING.x * scale; s.shadowOffsetY = distance * LIGHTING.y * scale;
    s.globalAlpha = opacity; s.drawImage(face, 0, 0);
  }
  s.globalAlpha = 1; s.globalCompositeOperation = 'destination-out'; s.drawImage(face, 0, 0);
  return shadow;
}

function paper(points, color, depth = 3, jitter = MATERIAL.jitter, material = color === PALETTE.kraft ? 'kraft' : 'color', border = 0) {
  const path = cut(points, jitter);
  const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
  const pad = Math.ceil(22 + depth * 7 + border);
  const x = Math.floor(Math.min(...xs)) - pad, y = Math.floor(Math.min(...ys)) - pad;
  const w = Math.ceil(Math.max(...xs)) - x + pad, h = Math.ceil(Math.max(...ys)) - y + pad;
  const large = (w - pad * 2) * (h - pad * 2) > 120000;
  const scale = MATERIAL.cacheScale;
  const face = cachedCanvas(w, h);
  const f = face.getContext('2d');
  f.scale(scale, scale); f.translate(-x, -y);
  if (border) {
    f.strokeStyle = MATERIAL.edge; f.lineJoin = 'round'; f.lineWidth = border * 2;
    f.stroke(path);
  }
  f.save(); f.clip(path); f.fillStyle = color; f.fillRect(x, y, w, h);
  f.fillStyle = random() > 0.5 ? `rgba(255,245,220,${range(0.01, 0.065)})` : `rgba(34,37,27,${range(0.01, 0.055)})`;
  f.fillRect(x, y, w, h);
  f.translate(range(-384, 0), range(-384, 0));
  f.fillStyle = f.createPattern(textures[material], 'repeat'); f.fillRect(x, y, w + 384, h + 384); f.restore();
  // 윤곽의 안쪽에서 반대 방향으로 옮긴 선만 남겨 단면의 방향을 구분한다.
  const edge = [1, 3, 5].map(i => parseInt(MATERIAL.edge.slice(i, i + 2), 16)).join(',');
  for (const [dx, dy, ink] of [[1, 1.3, `rgba(${edge},${large ? 0.35 : 0.75})`], [-1.2, -1.5, `rgba(54,43,31,${large ? 0.25 : 0.45})`]]) {
    f.save(); f.clip(path); f.strokeStyle = ink; f.lineWidth = large ? 1.2 : 1.7;
    f.translate(dx, dy); f.stroke(path); f.restore();
  }
  return { face, shadow: shadowCache(face, depth), x, y, w, h, depth };
}
function drawPaper(p, cameraShift = 0) {
  if (p.shadow) ctx.drawImage(p.shadow, p.x + cameraShift * p.depth * 0.11, p.y + cameraShift * p.depth * 0.07, p.w, p.h);
  ctx.drawImage(p.face, p.x, p.y, p.w, p.h);
}
function layer(depth) {
  const l = { depth, items: [] }; layers.push(l); return l;
}
function add(l, points, color, depth = 3, jitter, material, border) {
  const p = paper(points, color, depth, jitter, material, border); l.items.push(p); return p;
}
function sticker(parts, border, depth) {
  const x = Math.min(...parts.map(p => p.x)), y = Math.min(...parts.map(p => p.y));
  const w = Math.max(...parts.map(p => p.x + p.w)) - x, h = Math.max(...parts.map(p => p.y + p.h)) - y;
  const mask = cachedCanvas(w, h), face = cachedCanvas(w, h), scale = MATERIAL.cacheScale;
  const m = mask.getContext('2d'), f = face.getContext('2d');
  m.scale(scale, scale); parts.forEach(p => m.drawImage(p.face, p.x - x, p.y - y, p.w, p.h));
  for (let i = 0; i < 24; i++) {
    const angle = i / 24 * TAU, radius = border + range(-0.5, 0.5);
    f.drawImage(mask, Math.cos(angle) * radius * scale, Math.sin(angle) * radius * scale);
  }
  f.globalCompositeOperation = 'source-in'; f.fillStyle = MATERIAL.edge; f.fillRect(0, 0, face.width, face.height);
  f.globalCompositeOperation = 'source-atop';
  f.fillStyle = f.createPattern(textures.color, 'repeat'); f.fillRect(0, 0, face.width, face.height);
  return { face, shadow: shadowCache(face, depth), x, y, w, h, depth };
}
function group(l, x, y, scale, build, motion = null) {
  const parts = [];
  build((points, color, depth = 2, jitter) => parts.push(paper(points, color, depth, jitter)));
  l.items.push({ parts, backing: sticker(parts, 5.5 / scale, motion?.kind === 'cloud' ? 12 : 6), x, y, scale, motion });
}
function contact(l, x, y, rx, ry) {
  const w = rx * 2 + 16, h = ry * 2 + 16, face = cachedCanvas(w, h);
  const f = face.getContext('2d'); f.scale(MATERIAL.cacheScale, MATERIAL.cacheScale);
  f.translate(w / 2, h / 2); f.scale(rx, ry);
  const shade = f.createRadialGradient(0, 0, 0, 0, 0, 1);
  shade.addColorStop(0, 'rgba(58,46,34,0.58)'); shade.addColorStop(0.42, 'rgba(58,46,34,0.32)');
  shade.addColorStop(1, 'rgba(58,46,34,0)');
  f.fillStyle = shade; f.fillRect(-1, -1, 2, 2);
  l.items.push({ face, x: x - w / 2, y: y - h / 2, w, h, depth: 0 });
}
function cottonPuff(size) {
  const w = size * 4, face = cachedCanvas(w, w), f = face.getContext('2d');
  f.scale(MATERIAL.cacheScale, MATERIAL.cacheScale); f.translate(w / 2, w / 2);
  for (let i = 0; i < 85; i++) {
    const a = range(0, TAU), radius = range(0, size * 0.83), r = range(3, size * 0.64);
    const x = Math.cos(a) * radius, y = Math.sin(a) * radius;
    const fluff = f.createRadialGradient(x - 1, y - 2, 0, x, y, r);
    fluff.addColorStop(0, 'rgba(255,253,245,0.55)'); fluff.addColorStop(0.5, 'rgba(250,247,237,0.28)');
    fluff.addColorStop(1, 'rgba(250,247,237,0)');
    f.fillStyle = fluff; f.fillRect(x - r, y - r, r * 2, r * 2);
  }
  for (let i = 0; i < 360; i++) {
    const a = range(0, TAU), radius = range(0, size * 1.02), x = Math.cos(a) * radius, y = Math.sin(a) * radius;
    f.strokeStyle = 'rgba(255,254,247,0.34)'; f.lineWidth = range(0.25, 0.6);
    f.beginPath(); f.moveTo(x, y); f.quadraticCurveTo(x + 3, y - 3, x + range(2, 6), y + range(-3, 3)); f.stroke();
  }
  const shadow = cachedCanvas(w, w), s = shadow.getContext('2d');
  s.shadowColor = 'rgba(58,46,34,0.16)'; s.shadowBlur = 3 * MATERIAL.cacheScale;
  s.shadowOffsetX = 2 * MATERIAL.cacheScale; s.shadowOffsetY = 3 * MATERIAL.cacheScale;
  s.drawImage(face, 0, 0);
  s.globalCompositeOperation = 'destination-out'; s.drawImage(face, 0, 0);
  return { face, shadow, x: -w / 2, y: -w / 2, w, h: w, depth: 0 };
}
function grass(l, x, y, size, color = PALETTE.olive) {
  add(l, [[x - size, y], [x - size * 0.9, y - size * 0.65], [x - 3, y - 3],
    [x, y - size], [x + 4, y - 2], [x + size * 0.8, y - size * 0.6], [x + size, y]], color, 1, 0.4);
}
function shrub(l, x, y, size, color) {
  add(l, [[x - size, y], ...bezier([x - size, y], [x - size * 1.2, y - size], [x - size * 0.5, y - size * 1.2], [x - size * 0.24, y - size * 0.65], 8),
    ...bezier([x - size * 0.24, y - size * 0.65], [x + size * 0.1, y - size * 1.7], [x + size, y - size], [x + size, y], 12)], color, 3);
}
function stone(l, x, y, size) {
  add(l, [[x - size, y], [x - size * 0.85, y - size * 0.48], [x - size * 0.2, y - size * 0.75],
    [x + size * 0.7, y - size * 0.48], [x + size, y - 2]], PALETTE.kraft, 2, 0.7);
  add(l, [[x - size * 0.75, y - size * 0.43], [x - size * 0.2, y - size * 0.65], [x + size * 0.38, y - size * 0.4]], PALETTE.cream, 1, 0.4);
}

const sky = layer(0.1);
add(sky, rect(47, 42, 1826, 998), PALETTE.cream, 2, 2.2);
const ridge = layer(0.2);
add(ridge, [[0, 514], ...bezier([0, 440], [260, 220], [465, 196], [729, 391]),
  ...bezier([729, 391], [1110, 213], [1500, 228], [1920, 443]), [1920, 700], [0, 700]], PALETTE.kraft, 4, 1.5, 'corrugated');
const sun = layer(0.22);
add(sun, ellipse(1422, 195, 80, 79, 37), PALETTE.mustard, 7, 1.2, 'color', 6);
add(sun, ellipse(1416, 189, 54, 54, 32), '#dfb65f', 1, 0.7);
for (let i = 0; i < 11; i++) {
  const a = i * TAU / 11;
  const x = 1422 + Math.cos(a) * 109, y = 195 + Math.sin(a) * 109;
  add(sun, [[x - Math.sin(a) * 2, y + Math.cos(a) * 2], [x + Math.cos(a) * 14, y + Math.sin(a) * 14],
    [x + Math.sin(a) * 2, y - Math.cos(a) * 2]], PALETTE.mustard, 1, 0.3);
}

const clouds = layer(0.35);
[[300, 189, 1.06, 0], [742, 139, 0.81, 0.24], [1090, 272, 0.66, 0.52], [1662, 298, 0.9, 0.72]].forEach(([x, y, scale, phase]) => {
  group(clouds, x, y, scale, put => {
    put([[-110, 23], [-127, 7], [-129, -9], [-117, -25], [-92, -30], [-83, -53], [-61, -66], [-33, -63],
      [-15, -48], [3, -68], [30, -74], [55, -66], [72, -42], [98, -41], [120, -28], [132, -7], [127, 13], [111, 26]], PALETTE.cream, 10);
    put([[-93, 15], [-49, 12], [-25, 16], [17, 12], [50, 16], [94, 12], [108, 20], [-97, 24]], PALETTE.cream, 1, 0.3);
  }, { kind: 'cloud', phase });
});

const far = layer(0.45);
add(far, [[25, 572], ...bezier([25, 505], [300, 214], [537, 300], [811, 485]),
  ...bezier([811, 485], [1160, 250], [1480, 313], [1890, 491]), [1890, 900], [25, 900]], PALETTE.mustard, 4);
const hills = layer(0.65);
add(hills, [[20, 640], ...bezier([20, 568], [220, 413], [419, 360], [660, 484]),
  ...bezier([660, 484], [937, 593], [1230, 332], [1510, 427]),
  ...bezier([1510, 427], [1680, 418], [1810, 488], [1895, 520]), [1895, 1000], [20, 1000]], PALETTE.olive, 5);
add(hills, [[1090, 504], ...bezier([1090, 504], [1330, 364], [1637, 449], [1880, 571]), [1880, 704], [1100, 690]], PALETTE.olive, 2);

const ground = layer(0.9);
add(ground, [[12, 580], [500, 478], [970, 485], [1440, 478], [1908, 585], [1930, 1110], [-20, 1110]], PALETTE.olive, 4);
const riverOutline = [
  ...bezier([623, 454], [732, 458], [1058, 563], [1052, 656]),
  ...bezier([1052, 656], [1044, 783], [1360, 844], [1785, 1112]),
  [1135, 1112], ...bezier([1135, 1112], [1045, 941], [852, 884], [843, 759]),
  ...bezier([843, 759], [830, 603], [747, 539], [623, 454]),
];
const water = layer(0.95);
add(water, riverOutline, PALETTE.navy, 3);
add(water, riverOutline.map(([x, y]) => [x + (x > 1050 ? -11 : 5), y - 8]), PALETTE.teal, 2);
const waterClip = new Path2D();
riverOutline.forEach(([x, y], i) => i ? waterClip.lineTo(x, y) : waterClip.moveTo(x, y)); waterClip.closePath();
const ribbons = [0, 1, 2].map(i => [0, 1, 2].map(variant => {
  const y = 610 + i * 175;
  const crest = bezier([680, y], [970, y - 35], [1230, y + 120], [1770, y + 76], 88)
    .map(([x, yy], j) => [x, yy + Math.sin(j / 88 * TAU * 7 + i + variant * TAU / 3) * (4 + variant)]);
  return paper([...crest, ...crest.toReversed().map(([x, yy]) => [x, yy + 16 + i * 3])], MATERIAL.waterPapers[i], 2, 0.7);
}));
water.items.push({ kind: 'water', ribbons });
for (let i = 0; i < 15; i++) {
  const y = 543 + i * 35, center = 785 + (y - 543) * 0.76;
  add(water, [[center, y], [center + range(21, 60), y - 2], [center + range(35, 70), y + 3], [center + 4, y + 5]], i % 3 === 0 ? PALETTE.cream : PALETTE.teal, 1, 0.4);
}

const banks = layer(1.04);
add(banks, [[-20, 641], ...bezier([-20, 641], [280, 489], [508, 530], [673, 489]),
  ...bezier([673, 489], [744, 554], [833, 637], [831, 754]),
  ...bezier([831, 754], [828, 897], [1078, 983], [1115, 1110]), [-20, 1110]], PALETTE.mustard, 5);
add(banks, [[-20, 615], ...bezier([-20, 615], [258, 481], [500, 514], [657, 479]),
  ...bezier([657, 479], [726, 548], [808, 639], [811, 756]),
  ...bezier([811, 756], [813, 897], [1042, 976], [1088, 1110]), [-20, 1110]], PALETTE.olive, 4);
add(banks, [[1900, 540], [1900, 1110], [1805, 1110], ...bezier([1805, 1110], [1450, 856], [1082, 778], [1078, 652]),
  ...bezier([1078, 652], [1079, 569], [891, 500], [744, 475]), ...bezier([744, 475], [1034, 458], [1469, 489], [1900, 540])], PALETTE.kraft, 5);
add(banks, [[1900, 517], [1900, 1110], [1831, 1110], ...bezier([1831, 1110], [1494, 860], [1103, 772], [1101, 647]),
  ...bezier([1101, 647], [1092, 566], [913, 491], [780, 473]), ...bezier([780, 473], [1034, 449], [1469, 465], [1900, 517])], PALETTE.olive, 4);

const paths = layer(1.06);
add(paths, [...bezier([415, 618], [438, 708], [582, 727], [738, 699]), [764, 730],
  ...bezier([764, 730], [541, 802], [420, 706], [390, 626])], PALETTE.kraft, 1);
add(paths, [...bezier([1263, 700], [1347, 688], [1404, 625], [1464, 613]), [1502, 631],
  ...bezier([1502, 631], [1436, 678], [1346, 729], [1260, 729])], PALETTE.kraft, 1);
for (let i = 0; i < 9; i++) {
  const x = 455 + i * 29, y = 680 + Math.sin(i / 8 * Math.PI) * 50;
  add(paths, ellipse(x, y, 6, 2.5, 8), PALETTE.cream, 1, 0.3);
}

function tree(l, x, y, size, pine, phase) {
  contact(l, x + 5, y + 2, size * 0.32, size * 0.052);
  group(l, x, y, size / 180, put => {
    put([[-10, 0], [-8, -155], [3, -167], [11, 0]], PALETTE.kraft, 3);
    if (pine) {
      put([[-83, -61], [-39, -119], [-63, -118], [-26, -172], [-43, -170], [0, -240], [43, -170], [26, -172],
        [63, -118], [40, -119], [82, -61]], PALETTE.navy, 7);
      put([[-56, -76], [-21, -130], [-39, -128], [0, -220], [10, -166], [34, -136], [19, -136], [54, -82]], PALETTE.teal, 3);
      put([[-3, -74], [0, -191], [6, -87]], PALETTE.olive, 1, 0.3);
    } else {
      put(ellipse(0, -153, 86, 98, 33), PALETTE.teal, 8);
      put(ellipse(-28, -176, 57, 70, 25), PALETTE.mustard, 3);
      put(ellipse(31, -156, 51, 68, 27), PALETTE.olive, 2);
      put([[-5, -27], [-6, -159], [-37, -185], [-31, -188], [2, -169], [28, -195], [32, -192], [5, -157], [6, -27]], PALETTE.kraft, 2, 0.6);
      for (let i = 0; i < 9; i++) {
        const xx = range(-58, 58), yy = range(-212, -113);
        put([[xx, yy], [xx + 10, yy - 7], [xx + 16, yy - 4], [xx + 6, yy + 3]], i % 3 ? PALETTE.olive : PALETTE.cream, 1, 0.3);
      }
    }
    put([[-13, 0], [-9, -8], [14, -7], [18, 0]], PALETTE.kraft, 1, 0.3);
    put(ellipse(0, -12, 3, 3, 9), PALETTE.mustard, 1, 0.2);
  }, { kind: 'tree', phase });
}
const rearTrees = layer(0.98);
tree(rearTrees, 658, 501, 104, true, 0.2);
tree(rearTrees, 1248, 487, 112, false, 0.5);
tree(rearTrees, 1614, 516, 124, true, 0.7);

function house(l, x, y, scale, roof, smoke = false) {
  contact(l, x + 9, y + 6, 116 * scale, 13 * scale);
  group(l, x, y, scale, put => {
    put(rect(-96, -145, 190, 146), PALETTE.cream, 4);
    put([[55, -145], [94, -145], [94, 0], [55, 0]], PALETTE.kraft, 2);
    put(rect(-67, -238, 28, 83), PALETTE.brick, 4);
    put(rect(-72, -242, 39, 12), PALETTE.kraft, 2);
    put([[-120, -141], [-20, -237], [22, -232], [115, -140]], roof, 7);
    put([[-114, -141], [-18, -225], [-5, -218], [-85, -142]], roof, 2);
    put([[-119, -141], [116, -141], [107, -131], [-110, -132]], PALETTE.navy, 2);
    for (let i = 0; i < 4; i++) {
      const yy = -198 + i * 15, half = 32 + i * 18;
      put([[-half, yy], [half, yy + 2], [half + 6, yy + 5], [-half - 3, yy + 4]], roof, 1, 0.4);
    }
    put(rect(-20, -84, 38, 83), PALETTE.navy, 2);
    put(rect(-15, -78, 28, 76), PALETTE.brick, 1);
    put(ellipse(6, -40, 2.3, 2.3, 10), PALETTE.mustard, 1, 0.1);
    [-66, 58].forEach(wx => {
      put(rect(wx - 22, -109, 43, 49), PALETTE.kraft, 2);
      put(rect(wx - 17, -104, 33, 37), PALETTE.navy, 1);
      put(rect(wx - 14, -101, 12, 30), PALETTE.mustard, 1, 0.3);
      put(rect(wx - 1, -104, 3, 37), PALETTE.cream, 1, 0.2);
      put(rect(wx - 17, -86, 33, 3), PALETTE.cream, 1, 0.2);
      put(rect(wx - 26, -63, 50, 7), PALETTE.cream, 2, 0.4);
    });
    put(rect(-28, -2, 58, 9), PALETTE.kraft, 2);
    put(rect(-35, 7, 72, 7), PALETTE.cream, 2);
    put(ellipse(-2, -168, 12, 13, 15), PALETTE.cream, 1);
    put(ellipse(-2, -168, 7, 8, 12), PALETTE.navy, 1, 0.3);
  });
  if (smoke) {
    const puffs = Array.from({ length: 5 }, (_, i) => cottonPuff(14 + i * 1.5));
    l.items.push({ kind: 'smoke', x: x - 53 * scale, y: y - 247 * scale, scale, puffs });
  }
}
const houses = layer(1.13);
house(houses, 439, 619, 0.98, PALETTE.brick, true);
house(houses, 1481, 623, 0.83, '#426f93');
const garden = layer(1.15);
[[339, 630, 27], [543, 629, 33], [1393, 635, 23], [1572, 637, 29]].forEach(([x, y, r]) => shrub(garden, x, y, r, PALETTE.teal));
function fence(l, x, y, count, step) {
  add(l, [[x - 5, y - 26], [x + count * step, y - 15], [x + count * step, y - 8], [x - 5, y - 19]], PALETTE.kraft, 2, 0.5);
  for (let i = 0; i <= count; i++) {
    const xx = x + i * step, yy = y + i * 1.8;
    add(l, [[xx - 5, yy + 7], [xx - 5, yy - 37], [xx, yy - 44], [xx + 5, yy - 37], [xx + 5, yy + 7]], PALETTE.cream, 2, 0.4);
  }
}
fence(garden, 190, 674, 5, 24);
fence(garden, 1542, 689, 5, 23);

const middleTrees = layer(1.22);
tree(middleTrees, 218, 694, 176, false, 0.1);
tree(middleTrees, 1688, 736, 173, false, 0.4);
tree(middleTrees, 575, 779, 132, true, 0.8);

const bridge = layer(1.3);
contact(bridge, 758, 763, 71, 14);
contact(bridge, 1230, 763, 67, 14);
const deckTop = bezier([709, 624], [862, 543], [1119, 541], [1274, 623], 40);
const underArch = bezier([1169, 775], [1166, 625], [830, 625], [825, 775], 36);
add(bridge, [[696, 775], [709, 624], ...deckTop, [1293, 775], [1169, 775], ...underArch, [696, 775]], PALETTE.kraft, 8, 1.3, 'corrugated', 6);
add(bridge, [[704, 757], [718, 619], ...deckTop.map(([x, y]) => [x, y - 3]), [1282, 757], [1179, 757],
  ...bezier([1179, 757], [1167, 610], [827, 610], [817, 757], 36)], PALETTE.cream, 4);
add(bridge, [...deckTop.map(([x, y]) => [x, y + 8]), ...deckTop.toReversed().map(([x, y]) => [x, y + 22])], PALETTE.mustard, 2, 0.5);
for (let i = 0; i < 13; i++) {
  const u = i / 12, x = 726 + 535 * u, y = 620 - 59 * Math.sin(u * Math.PI);
  add(bridge, [[x - 5, y + 1], [x - 5, y - 42], [x + 4, y - 44], [x + 6, y + 1]], PALETTE.cream, 3, 0.5);
}
const rail = bezier([714, 581], [870, 503], [1116, 505], [1271, 581], 40);
add(bridge, [...rail, ...rail.toReversed().map(([x, y]) => [x, y + 10])], PALETTE.cream, 5, 0.6);
add(bridge, [...rail.map(([x, y]) => [x, y - 2]), ...rail.toReversed().map(([x, y]) => [x, y + 2])], PALETTE.mustard, 1, 0.3);
[711, 1274].forEach(x => {
  add(bridge, rect(x - 13, 570, 25, 187), PALETTE.kraft, 3);
  add(bridge, rect(x - 15, 565, 28, 20), PALETTE.cream, 3);
});
for (let i = 0; i < 13; i++) {
  const a = Math.PI + i / 12 * Math.PI;
  const x = 997 + Math.cos(a) * 179, y = 758 + Math.sin(a) * 104;
  const dx = Math.cos(a) * 10, dy = Math.sin(a) * 12;
  add(bridge, [[x - 5, y], [x + dx - 4, y + dy], [x + dx + 6, y + dy], [x + 5, y + 1]], PALETTE.kraft, 1, 0.3);
}

const details = layer(1.4);
[[753, 811, 23], [794, 861, 18], [1272, 789, 20], [1458, 854, 25], [1595, 925, 19], [949, 1000, 27],
  [676, 571, 12], [164, 877, 21], [1547, 755, 17], [582, 883, 15]].forEach(v => stone(details, ...v));
const grassSites = [[180, 735], [283, 756], [363, 693], [630, 647], [664, 778], [732, 844], [765, 917], [868, 1008],
  [1358, 817], [1491, 872], [1660, 961], [1830, 1004], [1628, 810], [1767, 903], [1463, 694], [1331, 557],
  [108, 965], [460, 938], [564, 1018], [353, 1045], [1823, 654], [1805, 1003]];
grassSites.forEach(([x, y], i) => {
  grass(details, x, y, range(12, 25), i % 3 ? PALETTE.navy : PALETTE.mustard);
  if (i % 2 === 0) {
    add(details, [[x + 17, y], [x + 18, y - 30], [x + 20, y - 30], [x + 20, y]], PALETTE.kraft, 1, 0.2);
    add(details, ellipse(x + 19, y - 32, 5, 6, 9), PALETTE.brick, 2, 0.4);
  }
});
[[108, 841, 49], [449, 849, 43], [1373, 796, 31], [1830, 783, 50], [681, 1025, 43]].forEach(([x, y, r], i) => shrub(details, x, y, r, i % 2 ? PALETTE.teal : '#5e6f45'));
const front = layer(1.7);
tree(front, 289, 1022, 211, false, 0.25);
tree(front, 1689, 1037, 216, true, 0.65);
[[99, 1040, 38], [194, 1045, 22], [396, 1044, 27], [1557, 1052, 34], [1788, 1045, 35]].forEach(([x, y, s]) => grass(front, x, y, s, PALETTE.navy));

const board = document.createElement('canvas');
board.width = 1920; board.height = 1080;
const b = board.getContext('2d');
b.fillStyle = PALETTE.kraft; b.fillRect(0, 0, 1920, 1080);
b.fillStyle = b.createPattern(textures.corrugated, 'repeat'); b.fillRect(0, 0, 1920, 1080);
b.strokeStyle = '#e1c79a'; b.lineWidth = 5; b.strokeRect(21, 19, 1878, 1042);
b.strokeStyle = 'rgba(63,46,26,0.3)'; b.lineWidth = 3; b.strokeRect(29, 27, 1862, 1026);

const photoLight = document.createElement('canvas');
photoLight.width = 1920; photoLight.height = 1080;
const light = photoLight.getContext('2d');
const warm = light.createRadialGradient(210, 90, 0, 210, 90, 1590);
warm.addColorStop(0, 'rgba(255,233,182,0.30)'); warm.addColorStop(1, 'rgba(255,233,182,0)');
light.fillStyle = warm; light.fillRect(0, 0, 1920, 1080);
const falloff = light.createLinearGradient(0, 0, 1920, 1080);
falloff.addColorStop(0, 'rgba(33,53,73,0)'); falloff.addColorStop(0.5, 'rgba(33,53,73,0.015)');
falloff.addColorStop(1, 'rgba(33,53,73,0.10)');
light.fillStyle = falloff; light.fillRect(0, 0, 1920, 1080);
light.save(); light.translate(960, 540); light.scale(1, 0.65);
const vignette = light.createRadialGradient(-180, -100, 480, 0, 0, 1210);
vignette.addColorStop(0, 'rgba(30,39,46,0)'); vignette.addColorStop(1, 'rgba(30,39,46,0.14)');
light.fillStyle = vignette; light.fillRect(-960, -831, 1920, 1662); light.restore();
light.strokeStyle = 'rgba(54,42,26,0.28)'; light.lineWidth = 4;
light.beginPath(); light.moveTo(48, 1038); light.lineTo(48, 44); light.lineTo(1872, 44); light.stroke();
light.strokeStyle = 'rgba(255,244,218,0.6)'; light.lineWidth = 2;
light.beginPath(); light.moveTo(48, 1038); light.lineTo(1872, 1038); light.lineTo(1872, 44); light.stroke();

function motionTime(t) {
  // 포즈의 중앙을 샘플링해 60번째 스텝이 정확히 0번째 포즈로 이어진다.
  const steps = DURATION * RENDERING.fps;
  return Math.round(((t % DURATION) + DURATION) % DURATION * RENDERING.fps) % steps / RENDERING.fps;
}
function drawItem(item, t, cameraShift) {
  if (item.kind === 'water') {
    ctx.save(); ctx.clip(waterClip);
    item.ribbons.forEach((variants, i) => {
      const pose = Math.floor((Math.round(t * RENDERING.fps) + i * 4) / 4) % 3;
      ctx.save();
      ctx.translate(18 * wave(t, i / 3), 4 * wave(t, i / 3 + 0.15)); drawPaper(variants[pose], cameraShift); ctx.restore();
    }); ctx.restore(); return;
  }
  if (item.kind === 'smoke') {
    item.puffs.forEach((p, i) => {
      const step = Math.round(t * RENDERING.fps), age = ((step + i * 12) % 60) / 60;
      const visibility = Math.sin(Math.PI * age) ** 2;
      ctx.save(); ctx.globalAlpha = visibility * 0.8;
      ctx.translate(item.x + (age * 20 + Math.sin(age * TAU) * 9) * item.scale, item.y - age * 117 * item.scale);
      ctx.scale(item.scale * (0.6 + age * 0.95), item.scale * (0.6 + age * 0.75)); drawPaper(p, cameraShift); ctx.restore();
    }); return;
  }
  if (item.parts) {
    const m = item.motion;
    const swing = m ? wave(t, m.phase) : 0;
    ctx.save(); ctx.translate(item.x, item.y); ctx.scale(item.scale, item.scale);
    if (m?.kind === 'cloud') {
      ctx.translate(swing * 10, 3 * wave(t, m.phase + 0.25));
      ctx.rotate(swing * 0.027);
      ctx.save(); ctx.lineWidth = 1.2; ctx.strokeStyle = '#7d775d'; ctx.globalAlpha = 0.5;
      [-55, 58].forEach(x => { ctx.beginPath(); ctx.moveTo(x, -45); ctx.lineTo(x - swing * 6, -item.y / item.scale + 48); ctx.stroke(); });
      ctx.restore();
    }
    if (m?.kind === 'tree') ctx.rotate(Math.round(swing * 3) / 3 * 0.018);
    drawPaper(item.backing, cameraShift);
    item.parts.forEach(p => drawPaper(p, cameraShift)); ctx.restore(); return;
  }
  drawPaper(item, cameraShift);
}
export function render(t) {
  const qt = motionTime(t);
  const move = (1 - Math.cos(TAU * t / DURATION)) / 2;
  ctx.setTransform(backingScale, 0, 0, backingScale, 0, 0);
  ctx.drawImage(board, 0, 0);
  ctx.save(); ctx.beginPath(); ctx.rect(46, 42, 1828, 998); ctx.clip();
  for (const l of layers) {
    ctx.save();
    ctx.translate(960 + CAMERA.travelX * move * l.depth, 540 + CAMERA.travelY * move * l.depth);
    const zoom = 1 + CAMERA.zoom * move * l.depth;
    ctx.scale(zoom, zoom); ctx.translate(-960, -540);
    for (const item of l.items) drawItem(item, qt, move);
    ctx.restore();
  }
  ctx.restore();
  ctx.drawImage(photoLight, 0, 0);
}
function resize() {
  const bounds = canvas.getBoundingClientRect();
  const dpr = Math.min(devicePixelRatio || 1, RENDERING.maxDpr);
  canvas.width = Math.round(bounds.width * dpr); canvas.height = Math.round(bounds.height * dpr);
  backingScale = canvas.width / CAMERA.width;
  if (window.__demo) render(window.__demo.time);
}
window.addEventListener('resize', resize);
resize();
start(render);
