// BangMotion Visual Director — 데모 공통 재생 시계.
// 모든 데모는 render(t)를 "t(초)의 순수 함수"로 구현한다. 그래야 임의 시점 프레임 추출과 끊김 없는 5초 루프가 보장된다.
//
// 사용:  import { start } from '../../shared/runtime.js';  start((t) => draw(t));
// URL:   ?t=2.5  → 2.5초 프레임에 고정(캡처용)   ?paused=1 → 0초에서 정지 상태로 시작
// 제어:  window.__demo.seek(t) / play() / pause() / time
// 갤러리: 부모 창에서 postMessage({ bmvd: 'play' | 'pause' | 'seek', t })

export const DURATION = 5;

export function start(render, { duration = DURATION, audio } = {}) {
  const q = new URLSearchParams(location.search);
  const preview = window.__bmvdPreview;
  const wrap = (x) => ((x % duration) + duration) % duration;
  const previewTime = (x) => Math.min(duration, Math.max(0, x));
  let t = q.has('t') ? parseFloat(q.get('t')) || 0 : 0;
  let playing = !preview && !q.has('t') && !q.has('paused');
  let rate = 1;
  let repeat;
  let last = performance.now();
  let track = audio && playing && !window.__bmvdCapture ? new Audio(audio) : null;
  let attempt = null;
  let waitingForGesture = false;

  const time = () => preview ? previewTime(t) : wrap(t);
  const draw = () => render(preview && t >= duration ? Math.max(0, duration - 1e-6) : time());
  const startClock = () => { playing = true; last = performance.now(); };

  function syncAudio(force = false) {
    if (!track || !Number.isFinite(track.duration)) return;
    const time = Math.min(wrap(t), track.duration);
    if (force || Math.abs(track.currentTime - time) > 0.08) track.currentTime = time;
    if (force || !playing) return;
    if (time >= track.duration) track.pause();
    else if (track.paused && !attempt) play();
  }

  function play() {
    if (preview && t >= duration) t = 0;
    if (!track || wrap(t) >= track.duration) return startClock();
    if (attempt) return;
    syncAudio(true);
    waitingForGesture = false;
    const pending = track.play();
    attempt = pending;
    pending.then(() => {
      if (attempt !== pending) return;
      attempt = null;
      startClock();
    }, error => {
      if (attempt !== pending) return;
      attempt = null;
      if (error.name === 'NotAllowedError') {
        playing = false;
        waitingForGesture = true;
      } else {
        track = null;
        startClock();
      }
    });
  }

  function pause() {
    playing = false;
    waitingForGesture = false;
    attempt = null;
    track?.pause();
  }

  function frame(now) {
    // rAF 타임스탬프는 play() 시점보다 이를 수 있어 음수 dt 를 막는다(음수면 4.99초 프레임으로 한 번 튐).
    if (playing) {
      t += Math.max(0, now - last) / 1000 * rate;
      if (repeat && t >= repeat.end) t = repeat.start + (t - repeat.end) % (repeat.end - repeat.start);
      else if (preview && t >= duration) { t = duration; pause(); }
    }
    last = now;
    if (playing && track) syncAudio();
    draw();
    preview?.update();
    requestAnimationFrame(frame);
  }

  window.__demo = {
    duration,
    get time() { return time(); },
    get playing() { return playing; },
    seek(x) { pause(); t = x; syncAudio(true); draw(); },
    play, pause,
  };

  if (preview) {
    window.__demo.setSpeed = value => { rate = value; };
    window.__demo.setLoop = range => { repeat = range; };
  } else {
    window.addEventListener('message', (e) => {
      const m = e.data;
      if (!m || (window.parent !== window && e.source !== window.parent)) return;
      if (m.bmvd === 'play') window.__demo.play();
      else if (m.bmvd === 'pause') window.__demo.pause();
      else if (m.bmvd === 'seek') window.__demo.seek(Number(m.t) || 0);
    });
  }

  if (track) {
    window.addEventListener('click', () => { if (waitingForGesture) play(); });
    window.addEventListener('keydown', (event) => {
      if (track && event.code === 'KeyM' && !event.repeat) track.muted = !track.muted;
      if (waitingForGesture) play();
    });
    playing = false;
    play();
  }

  draw();
  window.__demoReady = true; // 캡처 스크립트가 이 값을 기다린다
  requestAnimationFrame(frame);
}

// 루프용 헬퍼: 5초 주기로 정확히 이어지는 값만 쓴다.
export const TAU = Math.PI * 2;
export const loop = (t, cycles = 1, phase = 0, duration = DURATION) => Math.sin(TAU * (cycles * t / duration + phase)); // -1..1
export const saw = (t, cycles = 1, phase = 0, duration = DURATION) => (((cycles * t / duration + phase) % 1) + 1) % 1;   // 0..1 반복(흐르는 물·구름 순환)
export const smooth = (x) => x * x * (3 - 2 * x);
