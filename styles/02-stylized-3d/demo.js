import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { start, TAU, DURATION } from '../../shared/runtime.js';

export const PALETTE = Object.freeze({
  grass: '#91b947', leaf: '#438654', stone: '#efd5a0',
  red: '#ca5e43', blue: '#397c91', water: '#46b7b5', sky: '#9dd7df',
});
export const MATERIAL = Object.freeze({ grass: .95, bark: .9, stone: .8, roof: .6, water: .15 });
export const LIGHTING = Object.freeze({ sun: '#fff0c9', sunPower: 3.0, sky: '#bce5f5', ground: '#899665', ambient: 1.85, shadowSize: 4096 });
export const CAMERA = Object.freeze({ fov: 36, radius: 36.6, azimuth: .26, arc: 7 * Math.PI / 180, height: 11.5, target: [0, 3.2, -2.5] });
export const RENDERING = Object.freeze({ maxPixelRatio: 2, exposure: 1.12, fogNear: 32, fogFar: 92 });

const stage = document.querySelector('#stage');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, RENDERING.maxPixelRatio));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = RENDERING.exposure;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
stage.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(PALETTE.sky);
scene.fog = new THREE.Fog('#bddfe0', RENDERING.fogNear, RENDERING.fogFar);
const camera = new THREE.PerspectiveCamera(CAMERA.fov, 16 / 9, .1, 260);
const sun = new THREE.DirectionalLight(LIGHTING.sun, LIGHTING.sunPower);
sun.position.set(-18, 29, 14);
sun.target.position.set(0, 0, -2);
sun.castShadow = true;
sun.shadow.mapSize.setScalar(LIGHTING.shadowSize);
Object.assign(sun.shadow.camera, { left: -27, right: 27, top: 25, bottom: -24, near: 1, far: 80 });
sun.shadow.normalBias = .035;
sun.shadow.bias = -.00012;
sun.shadow.camera.updateProjectionMatrix();
scene.add(sun, sun.target, new THREE.HemisphereLight(LIGHTING.sky, LIGHTING.ground, LIGHTING.ambient));
const rim = new THREE.DirectionalLight('#fff3d0', .65);
rim.position.set(10, 15, -25);
scene.add(rim);

let seed = 92031;
function random() {
  seed |= 0; seed = seed + 0x6d2b79f5 | 0;
  let r = Math.imul(seed ^ seed >>> 15, 1 | seed);
  r = r + Math.imul(r ^ r >>> 7, 61 | r) ^ r;
  return ((r ^ r >>> 14) >>> 0) / 4294967296;
}
const between = (a, b) => a + (b - a) * random();
const clamp = THREE.MathUtils.clamp;
const standard = (color, roughness = .8, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, ...extra });
const mats = {
  grass: standard(PALETTE.grass, MATERIAL.grass, { vertexColors: true }),
  leaf: standard(PALETTE.leaf, MATERIAL.grass),
  bark: standard('#79573b', MATERIAL.bark),
  stone: standard(PALETTE.stone, MATERIAL.stone),
  trim: standard('#fff0cb', .82),
  wall: standard('#f7dda5', .9),
  wood: standard('#826343', .9),
  glass: standard('#315d68', .24, { metalness: .1 }),
  red: standard(PALETTE.red, MATERIAL.roof),
  blue: standard(PALETTE.blue, MATERIAL.roof),
};
const sphere = new THREE.SphereGeometry(1, 24, 16);
function mesh(geometry, material, parent = scene, position = [0, 0, 0], scale = [1, 1, 1]) {
  const obj = new THREE.Mesh(geometry, material);
  obj.position.set(...position); obj.scale.set(...scale);
  obj.castShadow = true; obj.receiveShadow = true;
  parent.add(obj); return obj;
}
function rounded(size, material, parent, position, radius = .1) {
  return mesh(new RoundedBoxGeometry(...size, 3, radius), material, parent, position);
}
function ellipsoid(position, scale, material, parent = scene) {
  return mesh(sphere, material, parent, position, scale);
}
function tube(points, radius, material, parent = scene) {
  return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), Math.max(12, points.length * 4), radius, 8, false), material, parent);
}

export function riverCenter(z) { return .245 * z + 1.3 * Math.sin(z * .12); }
function riverWidth(z) { return 3.05 + .38 * Math.sin(z * .095 + .7); }
function shoreline(z, side) {
  let low=0,high=2.2;
  for(let i=0;i<18;i++) {
    const d=(low+high)/2,x=riverCenter(z)+side*(riverWidth(z)+d);
    if(groundHeight(x,z)<.12)low=d;else high=d;
  }
  return riverCenter(z)+side*(riverWidth(z)+(low+high)/2);
}
export function groundHeight(x, z) {
  const d = Math.abs(x - riverCenter(z)) - riverWidth(z);
  const rise = THREE.MathUtils.smoothstep(d, -.15, 2.2);
  const hills = (6.5 + 3.4 * Math.sin(x * .07 + .8) ** 2 + 1.7 * Math.sin(x * .19)) * Math.exp(-(((z + 43) / 13) ** 2));
  const mountains = (11 + 5 * Math.sin(x * .065 + 2) ** 2 + 2 * Math.cos(x * .14)) * Math.exp(-(((z + 74) / 15) ** 2));
  return -.48 + rise * (1.45 + .34 * Math.sin(x * .22 + z * .13) + .28 * Math.cos(z * .23)) + hills + mountains;
}
function makeTerrain() {
  const geo = new THREE.PlaneGeometry(160, 150, 320, 300);
  geo.rotateX(-Math.PI / 2); geo.translate(0, 0, -22);
  const pos = geo.attributes.position;
  const colors = [], c = new THREE.Color(), dry = new THREE.Color('#d4bb7c'), green = new THREE.Color(PALETTE.grass);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), d = Math.abs(x - riverCenter(z)) - riverWidth(z);
    pos.setY(i, groundHeight(x, z));
    c.copy(dry).lerp(green, THREE.MathUtils.smoothstep(d, .1, 1.35));
    c.lerp(new THREE.Color('#6f9e65'), .18 + .16 * Math.sin(x * .29 + z * .23) * Math.cos(z * .21));
    c.multiplyScalar(.96 + .025 * Math.sin(x * 1.3 + Math.sin(z)) + .025 * Math.cos(z * 1.7));
    colors.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); geo.computeVertexNormals();
  const land = mesh(geo, mats.grass); land.castShadow = false;
}
makeTerrain();

function makeSky() {
  mesh(new THREE.SphereGeometry(180, 48, 24), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { top: { value: new THREE.Color('#72c5ea') }, bottom: { value: new THREE.Color('#d8eee5') } },
    vertexShader: 'varying vec3 direction; void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'uniform vec3 top;uniform vec3 bottom;varying vec3 direction;void main(){float h=smoothstep(-.04,.28,normalize(direction).y);gl_FragColor=vec4(mix(bottom,top,h),1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}',
  })).castShadow = false;
}
makeSky();

const water = standard(PALETTE.water, MATERIAL.water, { metalness: .12 });
const waterTime = { value: 0 };
water.onBeforeCompile = shader => {
  shader.uniforms.uTime = waterTime;
  shader.vertexShader = 'varying vec3 waterPosition;\n' + shader.vertexShader;
  shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nwaterPosition=position;');
  shader.fragmentShader = 'uniform float uTime; varying vec3 waterPosition;\n' + shader.fragmentShader;
  shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
    float p=uTime*6.28318530718/5.;
    vec2 q=waterPosition.xz;
    float wave=sin(q.y*3.7-p*2.+sin(q.x*2.7+p)*.65);
    float wave2=sin(q.y*8.-p*3.+q.x*5.);
    float caustic=pow(max(0.,wave*.55+wave2*.45),12.);
    diffuseColor.rgb*=.94+.065*wave;
    float center=.245*q.y+1.3*sin(q.y*.12);
    float bank=pow(clamp(abs(q.x-center)/(3.95+.38*sin(q.y*.095+.7)),0.,1.),4.);
    diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.20,.49,.40),bank*.22);
    diffuseColor.rgb+=vec3(.06,.10,.08)*caustic;
  `);
  shader.fragmentShader = shader.fragmentShader.replace('#include <lights_fragment_end>', '#include <lights_fragment_end>\nreflectedLight.directSpecular *= .24;');
  shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
    normal=normalize(normal+vec3(.035*cos(waterPosition.x*2.7+uTime*6.28318530718/5.),.0,.055*cos(waterPosition.z*3.7-uTime*12.56637061436/5.)));
  `);
};
function makeRiver() {
  const verts = [], indices = [];
  for (let i = 0; i <= 420; i++) {
    const z = -97 + i * 150 / 420;
    for (let j = 0; j < 2; j++) verts.push(riverCenter(z) + (j * 2 - 1) * (riverWidth(z) + 1.3), .12, z);
    if (i < 420) { const a = i * 2; indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3)); geo.setIndex(indices); geo.computeVertexNormals();
  const obj = mesh(geo, water); obj.castShadow = false;
}
makeRiver();

const pathSamples=[];
function makePath(points, width) {
  const curve = new THREE.CatmullRomCurve3(points.map(([x,z]) => new THREE.Vector3(x,0,z)));
  const verts = [], indices = [];
  for (let i=0;i<=140;i++) {
    const p=curve.getPoint(i/140), tangent=curve.getTangent(i/140);
    if(i%3===0)pathSamples.push({x:p.x,z:p.z,r:width*.58});
    const side=new THREE.Vector3(-tangent.z,0,tangent.x).multiplyScalar(width/2*(1+.08*Math.sin(i*.3)));
    for (const sign of [-1,1]) { const x=p.x+side.x*sign,z=p.z+side.z*sign; verts.push(x,groundHeight(x,z)+.026,z); }
    if(i<140){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geo.setIndex(indices);geo.computeVertexNormals();
  const path=mesh(geo,standard('#dbc28b',.98));path.castShadow=false;
}
makePath([[-24,13],[-13,9],[-8,3],[-6,0]],1.7);
makePath([[-6,0],[-9,-3],[-10,-6]],1.5);
makePath([[6,0],[9,-2],[10,-6],[18,-12]],1.6);

function deckY(x) { return 3.1 - .82 * (x / 6) ** 2; }
export function makeBridge() {
  const group = new THREE.Group(); scene.add(group);
  const shape = new THREE.Shape(); shape.moveTo(-6,-.65); shape.lineTo(-6,deckY(-6));
  for (let i=1;i<=64;i++){const x=-6+12*i/64;shape.lineTo(x,deckY(x));}
  shape.lineTo(6,-.65);shape.lineTo(4.9,-.65);
  for(let i=0;i<=64;i++){const x=4.9-9.8*i/64;shape.lineTo(x,.22+2.12*Math.sqrt(Math.max(0,1-(x/4.9)**2)));}
  shape.lineTo(-4.9,-.65);shape.closePath();
  const geo=new THREE.ExtrudeGeometry(shape,{depth:2.65,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.075,bevelThickness:.075,curveSegments:48});
  mesh(geo,mats.stone,group,[0,0,-1.325]);
  const stoneVariants=Array.from({length:5},(_,i)=>standard(new THREE.Color(PALETTE.stone).multiplyScalar(.88+i*.035),.8));
  for(const z of [-1.435,1.435]) {
    for(let i=0;i<19;i++) {
      const a=i/19*Math.PI,b=(i+1)/19*Math.PI-.012;
      const block=new THREE.Shape();
      for(let j=0;j<=5;j++){const t=a+(b-a)*j/5;const x=4.9*Math.cos(t);block[j?'lineTo':'moveTo'](x,.22+2.12*Math.sin(t));}
      for(let j=5;j>=0;j--){const t=a+(b-a)*j/5;block.lineTo(5.35*Math.cos(t),.22+2.57*Math.sin(t));}block.closePath();
      mesh(new THREE.ExtrudeGeometry(block,{depth:.13,bevelEnabled:true,bevelSize:.035,bevelThickness:.025,bevelSegments:2}),stoneVariants[i%5],group,[0,0,z]);
    }
    for(let i=0;i<=10;i++) {
      const x=-5.85+i*1.17,y=deckY(x);
      rounded([.25,1.02,.3],mats.trim,group,[x,y+.51,z],.055);
      rounded([.38,.13,.4],mats.stone,group,[x,y+1.05,z],.04);
    }
    const rail=[];for(let i=0;i<=40;i++){const x=-6+12*i/40;rail.push([x,deckY(x)+.87,z]);}
    tube(rail,.105,mats.wood,group);
  }
  for(let i=0;i<25;i++) {
    const x=-5.85+i*.4875;
    const block=rounded([.46,.12,2.7],i%4===0?mats.trim:mats.stone,group,[x,deckY(x)+.04,0],.035);
    block.rotation.z=Math.atan(-1.64*x/36);
  }
  for(const sign of [-1,1]) {
    const x=sign*6.3;
    for(let i=0;i<7;i++) {
      const xx=x+sign*i*.55,top=2.25-i*.18;
      const bottom=Math.min(...[-.34,.34].flatMap(dx=>[-1.32,1.32].map(z=>groundHeight(xx+dx,z))))-.25;
      rounded([.64,Math.max(.2,top-bottom),2.58],stoneVariants[i%5],group,[xx,(top+bottom)/2,0],.05);
    }
  }
  for(const x of [-4.9,4.9])mesh(new THREE.CylinderGeometry(.46,.75,.95,8),mats.stone,group,[x,.02,1.35]);
  return group;
}
makeBridge();

const smoke = [];
function makeWindow(group,x,y,z,width=.75,height=.9) {
  rounded([width+.18,height+.18,.16],mats.trim,group,[x,y,z],.04);
  rounded([width,height,.09],mats.glass,group,[x,y,z+.095],.04);
  rounded([.065,height,.08],mats.trim,group,[x,y,z+.16],.015);
  rounded([width,.065,.08],mats.trim,group,[x,y,z+.16],.015);
  rounded([width+.35,.13,.32],mats.trim,group,[x,y-height/2-.11,z+.05],.035);
  for(const sign of [-1,1]) rounded([.22,height+.05,.09],mats.wood,group,[x+sign*(width/2+.22),y,z+.04],.03);
}
export function makeHouse(x,z,roofMaterial,rotation=0,scale=1) {
  const group=new THREE.Group(); group.position.set(x,groundHeight(x,z)-.02,z);group.rotation.y=rotation;group.scale.setScalar(scale);scene.add(group);
  rounded([4.2,.42,3.8],standard('#baab81',.9),group,[0,.17,0],.13);
  rounded([3.9,3.4,3.45],mats.wall,group,[0,1.95,0],.17);
  const gable=new THREE.Shape();gable.moveTo(-1.95,0);gable.lineTo(1.95,0);gable.lineTo(0,1.9);gable.closePath();
  mesh(new THREE.ExtrudeGeometry(gable,{depth:3.45,bevelEnabled:false}),mats.wall,group,[0,3.55,-1.725]);
  for(const side of [-1,1]) {
    const panel=rounded([2.9,.22,4.3],roofMaterial,group,[side*1.13,4.48,0],.09); panel.rotation.z=-side*.71;
    for(let j=0;j<11;j++) {
      const z=-2.02+j*.4;
      tube([[side*.02,5.48,z],[side*1.2,4.55,z],[side*2.26,3.58,z]],.045,roofMaterial,group);
    }
    for(let row=0;row<4;row++) {
      const xx=side*(.35+row*.53),yy=5.38-(.35+row*.53)*.86;
      const line=rounded([.075,.045,4.2],roofMaterial,group,[xx,yy,0],.015);line.rotation.z=-side*.71;
    }
  }
  tube([[0,5.55,-2.17],[0,5.57,0],[0,5.55,2.17]],.14,roofMaterial,group);
  makeWindow(group,-1.05,2.27,1.76,.77,1.02); makeWindow(group,1.05,2.27,1.76,.77,1.02);
  rounded([.98,1.8,.15],mats.trim,group,[0,1.27,1.77],.09);
  rounded([.77,1.63,.12],mats.wood,group,[0,1.22,1.88],.075);
  ellipsoid([.23,1.2,1.97],[.06,.06,.04],mats.stone,group);
  ellipsoid([0,4.02,1.77],[.38,.38,.09],mats.trim,group);
  ellipsoid([0,4.02,1.85],[.27,.27,.055],mats.glass,group);
  rounded([.06,.5,.07],mats.trim,group,[0,4.02,1.92],.015);
  rounded([.5,.06,.07],mats.trim,group,[0,4.02,1.92],.015);
  for(const sign of [-1,1]) {
    rounded([.16,2.96,.13],mats.trim,group,[sign*1.85,1.95,1.75],.03);
    const sideWindow=new THREE.Group();sideWindow.position.set(sign*1.98,2.25,0);sideWindow.rotation.y=sign*Math.PI/2;group.add(sideWindow);makeWindow(sideWindow,0,0,0,.8,1.0);
  }
  for(let i=0;i<3;i++)rounded([1.45+i*.2,.15,.5],mats.stone,group,[0,.32-i*.09,2.02+i*.34],.04);
  rounded([1.25,.36,.38],mats.wood,group,[-1.05,1.52,2.02],.06);
  for(let i=0;i<8;i++)ellipsoid([-1.54+i*.14,1.81+Math.sin(i*2)*.04,2.02],[.13,.12,.13],i%2?mats.leaf:standard('#eebd60',.85),group);
  rounded([.65,1.75,.7],mats.red,group,[.95,4.9,-.8],.08);
  rounded([.88,.22,.9],mats.trim,group,[.95,5.82,-.8],.06);
  if(roofMaterial===mats.red) {
    group.updateMatrixWorld(true);
    const cloudMat=standard('#f5eedb',1,{transparent:true,opacity:.6,depthWrite:false});
    for(let i=0;i<7;i++) {
      const puff=ellipsoid([0,0,0],[1,1,1],cloudMat.clone());puff.castShadow=false;
      smoke.push({obj:puff,origin:new THREE.Vector3(.95,5.98,-.8).applyMatrix4(group.matrixWorld),phase:i/7});
    }
  }
  return group;
}
makeHouse(-9.1,-6.7,mats.red,-.06,1.04);
makeHouse(9.3,-5.8,mats.blue,-.22,.95);

const trees = [];
export function makeTree(x,z,height,conifer=false) {
  const root=new THREE.Group();root.position.set(x,groundHeight(x,z)-.05,z);scene.add(root);
  mesh(new THREE.CylinderGeometry(.16,.28,height*.62,10),mats.bark,root,[0,height*.3,0]);
  const crown=new THREE.Group();crown.position.y=height*.37;root.add(crown);
  if(conifer) {
    for(let i=0;i<4;i++) {
      const r=height*(.24-i*.037),h=height*.43;
      const profile=[[0,0],[r*.72,0],[r*.95,.07],[r,.17],[r*.92,.29],[r*.72,h*.36],[r*.43,h*.65],[r*.12,h*.92],[0,h]].map(p=>new THREE.Vector2(...p));
      const cone=mesh(new THREE.LatheGeometry(profile,28),standard(i%2?'#639960':'#468260',.95),crown,[0,height*(-.06+i*.16),0]);
      cone.scale.z=.87;
    }
  } else {
    tube([[0,0,0],[-.55,height*.22,.1],[-.8,height*.38,.1]],.11,mats.bark,crown);
    tube([[0,.1,0],[.55,height*.26,-.1],[.7,height*.43,-.1]],.11,mats.bark,crown);
    for(let i=0;i<9;i++) {
      const a=i*2.4,r=i===8?0:height*.21;
      const leafColor=new THREE.Color(PALETTE.leaf).lerp(new THREE.Color('#bad05c'),.18+random()*.35);
      ellipsoid([Math.cos(a)*r,height*(.37+.12*Math.sin(i*2.1)),Math.sin(a)*r*.8],[height*.245,height*.24,height*.22],standard(leafColor,.95),crown);
    }
  }
  trees.push({crown,phase:random()*TAU});
}
[[-15.2,3.5,6.6,false],[-14,-9.2,6.2,false],[-13,-20,7,true],[5.8,-15.7,7.5,true],[14.4,-9.7,6.7,false],[15.2,2.8,6.0,false],[19,-16.3,8.2,true]].forEach(args=>makeTree(...args));

function makeFence(points) {
  for(let i=0;i<points.length;i++) {
    const [x,z]=points[i],y=groundHeight(x,z);
    rounded([.15,1.03,.15],mats.wood,scene,[x,y+.48,z],.03);
    if(i){const [a,b]=points[i-1];for(const h of [.36,.75])tube([[a,groundHeight(a,b)+h,b],[x,y+h,z]],.065,mats.trim);}
  }
}
makeFence([[-17,-5],[-15.6,-4.6],[-14.2,-4.2],[-12.8,-3.8]]);
makeFence([[12.5,-3.2],[13.8,-3],[15.1,-2.7],[16.4,-2.4],[17.7,-2]]);

const clouds=[];
for(const [x,y,z,s] of [[-23,12,-32,1.3],[-7,15,-44,1.4],[15,13,-37,1.3],[25,16,-62,1.5]]) {
  const group=new THREE.Group();group.position.set(x,y,z);scene.add(group);
  const mat=standard('#fff7e7',1);
  for(const [a,b,c,r] of [[-2.2,0,0,.9],[-1,.45,.1,1.15],[.1,.95,-.1,1.45],[1.5,.3,0,1.15],[2.4,.1,.2,.8],[0,-.2,.35,1.1]]) {
    const p=ellipsoid([a*s,b*s,c*s],[r*s,r*s*.76,r*s*.85],mat,group);p.castShadow=false;
  }
  clouds.push({group,x,y,phase:random()*TAU});
}

function instanceBatch(geometry,material,count,placements) {
  const obj=new THREE.InstancedMesh(geometry,material,count),dummy=new THREE.Object3D();
  const color=new THREE.Color();
  for(let i=0;i<count;i++) {
    const p=placements(i);dummy.position.set(...p.position);dummy.rotation.set(...(p.rotation||[0,0,0]));dummy.scale.set(...p.scale);dummy.updateMatrix();obj.setMatrixAt(i,dummy.matrix);
    color.setRGB(1,1,1).multiplyScalar(p.shade??between(.88,1.12));obj.setColorAt(i,color);
  }
  obj.castShadow=true;obj.receiveShadow=true;scene.add(obj);return obj;
}
function landPoint() {
  for(let attempt=0;attempt<1000;attempt++) {
    const x=between(-27,27),z=between(-23,21),d=Math.abs(x-riverCenter(z))-riverWidth(z);
    if(d<1.0||Math.abs(z)<2.2&&Math.abs(x)<11||Math.hypot(x+9.1,z+6.7)<3.2||Math.hypot(x-9.3,z+5.8)<3.1)continue;
    if(pathSamples.some(p=>(x-p.x)**2+(z-p.z)**2<p.r*p.r))continue;
    return [x,groundHeight(x,z)-.015,z];
  }
  throw new Error('식생을 배치할 지면을 찾지 못했습니다.');
}
const grassGeo=new THREE.BufferGeometry();
const blades=[];
for(let i=0;i<4;i++) {
  const a=i*2.4,w=.035,h=.32+i*.025,dx=Math.cos(a)*w,dz=Math.sin(a)*w,bx=Math.sin(a)*.09,bz=Math.cos(a)*.09;
  const l=[-dx,0,-dz],r=[dx,0,dz],ml=[bx-dx*.65,h*.62,bz-dz*.65],mr=[bx+dx*.65,h*.62,bz+dz*.65],tip=[bx*1.8,h,bz*1.8];
  blades.push(...l,...r,...ml,...r,...mr,...ml,...ml,...mr,...tip);
}
grassGeo.setAttribute('position',new THREE.Float32BufferAttribute(blades,3));grassGeo.computeVertexNormals();
const grassMaterial=standard('#7d9f41',.95,{side:THREE.DoubleSide});
instanceBatch(grassGeo,grassMaterial,2400,()=>({position:landPoint(),rotation:[0,between(0,TAU),0],scale:[between(.8,1.8),between(.65,1.5),between(.8,1.8)]}));
const flowerPoints=Array.from({length:300},()=>{const p=landPoint();return {p,s:between(.7,1.15)};});
instanceBatch(new THREE.CylinderGeometry(.018,.022,.4,5),mats.leaf,flowerPoints.length,i=>({position:[flowerPoints[i].p[0],flowerPoints[i].p[1]+.2,flowerPoints[i].p[2]],scale:[1,flowerPoints[i].s,1]}));
const petalGeo=new THREE.SphereGeometry(1,7,5);
for(const [offset,col] of [[0,'#fff0b5'],[1,'#e6ba54']]) {
  const picks=flowerPoints.filter((_,i)=>i%2===offset);
  instanceBatch(petalGeo,standard(col,.85),picks.length*5,i=>{const f=picks[Math.floor(i/5)],a=i%5*TAU/5;return {position:[f.p[0]+Math.cos(a)*.09,f.p[1]+.4*f.s,f.p[2]+Math.sin(a)*.09],scale:[.11,.055,.11]};});
}
instanceBatch(new THREE.IcosahedronGeometry(1,1),standard('#b4b398',.8),240,()=>{
  const z=between(-24,22),side=random()<.5?-1:1,x=riverCenter(z)+side*(riverWidth(z)+between(.25,1.2)),s=between(.07,.24);
  return {position:[x,groundHeight(x,z)+s*.3,z],rotation:[random(),random()*TAU,random()],scale:[s*1.4,s*.75,s]};
});
for(const [x,z,s] of [[-9,10,1.0],[-12,12,.65],[13.8,10,.9],[17,7,1.2],[-17,-2,.7]]) {
  const y=groundHeight(x,z);
  const rock=mesh(new THREE.IcosahedronGeometry(1,2),standard('#a7ac92',.8),scene,[x,y+.25*s,z],[s,s*.63,s*.8]);rock.rotation.y=x;
  for(let j=0;j<4;j++)ellipsoid([x+between(-1,1)*s,y+.2,z+between(-1,1)*s],[.46,.35,.42],mats.leaf);
}

const foamMat=standard('#e1efcf',.65,{transparent:true,opacity:.72,depthWrite:false});
const bankFoamMat=foamMat.clone();bankFoamMat.side=THREE.DoubleSide;
bankFoamMat.onBeforeCompile=shader=>{
  shader.uniforms.uTime=waterTime;
  shader.vertexShader='varying vec2 foamUV;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nfoamUV=uv;');
  shader.fragmentShader='uniform float uTime; varying vec2 foamUV;\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
    float phase=uTime*6.28318530718/5.;
    float broken=sin(foamUV.y*2.4+sin(foamUV.y*3.7+phase)*.5)+.45*sin(foamUV.y*7.2-phase);
    diffuseColor.a*=smoothstep(-.15,.65,broken)*pow(max(0.,1.-abs(foamUV.x*2.-1.)),.7)*.7;
  `);
}
for(const side of [-1,1]) {
  const verts=[],uv=[],idx=[];
  for(let i=0;i<=300;i++) {
    const z=-27+i*.2,x=shoreline(z,side);
    for(const edge of [0,1]){verts.push(x-side*(.01+edge*.18),.137,z);uv.push(edge,z);}
    if(i<300){const a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2);}
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(idx);geo.computeVertexNormals();
  const obj=mesh(geo,bankFoamMat);obj.castShadow=false;
}
for(const side of [-1,1])for(let i=0;i<3;i++) {
  const x=shoreline(1.8,side),curve=[];
  for(let j=0;j<=18;j++){const a=-Math.PI/2+j/18*Math.PI;curve.push([x-side*Math.cos(a)*(.16+i*.12),.145,1.8+Math.sin(a)*(.3+i*.12)]);}
  const obj=tube(curve,.022,foamMat);obj.castShadow=false;
}
const sparkles=[];
for(let i=0;i<45;i++) {
  const z=between(-20,24),x=riverCenter(z)+between(-.8,.8)*riverWidth(z);
  const obj=mesh(new THREE.PlaneGeometry(.07,.23),new THREE.MeshBasicMaterial({color:'#fff5c9',transparent:true,opacity:1,depthWrite:false}),scene,[x,.16,z]);obj.rotation.x=-Math.PI/2;obj.castShadow=false;
  sparkles.push({obj,phase:random()*TAU});
}
const pollen=[];
for(let i=0;i<26;i++) {
  const p=landPoint();p[1]+=between(.5,3);
  const obj=ellipsoid(p,[.025,.025,.025],standard('#fff0b8',.7,{emissive:'#9a7b38',emissiveIntensity:.15}));obj.castShadow=false;
  pollen.push({obj,base:p,phase:random()*TAU});
}

export function render(t) {
  const phase=t/DURATION*TAU;
  const eased=(1-Math.cos(phase))*.5;
  const angle=CAMERA.azimuth+CAMERA.arc*(eased-.5);
  camera.position.set(Math.sin(angle)*CAMERA.radius,CAMERA.height+.22*Math.sin(phase),Math.cos(angle)*CAMERA.radius);
  camera.lookAt(...CAMERA.target);
  waterTime.value=t;
  for(const {crown,phase:p} of trees){crown.rotation.z=.025*Math.sin(phase+p);crown.rotation.x=.012*Math.sin(phase+p+.8);}
  for(const {group,x,y,phase:p} of clouds){group.position.x=x+.55*Math.sin(phase+p);group.position.y=y+.10*Math.sin(phase+p);}
  for(const {obj,origin,phase:p} of smoke){
    const u=(t/DURATION+p)%1,s=.18+.48*u;
    obj.position.set(origin.x+.85*u+.18*Math.sin(phase+p*TAU),origin.y+2.6*u,origin.z+.22*Math.sin(u*TAU));
    obj.scale.set(s,s*.85,s);obj.material.opacity=.43*Math.sin(Math.PI*u)**2;
  }
  for(const {obj,phase:p} of sparkles){const s=.2+.8*Math.max(0,Math.sin(phase*2+p))**8;obj.scale.set(s,s,1);obj.material.opacity=.7*s;}
  for(const {obj,base,phase:p} of pollen)obj.position.set(base[0]+.25*Math.sin(phase+p),base[1]+.18*Math.cos(phase+p),base[2]+.2*Math.sin(phase+p+.8));
  renderer.render(scene,camera);
}
function resize() {
  renderer.setSize(stage.clientWidth,stage.clientHeight,false);
  camera.aspect=16/9;camera.updateProjectionMatrix();
}
window.addEventListener('resize',resize);resize();
start(render);
