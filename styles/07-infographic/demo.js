import { start, DURATION, TAU, loop, smooth } from '../../shared/runtime.js';

export const PALETTE = Object.freeze({
  paper: '#F4F1EA', white: '#FFFCF5', ink: '#243D4B',
  orange: '#D36337', teal: '#68AAA9', green: '#7B9474', meadow: '#DCE4D5',
});
export const MATERIAL = Object.freeze({ outline: 3, detail: 2, grid: 40, gridOpacity: 0.045 });
export const LIGHTING = Object.freeze({ shadows: false, bankOpacity: 0.38 });
export const CAMERA = Object.freeze({ center: [960, 540], zoom: 0.005, shift: [4, 2.5] });
export const TYPE = Object.freeze({ title: 58, label: 28, value: 36, caption: 24 });

const svg = document.querySelector('#stage');
const p = PALETTE;
const river = 'M355 425 C420 510 633 470 710 540 C790 615 712 700 887 770 C1050 838 1190 824 1325 913 L1380 775 C1245 680 1122 714 1010 660 C915 612 936 525 840 475 C722 411 529 460 482 394 Z';
const trees = [
  [174, 645, 'round', 1.02], [290, 755, 'pine', 1.05], [507, 723, 'round', 0.95],
  [570, 461, 'pine', 0.72], [1088, 458, 'round', 0.78],
  [1338, 560, 'pine', 0.8], [425, 880, 'round', 0.86],
];
const targets = [
  { key: 'bridge', cx: 914, cy: 651, rx: 240, ry: 103 },
  { key: 'river', cx: 1100, cy: 783, rx: 148, ry: 77 },
  { key: 'homes', cx: 393, cy: 556, rx: 110, ry: 102 },
  { key: 'trees', cx: 507, cy: 670, rx: 77, ry: 91 },
];

function text(x, y, value, size = TYPE.label, extra = '') {
  return `<text x="${x}" y="${y}" font-size="${size}" ${extra}>${value}</text>`;
}

function tree(x, y, kind, scale, i) {
  const crown = kind === 'pine'
    ? `<path d="M0 -137 L-30 -88 H-20 L-44 -44 H-28 L-51 -10 H51 L28 -44 H44 L20 -88 H30 Z" fill="${p.green}"/><path d="M0 -120 V-13 M0 -69 L-18 -51 M0 -46 L22 -27" fill="none" stroke="${p.white}" stroke-opacity=".35"/>`
    : `<path d="M-40 -40 C-66 -46 -61 -83 -42 -91 C-49 -122 -13 -143 9 -125 C34 -140 62 -116 53 -94 C78 -72 60 -36 35 -34 C12 -15 -21 -17 -40 -40Z" fill="${p.green}"/><path d="M0 -25 V-100 M0 -57 L-24 -77 M0 -69 L25 -91" stroke="${p.white}" stroke-opacity=".4" fill="none"/>`;
  return `<g data-tree="${i}" transform="translate(${x} ${y}) scale(${scale})"><path d="M-24 3 H24" stroke="${p.green}" stroke-opacity=".5" stroke-width="4"/><path d="M0 0 V-61" stroke="${p.ink}" stroke-width="7"/><g id="crown-${i}">${crown}</g></g>`;
}

function house(x, y, color, chimney = false) {
  return `<g transform="translate(${x} ${y})" stroke="${p.ink}" stroke-width="${MATERIAL.outline}" stroke-linejoin="round">
    <path d="M-76 77 H84" stroke-opacity=".24"/>
    <path d="M-61 -28 H64 V75 H-61Z" fill="${p.white}"/>
    ${chimney ? `<path d="M30 -58 V-96 H47 V-47" fill="${p.white}"/><path d="M25 -97 H52"/>` : ''}
    <path d="M-82 -26 L0 -94 L85 -26Z" fill="${color}"/>
    <path d="M-62 -21 H64" stroke-opacity=".2"/>
    <path d="M-40 0 H-12 V28 H-40Z M24 0 H51 V28 H24Z" fill="${p.teal}" fill-opacity=".3"/>
    <path d="M-26 0 V28 M-40 14 H-12 M37.5 0 V28 M24 14 H51" stroke-width="${MATERIAL.detail}"/>
    <path d="M-5 35 H19 V75 H-5Z" fill="${p.meadow}"/><circle cx="12" cy="56" r="2" fill="${p.ink}" stroke="none"/>
    <path d="M-12 79 H26 M-17 86 H31" stroke-width="3"/>
  </g>`;
}

function bridge() {
  return `<g id="bridge-art" stroke="${p.ink}" stroke-width="${MATERIAL.outline}" stroke-linejoin="round">
    <path d="M1057 700 L1139 689 L1160 713 L1081 726Z" fill="${p.meadow}" stroke="none"/>
    <path d="M672 720 C696 708 714 702 737 702 M1074 715 L1140 701" fill="none" stroke="${p.green}" stroke-width="8"/>
    <path d="M708 602 H1116 V716 H1075 C1057 620 778 620 749 716 H708Z" fill="${p.white}"/>
    <path d="M708 602 H1116 V622 H708Z" fill="${p.orange}"/>
    <path d="M694 600 H1130 M702 564 H1122" fill="none" stroke-width="5"/>
    ${Array.from({ length: 12 }, (_, i) => `<path d="M${711 + i * 36} 565 V599"/>`).join('')}
    <path d="M718 642 H756 M718 675 H743 M1075 642 H1106 M1084 676 H1106 M794 647 L805 666 M843 635 L849 653 M909 631 V649 M975 638 L969 657 M1027 652 L1017 671" stroke-opacity=".45" stroke-width="2"/>
    <path d="M701 718 H755 M1070 718 H1123" stroke-width="5"/>
  </g>`;
}

function label(key, x, y, markup) {
  return `<g id="label-${key}" transform="translate(${x} ${y})"><g class="label-content">${markup}</g></g>`;
}

function buildScene() {
  svg.innerHTML += `<defs>
    <pattern id="grid" width="${MATERIAL.grid}" height="${MATERIAL.grid}" patternUnits="userSpaceOnUse"><path d="M40 0 H0 V40" fill="none" stroke="${p.ink}" stroke-opacity="${MATERIAL.gridOpacity}" stroke-width="1"/></pattern>
    <clipPath id="land-clip"><path d="M84 469 Q240 420 415 454 T774 449 Q1015 416 1376 467 V916 H84Z"/></clipPath>
    <clipPath id="river-clip"><path d="${river}"/></clipPath>
    <marker id="flow-tip" viewBox="0 0 12 12" refX="9" refY="6" markerWidth="9" markerHeight="9" orient="auto"><path d="M2 2 L8 6 L2 10" fill="none" stroke="${p.ink}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></marker>
    <style>
      text { font-family: "Pretendard", "Malgun Gothic", "Apple SD Gothic Neo", system-ui, sans-serif; fill: ${p.ink}; letter-spacing: -.7px; }
      .caption { fill-opacity: .67; letter-spacing: -.3px; }
      .value { fill: ${p.orange}; font-weight: 800; font-variant-numeric: tabular-nums; }
      .leader { fill: none; stroke: ${p.ink}; stroke-width: 2; stroke-opacity: .48; stroke-linecap: round; stroke-linejoin: round; }
      .dimension { fill: none; stroke: ${p.ink}; stroke-width: 2; }
    </style>
  </defs>
  <rect width="1920" height="1080" fill="${p.paper}"/>
  <rect width="1920" height="1080" fill="url(#grid)"/>
  <g id="camera">
    <g id="heading">
      <path d="M88 70 H100 V94 H88Z" fill="${p.orange}"/>
      ${text(116, 91, '우리 동네를 읽는 작은 지도', TYPE.caption, 'font-weight="600"')}
      ${text(84, 177, '강 마을 한눈에 보기', TYPE.title, 'font-weight="800" letter-spacing="-2"')}
      ${text(1832, 91, '가상의 마을 · 예시 데이터', TYPE.caption, 'text-anchor="end" class="caption"')}
      ${text(1832, 168, '공간을 읽고, 숫자로 이해하기', TYPE.label, 'text-anchor="end"')}
      <path d="M88 221 H1832" stroke="${p.ink}" stroke-width="2"/>
    </g>

    <g id="landscape">
      <path d="M88 448 Q220 352 385 426 Q555 327 744 433 Q906 357 1081 424 Q1250 360 1376 447 V495 H88Z" fill="${p.green}" fill-opacity=".11"/>
      <path d="M88 474 Q302 397 510 463 Q707 390 883 466 Q1125 404 1376 468 V525 H88Z" fill="${p.green}" fill-opacity=".16"/>
      ${[[210, 318, 1], [570, 281, 0.78], [1149, 290, 0.85]].map(([x, y, s], i) => `<g transform="translate(${x} ${y}) scale(${s})"><path id="cloud-${i}" d="M-51 12 C-78 12 -79 -18 -53 -19 C-48 -52 -3 -56 8 -29 C33 -44 61 -25 55 -5 C86 -3 81 21 58 21 H-51Z" fill="${p.white}" stroke="${p.ink}" stroke-opacity=".13" stroke-width="2"/></g>`).join('')}
      <g clip-path="url(#land-clip)">
        <path d="M84 469 Q240 420 415 454 T774 449 Q1015 416 1376 467 V916 H84Z" fill="${p.meadow}"/>
        <path d="M84 785 Q328 710 544 796 Q739 867 975 847 T1376 862 V916 H84Z" fill="${p.green}" fill-opacity=".12"/>
        <path d="M392 629 Q466 683 554 652 T718 647 M1110 649 Q1153 651 1218 635" fill="none" stroke="${p.paper}" stroke-width="32"/>
        <path d="M392 629 Q466 683 554 652 T718 647 M1110 649 Q1153 651 1218 635" fill="none" stroke="${p.ink}" stroke-opacity=".15" stroke-width="2" stroke-dasharray="3 10"/>
        <path d="${river}" fill="${p.teal}" fill-opacity=".56" stroke="${p.green}" stroke-opacity="${LIGHTING.bankOpacity}" stroke-width="10"/>
        <path d="${river}" fill="none" stroke="${p.white}" stroke-opacity=".65" stroke-width="2"/>
        <g id="water-lines" clip-path="url(#river-clip)" fill="none" stroke="${p.white}" stroke-width="3" stroke-linecap="round">
          ${Array.from({ length: 11 }, (_, i) => `<path id="wave-${i}" d="M${405 + i * 79} ${468 + i * 35} q18 -8 38 0 t38 0"/>`).join('')}
        </g>
        <path id="flow" d="M851 702 C888 737 936 752 1002 765" fill="none" stroke="${p.ink}" stroke-width="3" stroke-dasharray="9 12" marker-end="url(#flow-tip)"/>
        ${text(845, 815, '강 흐름', TYPE.caption, 'transform="rotate(19 845 815)"')}
        ${[[128, 724], [220, 825], [430, 825], [591, 555], [649, 754], [1198, 472], [1333, 723], [900, 874], [115, 530]].map(([x, y]) => `<path d="M${x - 10} ${y} l-4 -10 m14 10 v-16 m7 16 l5 -11" fill="none" stroke="${p.green}" stroke-width="2" stroke-linecap="round"/>`).join('')}
        ${[[608, 738, 14], [666, 716, 11], [1129, 674, 13], [1160, 685, 8], [409, 470, 9], [1339, 869, 12]].map(([x, y, r]) => `<path d="M${x - r} ${y} q0 ${-r} ${r} ${-r} q${r} 0 ${r + 4} ${r}Z" fill="${p.paper}" stroke="${p.ink}" stroke-opacity=".25" stroke-width="2"/>`).join('')}
      </g>
      <g fill="none" stroke="${p.green}" stroke-width="3" stroke-linecap="round"><path d="M152 697 H237 M152 716 H237 M161 687 V727 M193 687 V727 M227 687 V727 M1135 520 H1190 M1135 540 H1190 M1142 510 V551 M1178 510 V551"/></g>
      ${trees.slice(3, 5).map((v, i) => tree(...v, i + 3)).join('')}
      ${house(392, 550, p.orange, true)}
      <g id="smoke" fill="none" stroke="${p.ink}" stroke-opacity=".25" stroke-width="3" stroke-linecap="round"><path id="smoke-0" d="M432 440 C416 425 448 417 433 400"/><path id="smoke-1" d="M439 410 C425 397 448 387 439 372"/></g>
      ${house(1210, 556, p.ink)}
      ${bridge()}
      ${[0, 1, 2, 5, 6].map(i => tree(...trees[i], i)).join('')}
      <path d="M84 916 H1376" stroke="${p.ink}" stroke-opacity=".2" stroke-width="2"/>
    </g>

    <g id="annotations">
      <g class="dimension"><path d="M710 516 H844 M982 516 H1116 M710 505 V535 M1116 505 V535"/><path d="M710 539 V552 M1116 539 V552" stroke-opacity=".4"/></g>
      <g id="bridge-number">${text(913, 528, '24 m', TYPE.value, 'text-anchor="middle" class="value"')}</g>
      <path class="leader" d="M916 392 V482"/><circle cx="916" cy="482" r="4" fill="${p.orange}"/>
      ${label('bridge', 916, 332, `${text(0, 0, '아치 다리', TYPE.label, 'text-anchor="middle" font-weight="700"')}${text(0, 36, '두 강둑을 잇는 길', TYPE.caption, 'text-anchor="middle" class="caption"')}`)}
      <g class="dimension"><path d="M1117 855 L1177 730 M1104 849 L1130 861 M1164 724 L1190 736"/></g>
      ${label('river', 1147, 793, `<rect x="-60" y="-33" width="120" height="65" rx="3" fill="${p.paper}"/><rect x="87" y="-100" width="90" height="45" rx="3" fill="${p.paper}"/>${text(0, 12, '18 m', TYPE.value, 'text-anchor="middle" class="value"')}${text(97, -63, '강 폭', TYPE.label, 'font-weight="700"')}`)}
      <path class="leader" d="M172 414 V455 H305 L329 481"/><circle cx="329" cy="481" r="4" fill="${p.orange}"/>
      ${label('homes', 172, 394, `${text(0, 0, '집 A', TYPE.label, 'font-weight="700"')}`)}
      <path class="leader" d="M1278 414 V451 L1244 481"/><circle cx="1244" cy="481" r="4" fill="${p.ink}"/>
      <g id="home-b-label">${text(1278, 394, '집 B', TYPE.label, 'text-anchor="middle" font-weight="700"')}</g>
      <path class="leader" d="M541 729 L575 775 V810"/><circle cx="541" cy="729" r="4" fill="${p.green}"/>
      ${label('trees', 594, 860, `${text(0, -10, '나무', TYPE.label, 'font-weight="700"')}${text(77, -10, '7그루', TYPE.value, 'class="value"')}${text(0, 27, '활엽수 4 · 침엽수 3', TYPE.caption, 'class="caption"')}`)}
      <g id="focus-rings" fill="none" stroke="${p.orange}" stroke-width="2.5">
        ${targets.map((o, i) => `<ellipse id="focus-${i}" cx="${o.cx}" cy="${o.cy}" rx="${o.rx}" ry="${o.ry}"/>`).join('')}
        <ellipse id="focus-house-b" cx="1210" cy="556" rx="105" ry="102"/>
      </g>
    </g>

    <g id="summary" transform="translate(1456 288)">
      <path d="M-36 0 V628" stroke="${p.ink}" stroke-opacity=".18" stroke-width="2"/>
      ${text(0, 0, '마을의 구성', TYPE.label, 'font-weight="800"')}
      ${text(0, 39, '숫자로 살펴보는 생활 풍경', TYPE.caption, 'class="caption"')}
      ${[
        { key: 'bridge', y: 117, name: '다리 길이', value: '24', unit: 'm', width: 312 },
        { key: 'river', y: 271, name: '강 폭', value: '18', unit: 'm', width: 234 },
        { key: 'trees', y: 425, name: '나무', value: '7', unit: '그루', width: 91 },
      ].map((o, i) => `<g id="metric-${o.key}" transform="translate(0 ${o.y})">
        ${text(0, 0, o.name, TYPE.label, 'font-weight="600"')}
        <g id="metric-value-${i}" transform="translate(0 49)">${text(0, 0, o.value, TYPE.value, 'class="value"')}${text(o.value.length * 24 + 12, 0, o.unit, TYPE.caption)}</g>
        <path d="M0 79 H332" stroke="${p.ink}" stroke-opacity=".08" stroke-width="10"/>
        <path id="bar-${i}" d="M0 79 H${o.width}" stroke="${i === 0 ? p.orange : i === 1 ? p.teal : p.green}" stroke-width="10"/>
      </g>`).join('')}
      <path d="M0 556 H332" stroke="${p.ink}" stroke-opacity=".18"/>
      ${text(0, 598, '집', TYPE.label, 'font-weight="600"')}${text(332, 598, 'A + B · 2채', TYPE.label, 'text-anchor="end" font-weight="700"')}
      ${text(0, 651, '막대는 항목별 상대 크기입니다.', TYPE.caption, 'class="caption"')}
    </g>

    <g id="footer">
      <path d="M88 964 H1832" stroke="${p.ink}" stroke-width="2"/>
      ${text(88, 1016, '범례', TYPE.caption, 'font-weight="700"')}
      <path d="M170 1008 H204" stroke="${p.orange}" stroke-width="6"/>${text(218, 1016, '주요 시설', TYPE.caption)}
      <path d="M392 1008 H426" stroke="${p.teal}" stroke-width="10"/>${text(440, 1016, '하천', TYPE.caption)}
      <circle cx="573" cy="1008" r="8" fill="${p.green}"/>${text(595, 1016, '녹지', TYPE.caption)}
      ${text(800, 1016, '설명용 도해 · 실제 축척과 다릅니다', TYPE.caption, 'class="caption"')}
      ${targets.map((o, i) => `<g id="step-${i}" transform="translate(${1458 + i * 93} 1008)"><circle r="5" fill="${p.orange}"/>${text(13, 8, ['다리', '강', '집', '나무'][i], TYPE.caption)}</g>`).join('')}
    </g>
  </g>`;
}

// 강조점 사이를 정지 속도로 잇기 때문에 순환 경계에서도 시선이 튀지 않는다.
export function emphasisAt(t) {
  const phase = ((t / DURATION * 4) % 4 + 4) % 4;
  const current = Math.floor(phase);
  const progress = smooth(Math.max(0, Math.min(1, (phase - current - 0.48) / 0.52)));
  return targets.map((_, i) => i === current ? 1 - progress : i === (current + 1) % 4 ? progress : 0);
}

buildScene();
const byId = id => document.getElementById(id);
const camera = byId('camera');
const rings = targets.map((_, i) => byId(`focus-${i}`));
const labels = targets.map(o => byId(`label-${o.key}`).firstElementChild);

export function render(t) {
  const weights = emphasisAt(t);
  const wave = TAU * t / DURATION;
  const travel = (1 - Math.cos(wave)) / 2;
  const focusX = weights.reduce((sum, w, i) => sum + w * targets[i].cx, 0);
  const focusY = weights.reduce((sum, w, i) => sum + w * targets[i].cy, 0);
  const zoom = 1 + CAMERA.zoom * travel;
  const tx = CAMERA.shift[0] * travel * (CAMERA.center[0] - focusX) / 500;
  const ty = CAMERA.shift[1] * travel * (CAMERA.center[1] - focusY) / 350;
  const [cx, cy] = CAMERA.center;
  camera.setAttribute('transform', `translate(${cx + tx} ${cy + ty}) scale(${zoom}) translate(${-cx} ${-cy})`);

  targets.forEach((o, i) => {
    const w = weights[i];
    rings[i].setAttribute('opacity', 0.81 * w);
    rings[i].setAttribute('stroke-width', 2 + w);
    const s = 1 + 0.035 * w;
    rings[i].setAttribute('transform', `translate(${o.cx} ${o.cy}) scale(${1 + .008 * loop(t, 1, i / 4)}) translate(${-o.cx} ${-o.cy})`);
    labels[i].setAttribute('transform', `scale(${s})`);
    labels[i].querySelectorAll('text').forEach(node => node.setAttribute('opacity', 0.82 + 0.18 * w));
    byId(`step-${i}`).setAttribute('opacity', 0.55 + 0.45 * w);
  });
  byId('focus-house-b').setAttribute('opacity', .81 * weights[2]);
  byId('home-b-label').setAttribute('opacity', 0.82 + .18 * weights[2]);
  byId('home-b-label').setAttribute('transform', `translate(1278 394) scale(${1 + .035 * weights[2]}) translate(-1278 -394)`);
  byId('bridge-number').setAttribute('transform', `translate(913 516) scale(${1 + .035 * weights[0]}) translate(-913 -516)`);
  byId('bridge-number').setAttribute('opacity', .82 + .18 * weights[0]);
  byId('flow').setAttribute('stroke-dashoffset', -63 * t / DURATION);
  ['bridge', 'river', 'trees'].forEach((key, i) => {
    const w = weights[[0, 1, 3][i]];
    byId(`metric-${key}`).setAttribute('opacity', .85 + .15 * w);
    byId(`bar-${i}`).setAttribute('transform', `scale(${1 + .018 * loop(t, 1, i / 3)} 1)`);
    byId(`metric-value-${i}`).setAttribute('transform', `translate(0 49) scale(${1 + .035 * w})`);
  });
  trees.forEach((_, i) => byId(`crown-${i}`).setAttribute('transform', `rotate(${1.6 * loop(t, 1, i / 9)} 0 -22)`));
  for (let i = 0; i < 3; i++) byId(`cloud-${i}`).setAttribute('transform', `translate(${10 * loop(t, 1, i / 4)} 0)`);
  for (let i = 0; i < 11; i++) {
    byId(`wave-${i}`).setAttribute('transform', `translate(${9 * loop(t, 1, i / 11)} ${2.5 * loop(t, 1, i / 11)})`);
    byId(`wave-${i}`).setAttribute('opacity', .45 + .2 * loop(t, 1, i / 11));
  }
  for (let i = 0; i < 2; i++) {
    byId(`smoke-${i}`).setAttribute('transform', `translate(${2 * loop(t, 1, i / 3)} ${-3 + 3 * loop(t, 1, i / 3)})`);
    byId(`smoke-${i}`).setAttribute('opacity', .65 + .25 * loop(t, 1, i / 3));
  }
}

start(render);
