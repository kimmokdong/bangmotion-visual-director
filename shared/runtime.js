// BangMotion Visual Director — 데모 공통 재생 시계.
// 모든 데모는 render(t)를 "t(초)의 순수 함수"로 구현한다. 그래야 임의 시점 프레임 추출과 끊김 없는 5초 루프가 보장된다.
//
// 사용:  import { start } from '../../shared/runtime.js';  start((t) => draw(t));
// URL:   ?t=2.5  → 2.5초 프레임에 고정(캡처용)   ?paused=1 → 0초에서 정지 상태로 시작
// 제어:  window.__demo.seek(t) / play() / pause() / time
//        부모 창에서 postMessage({ bmvd: 'play' | 'pause' | 'seek', t })

export const DURATION = 5;

export function start(render, { duration = DURATION } = {}) {
  const q = new URLSearchParams(location.search);
  const wrap = (x) => ((x % duration) + duration) % duration;
  let t = q.has('t') ? parseFloat(q.get('t')) || 0 : 0;
  let playing = !q.has('t') && !q.has('paused');
  let last = performance.now();

  const draw = () => render(wrap(t));

  function frame(now) {
    // rAF 타임스탬프는 play() 시점보다 이를 수 있어 음수 dt 를 막는다(음수면 4.99초 프레임으로 한 번 튐).
    if (playing) t += Math.max(0, now - last) / 1000;
    last = now;
    draw();
    requestAnimationFrame(frame);
  }

  window.__demo = {
    duration,
    get time() { return wrap(t); },
    get playing() { return playing; },
    seek(x) { playing = false; t = x; draw(); },
    play() { playing = true; last = performance.now(); },
    pause() { playing = false; },
  };

  window.addEventListener('message', (e) => {
    const m = e.data;
    if (!m || !m.bmvd) return;
    if (m.bmvd === 'play') window.__demo.play();
    else if (m.bmvd === 'pause') window.__demo.pause();
    else if (m.bmvd === 'seek') window.__demo.seek(Number(m.t) || 0);
  });

  draw();
  window.__demoReady = true; // 캡처 스크립트가 이 값을 기다린다
  requestAnimationFrame(frame);
}

// 루프용 헬퍼: 5초 주기로 정확히 이어지는 값만 쓴다.
export const TAU = Math.PI * 2;
export const loop = (t, cycles = 1, phase = 0, duration = DURATION) => Math.sin(TAU * (cycles * t / duration + phase)); // -1..1
export const saw = (t, cycles = 1, phase = 0, duration = DURATION) => (((cycles * t / duration + phase) % 1) + 1) % 1;   // 0..1 반복(흐르는 물·구름 순환)
export const smooth = (x) => x * x * (3 - 2 * x);
