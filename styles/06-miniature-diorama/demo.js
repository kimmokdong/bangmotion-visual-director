import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { start, DURATION, TAU, loop, saw } from '../../shared/runtime.js';

export const PALETTE = Object.freeze({
  paper: '#d6cbbb', cream: '#e9dcb8', walnut: '#69452f',
  moss: '#75834a', brick: '#aa5341', slate: '#527880', resin: '#559c99',
});
export const MATERIAL = Object.freeze({
  grassRoughness: 0.98, grassBump: 0.055, spongeBump: 0.045,
  paintBump: 0.012, woodBump: 0.028, resinRoughness: 0.14,
  resinTransmission: 0.18, resinClearcoat: 0.38, resinBump: 0.012,
});
export const LIGHTING = Object.freeze({
  keyColor: '#ffe0af', keyIntensity: 3.7, keyPosition: [-5, 10, 6],
  fillColor: '#c4e4ee', fillIntensity: 1.4, fillPosition: [7, 6, -3],
  ambientIntensity: 0.65, shadowSize: 4096, exposure: 1.08,
});
export const CAMERA = Object.freeze({
  fov: 25, radius: 15.2, elevation: 10.7, azimuth: 0.29,
  arcDegrees: 6, target: [0, 1.0, 0.25], focus: [0, 1.43, 0],
  aperture: 0.0026, maxblur: 0.009,
});
export const RENDERING = Object.freeze({ maxPixelRatio: 2, samples: 4, seed: 60261 });

const stage = document.querySelector('main');
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = LIGHTING.exposure;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
stage.append(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(PALETTE.paper);
const camera = new THREE.PerspectiveCamera(CAMERA.fov, 16 / 9, 0.1, 90);
const world = new THREE.Group();
scene.add(world);
const focusPoint = new THREE.Vector3(...CAMERA.focus);
const target = new THREE.Vector3(...CAMERA.target);
const trees = [], clouds = [], smoke = [], ripples = [];

function mulberry32(seed) {
  return () => {
    let a = seed += 0x6D2B79F5;
    a = Math.imul(a ^ a >>> 15, a | 1);
    a ^= a + Math.imul(a ^ a >>> 7, a | 61);
    return ((a ^ a >>> 14) >>> 0) / 4294967296;
  };
}
const random = mulberry32(RENDERING.seed);
const between = (a, b) => a + (b - a) * random();
const tint = (color, amount) => new THREE.Color(color).multiplyScalar(amount);
const riverX = z => 0.78 * z + 0.22 * Math.sin(z * 0.9);
const insideBase = (x, z, margin = 0) => x * x / (5.85 - margin) ** 2 + z * z / (4.1 - margin) ** 2 < 1;
const bankDistance = (x, z) => Math.abs(x - riverX(z)) / 1.27;
function groundY(x, z) {
  const bank = THREE.MathUtils.smoothstep(bankDistance(x, z), 0.59, 0.94);
  return 0.745 + bank * 0.235 + bank * 0.018 * Math.sin(x * 2.7) * Math.cos(z * 2.1);
}

export function makeTexture(kind, repeats = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const pixels = ctx.createImageData(512, 512);
  const rng = mulberry32(RENDERING.seed + [...kind].reduce((v, c) => v + c.charCodeAt(0), 0));
  for (let y = 0; y < 512; y++) {
    for (let x = 0; x < 512; x++) {
      const i = (y * 512 + x) * 4;
      let n = 0.5 + (rng() - 0.5) * 0.56;
      if (kind === 'wood') n = 0.53 + 0.11 * Math.sin(y * 0.28 + 1.8 * Math.sin(x * TAU / 512) + Math.sin(y * 0.07)) + (rng() - 0.5) * 0.12;
      if (kind === 'paint') n = 0.63 + 0.055 * Math.sin(x * 0.61 + Math.sin(y * 0.018) * 2) + (rng() - 0.5) * 0.11;
      if (kind === 'sponge') n = 0.52 + (rng() - 0.5) * 0.75 + 0.1 * Math.sin(x * 0.8) * Math.sin(y * 0.8);
      if (kind === 'water') n = 0.55 + 0.19 * Math.sin(x / 512 * TAU * 8 + 1.3 * Math.sin(y / 512 * TAU * 3)) + 0.09 * Math.cos(y / 512 * TAU * 11 + Math.sin(x / 512 * TAU * 2));
      pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = Math.round(THREE.MathUtils.clamp(n, 0, 1) * 255);
      pixels.data[i + 3] = 255;
    }
  }
  ctx.putImageData(pixels, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeats, repeats);
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  return texture;
}
const textures = {
  grass: makeTexture('grass', 14), sponge: makeTexture('sponge', 2),
  wood: makeTexture('wood', 2), paint: makeTexture('paint', 2), clay: makeTexture('clay', 3), water: makeTexture('water', 2),
};
const materials = {
  grass: new THREE.MeshStandardMaterial({ color: PALETTE.moss, map: textures.grass, bumpMap: textures.grass, bumpScale: MATERIAL.grassBump, roughness: MATERIAL.grassRoughness }),
  wood: new THREE.MeshStandardMaterial({ color: '#a77d50', map: textures.wood, bumpMap: textures.wood, bumpScale: MATERIAL.woodBump, roughness: 0.66 }),
  walnut: new THREE.MeshStandardMaterial({ color: PALETTE.walnut, map: textures.wood, bumpMap: textures.wood, bumpScale: 0.025, roughness: 0.48 }),
  soil: new THREE.MeshStandardMaterial({ color: '#85734e', map: textures.clay, bumpMap: textures.clay, bumpScale: 0.035, roughness: 1 }),
  stone: new THREE.MeshStandardMaterial({ color: '#b8b3a0', map: textures.clay, bumpMap: textures.clay, bumpScale: 0.04, roughness: 0.96 }),
  bark: new THREE.MeshStandardMaterial({ color: '#6d563b', map: textures.wood, bumpMap: textures.wood, bumpScale: 0.03, roughness: 0.98 }),
  dark: new THREE.MeshStandardMaterial({ color: '#314f50', roughness: 0.35 }),
  cream: paint(PALETTE.cream), brick: paint(PALETTE.brick), slate: paint(PALETTE.slate),
  cotton: new THREE.MeshStandardMaterial({ color: '#eee8d9', map: textures.sponge, bumpMap: textures.sponge, bumpScale: 0.022, roughness: 1 }),
};
function paint(color) {
  return new THREE.MeshStandardMaterial({ color, map: textures.paint, bumpMap: textures.paint, bumpScale: MATERIAL.paintBump, roughness: 0.73 });
}
function mesh(geometry, material, parent = world) {
  const m = new THREE.Mesh(geometry, material);
  m.castShadow = m.receiveShadow = true;
  parent.add(m);
  return m;
}
function box(w, h, d, material, parent, position, radius = 0.025) {
  const m = mesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(radius, w / 3, h / 3, d / 3)), material, parent);
  m.position.set(...position);
  return m;
}
function beam(a, b, radius, material, parent = world) {
  const from = new THREE.Vector3(...a), to = new THREE.Vector3(...b);
  const m = mesh(new THREE.CylinderGeometry(radius, radius * 1.04, from.distanceTo(to), 8), material, parent);
  m.position.copy(from).add(to).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.sub(from).normalize());
  return m;
}
function clayGeometry(detail = 2, seed = 0) {
  const geometry = new THREE.SphereGeometry(1, detail * 8 + 8, detail * 6 + 6);
  const p = geometry.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const scale = 1 + 0.032 * Math.sin(x * 13 + seed) * Math.sin(z * 11 + y * 9) + 0.027 * Math.sin(y * 17 + seed);
    p.setXYZ(i, x * scale, y * scale, z * scale);
  }
  geometry.computeVertexNormals();
  return geometry;
}
const pebbleGeometry = clayGeometry(1, 4);
const softGeometry = clayGeometry(3, 8);

export function buildStudio() {
  const paper = new THREE.MeshStandardMaterial({ color: PALETTE.paper, roughness: 1 });
  const profile = [[-70, 0], [6, 0]];
  for (let i = 1; i <= 48; i++) {
    const a = i / 48 * Math.PI / 2;
    profile.push([6 + 9 * Math.sin(a), 9 - 9 * Math.cos(a)]);
  }
  profile.push([15, 40]);
  const vertices = [], indices = [];
  profile.forEach(([z, y]) => vertices.push(-80, y - 0.015, z, 80, y - 0.015, z));
  for (let i = 0; i < profile.length - 1; i++) {
    const k = i * 2;
    indices.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.setIndex(indices); geo.computeVertexNormals();
  const sweep = mesh(geo, paper, scene);
  sweep.castShadow = false;

  const env = new THREE.Scene();
  env.background = new THREE.Color('#aaa393');
  for (const [color, strength, pos, scale] of [
    ['#ffe6c7', 5, [-5, 9, 5], [6, 6]], ['#e0f1ff', 3, [6, 6, -4], [5, 5]], ['#ffffff', 4, [0, 10, -1], [2, 7]],
    ['#fff4dc', 3, [-3, 7, -11], [5, 8]],
  ]) {
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(...scale), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(strength), side: THREE.DoubleSide }));
    panel.position.set(...pos); panel.lookAt(0, 0, 0); env.add(panel);
  }
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(env, 0.065, 0.1, 100).texture;
  pmrem.dispose();
  env.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });

  scene.add(new THREE.HemisphereLight('#f2ead5', '#9c8e79', LIGHTING.ambientIntensity));
  const key = new THREE.DirectionalLight(LIGHTING.keyColor, LIGHTING.keyIntensity);
  key.position.set(...LIGHTING.keyPosition); key.castShadow = true;
  key.shadow.mapSize.setScalar(LIGHTING.shadowSize);
  Object.assign(key.shadow.camera, { left: -9, right: 9, top: 8, bottom: -8, near: 1, far: 28 });
  key.shadow.bias = -0.00016; key.shadow.normalBias = 0.025; key.shadow.radius = 4;
  scene.add(key);
  const fill = new THREE.DirectionalLight(LIGHTING.fillColor, LIGHTING.fillIntensity);
  fill.position.set(...LIGHTING.fillPosition); scene.add(fill);

  const contactCanvas = document.createElement('canvas');
  contactCanvas.width = contactCanvas.height = 256;
  const c = contactCanvas.getContext('2d');
  const gradient = c.createRadialGradient(128, 128, 40, 128, 128, 126);
  gradient.addColorStop(0, 'rgba(45,33,20,0.36)'); gradient.addColorStop(0.64, 'rgba(45,33,20,0.24)'); gradient.addColorStop(1, 'rgba(45,33,20,0)');
  c.fillStyle = gradient; c.fillRect(0, 0, 256, 256);
  const contact = mesh(new THREE.PlaneGeometry(14.2, 10.8), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(contactCanvas), transparent: true, depthWrite: false }), scene);
  contact.rotation.x = -Math.PI / 2; contact.position.y = 0.002; contact.castShadow = contact.receiveShadow = false;
}

export function buildBase() {
  const profile = [[0, 0.008], [0.965, 0.008], [0.99, 0.04], [1, 0.1], [1, 0.54], [0.99, 0.6], [0.97, 0.64], [0, 0.64]].map(p => new THREE.Vector2(...p));
  const base = mesh(new THREE.LatheGeometry(profile, 192), materials.walnut);
  base.scale.set(6.1, 1, 4.4);
  const lip = mesh(new THREE.CylinderGeometry(1, 1, 0.045, 192), materials.wood);
  lip.scale.set(5.98, 1, 4.27); lip.position.y = 0.647;
  const positions = [0, groundY(0, 0), 0], uvs = [0.5, 0.5], indices = [];
  const rings = 64, segments = 192;
  for (let r = 1; r <= rings; r++) {
    for (let j = 0; j <= segments; j++) {
      const angle = j / segments * TAU;
      const x = 5.85 * r / rings * Math.cos(angle), z = 4.1 * r / rings * Math.sin(angle);
      positions.push(x, groundY(x, z), z); uvs.push(x / 11.7 + 0.5, z / 8.2 + 0.5);
      const k = 1 + (r - 1) * (segments + 1) + j;
      if (j < segments) {
        if (r === 1) indices.push(0, k + 1, k);
        else indices.push(k, k - segments - 1, k + 1, k + 1, k - segments - 1, k - segments);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices); geo.computeVertexNormals();
  mesh(geo, materials.grass);
  const sidePositions = [], sideUv = [], sideIndices = [];
  for (let i = 0; i <= segments; i++) {
    const a = i / segments * TAU, x = Math.cos(a) * 5.85, z = Math.sin(a) * 4.1;
    sidePositions.push(x, 0.67, z, x, groundY(x, z) - 0.006, z); sideUv.push(i / segments * 5, 0, i / segments * 5, 1);
    if (i < segments) { const k = i * 2; sideIndices.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  const edge = new THREE.BufferGeometry();
  edge.setAttribute('position', new THREE.Float32BufferAttribute(sidePositions, 3));
  edge.setAttribute('uv', new THREE.Float32BufferAttribute(sideUv, 2)); edge.setIndex(sideIndices); edge.computeVertexNormals();
  mesh(edge, materials.soil);

  const water = mesh(new THREE.CylinderGeometry(1, 1, 0.11, 192), new THREE.MeshPhysicalMaterial({
    color: PALETTE.resin, roughness: MATERIAL.resinRoughness, metalness: 0,
    bumpMap: textures.water, bumpScale: MATERIAL.resinBump, roughnessMap: textures.water,
    transmission: MATERIAL.resinTransmission, thickness: 0.32, ior: 1.46,
    clearcoat: MATERIAL.resinClearcoat, clearcoatRoughness: 0.16, envMapIntensity: 0.9,
    attenuationColor: new THREE.Color('#568f81'), attenuationDistance: 2,
  }));
  water.scale.set(5.84, 1, 4.09); water.position.y = 0.793; water.castShadow = false;
  for (let i = 0; i < 22; i++) {
    const curve = new THREE.CatmullRomCurve3(Array.from({ length: 7 }, (_, j) => new THREE.Vector3((j / 6 - 0.5) * between(0.22, 0.48), 0, Math.sin(j / 6 * Math.PI) * 0.027)));
    const m = mesh(new THREE.TubeGeometry(curve, 16, 0.004, 4, false), new THREE.MeshStandardMaterial({ color: '#d0e3ce', transparent: true, opacity: 0.22, roughness: 0.24 }));
    m.castShadow = false;
    ripples.push({ mesh: m, phase: i / 22, offset: between(-0.47, 0.47) });
  }
}

export function buildBridge() {
  const bridge = new THREE.Group(); world.add(bridge); bridge.rotation.y = 0.55;
  const archY = x => 0.99 + 0.67 * (1 - (x / 1.68) ** 2);
  for (const z of [-0.48, 0.48]) {
    const shape = new THREE.Shape();
    shape.moveTo(-1.68, archY(-1.68));
    for (let i = 1; i <= 64; i++) { const x = -1.68 + i / 64 * 3.36; shape.lineTo(x, archY(x)); }
    for (let i = 64; i >= 0; i--) { const x = -1.68 + i / 64 * 3.36; shape.lineTo(x, archY(x) - 0.18); }
    shape.closePath();
    const rib = mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2, steps: 1 }), materials.wood, bridge);
    rib.position.z = z - 0.05;
    for (let i = 0; i < 8; i++) {
      const x = -1.6 + i / 7 * 3.2, y = archY(x);
      beam([x, y + 0.04, z], [x, y + 0.49, z], 0.029, materials.wood, bridge);
      const cap = mesh(new THREE.SphereGeometry(0.042, 10, 8), materials.cream, bridge); cap.position.set(x, y + 0.49, z);
    }
    for (const height of [0.27, 0.49]) {
      const path = new THREE.CatmullRomCurve3(Array.from({ length: 33 }, (_, i) => { const x = -1.66 + i / 32 * 3.32; return new THREE.Vector3(x, archY(x) + height, z); }));
      mesh(new THREE.TubeGeometry(path, 64, height > 0.3 ? 0.034 : 0.019, 8, false), materials.wood, bridge);
    }
  }
  for (let i = 0; i < 29; i++) {
    const x = -1.63 + i / 28 * 3.26;
    const plank = box(0.108, 0.065, between(1.04, 1.09), materials.wood, bridge, [x, archY(x) + 0.025, 0], 0.012);
    plank.rotation.z = Math.atan(-1.34 * x / 1.68 ** 2);
    for (const z of [-0.36, 0.36]) {
      const nail = mesh(new THREE.SphereGeometry(0.011, 6, 4), materials.dark, bridge);
      nail.position.set(x, archY(x) + 0.061, z); nail.scale.y = 0.3;
    }
  }
  for (const x of [-1.61, 1.61]) {
    const p = new THREE.Vector3(x, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.55);
    box(0.52, 0.18, 1.3, materials.stone, bridge, [x, 0.91, 0], 0.05);
    addPath([p.x, p.z], [x < 0 ? -3.0 : 2.5, x < 0 ? 0.2 : -0.72]);
  }
}

function addPath(from, to) {
  for (let i = 0; i < 13; i++) {
    const t = i / 12, x = THREE.MathUtils.lerp(from[0], to[0], t), z = THREE.MathUtils.lerp(from[1], to[1], t);
    if (bankDistance(x, z) < 0.79) continue;
    const slab = mesh(pebbleGeometry, materials.stone);
    slab.scale.set(0.23 + random() * 0.06, 0.035, 0.19 + random() * 0.05);
    slab.rotation.y = between(-0.3, 0.3); slab.position.set(x, groundY(x, z) + 0.015, z);
  }
}

function addWindow(parent, x, y, z, rotation = 0) {
  const frame = new THREE.Group(); parent.add(frame); frame.position.set(x, y, z); frame.rotation.y = rotation;
  box(0.36, 0.4, 0.045, materials.wood, frame, [0, 0, 0]);
  box(0.28, 0.31, 0.055, materials.dark, frame, [0, 0, 0.018]);
  box(0.025, 0.33, 0.028, materials.cream, frame, [0, 0, 0.052]);
  box(0.29, 0.023, 0.028, materials.cream, frame, [0, 0, 0.052]);
  box(0.43, 0.055, 0.12, materials.cream, frame, [0, -0.22, 0.02]);
  for (const side of [-1, 1]) {
    box(0.085, 0.37, 0.05, materials.slate, frame, [side * 0.24, 0, 0]);
    for (let i = 0; i < 4; i++) box(0.065, 0.012, 0.016, materials.wood, frame, [side * 0.24, -0.12 + i * 0.08, 0.028], 0.003);
  }
}

export function buildHouse(x, z, roofMaterial, angle, withSmoke) {
  const house = new THREE.Group(); world.add(house);
  house.position.set(x, groundY(x, z), z); house.rotation.y = angle;
  box(1.48, 0.13, 1.34, materials.stone, house, [0, 0.045, 0], 0.04);
  box(1.34, 1.02, 1.18, materials.cream, house, [0, 0.59, 0], 0.04);
  const gableShape = new THREE.Shape(); gableShape.moveTo(-0.67, 1.08); gableShape.lineTo(0.67, 1.08); gableShape.lineTo(0, 1.67); gableShape.closePath();
  const gable = mesh(new THREE.ExtrudeGeometry(gableShape, { depth: 1.18, bevelEnabled: false }), materials.cream, house); gable.position.z = -0.59;
  for (const side of [-1, 1]) {
    const roof = box(1.03, 0.11, 1.52, roofMaterial, house, [side * 0.385, 1.39, 0], 0.027);
    roof.rotation.z = -side * 0.7;
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 6; col++) {
        const tile = box(0.2, 0.026, 0.235, roofMaterial, roof, [-0.41 + row * 0.203, 0.064 + (col % 2) * 0.003, -0.63 + col * 0.252], 0.012);
        tile.rotation.y = between(-0.014, 0.014);
      }
    }
  }
  beam([0, 1.76, -0.77], [0, 1.76, 0.77], 0.055, roofMaterial, house);
  for (const xx of [-0.64, 0.64]) box(0.055, 0.99, 0.06, materials.wood, house, [xx, 0.61, 0.595]);
  for (let i = 0; i < 7; i++) box(1.24, 0.012, 0.016, materials.cream, house, [0, 0.22 + i * 0.116, 0.598], 0.002);
  box(0.33, 0.63, 0.06, materials.wood, house, [-0.29, 0.43, 0.62]);
  for (let i = 0; i < 3; i++) box(0.012, 0.53, 0.02, materials.bark, house, [-0.39 + i * 0.095, 0.43, 0.656], 0.002);
  const knob = mesh(new THREE.SphereGeometry(0.024, 10, 8), materials.cream, house); knob.position.set(-0.19, 0.43, 0.67);
  box(0.45, 0.075, 0.29, materials.stone, house, [-0.29, 0.065, 0.8]);
  addWindow(house, 0.31, 0.64, 0.61); addWindow(house, 0.68, 0.63, -0.03, Math.PI / 2);
  const round = mesh(new THREE.CylinderGeometry(0.105, 0.105, 0.025, 24), materials.wood, house);
  round.rotation.x = Math.PI / 2; round.position.set(0, 1.34, 0.606);
  const glass = mesh(new THREE.CircleGeometry(0.074, 24), materials.dark, house); glass.position.set(0, 1.34, 0.625);
  box(0.018, 0.15, 0.02, materials.cream, house, [0, 1.34, 0.636], 0.003);
  box(0.15, 0.018, 0.02, materials.cream, house, [0, 1.34, 0.636], 0.003);
  if (withSmoke) {
    box(0.25, 0.67, 0.27, materials.brick, house, [-0.36, 1.64, -0.31], 0.02);
    box(0.31, 0.09, 0.33, materials.stone, house, [-0.36, 2.0, -0.31], 0.02);
    box(0.17, 0.012, 0.19, materials.dark, house, [-0.36, 2.048, -0.31], 0.002);
    for (let i = 0; i < 7; i++) {
      const puff = mesh(softGeometry, new THREE.MeshStandardMaterial({ color: '#d7d6c9', transparent: true, opacity: 0.5, depthWrite: false, roughness: 1 }), house);
      puff.castShadow = false; smoke.push({ mesh: puff, phase: i / 7 });
    }
  }
  for (const xx of [-0.86, 0.85]) {
    const pot = mesh(new THREE.CylinderGeometry(0.11, 0.08, 0.15, 12), materials.brick, house); pot.position.set(xx, 0.075, 0.57);
    const shrub = mesh(softGeometry, materials.grass, house); shrub.position.set(xx, 0.21, 0.57); shrub.scale.set(0.16, 0.14, 0.15);
  }
  return house;
}

export function buildTree(x, z, size, conifer, phase) {
  const root = new THREE.Group(); world.add(root); root.position.set(x, groundY(x, z) - 0.02, z);
  const crown = new THREE.Group(); root.add(crown);
  const trunk = mesh(new THREE.CylinderGeometry(0.055 * size, 0.105 * size, 0.92 * size, 9), materials.bark, crown);
  trunk.position.y = 0.44 * size;
  const foliage = new THREE.MeshStandardMaterial({ color: tint(conifer ? '#526e50' : PALETTE.moss, between(0.86, 1.18)), map: textures.sponge, bumpMap: textures.sponge, bumpScale: MATERIAL.spongeBump, roughness: 1 });
  if (conifer) {
    for (let i = 0; i < 4; i++) {
      const radius = (0.56 - i * 0.105) * size;
      const profile = [[0, -0.37], [0.78, -0.37], [1, -0.31], [0.95, -0.23], [0.62, 0.04], [0.22, 0.32], [0, 0.43]].map(([r, y]) => new THREE.Vector2(r * radius, y * size));
      const cone = mesh(new THREE.LatheGeometry(profile, 28), foliage, crown);
      const p = cone.geometry.attributes.position;
      for (let j = 0; j < p.count; j++) {
        const xx = p.getX(j), zz = p.getZ(j), a = Math.atan2(zz, xx);
        const wobble = 1 + 0.055 * Math.sin(a * 7 + i) + 0.03 * Math.cos(a * 5);
        p.setXYZ(j, xx * wobble, p.getY(j), zz * wobble);
      }
      cone.geometry.computeVertexNormals(); cone.position.y = (0.95 + i * 0.33) * size;
    }
  } else {
    beam([0, 0.56 * size, 0], [-0.27 * size, 1.04 * size, 0.03], 0.035 * size, materials.bark, crown);
    beam([0, 0.63 * size, 0], [0.24 * size, 1.08 * size, -0.08], 0.033 * size, materials.bark, crown);
    for (let i = 0; i < 7; i++) {
      const a = i / 6 * TAU;
      const lobe = mesh(softGeometry, foliage, crown);
      lobe.position.set(i === 6 ? 0 : Math.cos(a) * 0.3 * size, (1.33 + (i === 6 ? 0.29 : 0.07 * Math.sin(a * 2))) * size, i === 6 ? 0 : Math.sin(a) * 0.29 * size);
      lobe.scale.set(0.43 * size, between(0.41, 0.56) * size, 0.43 * size);
    }
  }
  for (let i = 0; i < 3; i++) {
    const a = i / 3 * TAU;
    beam([0, 0.09, 0], [Math.cos(a) * 0.19 * size, 0.02, Math.sin(a) * 0.19 * size], 0.032 * size, materials.bark, root);
  }
  trees.push({ mesh: crown, phase, size });
}

export function buildBackdrop() {
  const shape = new THREE.Shape(); shape.moveTo(-4.25, 0.12); shape.lineTo(4.25, 0.12);
  for (let i = 0; i <= 80; i++) {
    const x = 4.25 - i / 80 * 8.5;
    shape.lineTo(x, 1.35 + 1.77 * Math.sqrt(Math.max(0, 1 - (x / 4.25) ** 2)));
  }
  shape.closePath();
  const sky = mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.075, bevelEnabled: true, bevelSize: 0.035, bevelThickness: 0.025, bevelSegments: 2 }), paint('#a9c9cd'));
  sky.position.z = -3.95;
  for (const x of [-3.25, 3.25]) box(0.24, 0.12, 0.54, materials.walnut, world, [x, 0.06, -3.9]);
  for (let layer = 0; layer < 2; layer++) {
    const hill = new THREE.Shape(); hill.moveTo(-4.1, 0.16); hill.lineTo(4.1, 0.16);
    for (let i = 0; i <= 80; i++) {
      const x = 4.1 - i / 80 * 8.2;
      hill.lineTo(x, 1.05 + (0.48 + 0.25 * Math.sin(x * 1.12 + layer * 2.1)) * Math.sin(i / 80 * Math.PI));
    }
    hill.closePath();
    const card = mesh(new THREE.ExtrudeGeometry(hill, { depth: 0.06, bevelEnabled: true, bevelSize: 0.025, bevelThickness: 0.02, bevelSegments: 2 }), paint(layer ? '#839367' : '#9aa77e'));
    card.position.z = -3.8 + layer * 0.12;
  }
  for (const [i, x, y, scale] of [[0, -2.85, 2.45, 0.76], [1, -0.6, 2.72, 0.88], [2, 1.95, 2.58, 0.7]]) {
    const cloud = new THREE.Group(); world.add(cloud); cloud.position.set(x, y, -3.57); cloud.scale.setScalar(scale);
    for (const [cx, cy, r] of [[-0.32, 0, 0.23], [0, 0.12, 0.33], [0.32, 0.015, 0.25]]) {
      const puff = mesh(softGeometry, materials.cotton, cloud); puff.position.set(cx, cy, 0); puff.scale.set(r, r * 0.76, r * 0.48);
    }
    beam([x, 0.2, -3.64], [x, y - 0.15 * scale, -3.64], 0.008, materials.wood);
    clouds.push({ mesh: cloud, x, y, phase: i / 3 });
  }
}

function buildFence(points) {
  for (let i = 0; i < points.length; i++) {
    const [x, z] = points[i], y = groundY(x, z);
    box(0.065, 0.37, 0.065, materials.wood, world, [x, y + 0.17, z], 0.012);
    if (!i) continue;
    const [px, pz] = points[i - 1];
    for (const h of [0.1, 0.27]) beam([px, groundY(px, pz) + h, pz], [x, y + h, z], 0.018, materials.wood);
  }
}

export function scatterDetails() {
  const dummy = new THREE.Object3D();
  const stones = [];
  for (let side of [-1, 1]) for (let i = 0; i < 65; i++) {
    const z = -3.9 + i / 64 * 7.8, x = riverX(z) + side * between(0.91, 1.15);
    if (!insideBase(x, z, 0.12)) continue;
    stones.push([x, groundY(x, z) + 0.018, z, between(0.065, 0.15)]);
  }
  const rockInstances = new THREE.InstancedMesh(pebbleGeometry, materials.stone, stones.length);
  rockInstances.castShadow = rockInstances.receiveShadow = true; world.add(rockInstances);
  stones.forEach(([x, y, z, s], i) => {
    dummy.position.set(x, y, z); dummy.scale.set(s * 1.5, s * 0.52, s); dummy.rotation.set(between(-0.25, 0.25), random() * TAU, 0); dummy.updateMatrix(); rockInstances.setMatrixAt(i, dummy.matrix);
    rockInstances.setColorAt(i, tint('#ffffff', between(0.76, 1.12)));
  });
  const blade = new THREE.BufferGeometry();
  blade.setAttribute('position', new THREE.Float32BufferAttribute([-0.013, 0, 0, 0.008, 0.085, 0.009, 0.013, 0, 0, 0, 0, -0.013, -0.006, 0.065, 0.014, 0, 0, 0.013], 3));
  blade.computeVertexNormals();
  const grassMaterial = new THREE.MeshStandardMaterial({ color: '#a0ad64', side: THREE.DoubleSide, roughness: 1 });
  const patches = [];
  for (let i = 0; i < 11000; i++) {
    const x = between(-5.7, 5.7), z = between(-4, 4);
    if (!insideBase(x, z, 0.14) || bankDistance(x, z) < 0.91) continue;
    if ((Math.abs(x + 3) < 0.95 && Math.abs(z + 0.55) < 0.9) || (Math.abs(x - 2.5) < 0.96 && Math.abs(z + 1.55) < 0.92)) continue;
    if ((z > -0.5 && z < 0.7 && x < -1) || (x > 1 && x < 2.9 && z > -0.8 && z < 0.05)) continue;
    patches.push([x, z]);
  }
  const flock = new THREE.InstancedMesh(blade, grassMaterial, patches.length); world.add(flock); flock.receiveShadow = true;
  patches.forEach(([x, z], i) => {
    const s = between(0.45, 1.2); dummy.position.set(x, groundY(x, z) - 0.005, z); dummy.rotation.set(0, random() * TAU, between(-0.12, 0.12)); dummy.scale.set(s, s * between(0.65, 1.1), s); dummy.updateMatrix(); flock.setMatrixAt(i, dummy.matrix);
    flock.setColorAt(i, tint('#ffffff', between(0.55, 1.2)));
  });
  const shrubMaterial = new THREE.MeshStandardMaterial({ color: '#6c804c', map: textures.sponge, bumpMap: textures.sponge, bumpScale: 0.04, roughness: 1 });
  for (const [x, z, s] of [[-4.9, 0.2, 0.32], [-4.2, 1.5, 0.3], [-2.3, 2.9, 0.29], [3.8, -0.7, 0.33], [4.5, 0.9, 0.28], [0.6, -2.3, 0.22], [2.7, 2.2, 0.25]]) {
    for (let j = 0; j < 3; j++) {
      const shrub = mesh(softGeometry, shrubMaterial); const sx = x + j * s * 0.8;
      shrub.position.set(sx, groundY(sx, z) + s * 0.35, z); shrub.scale.set(s, s * between(0.6, 0.9), s * 0.8);
    }
  }
  const flowerMaterial = paint('#d1b974');
  const flowers = [];
  for (let i = 0; i < 145; i++) {
    const x = between(-5.1, 5.1), z = between(-3.3, 3.3);
    if (!insideBase(x, z, 0.6) || bankDistance(x, z) < 1.2 || (Math.abs(x) > 2 && z < 0.4 && z > -2.5)) continue;
    flowers.push([x, z]);
  }
  const flowerHeads = new THREE.InstancedMesh(pebbleGeometry, flowerMaterial, flowers.length); world.add(flowerHeads);
  flowers.forEach(([x, z], i) => {
    dummy.position.set(x, groundY(x, z) + 0.1, z); dummy.rotation.set(0, i, 0); dummy.scale.set(0.032, 0.024, 0.032); dummy.updateMatrix(); flowerHeads.setMatrixAt(i, dummy.matrix);
  });
  buildFence(Array.from({ length: 8 }, (_, i) => [-4.55 + i * 0.38, 0.86 + 0.04 * Math.sin(i)]));
  buildFence(Array.from({ length: 7 }, (_, i) => [3.65 + 0.06 * Math.sin(i), -2.0 + i * 0.38]));
}

buildStudio(); buildBase(); buildBackdrop(); buildBridge();
buildHouse(-3, -0.65, materials.brick, 0.08, true);
buildHouse(2.5, -1.55, materials.slate, -0.14, false);
[
  [-4.35, -1.48, 1.07, false], [-4.05, 1.65, 0.78, false], [-2.5, -2.15, 0.92, true],
  [0.45, -2.22, 1.04, true], [3.8, -0.05, 0.94, false], [4.32, 1.52, 0.8, true], [-1.13, 2.58, 0.72, false],
].forEach(([x, z, size, conifer], i) => buildTree(x, z, size, conifer, i / 7));
scatterDetails();

const renderTarget = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: Math.min(RENDERING.samples, renderer.capabilities.maxSamples) });
const composer = new EffectComposer(renderer, renderTarget);
composer.addPass(new RenderPass(scene, camera));
const bokeh = new BokehPass(scene, camera, { focus: 28, aperture: CAMERA.aperture, maxblur: CAMERA.maxblur });
composer.addPass(bokeh);
const vignette = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, strength: { value: 0.14 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: 'uniform sampler2D tDiffuse; uniform float strength; varying vec2 vUv; void main(){ vec4 c=texture2D(tDiffuse,vUv); vec2 p=(vUv-0.5)*vec2(1.0,0.8); c.rgb*=1.0-strength*smoothstep(0.08,0.52,dot(p,p)); gl_FragColor=c; }',
});
composer.addPass(vignette);
composer.addPass(new OutputPass());
const smaa = new SMAAPass(1, 1); composer.addPass(smaa);

export function render(t) {
  const phase = TAU * t / DURATION;
  const angle = CAMERA.azimuth - Math.cos(phase) * THREE.MathUtils.degToRad(CAMERA.arcDegrees / 2);
  camera.position.set(Math.sin(angle) * CAMERA.radius, CAMERA.elevation, Math.cos(angle) * CAMERA.radius);
  camera.lookAt(target);
  bokeh.uniforms.focus.value = camera.position.distanceTo(focusPoint);
  textures.water.offset.set(0, t / DURATION);
  trees.forEach(({ mesh: crown, phase: offset }) => {
    crown.rotation.z = 0.017 * loop(t, 1, offset);
    crown.rotation.x = 0.009 * loop(t, 1, offset + 0.24);
  });
  clouds.forEach(({ mesh: cloud, x, y, phase: offset }) => {
    cloud.position.x = x + 0.065 * loop(t, 1, offset);
    cloud.position.y = y + 0.018 * loop(t, 1, offset + 0.25);
  });
  smoke.forEach(({ mesh: puff, phase: offset }) => {
    const p = saw(t, 1, offset), size = 0.065 + p * 0.13;
    puff.position.set(-0.36 + p * 0.21 + 0.025 * Math.sin(p * TAU), 2.08 + p * 0.8, -0.31);
    puff.scale.set(size, size * 1.1, size * 0.84);
    puff.material.opacity = Math.sin(p * Math.PI) ** 2 * 0.48;
  });
  ripples.forEach(({ mesh: ripple, phase: offset, offset: across }) => {
    const p = saw(t, 1, offset), z = -3.7 + p * 7.4;
    ripple.position.set(riverX(z) + across, 0.852 + 0.003 * Math.sin(phase + offset * TAU), z);
    ripple.rotation.y = -0.33 + 0.06 * Math.sin(phase + offset * TAU);
    ripple.material.opacity = Math.sin(p * Math.PI) ** 2 * 0.22;
  });
  composer.render(0);
}

function resize() {
  const { width, height } = stage.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, RENDERING.maxPixelRatio);
  renderer.setPixelRatio(dpr); renderer.setSize(width, height, false);
  composer.setPixelRatio(dpr); composer.setSize(width, height);
  camera.aspect = width / height; camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();
// 첫 캡처에서 SMAA 내장 데이터 이미지가 아직 디코딩되지 않는 경우를 막는다.
await Promise.all([smaa.areaTexture.image, smaa.searchTexture.image].map(img => img.decode()));
start(render);
