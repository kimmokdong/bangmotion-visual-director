import * as THREE from 'three';
import { start, DURATION, TAU, saw, smooth } from '../../shared/runtime.js';

export const PALETTE = Object.freeze({
  grass: '#a5ceb1', leaf: '#7fb79c', pine: '#62988b', water: '#68bfc2',
  coral: '#df9181', blue: '#87b9cc', cream: '#f4e7cc',
  earth: '#b3947e', sediment: '#d4b598', dark: '#577c79', foam: '#e5f5e9', bridgeShade: '#e8d9ba',
});
export const MATERIAL = Object.freeze({ roughness: 1, metalness: 0, flatShading: true });
export const LIGHTING = Object.freeze({
  sun: 2.2, hemisphere: 1.8, sunColor: '#fff6e8', skyColor: '#fffaf0', groundColor: '#b0c7bd',
  position: [-7, 13, 6], shadowSize: 4096, shadowExtent: 13, bias: -0.00015, normalBias: 0.035,
});
export const CAMERA = Object.freeze({
  yaw: Math.PI / 4, pitch: Math.atan(1 / Math.sqrt(2)), height: 16.8,
  near: 0.1, far: 120, distance: 32, targetY: 0.25, zoom: 0.045, pan: 0.14, panY: 0.06,
});
export const RENDERING = Object.freeze({ maxPixelRatio: 2, antialias: true });

const stage = document.querySelector('main');
const renderer = new THREE.WebGLRenderer({ canvas: document.querySelector('canvas'), alpha: true, antialias: RENDERING.antialias });
renderer.setPixelRatio(Math.min(devicePixelRatio, RENDERING.maxPixelRatio));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setClearColor(0x000000, 0);
const scene = new THREE.Scene();
const island = new THREE.Group();
scene.add(island);
const camera = new THREE.OrthographicCamera(-CAMERA.height * 8 / 9, CAMERA.height * 8 / 9, CAMERA.height / 2, -CAMERA.height / 2, CAMERA.near, CAMERA.far);
const direction = new THREE.Vector3(Math.sin(CAMERA.yaw) * Math.cos(CAMERA.pitch), Math.sin(CAMERA.pitch), Math.cos(CAMERA.yaw) * Math.cos(CAMERA.pitch));
camera.position.copy(direction.clone().multiplyScalar(CAMERA.distance));
camera.lookAt(0, 0, 0);

const materials = new Map();
function matte(color) {
  if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color, ...MATERIAL }));
  return materials.get(color);
}
function mesh(geometry, color, parent = island) {
  const object = new THREE.Mesh(geometry, typeof color === 'string' ? matte(color) : color);
  object.castShadow = true;
  object.receiveShadow = true;
  parent.add(object);
  return object;
}
function box(x, y, z, w, h, d, color, parent = island) {
  const object = mesh(new THREE.BoxGeometry(w, h, d), color, parent);
  object.position.set(x, y, z);
  return object;
}
function prism(points, bottom, top, color, parent = island) {
  const shape = new THREE.Shape();
  points.forEach(([x, z], i) => i ? shape.lineTo(x, -z) : shape.moveTo(x, -z));
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: top - bottom, bevelEnabled: false, curveSegments: 1 });
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, bottom, 0);
  return mesh(geometry, color, parent);
}
function stone(x, y, z, radius, color = PALETTE.cream, parent = island) {
  const object = mesh(new THREE.IcosahedronGeometry(radius, 0), color, parent);
  object.position.set(x, y, z);
  object.scale.set(1.25, 0.55, 0.9);
  object.rotation.y = x * 2.3 + z;
  return object;
}
function beam(a, b, width, color, parent = island) {
  const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
  const object = mesh(new THREE.BoxGeometry(width, start.distanceTo(end), width), color, parent);
  object.position.copy(start.add(end).multiplyScalar(0.5));
  object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...b).sub(new THREE.Vector3(...a)).normalize());
  return object;
}

scene.add(new THREE.HemisphereLight(LIGHTING.skyColor, LIGHTING.groundColor, LIGHTING.hemisphere));
const sun = new THREE.DirectionalLight(LIGHTING.sunColor, LIGHTING.sun);
sun.position.set(...LIGHTING.position);
sun.castShadow = true;
sun.shadow.mapSize.set(LIGHTING.shadowSize, LIGHTING.shadowSize);
Object.assign(sun.shadow.camera, { left: -LIGHTING.shadowExtent, right: LIGHTING.shadowExtent, top: LIGHTING.shadowExtent, bottom: -LIGHTING.shadowExtent, near: 1, far: 45 });
sun.shadow.bias = LIGHTING.bias;
sun.shadow.normalBias = LIGHTING.normalBias;
sun.shadow.radius = 3;
sun.target.position.set(0, 0, 0);
scene.add(sun, sun.target);

function riverCenter(x) { return 0.35 * x + 0.46 * Math.sin(x * 0.55); }
const half = 7, riverHalf = 1.13;
const samples = Array.from({ length: 57 }, (_, i) => -half + i * half * 2 / 56);
const bank = side => samples.map(x => [x, riverCenter(x) + side * riverHalf]);
const outline = [[-half, -half], [half, -half], [half, half], [-half, half]];
function buildTerrain() {
  prism(outline, -1.55, -1.31, PALETTE.earth);
  prism(outline, -1.31, -1.17, PALETTE.sediment);
  prism(outline, -1.17, -0.43, PALETTE.earth);
  prism(outline, -0.43, -0.29, PALETTE.sediment);
  const north = [[-half, -half], [half, -half], ...bank(-1).reverse()];
  const south = [...bank(1), [half, half], [-half, half]];
  for (const polygon of [north, south]) {
    prism(polygon, -0.29, 0.09, PALETTE.sediment);
    prism(polygon, 0.09, 0.27, PALETTE.grass);
  }
  prism([...bank(-1), ...bank(1).reverse()], -0.29, -0.19, PALETTE.water);
  for (let i = 0; i < 15; i++) {
    const x = -6.55 + i * 0.92;
    for (const side of [-1, 1]) {
      const z = riverCenter(x) + side * (riverHalf + 0.11);
      stone(x, 0.16, z, 0.16 + 0.06 * (i % 3), i % 4 ? PALETTE.sediment : PALETTE.cream);
    }
  }
  for (let i = 0; i < 18; i++) {
    const x = -6.5 + (i * 2.17 % 13), y = -0.93 - (i % 3) * 0.09;
    box(x, y, 7.008, 0.2 + (i % 4) * 0.09, 0.07, 0.018, PALETTE.sediment);
    box(7.008, y + 0.07, x, 0.018, 0.08, 0.26, PALETTE.sediment);
  }
  // 먼 언덕도 같은 타일 위에 두어 떠 있는 별도 지형처럼 보이지 않게 한다.
  for (const [x, z, w, h] of [[-5.4, -5.4, 2.6, 1.05], [-2.9, -5.5, 2.4, 0.7]]) {
    const hill = mesh(new THREE.ConeGeometry(w / 2, h, 4), PALETTE.leaf);
    hill.position.set(x, 0.27 + h / 2, z);
    hill.rotation.y = Math.PI / 4;
  }
}

function archHeight(z) { return 0.33 + 0.91 * Math.cos(z / 2.25 * Math.PI / 2); }
function buildBridge() {
  const bridge = new THREE.Group();
  bridge.rotation.y = -0.42;
  island.add(bridge);
  const count = 18, length = 4.5;
  for (let i = 0; i < count; i++) {
    const a = -length / 2 + i * length / count, b = a + length / count;
    const ya = archHeight(a), yb = archHeight(b);
    const shape = new THREE.Shape();
    shape.moveTo(a, ya); shape.lineTo(b, yb); shape.lineTo(b, yb - 0.27); shape.lineTo(a, ya - 0.27); shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: 1.56, bevelEnabled: false });
    geometry.rotateY(-Math.PI / 2);
    geometry.translate(0.78, 0, 0);
    mesh(geometry, i % 3 === 0 ? PALETTE.bridgeShade : PALETTE.cream, bridge);
    for (const x of [-0.71, 0.71]) {
      const railY = 0.6;
      beam([x, ya + railY, a], [x, yb + railY, b], 0.11, PALETTE.cream, bridge);
      beam([x, ya + 0.29, a], [x, yb + 0.29, b], 0.055, PALETTE.sediment, bridge);
      if (i % 3 === 0 || i === count - 1) {
        box(x, ya + 0.32, a, 0.14, 0.73, 0.14, PALETTE.cream, bridge);
        box(x, ya + 0.72, a, 0.2, 0.08, 0.2, PALETTE.cream, bridge);
      }
    }
  }
  for (const z of [-2.2, 2.2]) {
    box(0, 0.24, z, 1.78, 0.15, 0.55, PALETTE.sediment, bridge);
    box(0, 0.35, z, 1.65, 0.12, 0.5, PALETTE.cream, bridge);
  }
  for (const x of [-0.71, 0.71]) {
    const y = archHeight(2.25);
    box(x, y + 0.32, 2.25, 0.14, 0.73, 0.14, PALETTE.cream, bridge);
    box(x, y + 0.72, 2.25, 0.2, 0.08, 0.2, PALETTE.cream, bridge);
  }
  return bridge;
}

const smoke = [];
function buildHouse(x, z, color, rotation, chimney = false) {
  const house = new THREE.Group();
  house.position.set(x, 0.27, z);
  house.rotation.y = rotation;
  island.add(house);
  box(0, 0.1, 0, 2.4, 0.2, 2.05, PALETTE.sediment, house);
  box(0, 0.88, 0, 2.18, 1.5, 1.83, PALETTE.cream, house);
  const gable = new THREE.Shape();
  gable.moveTo(-1.09, 1.61); gable.lineTo(1.09, 1.61); gable.lineTo(0, 2.5); gable.closePath();
  const wall = new THREE.ExtrudeGeometry(gable, { depth: 1.83, bevelEnabled: false });
  wall.translate(0, 0, -0.915);
  mesh(wall, PALETTE.cream, house);
  for (const side of [-1, 1]) {
    const roof = box(side * 0.64, 2.07, 0, 1.68, 0.16, 2.24, color, house);
    roof.rotation.z = -side * 0.68;
    for (let row = 0; row < 4; row++) {
      const xx = side * (0.17 + row * 0.31), yy = 2.58 - (0.17 + row * 0.31) * 0.81;
      const batten = box(xx, yy + 0.025, 0, 0.035, 0.025, 2.25, color, house);
      batten.rotation.z = -side * 0.68;
    }
  }
  box(0, 2.59, 0, 0.17, 0.13, 2.31, color, house);
  box(0, 0.56, 0.943, 0.49, 0.97, 0.09, PALETTE.dark, house);
  box(0, 0.57, 0.998, 0.37, 0.83, 0.04, color, house);
  stone(0.12, 0.59, 1.03, 0.035, PALETTE.cream, house);
  box(0, 0.06, 1.19, 0.77, 0.12, 0.42, PALETTE.cream, house);
  for (const xx of [-0.69, 0.69]) windowFrame(xx, 1.05, 0.946, house);
  const sideWindow = new THREE.Group(); sideWindow.position.set(1.106, 0, 0); sideWindow.rotation.y = Math.PI / 2; house.add(sideWindow);
  windowFrame(0, 1.03, 0, sideWindow);
  windowFrame(0, 1.98, 0.925, house, 0.67);
  for (const xx of [-0.69, 0.69]) {
    box(xx, 0.66, 1.03, 0.64, 0.16, 0.28, color, house);
    for (let i = 0; i < 4; i++) {
      stone(xx - 0.23 + i * 0.15, 0.8, 1.07, 0.12, PALETTE.leaf, house);
      stone(xx - 0.2 + i * 0.14, 0.87, 1.08, 0.065, i % 2 ? PALETTE.cream : PALETTE.coral, house);
    }
  }
  if (chimney) {
    box(-0.64, 2.39, -0.35, 0.38, 1.03, 0.43, PALETTE.sediment, house);
    box(-0.64, 2.94, -0.35, 0.49, 0.13, 0.53, PALETTE.cream, house);
    box(-0.64, 3.011, -0.35, 0.29, 0.015, 0.32, PALETTE.dark, house);
    for (let i = 0; i < 5; i++) {
      const material = new THREE.MeshStandardMaterial({ color: PALETTE.cream, ...MATERIAL, transparent: true, opacity: 0.5, depthWrite: false });
      const puff = mesh(new THREE.IcosahedronGeometry(0.22, 1), material, house);
      puff.castShadow = false;
      smoke.push({ object: puff, phase: i / 5 });
    }
  }
  return house;
}
function windowFrame(x, y, z, parent, scale = 1) {
  const frame = new THREE.Group(); frame.position.set(x, y, z); frame.scale.setScalar(scale); parent.add(frame);
  box(0, 0, 0, 0.55, 0.63, 0.07, PALETTE.sediment, frame);
  box(0, 0, 0.043, 0.43, 0.5, 0.025, PALETTE.dark, frame);
  box(0, 0, 0.063, 0.038, 0.5, 0.03, PALETTE.cream, frame);
  box(0, 0.02, 0.063, 0.43, 0.038, 0.03, PALETTE.cream, frame);
  box(0, -0.33, 0.06, 0.63, 0.08, 0.16, PALETTE.cream, frame);
}

const trees = [];
function buildTree(x, z, type, size, phase) {
  const root = new THREE.Group(); root.position.set(x, 0.27, z); root.scale.setScalar(size); island.add(root);
  const sway = new THREE.Group(); root.add(sway);
  box(0, 0.65, 0, 0.18, 1.3, 0.18, PALETTE.earth, sway);
  if (type === 'pine') {
    for (let i = 0; i < 3; i++) {
      const object = mesh(new THREE.ConeGeometry(0.78 - i * 0.17, 1.15, 4), i % 2 ? PALETTE.leaf : PALETTE.pine, sway);
      object.position.y = 1.15 + i * 0.53;
      object.rotation.y = Math.PI / 4;
    }
  } else {
    beam([0, 0.8, 0], [-0.45, 1.5, 0.03], 0.12, PALETTE.earth, sway);
    for (const [xx, yy, zz, r] of [[0, 1.95, 0, 0.88], [-0.47, 1.61, 0.03, 0.64], [0.4, 1.77, 0.12, 0.64]]) {
      const crown = mesh(new THREE.IcosahedronGeometry(r, 1), phase > 0.5 ? PALETTE.grass : PALETTE.leaf, sway);
      crown.position.set(xx, yy, zz); crown.scale.y = 1.08;
    }
  }
  stone(0.19, 0.03, 0.09, 0.27, PALETTE.leaf, root);
  trees.push({ object: sway, phase });
}
function fence(points) {
  for (let i = 0; i < points.length; i++) {
    const [x, z] = points[i];
    box(x, 0.66, z, 0.13, 0.78, 0.13, PALETTE.cream);
    box(x, 1.07, z, 0.18, 0.08, 0.18, PALETTE.cream);
    if (i) for (const y of [0.55, 0.89]) beam([points[i - 1][0], y, points[i - 1][1]], [x, y, z], 0.08, PALETTE.cream);
  }
}
function path(points) {
  for (let i = 1; i < points.length; i++) {
    const a = new THREE.Vector3(points[i - 1][0], 0.28, points[i - 1][1]);
    const b = new THREE.Vector3(points[i][0], 0.28, points[i][1]);
    const count = Math.ceil(a.distanceTo(b) / 0.48);
    for (let j = 0; j < count; j++) {
      const p = a.clone().lerp(b, j / count);
      const tile = box(p.x, p.y + 0.025, p.z, 0.59, 0.07, 0.35, PALETTE.cream);
      tile.rotation.y = Math.atan2(b.x - a.x, b.z - a.z) + 0.08 * Math.sin(i + j);
    }
  }
}
function plantPatch(x, z, count = 5) {
  for (let i = 0; i < count; i++) {
    const a = i * 2.399, r = 0.15 + 0.065 * i;
    const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
    for (let j = 0; j < 3; j++) {
      const blade = box(px + (j - 1) * 0.065, 0.38, pz, 0.035, 0.22 + (i % 3) * 0.045, 0.04, PALETTE.leaf);
      blade.rotation.z = (j - 1) * 0.33;
    }
    if (i % 2 === 0) stone(px, 0.52, pz, 0.06, i % 4 ? PALETTE.cream : PALETTE.coral);
  }
}
function buildDetails() {
  path([[-3.9, 2.3], [-3.3, 3.5], [-1.6, 3.2], [-0.97, 2.05]]);
  path([[0.95, -2.06], [1.6, -2.9], [3.5, -2.9], [3.7, -2.2]]);
  fence([[-6.15, 1.6], [-6.15, 2.55], [-6.15, 3.5], [-6.15, 4.45], [-5.25, 4.45], [-4.35, 4.45]]);
  fence([[2.8, -5.6], [3.8, -5.6], [4.8, -5.6], [5.8, -5.6], [5.8, -4.6]]);
  for (const [x, z] of [[-5.8, 5.6], [-3.6, 5.5], [-1.9, 5], [0.7, 5.9], [3, 5.9], [5.2, 5.9], [5.8, 3.7], [-5.9, -1], [-2.4, -3.5], [0.4, -4.6], [5.9, -1.4]]) plantPatch(x, z);
  for (const [x, z, size] of [[-5.7, -1.5, 0.32], [-2.8, 4.8, 0.27], [5.8, 4.1, 0.42], [6.2, -1.4, 0.3], [1.8, -5.5, 0.37], [-5.7, 5.6, 0.28]]) {
    stone(x, 0.27 + size * 0.27, z, size, PALETTE.sediment);
    stone(x + 0.42, 0.31, z + 0.12, size * 0.45, PALETTE.cream);
  }
  for (const [x, z] of [[-5.6, -0.1], [-2.5, -3.8], [5.9, 0], [1.9, 5.7]]) {
    for (let i = 0; i < 3; i++) stone(x + i * 0.27, 0.45, z, 0.38, i % 2 ? PALETTE.grass : PALETTE.leaf);
  }
  box(-4.65, 0.3, 3.8, 1.08, 0.07, 1.3, PALETTE.sediment);
  for (let row = 0; row < 3; row++) {
    box(-5 + row * 0.35, 0.346, 3.8, 0.19, 0.025, 1.12, PALETTE.earth);
    for (let col = 0; col < 4; col++) stone(-5 + row * 0.35, 0.4, 3.38 + col * 0.28, 0.12, PALETTE.leaf);
  }
  for (const [x, side] of [[-4.9, -1], [-2.4, 1], [3.6, 1], [5.6, -1]]) {
    const z = riverCenter(x) + side * 1.25;
    for (let j = 0; j < 5; j++) {
      const px = x + 0.08 * j, h = 0.34 + 0.1 * (j % 3);
      box(px, 0.27 + h / 2, z, 0.028, h, 0.028, PALETTE.pine);
      box(px, 0.29 + h, z, 0.065, 0.13, 0.065, PALETTE.sediment);
    }
  }
  for (const z of [-1.4, -0.76]) for (const x of [5.1, 5.9]) box(x, 0.49, z, 0.1, 0.44, 0.1, PALETTE.earth);
  for (const z of [-1.43, -1.12, -0.81]) box(5.5, 0.73, z, 1.12, 0.13, 0.23, PALETTE.cream);
  for (const x of [5.1, 5.9]) box(x, 0.93, -1.45, 0.09, 0.6, 0.09, PALETTE.earth);
  box(5.5, 1.11, -1.45, 1.12, 0.2, 0.1, PALETTE.cream);
  // 수로 끝은 흙 단면 밖으로 조금 내밀어 얇은 폭포의 시작점을 숨긴다.
  box(7.026, -0.85, riverCenter(7), 0.09, 1.32, 2.24, PALETTE.water);
  box(7.035, -1.52, riverCenter(7), 0.15, 0.12, 2.27, PALETTE.foam);
}

const ripples = [], falls = [], clouds = [];
function buildAtmosphere() {
  for (let i = 0; i < 49; i++) {
    const lane = i % 7;
    const line = box(0, -0.126, 0, 0.21 + (i % 4) * 0.12, 0.017, 0.035, PALETTE.foam);
    line.castShadow = false;
    ripples.push({ object: line, phase: i * 0.61803398875 % 1, lane: (lane - 3) * 0.255 });
  }
  for (let i = 0; i < 15; i++) {
    const line = box(7.085, 0, riverCenter(7) - 0.98 + (i % 5) * 0.48, 0.015, 0.17, 0.028, PALETTE.foam);
    line.castShadow = false;
    falls.push({ object: line, phase: Math.floor(i / 5) / 3 + (i % 5) * 0.08 });
  }
  for (const [x, y, z, scale, phase] of [[-6.9, 3.6, -2.2, 0.85, 0], [-2.6, 3.35, -6.4, 1.05, 0.3], [4.2, 5.5, -5.3, 0.8, 0.6]]) {
    const cloud = new THREE.Group(); cloud.position.set(x, y, z); cloud.scale.setScalar(scale); scene.add(cloud);
    for (const [xx, yy, zz, w, h, d] of [[0, 0, 0, 2.15, 0.48, 0.75], [-0.45, 0.29, 0, 0.83, 0.62, 0.72], [0.4, 0.2, 0.03, 0.77, 0.58, 0.65]]) {
      const part = box(xx, yy, zz, w, h, d, PALETTE.foam, cloud);
      part.castShadow = false;
    }
    clouds.push({ object: cloud, x, y, z, phase });
  }
}

buildTerrain();
buildBridge();
buildHouse(-3.85, 1.12, PALETTE.coral, -0.08, true);
buildHouse(3.35, -3.65, PALETTE.blue, 0.08);
for (const args of [[-5.6, 3.45, 'round', 1, 0.1], [-5.5, -3.55, 'pine', 1.1, 0.3], [-0.5, -5.8, 'pine', 0.92, 0.6], [5.6, -3.55, 'round', 1, 0.7], [5.8, 0.55, 'pine', 0.9, 0.9], [1.25, 4.7, 'round', 0.87, 0.35], [-1.75, 5.9, 'pine', 0.83, 0.8]]) buildTree(...args);
buildDetails();
buildAtmosphere();

export function render(t) {
  const phase = TAU * t / DURATION;
  const ease = (1 - Math.cos(phase)) / 2;
  island.position.y = 0.045 * Math.sin(phase);
  camera.zoom = 1 + CAMERA.zoom * ease;
  const target = new THREE.Vector3(CAMERA.pan * ease, CAMERA.targetY + CAMERA.panY * ease, -CAMERA.pan * ease);
  // 위치만 평행 이동해야 모든 프레임의 투영 각도가 유지된다.
  camera.position.copy(target).addScaledVector(direction, CAMERA.distance);
  camera.updateProjectionMatrix();
  for (const { object, phase: offset } of trees) {
    object.rotation.z = 0.017 * Math.sin(phase + offset * TAU);
    object.rotation.x = 0.009 * Math.sin(phase + offset * TAU);
  }
  for (const { object, phase: offset, lane } of ripples) {
    const p = saw(t, 1, offset);
    const x = -6.9 + 13.8 * smooth(p);
    object.position.set(x, -0.126, riverCenter(x) + lane);
    object.rotation.y = -Math.atan(0.35 + 0.253 * Math.cos(x * 0.55));
    object.scale.x = Math.sin(Math.PI * p) ** 2;
  }
  for (const { object, phase: offset } of falls) {
    const p = saw(t, 3, offset);
    object.position.y = -0.24 - 1.13 * smooth(p);
    object.scale.y = Math.sin(Math.PI * p) ** 2;
  }
  for (const { object, phase: offset } of smoke) {
    const p = saw(t, 1, offset);
    const rise = smooth(p);
    object.position.set(-0.64 + 0.42 * rise, 3.13 + 1.1 * rise, -0.35 + 0.2 * rise);
    object.scale.setScalar(0.45 + p * 1.2);
    object.material.opacity = 0.6 * Math.sin(Math.PI * p) ** 2;
  }
  for (const { object, x, y, z, phase: offset } of clouds) {
    object.position.set(x + 0.22 * Math.sin(phase + offset * TAU), y + 0.035 * Math.cos(phase + offset * TAU), z + 0.13 * Math.sin(phase + offset * TAU));
  }
  renderer.render(scene, camera);
}
function resize() {
  renderer.setPixelRatio(Math.min(devicePixelRatio, RENDERING.maxPixelRatio));
  renderer.setSize(stage.clientWidth, stage.clientHeight, false);
}
window.addEventListener('resize', resize);
resize();
start(render);
