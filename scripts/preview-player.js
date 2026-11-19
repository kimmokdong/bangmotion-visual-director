(() => {
  const el = name => document.getElementById('bmvd-' + name);
  const { fps, scenes, missingScenes, projectName, webAudio } = window.__bmvdConfig;
  const root = document.documentElement;
  const stage = el('stage');
  const range = el('range');
  const time = el('time');
  const play = el('play');
  const loop = el('loop');
  const speed = el('speed');
  const sound = el('sound');
  const audio = el('audio');
  const copy = el('copy');
  const toast = el('toast');
  const present = el('present');
  const record = el('record');
  const recordLabel = record.textContent;
  const audioContext = webAudio && window.AudioContext ? new AudioContext() : null;
  const master = audioContext?.createGain();
  master?.connect(audioContext.destination);
  const sources = new Set();
  let buffers;
  let audioAnchor;
  let scheduledSources = 0;
  const audioLoading = audioContext && Promise.all(webAudio.assets.map(async src => {
    try {
      const data = await (await fetch(src)).arrayBuffer();
      return await audioContext.decodeAudioData(data);
    } catch (error) {
      console.warn('내장 소리를 읽을 수 없습니다.', error);
      return null;
    }
  })).then(decoded => {
    buffers = decoded;
    if (!buffers.some(Boolean)) sound.hidden = true;
    if (clock) syncAudio(true);
  });
  const reloadState = new URLSearchParams(location.hash.slice(1));
  const audioVersion = reloadState.get('audio');
  if (audioVersion && audio.getAttribute('src') === './out/sound/mix.wav') {
    audio.src = './out/sound/mix.wav?v=' + encodeURIComponent(audioVersion);
  }

  let clock;
  let availableScenes;
  let activeScene;
  let selectedScene;
  let sceneButtons;
  let pendingAudio;
  let audioBlocked = false;
  let toastTimer;
  let previousTime;
  let cursorTimer;
  let capture;

  window.__bmvdViewport = {
    get width() { return stage.clientWidth; },
    get height() { return stage.clientHeight; },
  };
  window.__bmvdPreview = { update };
  new ResizeObserver(() => window.dispatchEvent(new Event('resize'))).observe(stage);

  function setLoop() {
    clock.setLoop(loop.checked && !capture?.recorder ? selectedScene || { start: 0, end: clock.duration } : undefined);
  }

  function syncWebAudio(force) {
    if (!buffers || audioContext.state !== 'running') return;
    const now = audioContext.currentTime;
    const t = clock.time;
    const rate = Number(speed.value);
    if (!force && audioAnchor && clock.playing &&
        Math.abs(t - audioAnchor.time - (now - audioAnchor.context) * rate) <= 0.12) return;
    if (!audioAnchor && !clock.playing) return;
    for (const source of sources) source.stop();
    sources.clear();
    audioAnchor = undefined;
    if (!clock.playing) return;

    audioAnchor = { time: t, context: now };
    const loopEnd = loop.checked && !capture?.recorder ? selectedScene?.end ?? clock.duration : clock.duration;
    for (const track of webAudio.tracks) {
      const buffer = buffers[track.asset];
      if (!buffer?.duration) continue;
      const length = track.loop ? track.end - track.start
        : Math.min(track.trim ?? buffer.duration, buffer.duration);
      const start = Math.max(t, track.start);
      const end = Math.min(track.start + length, track.end, loopEnd);
      if (start >= end) continue;

      const when = now + (start - t) / rate;
      const until = now + (end - t) / rate;
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = rate;
      source.loop = !!track.loop;
      const gain = audioContext.createGain();
      gain.gain.value = 10 ** (track.gain / 20);
      source.connect(gain);
      let output = gain;

      function applyFade(from, to, fadeStart, fadeEnd) {
        if (fadeStart >= fadeEnd) return;
        const fade = audioContext.createGain();
        output.connect(fade);
        output = fade;
        const valueAt = time => from + (to - from) * Math.min(1, Math.max(0, (time - fadeStart) / (fadeEnd - fadeStart)));
        fade.gain.setValueAtTime(valueAt(start), when);
        if (start < fadeEnd && end > fadeStart) {
          const rampStart = Math.max(start, fadeStart);
          const rampEnd = Math.min(end, fadeEnd);
          fade.gain.setValueAtTime(valueAt(rampStart), now + (rampStart - t) / rate);
          fade.gain.linearRampToValueAtTime(valueAt(rampEnd), now + (rampEnd - t) / rate);
        }
      }
      const fadeIn = Math.min(track.fadeIn ?? 0, length);
      const fadeOut = Math.min(track.fadeOut ?? (track.trim ? Math.min(0.25, length * 0.3) : 0), length);
      applyFade(0, 1, track.start, track.start + fadeIn);
      applyFade(1, 0, track.start + length - fadeOut, track.start + length);
      output.connect(master);
      const offset = (track.offset ?? 0) + start - track.start;
      source.start(when, track.loop ? offset % buffer.duration : offset);
      source.stop(until);
      sources.add(source);
      source.onended = () => sources.delete(source);
      scheduledSources++;
    }
    root.dataset.bmvdAudioScheduled = scheduledSources;
  }

  function syncAudio(force = false) {
    if (audioContext) {
      syncWebAudio(force);
      return;
    }
    if (audio.error || !Number.isFinite(audio.duration)) return;
    const t = Math.min(clock.time, audio.duration);
    if (force || Math.abs(audio.currentTime - t) > 0.12) audio.currentTime = t;
    if (!clock.playing || t >= audio.duration) {
      if (!audio.paused) audio.pause();
    } else if (audio.paused && !pendingAudio && !audioBlocked) {
      pendingAudio = audio.play().catch(error => {
        if (error.name === 'NotAllowedError') audioBlocked = true;
      }).finally(() => { pendingAudio = undefined; });
    }
  }

  function seek(t, resume = false) {
    if (selectedScene && (t < selectedScene.start || t >= selectedScene.end)) {
      selectedScene = undefined;
      setLoop();
    }
    clock.seek(t);
    if (resume) clock.play();
    previousTime = clock.time;
    syncAudio(true);
    update();
  }

  function jumpToScene(i) {
    selectedScene = availableScenes[i];
    loop.checked = true;
    setLoop();
    seek(selectedScene.start, true);
  }

  function setup() {
    clock = window.__demo;
    range.max = clock.duration;
    range.disabled = play.disabled = present.disabled = record.disabled = false;
    availableScenes = scenes.filter(scene => scene.start < clock.duration)
      .map(scene => ({ ...scene, end: Math.min(scene.end, clock.duration) }));
    sceneButtons = availableScenes.map((scene, i) => {
      const segment = document.createElement('span');
      segment.style.left = 100 * scene.start / clock.duration + '%';
      segment.style.width = 100 * (scene.end - scene.start) / clock.duration + '%';
      el('segments').append(segment);

      const chip = document.createElement('button');
      chip.type = 'button';
      chip.textContent = (i + 1) + '. ' + scene.label;
      chip.title = scene.start + '–' + scene.end + '초' + (i < 9 ? ' (' + (i + 1) + ')' : '');
      chip.addEventListener('click', () => jumpToScene(i));
      el('scenes').append(chip);
      return chip;
    });
    if (missingScenes) {
      el('note').textContent = 'scenes.json 이 없어 장면 버튼을 만들지 않았습니다';
      el('note').hidden = false;
    }
    const restored = Number(reloadState.get('t'));
    if (reloadState.has('t') && Number.isFinite(restored)) clock.seek(restored);
    sound.hidden = audioContext ? !!buffers && !buffers.some(Boolean) : !audio.hasAttribute('src') || !!audio.error;
    if (audioContext) sound.title += ' · 음량 측정 없이 대략 맞춘 소리 (ffmpeg 없음)';
    syncAudio(true);
  }

  function update() {
    if (!clock) setup();
    const t = clock.time;
    const stamp = t.toFixed(2) + '초 · ' + Math.floor(t * fps) + '프레임';
    if (time.value !== stamp) {
      time.value = stamp;
      range.setAttribute('aria-valuetext', stamp);
    }
    range.value = t;
    const caption = clock.playing ? 'Ⅱ 정지' : '▶ 재생';
    if (play.textContent !== caption) play.textContent = caption;
    const i = availableScenes.findIndex(scene => t >= scene.start && t < scene.end);
    if (i !== activeScene) {
      sceneButtons[activeScene]?.removeAttribute('aria-current');
      sceneButtons[i]?.setAttribute('aria-current', 'true');
      activeScene = i;
    }
    syncAudio(t < previousTime);
    previousTime = t;
    if (capture?.recorder?.state === 'recording' && !capture.timer && !clock.playing && t >= clock.duration) {
      const session = capture;
      session.timer = setTimeout(() => stopRecording(session), 500);
    }
  }

  function togglePlay() {
    if (clock.playing) clock.pause();
    else if (clock.time < clock.duration || !root.hasAttribute('data-bmvd-presenting')) clock.play();
    previousTime = clock.time;
    syncAudio(true);
    update();
  }

  function step(delta) {
    const frame = Math.max(0, Math.floor(clock.time * fps) + delta);
    const t = frame / fps;
    // 부동소수점 나눗셈으로 정확한 프레임 경계보다 살짝 작아지는 경우를 보정한다.
    seek(t * fps < frame ? t + Number.EPSILON * Math.max(1, t) : t);
  }

  function toggleSound() {
    if (sound.hidden) return;
    setSound(audio.muted);
  }

  function setSound(enabled) {
    audio.muted = !enabled;
    if (master) master.gain.value = Number(enabled);
    sound.setAttribute('aria-pressed', String(enabled));
    sound.textContent = enabled ? '🔊 소리' : '🔇 소리';
  }

  function showToast(message, duration = 1800) {
    clearTimeout(toastTimer);
    toast.textContent = message;
    if (duration) toastTimer = setTimeout(() => { toast.textContent = ''; }, duration);
  }

  async function enterPresentation() {
    el('shell').style.setProperty('--bmvd-stage-background', getComputedStyle(document.body).backgroundColor);
    await root.requestFullscreen();
    root.dataset.bmvdPresenting = '';
  }

  function playFromStart() {
    selectedScene = undefined;
    setLoop();
    setSound(true);
    seek(0, true);
  }

  async function togglePresentation() {
    if (capture) return;
    if (document.fullscreenElement === root) {
      await document.exitFullscreen();
      return;
    }
    retryAudio();
    try {
      await enterPresentation();
      await audioLoading;
      if (document.fullscreenElement === root) playFromStart();
    } catch {
      showToast('전체화면으로 전환할 수 없습니다. Chrome 또는 Edge에서 열어 주세요.', 6000);
    }
  }

  const captureHint = "다음 창에서 '이 탭'을 고르고 '탭 오디오도 공유'를 켜 주세요.";
  const captureHelp = 'Windows 캡처 도구(Win+Shift+R) 또는 Xbox Game Bar(Win+Alt+R)를 이용해 주세요. 고품질 MP4는 render-demo.js로 만들 수 있습니다.';

  function completeRecording(session, message) {
    if (capture !== session) return;
    capture = undefined;
    clearTimeout(session.timer);
    session.stream?.getTracks().forEach(track => track.stop());
    if (session.speed) {
      clock.pause();
      speed.value = session.speed;
      setSpeed();
      setLoop();
      document.title = session.title;
    }
    if (root.hasAttribute('data-bmvd-presenting') && document.fullscreenElement === root) {
      document.exitFullscreen().catch(() => {});
    }
    record.disabled = false;
    record.textContent = recordLabel;
    showToast(message, 12000);
  }

  function stopRecording(session) {
    if (capture !== session) return;
    if (!session.recorder) completeRecording(session, '탭 공유가 끝났습니다. ' + captureHelp);
    else if (session.recorder.state !== 'inactive') session.recorder.stop();
  }

  async function startRecording(session, retry = false) {
    record.disabled = true;
    try {
      await enterPresentation();
    } catch {
      if (capture !== session) return;
      if (retry) {
        completeRecording(session, '녹화할 전체화면을 열 수 없습니다. ' + captureHelp);
      } else {
        record.disabled = false;
        record.textContent = '⛶ 상영하며 녹화 시작';
        showToast('공유가 준비됐습니다. ⛶ 상영하며 녹화 시작을 눌러 주세요.', 0);
      }
      return;
    }
    await audioLoading;
    if (capture !== session || document.fullscreenElement !== root) {
      if (document.fullscreenElement === root) await document.exitFullscreen();
      return;
    }
    try {
      const recorder = new MediaRecorder(session.stream, { mimeType: session.mime, videoBitsPerSecond: 8_000_000 });
      session.recorder = recorder;
      const chunks = [];
      recorder.ondataavailable = ({ data }) => { if (data.size) chunks.push(data); };
      recorder.onerror = () => completeRecording(session, '녹화 중 오류가 발생했습니다. ' + captureHelp);
      recorder.onstop = () => {
        if (capture !== session) return;
        if (!chunks.length) {
          completeRecording(session, '저장할 영상이 없습니다. ' + captureHelp);
          return;
        }
        const type = recorder.mimeType || session.mime;
        const ext = type.startsWith('video/mp4') ? 'mp4' : 'webm';
        const url = URL.createObjectURL(new Blob(chunks, { type }));
        const link = document.createElement('a');
        link.href = url;
        const name = session.title.trim().replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').replace(/[. ]+$/, '');
        link.download = (name || projectName) + '.' + ext;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 30000);
        completeRecording(session, '영상 다운로드를 시작했습니다.');
      };
      session.speed = speed.value;
      session.title = document.title;
      speed.value = '1';
      setSpeed();
      document.title = '● 녹화 중 … ' + (session.title || projectName);
      showToast('');
      clock.seek(0);
      recorder.start(1000);
      playFromStart();
    } catch {
      completeRecording(session, '녹화를 시작할 수 없습니다. ' + captureHelp);
    }
  }

  async function recordVideo() {
    if (!clock) return;
    retryAudio();
    if (capture) {
      if (!record.disabled) await startRecording(capture, true);
      return;
    }
    const mime = ['video/mp4;codecs=avc1,mp4a', 'video/webm;codecs=vp9,opus', 'video/webm']
      .find(type => window.MediaRecorder?.isTypeSupported(type));
    const devices = navigator.mediaDevices;
    if (!devices?.getDisplayMedia || !mime || !document.fullscreenEnabled) {
      showToast('이 브라우저에서는 탭 녹화를 사용할 수 없습니다. ' + captureHelp, 12000);
      return;
    }
    const session = capture = { mime };
    record.disabled = true;
    showToast(captureHint, 0);
    try {
      // 공유창이 뜨기 전에 안내가 한 프레임은 표시되어야 한다.
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const supported = devices.getSupportedConstraints();
      const audioOptions = {};
      // 탭에서 이미 믹스한 소리에 마이크용 음량 보정을 다시 적용하지 않는다.
      for (const key of ['suppressLocalAudioPlayback', 'autoGainControl', 'echoCancellation', 'noiseSuppression']) {
        if (supported[key]) audioOptions[key] = false;
      }
      session.stream = await devices.getDisplayMedia({
        video: { frameRate: fps }, audio: Object.keys(audioOptions).length ? audioOptions : true, preferCurrentTab: true,
        selfBrowserSurface: 'include', systemAudio: 'include',
      });
      const [videoTrack] = session.stream.getVideoTracks();
      const surface = videoTrack?.getSettings().displaySurface;
      if (!videoTrack || (surface && surface !== 'browser') || (!sound.hidden && !session.stream.getAudioTracks().length)) {
        completeRecording(session, '공유 설정을 확인해 주세요. ' + captureHint);
        return;
      }
      session.stream.getTracks().forEach(track =>
        track.addEventListener('ended', () => stopRecording(session), { once: true }));
      await startRecording(session);
    } catch {
      completeRecording(session, '탭 공유가 취소되었거나 녹화를 시작할 수 없습니다. ' + captureHelp);
    }
  }

  async function copyTime() {
    const t = clock.time;
    const scene = availableScenes[activeScene];
    const text = t.toFixed(1) + '초 · ' + Math.floor(t * fps) + '프레임' +
      (scene ? ' (' + (activeScene + 1) + '. ' + scene.label + ')' : '');
    copy.dataset.copied = text;
    el('controls').dataset.copied = text;
    let copied = false;
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
    } catch {
      const field = document.createElement('textarea');
      const focused = document.activeElement;
      field.value = text;
      el('controls').append(field);
      field.select();
      try { copied = document.execCommand('copy'); }
      finally { field.remove(); focused?.focus({ preventScroll: true }); }
    }
    showToast(copied ? '시각을 복사했습니다' : text);
  }

  function reload() {
    location.hash = new URLSearchParams({ t: String(clock.time), audio: String(Date.now()) }).toString();
    location.reload();
  }

  function retryAudio() {
    if (audioContext?.state === 'suspended') audioContext.resume().catch(() => {});
    if (!audioBlocked) return;
    audioBlocked = false;
    syncAudio(true);
  }

  function setSpeed() {
    clock.setSpeed(Number(speed.value));
    audio.playbackRate = Number(speed.value);
    syncAudio(true);
  }

  document.addEventListener('fullscreenchange', () => {
    if (document.fullscreenElement === root || !root.hasAttribute('data-bmvd-presenting')) return;
    delete root.dataset.bmvdPresenting;
    delete root.dataset.bmvdCursor;
    clearTimeout(cursorTimer);
    if (capture?.stream) stopRecording(capture);
  });
  window.addEventListener('mousemove', () => {
    if (!root.hasAttribute('data-bmvd-presenting')) return;
    root.dataset.bmvdCursor = '';
    clearTimeout(cursorTimer);
    cursorTimer = setTimeout(() => { delete root.dataset.bmvdCursor; }, 2000);
  });
  audioContext?.addEventListener('statechange', () => { if (clock) syncAudio(true); });
  audio.addEventListener('error', () => { sound.hidden = true; });
  audio.addEventListener('loadedmetadata', () => { if (clock) syncAudio(true); });
  present.addEventListener('click', togglePresentation);
  record.addEventListener('click', recordVideo);
  play.addEventListener('click', togglePlay);
  el('back').addEventListener('click', () => step(-1));
  el('next').addEventListener('click', () => step(1));
  range.addEventListener('input', () => seek(range.valueAsNumber, clock.playing));
  loop.addEventListener('change', () => {
    setLoop();
    syncAudio(true);
  });
  speed.addEventListener('change', setSpeed);
  sound.addEventListener('click', toggleSound);
  copy.addEventListener('click', copyTime);
  el('reload').addEventListener('click', reload);
  window.addEventListener('click', retryAudio);
  window.addEventListener('keydown', event => {
    if (!clock || event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
    const { code, shiftKey, repeat, target } = event;
    retryAudio();
    if (root.hasAttribute('data-bmvd-presenting')) {
      if (repeat) return;
      if (code === 'Escape' || code === 'KeyF') document.exitFullscreen().catch(() => {});
      else if (code === 'Space') togglePlay();
      else if (code === 'KeyM') toggleSound();
      else return;
      event.preventDefault();
      return;
    }
    const arrow = code === 'ArrowLeft' || code === 'ArrowRight';
    const index = /^[1-9]$/.test(event.key) ? Number(event.key) - 1 : -1;
    if ((arrow && target === speed) || (code === 'Space' && [loop, present, record].includes(target))) return;
    if (arrow) {
      const direction = code === 'ArrowLeft' ? -1 : 1;
      if (shiftKey) seek(clock.time + direction * 0.5);
      else step(direction);
    } else if (code === 'Home') seek(0);
    else if (repeat) return;
    else if (code === 'Space') togglePlay();
    else if (code === 'KeyF') togglePresentation();
    else if (index >= 0 && index < availableScenes.length) jumpToScene(index);
    else if (code === 'KeyM') toggleSound();
    else if (code === 'KeyC') copyTime();
    else if (code === 'KeyR') reload();
    else return;
    event.preventDefault();
  });
})();
