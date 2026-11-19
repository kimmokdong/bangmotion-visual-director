'use strict';
// 소리 믹스: 프로젝트의 sound.json → out/sound/mix.wav (+ CREDITS.txt, SOUND.md, report.json, waveform.png)
//   node scripts/sound.js <프로젝트>
//   node scripts/sound.js --measure a.mp4
// render-demo.js 가 믹스를 붙인 최종 MP4 를 다시 측정한다.
const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const { ROOT, runFFmpeg, hasFFmpeg, readJSON, writeJSON, parseArgs, inside, main } = require('./lib');

const SFX_DIR = path.join(ROOT, 'sound', 'sfx');
const TARGET = { lufs: -16, truePeak: -4, lra: 11 };
const MODES = { 'music-sfx': '음악·효과음만', narration: '내레이션', dialogue: '대화·이야기', none: '소리 없음' };
const LEAD = { movement: 2 / 30, scene_cut: 2 / 30 }; // 휙 소리는 움직임보다 30fps 기준 2프레임 먼저
let sfxManifest = null;

function loadManifest() {
  if (!sfxManifest) sfxManifest = JSON.parse(fsSync.readFileSync(path.join(SFX_DIR, 'manifest.json'), 'utf8'));
  return sfxManifest;
}

/** 소리 경로 해석: 'sfx:kit/pop.ogg' = 스킬 번들, 그 외 = 프로젝트 기준 상대 경로. 반환 { file, meta } */
function resolveSound(ref, project) {
  if (typeof ref !== 'string' || !ref.trim()) throw new Error('소리 파일 경로가 필요합니다.');
  if (ref.startsWith('sfx:')) {
    const rel = ref.slice(4);
    const m = loadManifest();
    const meta = m.bundled.find((b) => b.file === rel) || m.default_kit.find((b) => b.file === rel && b.bundled);
    if (!meta || meta.license !== 'CC0 1.0') throw new Error(`번들 CC0 효과음 목록에 없습니다: ${ref}`);
    return { file: localFile(SFX_DIR, rel),
      meta: { title: meta.title || path.basename(rel), creator: meta.creator || meta.attribution, source: meta.source_url, license: meta.license, credit: meta.credit || meta.attribution } };
  }
  return { file: localFile(project, ref), meta: null };
}

function localFile(root, ref) {
  const file = path.resolve(root, ref);
  if (/^(?:[a-z][a-z\d+.-]*:|[\\/])/i.test(ref) || !inside(root, file)
    || (fsSync.existsSync(file) && !inside(fsSync.realpathSync(root), fsSync.realpathSync(file)))) {
    throw new Error(`소리 파일에 폴더 안의 상대 경로를 사용하세요: ${ref}`);
  }
  return file;
}

/** 큐 종류 → 기본 키트 소리(sfx/manifest.json category_map + default_kit) */
function defaultFor(type) {
  const m = loadManifest();
  const cat = Object.hasOwn(m.category_map, type) ? m.category_map[type] : type;
  const k = m.default_kit.find((x) => x.category === cat && x.bundled);
  if (k) return 'sfx:' + k.file;
  const b = m.bundled.find((x) => x.category === cat);
  return b ? 'sfx:' + b.file : null;
}

async function durationOf(file, stream = 'a') {
  const progress = await runFFmpeg(['-nostats', '-progress', 'pipe:2', '-i', file, '-map', `0:${stream}:0`, '-f', 'null', '-']);
  // 마지막 progress 블록에 실제로 디코딩한 스트림의 끝 시각이 있다.
  const times = [...progress.matchAll(/^out_time_us=(\d+)\s*$/gm)];
  if (!times.length) throw new Error(`미디어 길이를 읽을 수 없습니다: ${file}`);
  return Number(times.at(-1)[1]) / 1e6;
}

/** ebur128 로 통합 음량·실제 피크 측정. mono=true 면 모노로 합친 결과(폰 스피커 확인용) */
async function measure(file, { mono = false } = {}) {
  const filter = (mono ? 'aformat=channel_layouts=mono,' : '') + 'ebur128=peak=true:framelog=verbose';
  const text = await runFFmpeg(['-nostats', '-i', file, '-map', '0:a:0', '-af', filter, '-f', 'null', '-'], { loglevel: 'info' });
  const sum = text.slice(text.lastIndexOf('Summary:'));
  const num = (re) => { const m = sum.match(re); return m ? Number(m[1]) : null; };
  return { file, lufs: num(/I:\s+(-?[\d.]+) LUFS/), lra: num(/LRA:\s+(-?[\d.]+) LU/), truePeak: num(/Peak:\s+(-?[\d.]+) dBFS/) };
}

function judge(m, target = TARGET) {
  const issues = [];
  if (m.lufs === null) issues.push('음량 측정 실패');
  else if (Math.abs(m.lufs - target.lufs) > 1) issues.push(`통합 음량 ${m.lufs} LUFS (목표 ${target.lufs}±1)`);
  if (m.truePeak === null) issues.push('실제 피크를 측정할 수 없습니다.');
  else if (m.truePeak > target.truePeak) issues.push(`실제 피크 ${m.truePeak} dBFS (목표 ${target.truePeak} 이하)`);
  return issues;
}

function number(value, name, min = -Infinity, max = Infinity) {
  if (!Number.isFinite(value) || value < min || value > max) throw new Error(`sound.json의 ${name} 값이 범위를 벗어났습니다: ${value}`);
  return value;
}

function targets(cfg) {
  const target = { ...TARGET, ...cfg.target };
  number(target.lufs, 'target.lufs', -70, -5);
  number(target.truePeak, 'target.truePeak', -8.5, 0);
  number(target.lra, 'target.lra', 1, 50);
  return target;
}

function validateConfig(cfg) {
  if (!cfg || typeof cfg !== 'object' || Array.isArray(cfg)) throw new Error('sound.json은 JSON 객체여야 합니다.');
  const mode = cfg.mode ?? 'music-sfx';
  if (!Object.hasOwn(MODES, mode)) throw new Error(`알 수 없는 설명 방식: ${mode}`);
  return mode;
}

function cueLead(cue) {
  return cue.lead ?? (Object.hasOwn(LEAD, cue.type) ? LEAD[cue.type] : 0);
}

// 브라우저에서 원본 소리를 재생할 때도 믹스와 같은 기본값·경로 규칙을 쓴다.
function previewTracks(cfg, project) {
  if (validateConfig(cfg) === 'none') return [];
  const duration = number(cfg.duration, 'duration', Number.EPSILON);
  for (const key of ['ambience', 'cues', 'voice']) {
    if (cfg[key] != null && !Array.isArray(cfg[key])) throw new Error(`sound.json의 ${key}는 배열이어야 합니다.`);
  }
  const tracks = [];
  function add(ref, track) {
    tracks.push({ ...track, file: resolveSound(ref, project).file, end: track.end ?? duration });
  }
  const music = cfg.music;
  if (music?.file) {
    const start = number(music.start ?? 0, 'music.start', 0);
    number(duration - start, 'duration - music.start', Number.EPSILON);
    add(music.file, { start, loop: true, offset: number(music.offset ?? 0, 'music.offset', 0),
      gain: number(music.gain ?? -12, 'music.gain'), fadeIn: number(music.fadeIn ?? 0.6, 'music.fadeIn', 0),
      fadeOut: number(music.fadeOut ?? 1.5, 'music.fadeOut', 0) });
  }
  for (const a of cfg.ambience ?? []) {
    const start = number(a.start ?? 0, 'ambience.start', 0);
    const end = Math.min(duration, number(a.end ?? duration, 'ambience.end', 0));
    number(end - start, 'ambience 길이', Number.EPSILON);
    const fade = number(a.fade ?? 0.8, 'ambience.fade', 0);
    add(a.file, { start, end, loop: true, offset: number(a.offset ?? 0, 'ambience.offset', 0),
      gain: number(a.gain ?? -18, 'ambience.gain'), fadeIn: fade, fadeOut: fade });
  }
  for (const cue of cfg.cues ?? []) {
    const ref = cue.sound || defaultFor(cue.type);
    if (!ref) continue;
    const start = Math.max(0, number(cue.t, 'cues.t', 0) - number(cueLead(cue), 'cues.lead', 0));
    const trim = cue.dur == null ? undefined : number(cue.dur, 'cues.dur', Number.EPSILON);
    add(ref, { start, trim, gain: number(cue.gain ?? -8, 'cues.gain') });
  }
  for (const voice of cfg.voice ?? []) {
    if (voice.file) add(voice.file, { start: number(voice.t, 'voice.t', 0), gain: number(voice.gain ?? 0, 'voice.gain') });
  }
  return tracks;
}

/** sound.json → 믹스. 반환 { mix, report } 또는 null(sound.json 없음 / 소리 없음 모드) */
async function buildMix(projectDir, { quiet = false, outputDir } = {}) {
  const project = path.resolve(projectDir);
  const cfg = await readConfig(project);
  if (cfg === undefined) { if (!quiet) console.log('[정보] sound.json 이 없어 소리 없이 진행합니다.'); return null; }
  const mode = validateConfig(cfg);
  const D = mode === 'none' && cfg.duration === undefined ? null : number(cfg.duration, 'duration', Number.EPSILON);
  const target = targets(cfg);
  const outDir = outputDir ?? path.join(project, 'out', 'sound');
  await fs.mkdir(outDir, { recursive: true });
  const mixFile = path.join(outDir, 'mix.wav');
  const warnings = [];
  const used = []; // CREDITS 용
  const cueRows = [];
  if (mode === 'none') return saveReport();
  if (!hasFFmpeg()) throw new Error('ffmpeg 가 없습니다.');
  for (const key of ['ambience', 'cues', 'voice']) {
    if (cfg[key] != null && !Array.isArray(cfg[key])) throw new Error(`sound.json의 ${key}는 배열이어야 합니다.`);
  }
  const inputs = [];
  const chains = [];
  const voiceLabels = [];
  const otherLabels = [];
  let musicLabel = null;
  let inputCount = 0;
  const addInput = (file, loop) => { inputs.push(...(loop ? ['-stream_loop', '-1'] : []), '-i', file); return inputCount++; };
  const credit = (role, ref, entry, r) => {
    const m = r.meta || {};
    const lic = entry.license || m.license || null;
    const src = entry.source || m.source || null;
    if (!lic) warnings.push(`라이선스 미확인: ${ref} (${role}) — 출처·라이선스를 sound.json 에 적기 전에는 공개하지 말 것`);
    else if (!src) warnings.push(`출처 미확인: ${ref} (${role}) — 출처를 sound.json 에 적기 전에는 공개하지 말 것`);
    used.push({ role, ref, title: entry.title || m.title || path.basename(r.file), creator: entry.artist || entry.creator || m.creator || '', source: src, license: lic, credit: entry.credit || m.credit || '' });
  };
  const fmt = 'aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo';
  const ms = (t) => Math.max(0, Math.round(t * 1000));
  const fades = (inTime, outTime, length) => [
    inTime > 0 ? `,afade=t=in:d=${Math.min(inTime, length)}` : '',
    outTime > 0 ? `,afade=t=out:st=${Math.max(0, length - outTime).toFixed(3)}:d=${Math.min(outTime, length)}` : '',
  ].join('');

  // 음악
  if (cfg.music && cfg.music.file) {
    const r = resolveSound(cfg.music.file, project);
    if (!fsSync.existsSync(r.file)) throw new Error(`음악 파일이 없습니다: ${r.file}`);
    const mu = { offset: 0, gain: -12, fadeIn: 0.6, fadeOut: 1.5, start: 0, ...cfg.music };
    for (const key of ['offset', 'fadeIn', 'fadeOut', 'start']) number(mu[key], `music.${key}`, 0);
    number(mu.gain, 'music.gain');
    const len = number(D - mu.start, 'duration - music.start', Number.EPSILON);
    const i = addInput(r.file, true);
    chains.push(`[${i}:a]${fmt},atrim=start=${mu.offset}:duration=${len.toFixed(3)},asetpts=PTS-STARTPTS${fades(mu.fadeIn, mu.fadeOut, len)},volume=${mu.gain}dB,adelay=${ms(mu.start)}:all=1[mus]`);
    musicLabel = 'mus';
    credit('음악', cfg.music.file, cfg.music, r);
  }
  // 바탕 소리(환경음)
  (cfg.ambience || []).forEach((a, k) => {
    const r = resolveSound(a.file, project);
    if (!fsSync.existsSync(r.file)) throw new Error(`환경음 파일이 없습니다: ${r.file}`);
    const st = number(a.start ?? 0, `ambience[${k}].start`, 0);
    const en = Math.min(D, number(a.end ?? D, `ambience[${k}].end`, 0));
    const len = number(en - st, `ambience[${k}] 길이`, Number.EPSILON);
    const fade = number(a.fade ?? 0.8, `ambience[${k}].fade`, 0);
    const offset = number(a.offset ?? 0, `ambience[${k}].offset`, 0);
    const gain = number(a.gain ?? -18, `ambience[${k}].gain`);
    const i = addInput(r.file, true);
    chains.push(`[${i}:a]${fmt},atrim=start=${offset}:duration=${len.toFixed(3)},asetpts=PTS-STARTPTS${fades(fade, fade, len)},volume=${gain}dB,adelay=${ms(st)}:all=1[amb${k}]`);
    otherLabels.push(`amb${k}`);
    credit('환경음', a.file, a, r);
  });
  // 효과음 큐
  const durations = new Map();
  for (const [k, c] of (cfg.cues || []).entries()) {
    const ref = c.sound || defaultFor(c.type);
    if (!ref) { warnings.push(`큐 ${k} (${c.type}) 에 맞는 소리가 없습니다 — 건너뜀`); continue; }
    const r = resolveSound(ref, project);
    if (!fsSync.existsSync(r.file)) throw new Error(`효과음 파일이 없습니다: ${r.file}`);
    const lead = number(cueLead(c), `cues[${k}].lead`, 0);
    const at = Math.max(0, number(c.t, `cues[${k}].t`, 0) - lead);
    const gain = number(c.gain ?? -8, `cues[${k}].gain`);
    if (!durations.has(r.file)) durations.set(r.file, await durationOf(r.file));
    const len = durations.get(r.file);
    const dur = Math.min(number(c.dur ?? len, `cues[${k}].dur`, Number.EPSILON), len);
    const fo = Math.min(0.25, dur * 0.3);
    const trim = c.dur ? `,atrim=0:${dur.toFixed(3)},afade=t=out:st=${Math.max(0, dur - fo).toFixed(3)}:d=${fo.toFixed(3)}` : '';
    const i = addInput(r.file, false);
    chains.push(`[${i}:a]${fmt}${trim},asetpts=PTS-STARTPTS,volume=${gain}dB,adelay=${ms(at)}:all=1[c${k}]`);
    otherLabels.push(`c${k}`);
    if (at + dur > D + 0.05) warnings.push(`큐 ${k} (${c.desc || c.type}) 이 영상 끝(${D}s)을 넘습니다 — 잘림`);
    cueRows.push({ k, t: c.t, at: +at.toFixed(3), dur: +dur.toFixed(3), type: c.type || '', desc: c.desc || '', ref, gain, layer: c.layer || '' });
    credit('효과음', ref, c, r);
  }
  // 음성(내레이션·대사) — TTS 연결 자리: references/sound-guide.md §음성
  (cfg.voice || []).forEach((v, k) => {
    let ref = v.file;
    let file = ref ? resolveSound(ref, project).file : null;
    if (!file || !fsSync.existsSync(file)) {
      file = synthesizeVoice(v, path.join(outDir, `voice_${k}.wav`));
      if (!file) { warnings.push(`음성 ${k} "${(v.text || '').slice(0, 20)}…": 녹음 파일 없음, TTS 미연결 — 화면 글자로만 전달됩니다`); return; }
      ref = path.relative(project, file);
    }
    const i = addInput(file, false);
    const gain = number(v.gain ?? 0, `voice[${k}].gain`);
    const at = number(v.t, `voice[${k}].t`, 0);
    chains.push(`[${i}:a]${fmt},asetpts=PTS-STARTPTS,volume=${gain}dB,adelay=${ms(at)}:all=1[v${k}]`);
    voiceLabels.push(`v${k}`);
    const tts = ref !== v.file;
    credit('음성', ref, { title: v.speaker || '내레이션', ...(tts ? { source: 'TTS', license: '자체 제작' } : {}), ...v },
      tts ? { file } : resolveSound(ref, project));
  });
  if (!inputs.length) return saveReport();

  // 음성이 있으면 음악을 8~12dB 눌러 준다(사이드체인 덕킹)
  const bus = [];
  if (voiceLabels.length) {
    chains.push(`${voiceLabels.map((l) => `[${l}]`).join('')}amix=inputs=${voiceLabels.length}:normalize=0:duration=longest,asplit=2[vox][voxsc]`);
    if (musicLabel) {
      chains.push(`[voxsc]apad=whole_dur=${D}[voxp];[${musicLabel}][voxp]sidechaincompress=threshold=0.02:ratio=6:attack=30:release=400:makeup=1[musd]`);
      bus.push('musd');
    }
    else chains.push('[voxsc]anullsink');
    bus.push('vox');
  } else if (musicLabel) bus.push(musicLabel);
  bus.push(...otherLabels);
  chains.push(`${bus.map((l) => `[${l}]`).join('')}amix=inputs=${bus.length}:normalize=0:duration=longest,apad=whole_dur=${D},atrim=0:${D},asetpts=PTS-STARTPTS[pre]`);
  const temp = await fs.mkdtemp(path.join(outDir, '.mix-'));
  try {
    const premix = path.join(temp, 'premix.wav');
    const freshMix = path.join(temp, 'mix.wav');
    await runFFmpeg([...inputs, '-filter_complex', chains.join(';'), '-map', '[pre]', '-ar', '48000', '-c:a', 'pcm_f32le', premix]);
    await normalize(premix, freshMix, target);
    const [m, mono] = await Promise.all([measure(freshMix), measure(freshMix, { mono: true })]);

    // 주황 세로선은 큐 시각이다. 움직임 큐의 실제 시작 시각은 보고서에 따로 적는다.
    const wave = path.join(temp, 'waveform.png');
    const W = 1600, H = 300;
    const marks = cueRows.filter(c => c.t <= D)
      .map(c => `drawbox=x=${Math.min(W - 2, Math.round(c.t / D * W))}:y=0:w=2:h=${H}:color=0xffb347@0.9:t=fill`);
    let waveform = null;
    try {
      const filter = [`showwavespic=s=${W}x${H}:split_channels=0:scale=sqrt:colors=0x6fb6ff`, ...marks].join(',');
      await runFFmpeg(['-i', freshMix, '-filter_complex', filter, '-frames:v', '1', '-update', '1', wave]);
      waveform = path.join(outDir, 'waveform.png');
      await fs.rename(wave, waveform);
    } catch {
      warnings.push('파형 PNG를 만들 수 없습니다. report.json의 큐 시각으로 확인하세요.');
    }
    return await saveReport({ ...m, file: mixFile, mono: { ...mono, file: mixFile } }, waveform, freshMix);
  } finally {
    await fs.rm(temp, { recursive: true, force: true });
  }

  async function saveReport(mix = null, waveform = null, freshMix) {
    const risky = [...cueRows].filter(c => c.at < D)
      .sort((a, b) => (b.gain + b.dur * 2) - (a.gain + a.dur * 2)).slice(0, 5)
      .map(c => ({ t: Math.min(D, c.t), why: `${c.desc || c.type} (${path.basename(c.ref)}, ${c.gain}dB, ${c.dur}s)` }));
    // 큐가 적은 영상도 도입·중간·끝에서 헤드폰으로 확인할 지점을 제공한다.
    if (mix) for (const ratio of [0.05, 0.25, 0.5, 0.75, 0.95]) {
      if (risky.length === 5) break;
      const t = D * ratio;
      if (risky.every(c => c.t.toFixed(2) !== t.toFixed(2))) risky.push({ t, why: '배경 소리·무음 구간 확인' });
    }
    if (!mix && mode !== 'none' && !warnings.length) warnings.push('sound.json에 재생할 소리가 없습니다.');
    const report = { mode, modeName: MODES[mode], duration: D, target, mix, issues: mix ? judge(mix, target) : [],
      warnings, cues: cueRows, used, risky, mixFile: mix ? mixFile : null, waveform };
    if (!waveform) await fs.rm(path.join(outDir, 'waveform.png'), { force: true });
    await fs.writeFile(path.join(outDir, 'CREDITS.txt'), creditsText(used), 'utf8');
    await fs.writeFile(path.join(outDir, 'SOUND.md'), soundMd(report), 'utf8');
    await writeJSON(path.join(outDir, 'report.json'), report);
    if (mix) await fs.rename(freshMix, mixFile);
    else await fs.rm(mixFile, { force: true });
    if (!quiet) {
      console.log(mix ? `[완료] ${mixFile}  (${mix.lufs} LUFS, 실제 피크 ${mix.truePeak} dBFS · 모노 ${mix.mono.lufs} LUFS / ${mix.mono.truePeak} dBFS)`
        : `[정보] ${MODES[mode]} · 믹스 없음`);
      for (const w of [...warnings, ...report.issues]) console.log(`[경고] ${w}`);
    }
    return mix ? { mix: mixFile, report } : null;
  }
}

async function normalize(premix, mixFile, target) {
  // 피크 여유 0.5dB 를 두고 내보낸 뒤 MP4 에서 다시 잰다.
  const tp = target.truePeak - 0.5;
  const base = `loudnorm=I=${target.lufs}:TP=${tp}:LRA=${target.lra}`;
  const pass1 = await runFFmpeg(['-nostats', '-i', premix, '-af', `${base}:print_format=json`, '-f', 'null', '-'], { loglevel: 'info' });
  const js = JSON.parse(pass1.slice(pass1.lastIndexOf('{'), pass1.lastIndexOf('}') + 1));
  const gain = target.lufs - Number(js.input_i);
  const save = af => runFFmpeg(['-i', premix, ...(af ? ['-af', af] : []), '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s16le', mixFile]);
  if (!Number.isFinite(gain) || !Number.isFinite(Number(js.input_tp))) {
    await save();
  } else if (Number(js.input_tp) + gain <= tp) {
    // 피크 여유가 충분: 선형 정규화(소리 모양 그대로)
    await save(`${base}:measured_I=${js.input_i}:measured_TP=${js.input_tp}:measured_LRA=${js.input_lra}:measured_thresh=${js.input_thresh}:offset=${js.target_offset}:linear=true,aresample=48000`);
  } else {
    // 짧은 효과음 피크 때문에 선형으로는 목표 음량에 못 미침 → 이득을 준 뒤 리미터로 피크만 누른다(4배 오버샘플 후 제한해 실제 피크 근사).
    // 리미터가 깎은 만큼 음량이 내려가므로 측정→이득 보정을 최대 4번 반복한다.
    const lim = Math.pow(10, (tp - 0.4) / 20).toFixed(4);
    let g = gain;
    let previousGain, previousLufs;
    for (let k = 0; k < 4; k++) {
      await save(`volume=${g.toFixed(2)}dB,aresample=192000,alimiter=limit=${lim}:attack=2:release=80:level=disabled:latency=1,aresample=48000`);
      const got = (await measure(mixFile)).lufs;
      if (got === null || Math.abs(got - target.lufs) < 0.3 || k === 3) break;
      // 제한 중에는 이득을 1dB 올려도 통합 음량이 1dB 오르지 않는다.
      const slope = k ? Math.max(0.25, Math.min(1, (got - previousLufs) / (g - previousGain))) : 0.5;
      previousGain = g;
      previousLufs = got;
      g += (target.lufs - got) / slope;
    }
  }
}

/** TTS 실행 인자에서 {text}, {out}, {speaker}를 치환한다. 셸을 거치지 않는다. */
function synthesizeVoice(v, out) {
  const cmd = process.env.BMVD_TTS_CMD;
  if (!cmd?.trim() || typeof v.text !== 'string' || !v.text) return null;
  const [exe, ...args] = (cmd.match(/(?:[^\s"]+|"[^"]*")+/g) ?? []).map(arg => arg.replaceAll('"', ''));
  if (!exe) return null;
  const values = { text: v.text, out, speaker: v.speaker || 'narrator' };
  const r = spawnSync(exe, args.map(arg => arg.replace(/\{(text|out|speaker)\}/g, (_, key) => values[key])),
    { stdio: 'inherit', windowsHide: true });
  return r.status === 0 && fsSync.existsSync(out) ? out : null;
}

function creditsText(used) {
  const seen = new Set();
  const lines = ['소리 출처 (영상 설명란에 붙여 넣을 수 있음)', ''];
  for (const u of used) {
    const key = u.ref;
    if (seen.has(key)) continue;
    seen.add(key);
    lines.push(`- [${u.role}] ${u.credit || `"${u.title}"${u.creator ? ' by ' + u.creator : ''}`}${u.source && !(u.credit || '').includes(u.source) ? ' — ' + u.source : ''} · ${u.license || '라이선스 미확인'}`);
  }
  lines.push('', 'CC0 소리는 출처 표기가 필요 없지만 출처 증빙으로 남깁니다. CC BY 음악은 위 표기를 영상 설명에 꼭 넣어야 합니다.');
  return lines.join('\n') + '\n';
}

function soundMd(r) {
  const L = ['# 소리 보고서', '', `- 설명 방식: ${r.modeName}${r.duration === null ? '' : ` · 길이 ${r.duration}초`}`];
  if (r.mix) L.push(`- 믹스(mix.wav): ${r.mix.lufs} LUFS, 실제 피크 ${r.mix.truePeak} dBFS, 모노 ${r.mix.mono.lufs} LUFS / ${r.mix.mono.truePeak} dBFS (목표 ${r.target.lufs} LUFS, 피크 ${r.target.truePeak} dBFS 이하)`,
    '- 최종 MP4 측정은 render-demo.js 가 out/sound/final-*.json 에 남긴다');
  L.push('');
  if (r.issues.length || r.warnings.length) { L.push('## 경고', ''); for (const w of [...r.issues, ...r.warnings]) L.push(`- ${w}`); L.push(''); }
  L.push('## 효과음 큐', '', '| # | 시각 | 실제 시작 | 길이 | 종류 | 층 | 설명 | 소리 | 음량 |', '|---|---|---|---|---|---|---|---|---|');
  for (const c of r.cues) L.push(`| ${c.k} | ${c.t}s | ${c.at}s | ${c.dur}s | ${c.type} | ${c.layer} | ${c.desc} | ${c.ref} | ${c.gain}dB |`);
  L.push('', '## 사용한 소리·라이선스', '', '| 역할 | 소리 | 출처 | 라이선스 |', '|---|---|---|---|');
  const seen = new Set();
  for (const u of r.used) { if (seen.has(u.ref)) continue; seen.add(u.ref); L.push(`| ${u.role} | ${u.title}${u.creator ? ' — ' + u.creator : ''} | ${u.source || '-'} | ${u.license || '**미확인**'} |`); }
  if (r.risky.length) {
    L.push('', '## 헤드폰으로 확인할 시각', '', 'AI 는 소리를 들을 수 없다. 아래 시각은 숫자로만 확인했으므로 사람이 들어 보고 판단한다.', '');
    for (const x of r.risky) L.push(`- ${x.t.toFixed(2)}초 — ${x.why}`);
  }
  return L.join('\n') + '\n';
}

async function readConfig(project) {
  try { return await readJSON(path.join(project, 'sound.json')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
}

/** mix.wav 가 sound.json 보다 오래됐으면 다시 만든다. */
async function ensureMix(projectDir) {
  const project = path.resolve(projectDir);
  const cfgFile = path.join(project, 'sound.json');
  const cfg = await readConfig(project);
  if (cfg === undefined) return null;
  const mode = validateConfig(cfg);
  const mix = path.join(project, 'out', 'sound', 'mix.wav');
  const stat = await fs.stat(mix).catch(error => {
    if (error.code !== 'ENOENT') throw error;
  });
  if (mode !== 'none' && stat?.isFile() && stat.mtimeMs >= (await fs.stat(cfgFile)).mtimeMs) {
    return { mix, target: targets(cfg) };
  }
  const result = await buildMix(project, { quiet: true });
  return result && { mix: result.mix, target: result.report.target };
}

/** 영상에 믹스를 넣는다(영상은 다시 인코딩하지 않음). 결과 MP4 의 음량을 재서 out/sound/final-<이름>.json 에 남긴다. */
async function muxInto(projectDir, video) {
  const res = await ensureMix(projectDir);
  if (!res) return null;
  const tmp = path.join(path.dirname(video), `.mux-${randomUUID()}.mp4`);
  const { target } = res;
  const duration = await durationOf(video, 'v');
  // AAC 인코딩은 실제 피크를 0.5~1dB 올릴 수 있다. 목표를 넘으면 넘은 만큼(+0.3dB) 낮춰 한 번 더 넣는다(영상은 그대로 복사).
  let m, mono, cut = 0;
  try {
    for (let k = 0; k < 2; k++) {
      const filter = cut ? `volume=-${cut.toFixed(2)}dB,apad` : 'apad';
      await runFFmpeg(['-i', video, '-i', res.mix, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy',
        '-af', filter, '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-t', String(duration), '-movflags', '+faststart', tmp]);
      m = await measure(tmp);
      if (k === 1 || m.truePeak === null || m.truePeak <= target.truePeak) break;
      cut = m.truePeak - target.truePeak + 0.3;
    }
    mono = { ...await measure(tmp, { mono: true }), file: video };
    await fs.rename(tmp, video);
  } finally {
    await fs.rm(tmp, { force: true });
  }
  if (cut) m.peakTrimDb = +cut.toFixed(2);
  const issues = judge(m, target);
  const rec = { video, ...m, file: video, mono, target, issues };
  await writeJSON(path.join(projectDir, 'out', 'sound', `final-${path.parse(video).name}.json`), rec);
  console.log(`[소리] ${path.basename(video)}: ${m.lufs} LUFS · 실제 피크 ${m.truePeak} dBFS · 모노 ${mono.lufs} LUFS / ${mono.truePeak} dBFS${issues.length ? ' · ' + issues.join(', ') : ' · 목표 안'}`);
  return rec;
}

if (require.main === module) {
  main(async () => {
    const o = parseArgs(process.argv.slice(2), { values: ['measure'], flags: [] });
    if (o.ids.length > 1 || (!o.ids.length && !o.measure)) throw new Error('사용법: node scripts/sound.js <프로젝트> 또는 --measure 영상.mp4');
    if (o.measure) {
      if (!hasFFmpeg()) throw new Error('ffmpeg 가 없습니다.');
      const [m, mono] = await Promise.all([measure(o.measure), measure(o.measure, { mono: true })]);
      console.log(JSON.stringify({ ...m, mono, issues: judge(m) }, null, 1));
      return;
    }
    await buildMix(o.ids[0]);
  });
}
module.exports = { buildMix, ensureMix, muxInto, measure, resolveSound, previewTracks, TARGET };
