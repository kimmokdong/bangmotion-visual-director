# 소리 가이드

큐 시각, 통합 음량(LUFS), 실제 피크, 모노 합산을 측정한다. AI는 소리를 직접 들을 수 없으므로 사람에게 헤드폰으로 확인할 시각 다섯 곳을 넘긴다. 보고서에는 측정값과 확인 범위를 적는다. “소리가 좋다”고 말하지 않는다.

소리 제작 순서는 Vox의 sound-pass 방식을 이 스킬에 맞게 적용했다. 번들 효과음의 출처와 라이선스는 [sound/LICENSES.md](../sound/LICENSES.md)에 있다. [Vox의 sound-pass](https://x.com/Voxyz_ai/status/2109358372873183564)

## 1. 설명 방식과 목적별 기본값

소리 전반에 관한 질문은 하지 않는다. 목적에 맞는 기본값으로 작업한다. 수업·설명 영상에 스타일 갤러리를 안내할 때만, 같은 메시지에 “설명 방식”을 한 번 묶어 묻는다. 이미 설명 방식이 정해졌으면 그대로 쓴다.

> 설명 방식도 함께 골라 주세요. ① 음악·효과음만(화면 글자로 설명, 추천) ② 내레이션 ③ 소리 없음

사용자가 스타일을 이미 골랐고 내레이션이나 무음을 요청하지 않았으면 ①로 진행한다. 이 경우 최종 보고에 음악·효과음과 화면 글자를 기본값으로 사용했다고 적는다. 스타일 선택을 맡긴 경우에도 목적별 기본값을 쓴다.

| 목적 | 기본 설명 방식 | 배경음악·환경음 | 효과음 |
|---|---|---|---|
| 수업·개념·과정 설명 | 음악·효과음만 | 잔잔한 음악을 효과음보다 8~12dB 낮게 | 카메라 이동에 약한 whoosh, 등장에 pop, 강조 1~2번 |
| 홍보 | 음악·효과음만 | 박자감 있는 곡, 큰 동작을 박자에 맞춤 | 대표 장면 공개에 impact 한 번 |
| 공간 소개·감상 | 음악·환경음 | 공간에 맞는 환경음 중심. 필요하면 잔잔한 음악 | 장면 속 행동에 필요한 소리만 |
| “소리 빼고”, “무음” | 소리 없음 | — | — |

## 2. 내용 소리와 스타일 소리

- **내용 소리**는 물건이나 사람이 장면 안에서 실제로 내는 소리다. 가위질, 바늘이 천을 통과하는 소리, 흐르는 물처럼 특정 물체의 소리는 소재를 따로 구한다. 큐의 `layer`는 `content`로 적는다.
- **스타일 소리**는 등장, 강조, 화면 전환의 리듬을 돕는다. 아래 범주에서 고르고 큐의 `layer`는 `style`로 적는다. 스타일 수정 시 장면 사건에 맞춰 이 큐를 조정한다.

| 스타일 | 소리 연출 | 번들 범주 |
|---|---|---|
| `01-isometric` | 블록이 내려앉거나 맞물릴 때 짧은 소리 | `tick` |
| `02-stylized-3d` | 카메라 이동에 가벼운 휙, 오브젝트 등장에 뿅 | `whoosh`, `pop` |
| `03-storybook-2p5d` | 그림책 요소가 드러날 때 작은 종·차임 느낌 | `ding` |
| `04-flat-vector` | 도형과 라벨이 등장하거나 맞물릴 때 짧은 뿅·딸깍 | `pop`, `click` |
| `05-paper-cutout` | 종이 조각이 미끄러져 들어올 때 부드러운 휙, 스톱모션처럼 멈출 때 마른 톡. 실제 종이 소리는 별도 수급 | `whoosh`, `tick` |
| `06-miniature-diorama` | 초점이 이동해 멎을 때 작은 딸깍. 모형의 고유한 동작 소리는 별도 수급 | `click` |
| `07-infographic` | 카운터에 짧은 톡, 핵심 수치 강조에 알림음 | `tick`, `ding` |
| `08-glassmorphism` | 패널 반응에 작은 전자음, 패널 이동에 가벼운 전환음 | `ui-blip`, `transition` |

## 3. 프로젝트의 `sound.json`

[수업·설명 영상 템플릿](../templates/sound.json)을 프로젝트에 `sound.json`으로 복사하고 장면표에 맞게 채운다. 음악 경로와 크레딧 예시를 실제 소스로 바꾸거나 `music: null`로 둔다.

| 키 | 값 |
|---|---|
| `mode` | `music-sfx`(기본), `narration`, `none`. `dialogue`도 기존 소리 설계 데이터에서 사용할 수 있다. |
| `duration` | 영상 길이(초). 미리보기·MP4에 쓸 영상 길이와 맞춘다. |
| `target` | 기본 `{"lufs": -16, "truePeak": -4, "lra": 11}`. |
| `music` | 배경음 파일 `file`, 영상의 시작점 `start`, 원본에서 건너뛸 길이 `offset`, `gain`, `fadeIn`, `fadeOut`, 출처·라이선스. |
| `ambience[]` | `file`, `start`, `end`, `offset`, `gain`, 양쪽 페이드 길이 `fade`, 출처·라이선스. |
| `cues[]` | 사건 시각 `t`, `type`, `sound`, `gain`, `desc`, `layer`(`content` 또는 `style`), 선택 `lead`·`dur`, 외부 소리의 출처·라이선스. |
| `voice[]` | `t`, `text`, `speaker`, `file`, `gain`, 출처·라이선스. |

- 시간 값은 초, `gain`은 dB다. `sfx:kit/pop.ogg`와 같이 `sfx:`로 시작하는 경로는 `sound/sfx/manifest.json`에 등록된 스킬 소리를 뜻한다. 다른 파일 경로는 프로젝트 폴더 기준이다.
- `sound`를 비우면 `type`에 따라 기본 소리를 고른다. `movement`·`scene_cut`은 whoosh, `appear`·`success`는 pop, `build_up`은 riser, `reveal`은 impact, `hover_or_small_ui`는 tick, `bed`는 ambience다. 매니페스트의 범주 이름도 `type`에 쓸 수 있다.
- `movement`·`scene_cut`은 기본으로 30fps 기준 2프레임 앞에서 시작한다. `lead`로 앞당기는 시간을 바꾼다. `dur`를 주면 해당 길이까지만 쓰고 끝을 페이드한다. riser는 다음 강조 시각에 **끝나도록** 배치한다.
- 내레이션은 로컬 녹음 파일 경로를 연결한다. 선택 사항인 `BMVD_TTS_CMD`로 실행 파일과 인자를 지정하면 `{text}`, `{speaker}`, `{out}`을 치환해 음성을 생성한다. 예를 들어 `python "C:/tts tools/tts.py" --text {text} --speaker {speaker} --out {out}`를 값으로 쓴다. 출력은 `out/sound/voice_<n>.wav`다. 녹음과 TTS가 모두 없으면 화면 글자로 전달하고 보고서에 남긴다.

## 4. 소리 출처와 라이선스

1. **번들 CC0 효과음**부터 찾는다. UI·등장·전환·강조는 `sound/TOP-PICKS.md`를 본다.
2. 맞는 소리나 음악이 없으면 무료 CC0·CC BY 자료를 검색한다. Freesound의 CC0 필터, Kenney의 CC0 팩, incompetech의 CC BY 곡이 출발점이다. 받기 전에 곡이나 효과음의 원본 페이지에서 라이선스를 확인한다. Mixkit·Pixabay 파일은 이용 조건을 확인하고 사용자 프로젝트에만 저장한다.
3. 검색으로도 맞는 소리가 없고 Agent Audio를 쓸 수 있으면 프로젝트에 생성한다. 출처와 사용 조건을 기록한다. 음악도 같은 순서를 따른다. 대체할 소스가 없으면 해당 큐를 빼고 보고한다.

외부 음원은 항목마다 `source`와 `license`를 기록한다. 필요한 경우 `title`, `creator` 또는 `artist`, `credit`도 남긴다. 자체 녹음은 그 사실과 사용 조건을 적는다. 라이선스나 출처가 미확인이면 공개 전에 해결한다. CC BY 소재는 `CREDITS.txt`의 표기를 영상 설명에 넣는다. 스킬 번들에는 CC0 파일만 넣는다.

## 5. 믹스·미리보기·내보내기

선행 작업으로 소스 음량을 비슷하게 맞추면 `gain`의 차이가 예측 가능해진다. 예를 들어 효과음 −20 LUFS, 환경음 −30 LUFS, 음악 −18 LUFS를 출발점으로 삼는다. 음성 > 효과음 > 음악 순으로 들리게 하고, 음성이 들어오면 믹서가 배경음악을 사이드체인으로 눌러 준다.

```text
node <스킬>/scripts/sound.js <프로젝트>
node <스킬>/scripts/render-demo.js --url <프로젝트>/index.html --out <프로젝트>/out/video.mp4
```

- 믹스 목표는 **−16 LUFS ±1, 실제 피크 −4 dBFS 이하**다. 선형 정규화에 피크 여유가 없으면 이득과 4배 오버샘플 리미터를 적용하고, 실제 측정값으로 이득을 최대 4회 조정한다. 모노 합산도 별도로 잰다.
- 결과는 `out/sound/`의 `mix.wav`, `SOUND.md`, `CREDITS.txt`, `report.json`, `waveform.png`다. 파형 PNG를 만들 수 없으면 보고서에 경고를 남긴다. Node.js와 ffmpeg로 동작한다.
- `bundle-preview.js`는 기본으로 믹스를 MP3 128 kbps로 바꿔 `preview.html`에 내장한다. ffmpeg가 없으면 `sound.json`에 연결한 원본 소리를 내장해 영상 시계에 맞춰 재생한다. 이 경우 음량 측정·정규화와 내레이션 덕킹은 생략되고, 소리 버튼에 “음량 측정 없이 대략 맞춘 소리 (ffmpeg 없음)”이 뜬다.
- `M`으로 소리를 켜거나 끈다. 탭을 녹화할 때는 공유창에서 **탭 오디오도 공유**를 켠다. `--no-embed-audio`를 쓴 HTML은 `./out/sound/mix.wav`를 함께 둔다. 개발용 `index.html`에서 믹스를 재생하려면 `start(render, { duration, audio: './out/sound/mix.wav' })`를 사용한다.
- `render-demo.js`는 로컬 HTML 옆의 `sound.json`을 읽는다. 별도 폴더는 `--sound <프로젝트>`로 지정한다. `mix.wav`가 없거나 설정 파일보다 오래된 경우 다시 만든다. 오디오 소스만 바꿨다면 `sound.js`를 직접 다시 실행한다. `--no-sound`는 소리 단계를 건너뛴다.
- MP4에 AAC 192 kbps 오디오를 영상 길이에 맞춰 붙이고, 내보낸 MP4를 다시 측정해 `out/sound/final-<영상 이름>.json`에 남긴다. 파일 하나만 재려면 `node <스킬>/scripts/sound.js --measure <영상.mp4>`를 쓴다.

## 6. 보고 전 확인

- [ ] `waveform.png`의 주황 세로선(큐 시각) 전후에 소리가 있는지, 영상 끝에서 효과음이 잘리지 않는지 본다. 미리 당긴 큐는 `SOUND.md`의 실제 시작 시각도 본다.
- [ ] `preview.html`에서 큐가 장면 사건과 맞는지 본다. 고품질 MP4를 만든 경우 큐 앞뒤의 프레임도 확인한다. 예를 들어 2초 큐는 `ffmpeg -ss 1.9 -i video.mp4 -frames:v 1 before.png`와 2.1초 프레임을 확인한다.
- [ ] 고품질 MP4를 만든 경우 `final-*.json`에서 `issues`와 모노 측정값을 본다. 합산할 때 레벨이 크게 달라지는 구간을 사람이 확인할 목록에 넣는다.
- [ ] `SOUND.md`에서 출처와 라이선스를 확인하고, CC BY 음원이 있으면 `CREDITS.txt`의 표기를 전달한다.
- [ ] `SOUND.md`의 헤드폰 확인 시각 다섯 곳과 최종 측정값을 사용자에게 전달한다.
