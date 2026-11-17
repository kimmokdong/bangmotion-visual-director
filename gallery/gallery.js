const FALLBACK_IDS = [
  '01-isometric', '02-stylized-3d', '03-storybook-2p5d', '04-flat-vector',
  '05-paper-cutout', '06-miniature-diorama', '07-infographic', '08-glassmorphism',
];
const $ = (selector) => document.querySelector(selector);
const grid = $('#gallery');
const dialog = $('#preview-dialog');
const content = $('#dialog-content');
const selectionBar = $('#selection');
const compareIds = new Set();
let styles = [];
let selectedId = null;
let selecting = false;
let selectionMessage = '';
let hoveredCard = null;
let focusedCard = null;
let hoverFrame = null;
let hoverOwner = null;
let modalFrames = [];
let modalMode = null;
let detailIndex = 0;
let returnFocus = null;
let playing = false;
let progressAnimation = 0;

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function button(text, className, handler) {
  const node = element('button', className, text);
  node.type = 'button';
  node.addEventListener('click', handler);
  return node;
}

async function getJSON(url, options = {}) {
  const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(8000), ...options });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function validStyle(style) {
  return style && typeof style.id === 'string' && /^\d{2}-[a-z0-9-]+$/.test(style.id)
    && Number.isInteger(style.number) && typeof style.name === 'string';
}

function label(style) {
  return `${String(style.number).padStart(2, '0')} ${style.name}`;
}

function list(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === 'string') : [];
}

function selectButton(style) {
  const node = button('이 스타일로 선택', 'select-button primary', () => selectStyle(style));
  node.dataset.selectId = style.id;
  node.setAttribute('aria-label', `${style.name}, 이 스타일로 선택`);
  node.disabled = selecting;
  return node;
}

function showSelection(style, state, message) {
  selectionBar.hidden = false;
  selectionBar.classList.toggle('is-error', state === 'error');
  $('#selection-title').textContent = `${state === 'saved' ? '선택됨' : state === 'pending' ? '선택 저장 중' : '선택 저장 실패'}: ${label(style)} (${style.id})`;
  selectionMessage = message;
  $('#selection-status').textContent = message;
  $('#selection-text').value = `스타일 선택: ${style.id}`;
  $('#copy').textContent = '복사';
}

function markSelected() {
  for (const card of grid.children) card.classList.toggle('selected', card.dataset.id === selectedId);
}

async function selectStyle(style) {
  if (selecting) return;
  selecting = true;
  document.querySelectorAll('.select-button').forEach((node) => { node.disabled = true; });
  showSelection(style, 'pending', '서버에 선택을 저장하고 있습니다.');
  try {
    const result = await getJSON('/api/select', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: style.id, name: style.name }),
    });
    if (result.ok !== true) throw new Error('저장 응답 오류');
    selectedId = style.id;
    markSelected();
    showSelection(style, 'saved', '선택을 저장했습니다. 아래 문구를 복사해 대화에 붙여 넣으세요.');
    if (dialog.open) dialog.close();
  } catch {
    showSelection(style, 'error', '서버에 저장하지 못했습니다. 아래 문구를 복사해 대화에 붙여 넣으세요.');
    if (dialog.open) dialog.close();
  } finally {
    selecting = false;
    document.querySelectorAll('.select-button').forEach((node) => { node.disabled = false; });
  }
}

$('#copy').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText($('#selection-text').value);
    $('#copy').textContent = '복사됨';
    $('#selection-status').textContent = `${selectionMessage} 복사했습니다.`;
  } catch {
    $('#selection-text').focus();
    $('#selection-text').select();
    $('#selection-status').textContent = `${selectionMessage} 자동 복사가 되지 않아 문구를 선택했습니다. Ctrl+C 또는 길게 눌러 복사하세요.`;
  }
});

function command(frame, bmvd, t) {
  frame.contentWindow?.postMessage({ bmvd, t }, '*');
}

function createDemo(style, onReady, onFailure) {
  const frame = element('iframe');
  frame.title = `${style.name} 5초 반복 데모`;
  frame.src = `../styles/${style.id}/index.html?paused=1`;
  frame.tabIndex = -1;
  frame.setAttribute('aria-hidden', 'true');
  frame.setAttribute('allow', 'fullscreen');
  frame.dataset.ready = 'false';
  frame.addEventListener('load', () => {
    const deadline = performance.now() + 10000;
    function check() {
      if (!frame.isConnected) return;
      try {
        if (frame.contentWindow.__demo) {
          frame.dataset.ready = 'true';
          onReady(frame);
          return;
        }
      } catch { /* 같은 출처 데모가 아니면 준비 실패로 안내한다. */ }
      if (performance.now() < deadline) setTimeout(check, 60);
      else onFailure?.();
    }
    check();
  });
  return frame;
}

function stopHover() {
  hoverFrame?.remove();
  hoverFrame = null;
  hoverOwner = null;
}

function previewCard(card) {
  if (dialog.open || !card) { stopHover(); return; }
  if (hoverOwner === card) return;
  stopHover();
  hoverOwner = card;
  const style = styles.find((item) => item.id === card.dataset.id);
  hoverFrame = createDemo(style, (frame) => { command(frame, 'seek', 0); command(frame, 'play'); });
  card.querySelector('.card-media').append(hoverFrame);
}

function renderCard(style, index) {
  const card = element('article', 'style-card');
  card.dataset.id = style.id;
  card.tabIndex = 0;
  card.setAttribute('aria-label', `${label(style)}. Enter 키로 상세 미리보기 열기`);
  card.setAttribute('aria-haspopup', 'dialog');
  const media = element('div', 'card-media');
  const placeholder = element('span', 'placeholder', '미리보기 생성 전');
  const image = element('img');
  image.alt = `${style.name}으로 그린 강과 다리, 두 집과 나무 장면`;
  image.loading = 'lazy';
  image.addEventListener('load', () => { placeholder.hidden = true; });
  image.addEventListener('error', () => { image.hidden = true; placeholder.hidden = false; });
  image.src = `../styles/${style.id}/preview.png`;
  media.append(placeholder, image, element('span', 'media-badge', '5초 루프 ↗'));
  const body = element('div', 'card-body');
  const heading = element('div', 'card-heading');
  heading.append(element('span', 'style-number', String(style.number).padStart(2, '0')), element('h2', '', style.name));
  body.append(heading, element('p', 'english-name', style.name_en || ''), element('p', 'tagline', style.tagline || ''));
  const features = element('div', 'features');
  list(style.features).slice(0, 4).forEach((feature) => features.append(element('span', 'chip', feature)));
  const uses = element('p', 'use-cases');
  uses.append(element('strong', '', '추천 활용 분야'), document.createTextNode(list(style.use_cases).join(' · ')));
  const actions = element('div', 'card-actions');
  const compareLabel = element('label', 'compare-label');
  const checkbox = element('input');
  checkbox.type = 'checkbox';
  checkbox.dataset.compareId = style.id;
  checkbox.setAttribute('aria-label', `${style.name} 비교`);
  checkbox.addEventListener('change', () => {
    if (checkbox.checked) compareIds.add(style.id);
    else compareIds.delete(style.id);
    updateCompare();
    if (compareIds.size === 2) openCompare(checkbox);
  });
  compareLabel.append(checkbox, document.createTextNode('비교'));
  actions.append(compareLabel, selectButton(style));
  body.append(features, uses, actions);
  card.append(media, body);
  card.addEventListener('click', (event) => {
    if (!event.target.closest('button, input, label')) openDetail(index, card);
  });
  card.addEventListener('keydown', (event) => {
    if (event.target === card && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      openDetail(index, card);
    }
  });
  card.addEventListener('pointerenter', (event) => {
    if (event.pointerType === 'touch') return;
    hoveredCard = card;
    previewCard(card);
  });
  card.addEventListener('pointerleave', () => { hoveredCard = null; previewCard(focusedCard); });
  card.addEventListener('focusin', () => { focusedCard = card; previewCard(card); });
  card.addEventListener('focusout', (event) => {
    if (!card.contains(event.relatedTarget)) { focusedCard = null; previewCard(hoveredCard); }
  });
  return card;
}

function updateCompare() {
  const chosen = styles.filter((style) => compareIds.has(style.id));
  $('#compare-tray').hidden = chosen.length === 0;
  $('#compare-summary').textContent = `${chosen.length}/2 선택 · ${chosen.map((style) => style.name).join(' + ')}`;
  $('#compare-open').disabled = chosen.length !== 2;
  $('#compare-open').textContent = chosen.length === 2 ? '나란히 비교하기' : '2개를 골라 비교';
  document.querySelectorAll('[data-compare-id]').forEach((node) => {
    node.checked = compareIds.has(node.dataset.compareId);
    node.disabled = chosen.length === 2 && !node.checked;
  });
}

$('#compare-clear').addEventListener('click', () => { compareIds.clear(); updateCompare(); });
$('#compare-open').addEventListener('click', () => openCompare($('#compare-open')));

function resetPlayer() {
  cancelAnimationFrame(progressAnimation);
  modalFrames = [];
  content.replaceChildren();
  playing = false;
}

function beginModal(mode, origin) {
  stopHover();
  resetPlayer();
  modalMode = mode;
  if (!dialog.open) {
    returnFocus = origin || document.activeElement;
    dialog.showModal();
    document.body.classList.add('modal-open');
  }
}

function stage(style) {
  const node = element('div', 'demo-stage');
  const status = element('p', 'demo-status', '데모를 준비하고 있습니다…');
  const frame = createDemo(style, () => {
    status.hidden = true;
    if (modalFrames.every((item) => item.dataset.ready === 'true')) {
      modalFrames.forEach((item) => command(item, 'seek', 0));
      modalFrames.forEach((item) => command(item, 'play'));
      playing = true;
      const toggle = content.querySelector('[data-toggle]');
      if (toggle) { toggle.disabled = false; toggle.textContent = '일시정지'; toggle.setAttribute('aria-label', '데모 일시정지'); }
    }
  }, () => { status.textContent = '데모를 불러오지 못했습니다. 파일이 준비되었는지 확인해 주세요.'; });
  modalFrames.push(frame);
  node.append(frame, status);
  return node;
}

function controls(stages) {
  const row = element('div', 'player-controls');
  const toggle = button('재생 준비 중', '', () => {
    playing = !playing;
    modalFrames.forEach((frame) => command(frame, playing ? 'play' : 'pause'));
    toggle.textContent = playing ? '일시정지' : '재생';
    toggle.setAttribute('aria-label', playing ? '데모 일시정지' : '데모 재생');
  });
  toggle.dataset.toggle = '';
  toggle.disabled = true;
  const wrap = element('div', 'progress-wrap');
  const progress = element('progress');
  progress.max = 5;
  progress.value = 0;
  progress.setAttribute('aria-label', '5초 데모 진행 시간');
  const time = element('span', 'time-label', '0.0 / 5.0초');
  time.setAttribute('aria-hidden', 'true');
  wrap.append(progress, time);
  row.append(toggle, wrap);
  stages.forEach((node, index) => row.append(button(stages.length === 1 ? '전체 화면' : `${index + 1}번 전체 화면`, 'quiet', async () => {
    try { await node.requestFullscreen(); }
    catch { $('#dialog-eyebrow').textContent = '이 브라우저에서는 전체 화면을 열 수 없습니다.'; }
  })));
  function update() {
    if (!dialog.open) return;
    try {
      const t = modalFrames[0]?.contentWindow?.__demo?.time;
      if (Number.isFinite(t)) { progress.value = t; time.textContent = `${t.toFixed(1)} / 5.0초`; }
    } catch { /* 준비되지 않은 프레임은 다음 화면 갱신 때 다시 확인한다. */ }
    progressAnimation = requestAnimationFrame(update);
  }
  progressAnimation = requestAnimationFrame(update);
  return row;
}

function openDetail(index, origin) {
  detailIndex = (index + styles.length) % styles.length;
  const style = styles[detailIndex];
  beginModal('detail', origin);
  $('#dialog-eyebrow').textContent = '5초 반복 재생 · ← → 이전 / 다음 스타일';
  $('#dialog-title').textContent = label(style);
  const demo = stage(style);
  content.append(demo, controls([demo]), element('p', 'detail-tagline', style.tagline || ''));
  const details = element('dl', 'details');
  [
    ['그래픽 스타일', style.axes?.graphic_style],
    ['공간 표현·카메라', style.axes?.space_camera],
    ['잘 맞는 연출기법', list(style.axes?.fits_techniques).join(' · ')],
    ['구현 기술', list(style.tech).join(' · ')],
  ].forEach(([title, description]) => {
    const group = element('div');
    group.append(element('dt', '', title), element('dd', '', description || '정보 준비 중'));
    details.append(group);
  });
  const actions = element('div', 'detail-actions');
  const nav = element('div', 'detail-nav');
  nav.append(button('← 이전 스타일', 'quiet', () => { openDetail(detailIndex - 1); content.querySelector('.detail-nav button').focus(); }), button('다음 스타일 →', 'quiet', () => { openDetail(detailIndex + 1); content.querySelector('.detail-nav button:last-child').focus(); }));
  actions.append(nav, selectButton(style));
  content.append(details, actions);
  $('#dialog-close').focus();
}

function openCompare(origin) {
  const chosen = styles.filter((style) => compareIds.has(style.id));
  if (chosen.length !== 2) return;
  beginModal('compare', origin);
  $('#dialog-eyebrow').textContent = '같은 장면 · 같은 시간 · 두 가지 스타일';
  $('#dialog-title').textContent = '스타일 나란히 비교';
  const columns = element('div', 'comparison-grid');
  const stages = chosen.map((style) => {
    const column = element('section', 'comparison-item');
    const demo = stage(style);
    column.append(element('h3', '', label(style)), demo, element('p', 'detail-tagline', style.tagline || ''), selectButton(style));
    columns.append(column);
    return demo;
  });
  content.append(columns, controls(stages), element('p', 'comparison-note', '두 데모는 0초에서 함께 시작해 5초마다 반복됩니다. 일시정지와 재생도 함께 적용됩니다.'));
  $('#dialog-close').focus();
}

$('#dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (event) => {
  const bounds = dialog.getBoundingClientRect();
  if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
});
dialog.addEventListener('close', () => {
  resetPlayer();
  modalMode = null;
  document.body.classList.remove('modal-open');
  hoveredCard = null;
  focusedCard = null;
  returnFocus?.focus({ preventScroll: true });
  // 닫힌 직후 초점 복원으로 카드 데모가 다시 시작되지 않게 한다.
  stopHover();
});
dialog.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') { event.preventDefault(); dialog.close(); return; }
  if (event.key === 'Tab') {
    const items = [...dialog.querySelectorAll('button:not(:disabled), input:not(:disabled), [tabindex="0"]')].filter((node) => node.getClientRects().length);
    const first = items[0];
    const last = items.at(-1);
    if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
  }
  if (modalMode === 'detail' && ['ArrowLeft', 'ArrowRight'].includes(event.key)) {
    event.preventDefault();
    openDetail(detailIndex + (event.key === 'ArrowLeft' ? -1 : 1));
  }
});
document.addEventListener('keydown', (event) => {
  if (dialog.open || event.ctrlKey || event.metaKey || event.altKey || event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
  if (/^[1-8]$/.test(event.key)) {
    const index = styles.findIndex((style) => style.number === Number(event.key));
    if (index !== -1) { event.preventDefault(); openDetail(index, grid.children[index]); }
  }
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    stopHover();
    if (playing) content.querySelector('[data-toggle]')?.click();
  }
});
window.addEventListener('blur', stopHover);

async function init() {
  let catalog;
  let fallback = false;
  try {
    catalog = await getJSON('/api/styles');
    if (!Array.isArray(catalog) || catalog.some((style) => !validStyle(style))) throw new Error('스타일 목록 형식 오류');
  } catch {
    fallback = true;
    const results = await Promise.allSettled(FALLBACK_IDS.map((id) => getJSON(`../styles/${id}/style.json`)));
    catalog = results.filter((result) => result.status === 'fulfilled' && validStyle(result.value)).map((result) => result.value);
  }
  styles = [...new Map(catalog.map((style) => [style.id, style])).values()].sort((a, b) => a.number - b.number);
  grid.replaceChildren(...styles.map(renderCard));
  $('#style-count').textContent = `${styles.length}가지 스타일`;
  $('#catalog-status').textContent = styles.length === 0 ? '아직 불러올 수 있는 스타일이 없습니다. 스타일 파일과 서버를 확인한 뒤 새로고침해 주세요.'
    : fallback ? `스타일 목록 API에 연결하지 못해 개별 파일에서 ${styles.length}종을 불러왔습니다.` : '';
  try {
    const previous = await getJSON('/api/selection');
    if (previous.id) {
      const style = styles.find((item) => item.id === previous.id);
      if (style) { selectedId = style.id; markSelected(); showSelection(style, 'saved', '이전에 저장한 선택을 불러왔습니다. 아래 문구를 복사해 대화에 붙여 넣으세요.'); }
    }
  } catch {
    $('#catalog-status').textContent += ' 이전 선택을 불러오지 못했습니다. 선택 시 서버 저장 여부를 다시 안내합니다.';
  }
}

init();
