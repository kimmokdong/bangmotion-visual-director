import { start, DURATION, loop, smooth } from '../../shared/runtime.js';

// 강조색(accent)은 활성 번호표·초점 링·다리 막대에만 쓴다. 나머지는 잉크·하천·녹지의 저채도 면.
export const PALETTE = Object.freeze({
  paper: '#EFEBE2', plate: '#FAF7F0', white: '#FFFDF8', ink: '#22394A',
  accent: '#E0662F', water: '#5FA3A6', green: '#71906C', meadow: '#DFE6D5',
  roofRed: '#B0503F', roofBlue: '#4D6E8C',
});
export const MATERIAL = Object.freeze({ outline: 3, detail: 2, hairline: 1.5, grid: 32, gridOpacity: 0.05 });
export const LIGHTING = Object.freeze({ shadows: false, shadeOpacity: 0.14, bankOpacity: 0.4 });
export const CAMERA = Object.freeze({ focus: [914, 640], push: 0.022 });
export const TYPE = Object.freeze({ title: 60, label: 28, value: 36, big: 68, caption: 24, small: 22 });
// 0~1.95초에 차례로 그려지고, 4.3~4.85초에 함께 걷혀 t=0 상태로 돌아간다.
export const TIMELINE = Object.freeze({
  bridge: [0.05, 0.85], river: [0.35, 1.15], homes: [0.65, 1.45], trees: [0.95, 1.75],
  elevation: [0.15, 1.2], elevationDim: [0.8, 1.5], hold: [1.55, 2.0], clear: [4.3, 4.85],
});

const svg = document.querySelector('#stage');
const p = PALETTE;
const PLATE = { x: 88, y: 240, w: 1288, h: 676 };
const SIDE = 1424;

const clamp01 = x => Math.max(0, Math.min(1, x));
const ramp = (t, a, b) => smooth(clamp01((t - a) / (b - a)));
const easeOut = x => 1 - (1 - x) ** 3;
const backOut = x => 1 + 2.2 * (x - 1) ** 3 + 1.2 * (x - 1) ** 2; // 약 8% 넘침 후 정착
const bell = (t, c, h = 0.3) => smooth(clamp01(1 - Math.abs(t - c) / h));
const keep = t => 1 - ramp(t, ...TIMELINE.clear);
const built = (t, [a, b]) => easeOut(clamp01((t - a) / (b - a))) * keep(t);
const pop = (t, a, d = 0.32) => backOut(clamp01((t - a) / d)) * keep(t);

// 강은 두 강둑의 3차 베지어 사슬. 제어점을 섞으면 유선(streamline)과 깊은 물길이 나온다.
const bankA = [[355, 425], [420, 510], [633, 470], [710, 540], [790, 615], [712, 700], [887, 770], [1050, 838], [1190, 824], [1325, 913]];
const bankB = [[482, 394], [529, 460], [722, 411], [840, 475], [936, 525], [915, 612], [1010, 660], [1122, 714], [1245, 680], [1380, 775]];
const chain = pts => `M${pts[0]} C${pts.slice(1, 4).join(' ')} C${pts.slice(4, 7).join(' ')} C${pts.slice(7).join(' ')}`;
const mix = u => bankA.map((a, i) => a.map((v, k) => +(v + (bankB[i][k] - v) * u).toFixed(1)));
const band = (u, v) => `${chain(mix(u))} L${chain(mix(v).reverse()).slice(1)} Z`;
const river = band(0, 1);
const STREAMS = [0.34, 0.66];
const DASH = 18; // 유선 점 3 + 간격 15

const trees = [
  [174, 645, 'round', 1.02], [290, 755, 'pine', 1.05], [507, 723, 'round', 0.95],
  [570, 461, 'pine', 0.72], [1088, 458, 'round', 0.78],
  [1338, 560, 'pine', 0.8], [425, 880, 'round', 0.86],
];
const rings = [
  { key: 0, cx: 914, cy: 651, rx: 240, ry: 103 },
  { key: 1, cx: 1100, cy: 783, rx: 148, ry: 77 },
  { key: 2, cx: 393, cy: 556, rx: 110, ry: 102 },
  { key: 2, cx: 1210, cy: 556, rx: 105, ry: 102 },
  { key: 3, cx: 507, cy: 670, rx: 77, ry: 91 },
];
const NAMES = ['다리', '강', '집', '나무'];

function text(x, y, value, size = TYPE.label, extra = '') {
  return `<text x="${x}" y="${y}" font-size="${size}" ${extra}>${value}</text>`;
}

// 번호표: 잉크 원 위에 강조색 원을 겹쳐 활성도(opacity)만 바꾼다. 색을 직접 바꾸면 중간 프레임이 튄다.
function marker(id, n, x, y, r = 17) {
  return `<g id="${id}" transform="translate(${x} ${y})"><circle class="ping" r="${r}" fill="none" stroke="${p.accent}" stroke-width="2" opacity="0"/>
    <circle r="${r}" fill="${p.ink}"/><circle class="on" r="${r}" fill="${p.accent}" opacity="0"/>
    ${text(0, 8, n, TYPE.small, 'text-anchor="middle" font-weight="800" class="pip-num"')}</g>`;
}

function tree(x, y, kind, scale, i) {
  const crown = kind === 'pine'
    ? `<path d="M0 -137 L-30 -88 H-20 L-44 -44 H-28 L-51 -10 H51 L28 -44 H44 L20 -88 H30 Z" fill="${p.green}"/>
       <path d="M0 -137 L30 -88 H20 L44 -44 H28 L51 -10 H0Z" fill="${p.ink}" fill-opacity="${LIGHTING.shadeOpacity}"/>
       <path d="M0 -120 V-13 M0 -69 L-18 -51 M0 -46 L22 -27" fill="none" stroke="${p.white}" stroke-opacity=".35"/>`
    : `<path d="M-40 -40 C-66 -46 -61 -83 -42 -91 C-49 -122 -13 -143 9 -125 C34 -140 62 -116 53 -94 C78 -72 60 -36 35 -34 C12 -15 -21 -17 -40 -40Z" fill="${p.green}"/>
       <path d="M53 -94 C78 -72 60 -36 35 -34 C12 -15 -21 -17 -40 -40 C-8 -38 30 -52 53 -94Z" fill="${p.ink}" fill-opacity="${LIGHTING.shadeOpacity}"/>
       <path d="M0 -25 V-100 M0 -57 L-24 -77 M0 -69 L25 -91" stroke="${p.white}" stroke-opacity=".4" fill="none"/>`;
  return `<g transform="translate(${x} ${y}) scale(${scale})"><path d="M-26 3 H26" stroke="${p.ink}" stroke-opacity=".22" stroke-width="3"/><path d="M0 0 V-61" stroke="${p.ink}" stroke-width="7"/><g id="crown-${i}">${crown}</g></g>`;
}

function house(x, y, roof, chimney = false) {
  return `<g transform="translate(${x} ${y})" stroke="${p.ink}" stroke-width="${MATERIAL.outline}" stroke-linejoin="round">
    <path d="M-78 77 H86" stroke-opacity=".24"/>
    <path d="M-61 -28 H64 V75 H-61Z" fill="${p.white}"/>
    <path d="M14 -26 H62 V73 H14Z" fill="${p.ink}" fill-opacity=".05" stroke="none"/>
    ${chimney ? `<path d="M30 -58 V-96 H47 V-47" fill="${p.white}"/><path d="M25 -97 H52"/>` : ''}
    <path d="M-82 -26 L0 -94 L85 -26Z" fill="${roof}"/>
    <path d="M0 -92 L82 -27 H0Z" fill="${p.ink}" fill-opacity="${LIGHTING.shadeOpacity}" stroke="none"/>
    <path d="M-50 -38 L-28 -56 M-30 -38 L-8 -56" stroke="${p.white}" stroke-opacity=".3" stroke-width="${MATERIAL.detail}"/>
    <path d="M-62 -21 H64" stroke-opacity=".2"/>
    <path d="M-40 0 H-12 V28 H-40Z M24 0 H51 V28 H24Z" fill="${p.water}" fill-opacity=".3"/>
    <path d="M-26 0 V28 M-40 14 H-12 M37.5 0 V28 M24 14 H51" stroke-width="${MATERIAL.detail}"/>
    <path d="M-5 35 H19 V75 H-5Z" fill="${p.meadow}"/><circle cx="12" cy="56" r="2" fill="${p.ink}" stroke="none"/>
    <path d="M-12 79 H26 M-17 86 H31" stroke-width="3"/>
  </g>`;
}

function bridge() {
  // 아치 안쪽 곡선(중심 912,716 · 반지름 163×72)을 따라 홍예석 줄눈을 방사형으로 놓는다.
  const stones = Array.from({ length: 9 }, (_, i) => {
    const a = Math.PI * (0.12 + 0.76 * i / 8), c = Math.cos(a), s = Math.sin(a);
    return `M${(912 - 163 * c).toFixed(1)} ${(716 - 72 * s).toFixed(1)} L${(912 - 181 * c).toFixed(1)} ${(716 - 88 * s).toFixed(1)}`;
  }).join(' ');
  return `<g id="bridge-art" stroke="${p.ink}" stroke-width="${MATERIAL.outline}" stroke-linejoin="round">
    <path d="M1057 700 L1139 689 L1160 713 L1081 726Z" fill="${p.meadow}" stroke="none"/>
    <path d="M672 720 C696 708 714 702 737 702 M1074 715 L1140 701" fill="none" stroke="${p.green}" stroke-width="8"/>
    <path d="M708 602 H1116 V716 H1075 C1057 620 778 620 749 716 H708Z" fill="${p.white}"/>
    <path d="${stones}" stroke-opacity=".35" stroke-width="${MATERIAL.detail}"/>
    <path d="M708 602 H1116 V622 H708Z" fill="${p.accent}"/>
    <path d="M694 600 H1130 M702 564 H1122" fill="none" stroke-width="5"/>
    ${Array.from({ length: 12 }, (_, i) => `<path d="M${711 + i * 36} 565 V599"/>`).join('')}
    <path d="M718 642 H756 M718 675 H743 M1075 642 H1106 M1084 676 H1106" stroke-opacity=".4" stroke-width="2"/>
    <path d="M701 718 H755 M1070 718 H1123" stroke-width="5"/>
  </g>`;
}

// 그려지는 선: pathLength=1 로 길이를 정규화하고 dashoffset 으로 진행률을 준다.
const draw = (id, d, cls = 'leader', extra = '') => `<path id="${id}" class="${cls}" d="${d}" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="1" opacity="0" ${extra}/>`;

function elevation() {
  const y0 = 846, sag = 52, x0 = 1500, span = 260;
  const archY = x => { const s = (x - x0) / span; return y0 - 4 * sag * s * (1 - s); };
  const posts = [1526, 1552, 1578, 1682, 1708, 1734].map(x => `M${x} 794 V${archY(x).toFixed(1)}`).join(' ');
  return `<g id="elevation">
    <path d="M${SIDE} 724 H1832" stroke="${p.ink}" stroke-opacity=".18" stroke-width="2"/>
    ${text(SIDE, 760, '다리 측면도', TYPE.caption, 'font-weight="800"')}
    ${text(1832, 760, '아치 높이 6 m', TYPE.caption, 'text-anchor="end" class="caption"')}
    <path d="M${SIDE} ${y0} H${x0} L${x0 + 10} 880 H${SIDE}Z M1832 ${y0} H${x0 + span} L${x0 + span - 10} 880 H1832Z" fill="${p.meadow}" stroke="${p.ink}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M${x0 + 4} 856 H${x0 + span - 4} L${x0 + span - 10} 880 H${x0 + 10}Z" fill="${p.water}" fill-opacity=".45"/>
    <path id="elev-water" d="M${x0 + 8} 856 H${x0 + span - 8}" stroke="${p.white}" stroke-width="3" stroke-dasharray="12 10" stroke-linecap="round"/>
    <g stroke="${p.ink}" stroke-width="2.5" fill="none" stroke-linejoin="round" stroke-linecap="round">
      ${draw('elev-arch', `M${x0} ${y0} Q${x0 + span / 2} ${y0 - 2 * sag} ${x0 + span} ${y0}`, 'draw', 'style="stroke-width:3.5px"')}
      <path id="elev-deck" d="M1490 784 H1770 V794 H1490Z" fill="${p.accent}" opacity="0"/>
      <path id="elev-posts" opacity="0" d="${posts} M1494 772 H1766 ${Array.from({ length: 11 }, (_, i) => `M${(1494 + i * 27.2).toFixed(1)} 772 V784`).join(' ')}"/>
    </g>
    <g class="dimension">
      ${draw('elev-dim-line', `M${x0} 900 H${x0 + span}`, 'draw')}
      <path d="M${x0} 890 V910 M${x0 + span} 890 V910 M${x0} 852 V884 M${x0 + span} 852 V884" stroke-opacity=".5"/>
    </g>
    <g id="elev-dim-label" opacity="0"><rect x="1594" y="886" width="72" height="28" fill="${p.paper}"/>${text(1630, 908, '24 m', TYPE.caption, 'text-anchor="middle" font-weight="800"')}</g>
  </g>`;
}

function icon(kind, x, y, i) {
  const body = kind === 'house'
    ? `<path d="M-15 0 V-20 H15 V0Z" fill="${p.white}" stroke="${p.ink}" stroke-width="2"/><path d="M-19 -18 L0 -34 L19 -18Z" fill="${i ? p.roofBlue : p.roofRed}" stroke="${p.ink}" stroke-width="2" stroke-linejoin="round"/>`
    : kind === 'pine'
      ? `<path d="M0 -36 L-12 -16 H-7 L-14 -4 H14 L7 -16 H12Z" fill="${p.green}"/><path d="M0 -4 V2" stroke="${p.ink}" stroke-width="3"/>`
      : `<circle cy="-20" r="13" fill="${p.green}"/><path d="M0 -8 V2" stroke="${p.ink}" stroke-width="3"/>`;
  return `<g transform="translate(${x} ${y})"><g id="${kind === 'house' ? 'hicon' : 'ticon'}-${i}">${body}</g></g>`;
}

function buildScene() {
  const ticks = (n, f) => Array.from({ length: n }, (_, i) => f(i, i % 5 === 0 ? 12 : 6)).join(' ');
  svg.innerHTML += `<defs>
    <pattern id="grid" width="${MATERIAL.grid}" height="${MATERIAL.grid}" patternUnits="userSpaceOnUse" x="${PLATE.x}" y="${PLATE.y}"><path d="M${MATERIAL.grid} 0 H0 V${MATERIAL.grid}" fill="none" stroke="${p.ink}" stroke-opacity="${MATERIAL.gridOpacity}" stroke-width="1"/></pattern>
    <clipPath id="plate-clip"><rect x="${PLATE.x}" y="${PLATE.y}" width="${PLATE.w}" height="${PLATE.h}"/></clipPath>
    <clipPath id="land-clip"><path d="M84 469 Q240 420 415 454 T774 449 Q1015 416 1376 467 V916 H84Z"/></clipPath>
    <clipPath id="river-clip"><path d="${river}"/></clipPath>
    <marker id="flow-tip" viewBox="0 0 12 12" refX="9" refY="6" markerWidth="9" markerHeight="9" orient="auto"><path d="M2 2 L8 6 L2 10" fill="none" stroke="${p.ink}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></marker>
    <style>
      text { font-family: "Pretendard", "Malgun Gothic", "Apple SD Gothic Neo", system-ui, sans-serif; fill: ${p.ink}; letter-spacing: -.6px; }
      .caption { fill: #66757F; letter-spacing: -.3px; }
      .num { font-weight: 800; font-variant-numeric: tabular-nums; letter-spacing: -1px; }
      .halo { paint-order: stroke; stroke: ${p.plate}; stroke-width: 6px; stroke-linejoin: round; }
      .pip-num { fill: ${p.white}; letter-spacing: 0; }
      .on-ink { fill: ${p.white}; }
      .leader, .draw { fill: none; stroke: ${p.ink}; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
      .leader { stroke-opacity: .6; }
      .dimension { fill: none; stroke: ${p.ink}; stroke-width: 2; }
    </style>
  </defs>
  <rect width="1920" height="1080" fill="${p.paper}"/>

  <g id="heading">
    <path d="M88 72 H100 V96 H88Z" fill="${p.accent}"/>
    ${text(116, 93, '그림 1 · 지역 안내 도해', TYPE.caption, 'font-weight="700"')}
    ${text(84, 172, '강 마을 한눈에 보기', TYPE.title, 'font-weight="800" letter-spacing="-2.4"')}
    ${text(1832, 93, '가상의 마을 · 예시 데이터', TYPE.caption, 'text-anchor="end" class="caption"')}
    ${text(1832, 168, '공간을 읽고, 숫자로 이해하기', TYPE.label, 'text-anchor="end" font-weight="600"')}
    <path d="M88 206 H1832" stroke="${p.ink}" stroke-width="3"/><path d="M88 213 H1832" stroke="${p.ink}" stroke-width="1"/>
  </g>

  <g clip-path="url(#plate-clip)">
    <rect x="${PLATE.x}" y="${PLATE.y}" width="${PLATE.w}" height="${PLATE.h}" fill="${p.plate}"/>
    <rect x="${PLATE.x}" y="${PLATE.y}" width="${PLATE.w}" height="${PLATE.h}" fill="url(#grid)"/>
    <g id="map">
      <g id="landscape">
        <path d="M88 448 Q220 352 385 426 Q555 327 744 433 Q906 357 1081 424 Q1250 360 1376 447 V495 H88Z" fill="${p.green}" fill-opacity=".1"/>
        <g fill="none" stroke="${p.green}" stroke-opacity=".4" stroke-width="${MATERIAL.hairline}">
          ${[0, 1, 2].map(k => `<path transform="translate(0 495) scale(1 ${1 - k * 0.22}) translate(0 -495)" d="M88 448 Q220 352 385 426 Q555 327 744 433 Q906 357 1081 424 Q1250 360 1376 447"/>`).join('')}
        </g>
        <path d="M88 474 Q302 397 510 463 Q707 390 883 466 Q1125 404 1376 468 V525 H88Z" fill="${p.green}" fill-opacity=".15"/>
        ${[[318, 322, 1], [640, 286, 0.78], [1170, 300, 0.85]].map(([x, y, s], i) => `<g transform="translate(${x} ${y}) scale(${s})"><path id="cloud-${i}" d="M-51 12 C-78 12 -79 -18 -53 -19 C-48 -52 -3 -56 8 -29 C33 -44 61 -25 55 -5 C86 -3 81 21 58 21 H-51Z" fill="${p.white}" stroke="${p.ink}" stroke-opacity=".2" stroke-width="2"/></g>`).join('')}
        <g clip-path="url(#land-clip)">
          <path d="M84 469 Q240 420 415 454 T774 449 Q1015 416 1376 467 V916 H84Z" fill="${p.meadow}"/>
          <path d="M84 785 Q328 710 544 796 Q739 867 975 847 T1376 862 V916 H84Z" fill="${p.green}" fill-opacity=".12"/>
          <path d="M392 629 Q466 683 554 652 T718 647 M1110 649 Q1153 651 1218 635" fill="none" stroke="${p.plate}" stroke-width="32"/>
          <path d="M392 629 Q466 683 554 652 T718 647 M1110 649 Q1153 651 1218 635" fill="none" stroke="${p.ink}" stroke-opacity=".18" stroke-width="2" stroke-dasharray="3 10"/>
          <path d="${river}" fill="${p.water}" fill-opacity=".5" stroke="${p.green}" stroke-opacity="${LIGHTING.bankOpacity}" stroke-width="10"/>
          <path d="${band(0.3, 0.7)}" fill="${p.water}" fill-opacity=".32"/>
          <path d="${river}" fill="none" stroke="${p.white}" stroke-opacity=".7" stroke-width="2"/>
          <g clip-path="url(#river-clip)" fill="none" stroke="${p.white}" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="3 15">
            ${STREAMS.map((u, i) => `<path id="stream-${i}" d="${chain(mix(u))}"/>`).join('')}
          </g>
          <path id="flow" d="M851 702 C888 737 936 752 1002 765" fill="none" stroke="${p.ink}" stroke-width="3" stroke-dasharray="9 12" marker-end="url(#flow-tip)" opacity="0"/>
          ${text(845, 815, '강 흐름', TYPE.caption, 'transform="rotate(19 845 815)" class="halo" font-weight="600"')}
          ${[[128, 724], [220, 825], [430, 825], [591, 555], [649, 754], [1198, 472], [1333, 723], [900, 874], [115, 530]].map(([x, y]) => `<path d="M${x - 10} ${y} l-4 -10 m14 10 v-16 m7 16 l5 -11" fill="none" stroke="${p.green}" stroke-width="2" stroke-linecap="round"/>`).join('')}
          ${[[608, 738, 14], [666, 716, 11], [1129, 674, 13], [1160, 685, 8], [409, 470, 9], [1339, 869, 12]].map(([x, y, r]) => `<path d="M${x - r} ${y} q0 ${-r} ${r} ${-r} q${r} 0 ${r + 4} ${r}Z" fill="${p.plate}" stroke="${p.ink}" stroke-opacity=".28" stroke-width="2"/>`).join('')}
        </g>
        <g fill="none" stroke="${p.green}" stroke-width="3" stroke-linecap="round"><path d="M152 697 H237 M152 716 H237 M161 687 V727 M193 687 V727 M227 687 V727 M1135 520 H1190 M1135 540 H1190 M1142 510 V551 M1178 510 V551"/></g>
        ${trees.slice(3, 5).map((v, i) => tree(...v, i + 3)).join('')}
        ${house(392, 550, p.roofRed, true)}
        <g fill="none" stroke="${p.ink}" stroke-opacity=".25" stroke-width="3" stroke-linecap="round"><path id="smoke-0" d="M432 440 C416 425 448 417 433 400"/><path id="smoke-1" d="M439 410 C425 397 448 387 439 372"/></g>
        ${house(1210, 556, p.roofBlue)}
        ${bridge()}
        ${[0, 1, 2, 5, 6].map(i => tree(...trees[i], i)).join('')}
      </g>

      <g id="annotations">
        <g fill="none" stroke="${p.accent}" stroke-width="2.5" stroke-dasharray="10 6">
          ${rings.map((o, i) => `<ellipse id="ring-${i}" cx="${o.cx}" cy="${o.cy}" rx="${o.rx}" ry="${o.ry}" opacity="0"/>`).join('')}
        </g>
        <g class="dimension">
          ${draw('dim-bridge-l', 'M844 516 H710', 'draw')}${draw('dim-bridge-r', 'M982 516 H1116', 'draw')}
          <path id="dim-bridge-ticks" d="M710 505 V527 M1116 505 V527 M710 534 V552 M1116 534 V552" stroke-opacity=".5" opacity="0"/>
        </g>
        ${marker('mk-bridge', 1, 852, 462)}
        ${text(876, 472, '아치 다리', TYPE.label, 'font-weight="800" class="halo"')}
        ${text(913, 529, '24 m', TYPE.value, 'id="map-bridge-num" text-anchor="middle" class="num halo" opacity="0"')}

        <g class="dimension">
          ${draw('dim-river-a', 'M1147 792 L1117 855', 'draw')}${draw('dim-river-b', 'M1147 792 L1177 730', 'draw')}
          <path id="dim-river-ticks" d="M1104 849 L1130 861 M1164 724 L1190 736" opacity="0"/>
        </g>
        <g id="river-chip" opacity="0"><rect x="1089" y="762" width="116" height="60" rx="3" fill="${p.plate}" stroke="${p.ink}" stroke-opacity=".25" stroke-width="1.5"/>${text(1147, 805, '18 m', TYPE.value, 'id="map-river-num" text-anchor="middle" class="num"')}</g>
        ${marker('mk-river', 2, 1214, 712)}
        ${text(1238, 722, '강 폭', TYPE.label, 'font-weight="800" class="halo"')}

        ${draw('lead-home-a', 'M186 404 V455 H305 L329 481')}<circle id="dot-home-a" cx="329" cy="481" r="5" fill="${p.ink}"/>
        ${marker('mk-home-a', 3, 186, 386)}${text(210, 396, '집 A', TYPE.label, 'font-weight="800" class="halo"')}
        ${draw('lead-home-b', 'M1252 404 V448 L1240 478')}<circle id="dot-home-b" cx="1240" cy="478" r="5" fill="${p.ink}"/>
        ${marker('mk-home-b', 3, 1252, 386)}${text(1276, 396, '집 B', TYPE.label, 'font-weight="800" class="halo"')}

        ${draw('lead-trees', 'M541 729 L606 794 V822')}<circle id="dot-trees" cx="541" cy="729" r="5" fill="${p.ink}"/>
        ${marker('mk-trees', 4, 606, 840)}
        ${text(634, 850, '나무 7그루', TYPE.label, 'font-weight="800" class="halo"')}
        ${text(634, 885, '활엽수 4 · 침엽수 3', TYPE.caption, 'class="caption halo"')}
      </g>
    </g>
  </g>
  <g stroke="${p.ink}" fill="none">
    <rect x="${PLATE.x}" y="${PLATE.y}" width="${PLATE.w}" height="${PLATE.h}" stroke-width="2"/>
    <path stroke-opacity=".4" stroke-width="1.5" d="${ticks(41, (i, l) => `M${PLATE.x + i * 32} ${PLATE.y} v${l}`)} ${ticks(22, (i, l) => `M${PLATE.x} ${PLATE.y + i * 32} h${l}`)}"/>
    <path d="M${PLATE.x} ${PLATE.y} H${PLATE.x + 210} V${PLATE.y + 38} H${PLATE.x}Z" fill="${p.ink}" stroke="none"/>
  </g>
  ${text(PLATE.x + 16, PLATE.y + 27, '도해 · 강 마을 구조', TYPE.small, 'font-weight="700" class="on-ink"')}

  <g id="summary">
    ${text(SIDE, 268, '핵심 수치', TYPE.caption, 'font-weight="800"')}
    ${text(1832, 268, '단위 m · 채 · 그루', TYPE.small, 'text-anchor="end" class="caption"')}
    <path d="M${SIDE} 284 H1832" stroke="${p.ink}" stroke-width="2"/>
    ${[
      { key: 'bridge', y: 0, name: '다리 길이', value: 24, note: '강 폭의 1.3배', color: p.accent },
      { key: 'river', y: 134, name: '강 폭', value: 18, note: '다리 길이의 75%', color: p.water },
    ].map((o, i) => `<g transform="translate(0 ${o.y})">
      ${marker(`mk-side-${o.key}`, i + 1, SIDE + 15, 322, 15)}
      ${text(SIDE + 40, 331, o.name, 26, 'font-weight="700"')}
      ${text(1832, 331, o.note, TYPE.caption, 'text-anchor="end" class="caption"')}
      ${text(SIDE + 82, 398, o.value, TYPE.big, `id="side-${o.key}-num" text-anchor="end" class="num"`)}
      ${text(SIDE + 92, 398, 'm', 30, 'font-weight="700"')}
      <path d="M${SIDE} 420 H1832" stroke="${p.ink}" stroke-opacity=".08" stroke-width="12"/>
      <path id="bar-${o.key}" d="M${SIDE} 420 H${SIDE + 408 * o.value / 30}" stroke="${o.color}" stroke-width="12"/>
      <path d="${[0, 1, 2, 3].map(k => `M${SIDE + k * 136} 430 V438`).join(' ')}" stroke="${p.ink}" stroke-opacity=".4" stroke-width="1.5"/>
    </g>`).join('')}
    ${[0, 10, 20].map((v, k) => text(SIDE + k * 136, 596, v, TYPE.small, `class="caption" ${k ? 'text-anchor="middle"' : ''}`)).join('')}
    ${text(1832, 596, '30 m', TYPE.small, 'text-anchor="end" class="caption"')}
    <path d="M${SIDE} 614 H1832" stroke="${p.ink}" stroke-opacity=".18" stroke-width="2"/>
    ${marker('mk-side-homes', 3, SIDE + 15, 646, 15)}${text(SIDE + 40, 655, '집', 26, 'font-weight="700"')}
    ${text(1592, 655, '<tspan id="side-homes-num">2</tspan>채', 26, 'text-anchor="end" class="num"')}
    ${marker('mk-side-trees', 4, 1630, 646, 15)}${text(1655, 655, '나무', 26, 'font-weight="700"')}
    ${text(1832, 655, '<tspan id="side-trees-num">7</tspan>그루', 26, 'text-anchor="end" class="num"')}
    ${[0, 1].map(i => icon('house', SIDE + 22 + i * 50, 708, i)).join('')}
    ${['round', 'round', 'round', 'round', 'pine', 'pine', 'pine'].map((k, i) => icon(k, 1630 + i * 31, 708, i)).join('')}
    ${elevation()}
  </g>

  <g id="footer">
    <path d="M88 958 H1832" stroke="${p.ink}" stroke-width="2"/>
    ${text(88, 1012, '범례', TYPE.caption, 'font-weight="800"')}
    <path d="M168 1004 H200" stroke="${p.accent}" stroke-width="6"/>${text(212, 1012, '주요 시설', TYPE.caption)}
    <path d="M346 1004 H380" stroke="${p.water}" stroke-width="12"/>${text(392, 1012, '하천', TYPE.caption)}
    <path d="M470 1004 H504" stroke="${p.ink}" stroke-width="3" stroke-dasharray="7 6"/>${text(516, 1012, '물 흐름', TYPE.caption)}
    <circle cx="628" cy="1004" r="9" fill="${p.green}"/>${text(646, 1012, '녹지', TYPE.caption)}
    ${text(760, 1012, '자료: 가상의 예시 · 설명용 도해로 실제 축척과 다릅니다', TYPE.caption, 'class="caption"')}
    ${NAMES.map((name, i) => `${marker(`step-${i}`, i + 1, 1444 + i * 100, 1004, 14)}${text(1466 + i * 100, 1012, name, TYPE.caption, `id="step-name-${i}"`)}`).join('')}
  </g>`;
}

// 차례로 짓는 동안은 지금 그려지는 대상을, 다 지은 뒤에는 시각적 초점인 다리를 강조한다.
export function emphasisAt(t) {
  const hold = ramp(t, ...TIMELINE.hold) * keep(t);
  return [Math.max(bell(t, 0.45), hold), bell(t, 0.75), bell(t, 1.05), bell(t, 1.35)];
}

buildScene();
const byId = id => document.getElementById(id);
const set = (id, attrs) => { const el = byId(id); for (const k in attrs) el.setAttribute(k, attrs[k]); };
const dash = (id, v) => set(id, { 'stroke-dashoffset': 1 - v, opacity: Math.min(1, v * 25) });
const scaleAt = (x, y, s) => `translate(${x} ${y}) scale(${Math.max(0.001, s)}) translate(${-x} ${-y})`;

function markerState(id, w, t, ping = true) {
  const g = byId(id);
  g.querySelector('.on').setAttribute('opacity', w);
  const phase = (t / DURATION * 4) % 1; // 1.25초마다 한 번 퍼지는 맥동
  g.querySelector('.ping').setAttribute('transform', `scale(${1 + 0.9 * phase})`);
  g.querySelector('.ping').setAttribute('opacity', ping ? w * (1 - phase) * 0.8 : 0);
}

export function render(t) {
  const w = emphasisAt(t);
  const b = { bridge: built(t, TIMELINE.bridge), river: built(t, TIMELINE.river), homes: built(t, TIMELINE.homes), trees: built(t, TIMELINE.trees) };

  // 도판 안쪽만 다리 쪽으로 천천히 밀고 들어갔다가 걷힐 때 돌아온다. 제목·표·범례는 고정.
  const push = ramp(t, 0.2, 2.4) * (1 - ramp(t, 4.25, 4.95));
  byId('map').setAttribute('transform', scaleAt(...CAMERA.focus, 1 + CAMERA.push * push));

  rings.forEach((o, i) => set(`ring-${i}`, {
    opacity: 0.9 * w[o.key],
    'stroke-dashoffset': -32 * t / DURATION,
    transform: scaleAt(o.cx, o.cy, 1.02 + 0.01 * loop(t, 2, i / 5)),
  }));

  // ① 다리
  dash('dim-bridge-l', b.bridge); dash('dim-bridge-r', b.bridge);
  byId('dim-bridge-ticks').setAttribute('opacity', clamp01((b.bridge - 0.7) / 0.3));
  byId('map-bridge-num').textContent = `${Math.round(24 * b.bridge)} m`;
  byId('map-bridge-num').setAttribute('opacity', Math.min(1, b.bridge * 6));
  markerState('mk-bridge', w[0], t);
  // ② 강
  dash('dim-river-a', b.river); dash('dim-river-b', b.river);
  byId('dim-river-ticks').setAttribute('opacity', clamp01((b.river - 0.7) / 0.3));
  byId('river-chip').setAttribute('opacity', Math.min(1, b.river * 5));
  byId('map-river-num').textContent = `${Math.round(18 * b.river)} m`;
  markerState('mk-river', w[1], t);
  // 물은 등속으로 흐른다(물리적 등속 예외). 대시 주기의 정수배만 이동해 루프가 맞물린다.
  STREAMS.forEach((_, i) => set(`stream-${i}`, { 'stroke-dashoffset': -DASH * 6 * t / DURATION - i * 9, opacity: 0.6 + 0.3 * b.river }));
  set('flow', { opacity: b.river, 'stroke-dashoffset': -63 * t / DURATION });
  // ③ 집
  [['a', 329, 481], ['b', 1240, 478]].forEach(([s, x, y]) => {
    dash(`lead-home-${s}`, b.homes);
    byId(`dot-home-${s}`).setAttribute('transform', scaleAt(x, y, pop(t, TIMELINE.homes[0] + 0.45)));
    markerState(`mk-home-${s}`, w[2], t);
  });
  // ④ 나무
  dash('lead-trees', b.trees);
  byId('dot-trees').setAttribute('transform', scaleAt(541, 729, pop(t, TIMELINE.trees[0])));
  markerState('mk-trees', w[3], t);

  // 오른쪽 표: 수치 카운트업, 막대 성장, 그림 단위(아이소타입)가 하나씩 등장
  [['bridge', 24], ['river', 18]].forEach(([key, value], i) => {
    byId(`side-${key}-num`).textContent = Math.round(value * b[key]);
    set(`bar-${key}`, { transform: `translate(${SIDE} 0) scale(${Math.max(0.001, b[key])} 1) translate(${-SIDE} 0)`, opacity: Math.min(1, b[key] * 25) });
    markerState(`mk-side-${key}`, w[i], t, false);
  });
  const homesShown = [0, 1].map(i => pop(t, TIMELINE.homes[0] + i * 0.15));
  homesShown.forEach((s, i) => byId(`hicon-${i}`).setAttribute('transform', `scale(${Math.max(0.001, s)})`));
  byId('side-homes-num').textContent = homesShown.filter(s => s > 0.5).length;
  const treesShown = trees.map((_, i) => pop(t, TIMELINE.trees[0] + i * 0.08, 0.28));
  treesShown.forEach((s, i) => byId(`ticon-${i}`).setAttribute('transform', `scale(${Math.max(0.001, s)})`));
  const treeCount = treesShown.filter(s => s > 0.5).length;
  byId('side-trees-num').textContent = treeCount;
  markerState('mk-side-homes', w[2], t, false);
  markerState('mk-side-trees', w[3], t, false);

  // 다리 측면도: 아치 → 상판·난간 → 치수 순서
  const arch = built(t, TIMELINE.elevation), dim = built(t, TIMELINE.elevationDim);
  dash('elev-arch', arch);
  byId('elev-deck').setAttribute('opacity', clamp01((arch - 0.4) / 0.4));
  byId('elev-posts').setAttribute('opacity', clamp01((arch - 0.6) / 0.4));
  dash('elev-dim-line', dim);
  byId('elev-dim-label').setAttribute('opacity', clamp01((dim - 0.6) / 0.4));
  byId('elev-water').setAttribute('stroke-dashoffset', -44 * t / DURATION);

  w.forEach((v, i) => {
    markerState(`step-${i}`, v, t, false);
    set(`step-name-${i}`, { 'font-weight': v > 0.5 ? 800 : 400, 'fill-opacity': 0.6 + 0.4 * v });
  });

  trees.forEach((_, i) => byId(`crown-${i}`).setAttribute('transform', `rotate(${1.6 * loop(t, 1, i / 9)} 0 -22)`));
  for (let i = 0; i < 3; i++) byId(`cloud-${i}`).setAttribute('transform', `translate(${10 * loop(t, 1, i / 4)} 0)`);
  for (let i = 0; i < 2; i++) set(`smoke-${i}`, {
    transform: `translate(${2 * loop(t, 1, i / 3)} ${-3 + 3 * loop(t, 1, i / 3)})`,
    opacity: 0.65 + 0.25 * loop(t, 1, i / 3),
  });
}

start(render);
