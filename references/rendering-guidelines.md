# 렌더링 가이드라인

## 1. 재생 계약 (모든 영상 공통)
영상 HTML 은 스타일 데모와 같은 계약을 따른다. 그래야 스킬의 검증·렌더 스크립트를 그대로 쓸 수 있다.

- `shared/runtime.js` 를 프로젝트 폴더로 복사해 `start(render, { duration })` 로 구동한다.
- 소리를 만든 프로젝트는 `start(render, { duration, audio: './out/sound/mix.wav' })`로 연결한다. 재생·정지·탐색·반복을 화면 시계에 맞춘다. 자동 재생이 막히면 첫 클릭이나 키 입력으로 함께 시작하고, `M`으로 음소거를 전환한다. `?t=`, `?paused=1`은 무음이며 `seek(t)`는 재생을 멈춘다.
- `render(t)` 는 t 의 순수 함수. `window.__demo.seek(t)` 로 임의 프레임 이동, `?t=3.2` 로 고정.
- 논리 스테이지 1920×1080(세로 영상은 1080×1920), 창에 맞춰 비율 유지 스케일.
- 외부 요청은 가급적 없이(three.js 는 스킬 `vendor/three` 를 프로젝트로 복사). 웹폰트가 꼭 필요하면 프로젝트에 파일로 넣는다.
- GSAP 을 쓰고 싶으면(bang-motion 기법 재사용) 타임라인을 `paused: true` 로 만들고 `render(t)` 안에서 `tl.time(t)` 로만 움직인다. GSAP 자체 시계로 재생하지 않는다.

루프가 아닌 일반 영상(20초 설명 영상 등)은 `start(render, { duration: 20 })` 로 두면 끝에서 처음으로 돌아가 반복 재생된다. 검증할 때는 `--no-loop` 로 이음매 검사를 끈다.

## 2. 실시간 HTML 설정
| 항목 | 값 |
|---|---|
| 픽셀 비율 | `Math.min(devicePixelRatio, 2)` |
| WebGL AA | `antialias: true`. 후처리(EffectComposer)를 쓰면 MSAA 가 꺼지므로 렌더 타깃에 `samples: 4` 를 주거나 마지막에 SMAA |
| 그림자 | `PCFSoftShadowMap`, 맵 2048, 그림자 카메라 frustum 을 장면 크기에 맞게 |
| 텍스처 | `generateMipmaps`, `anisotropy = renderer.capabilities.getMaxAnisotropy()`, 색 텍스처는 `SRGBColorSpace` |
| 색 | `outputColorSpace = SRGBColorSpace`. 사실/반사실 3D 는 `ACESFilmicToneMapping`, 팔레트 고정 스타일은 `NoToneMapping` |
| 후처리 | 최대 2패스. DOF 는 미니어처·클로즈업만 |
| Canvas 2D | 캔버스 크기 = 논리 크기 × DPR, `ctx.setTransform(dpr,0,0,dpr,0,0)`. 무거운 질감은 오프스크린 캔버스에 캐시 |
| SVG | viewBox 고정, 속성만 갱신(DOM 재생성 금지) |

## 3. HTML 미리보기·상영·녹화

```
node <스킬>/scripts/bundle-preview.js <프로젝트> [--no-embed-audio]
```

- 프로젝트의 `index.html`에서 모듈과 CSS를 묶어 `preview.html`만 생성하거나 갱신한다. `index.html`은 검사·캡처·MP4 렌더에 계속 사용한다.
- 프로젝트의 `runtime.js`에 미리보기 연결 코드(`__bmvdPreview`)가 없으면 안내를 출력하고 `preview.html`에만 스킬의 최신 `shared/runtime.js`를 포함한다.
- 브라우저 코드가 실행 중에 직접 읽는 파일은 번들에 포함되도록 모듈에서 가져온다.
- Chrome 또는 Edge에서 `preview.html`을 더블클릭한다. 기본값은 소리도 포함한 단일 파일이다. ffmpeg가 있으면 최신 믹스를 MP3 128 kbps로 압축해 넣고, 믹스가 없거나 오래됐으면 임시 믹스를 만든다. ffmpeg가 없으면 `sound.json`의 원본 소리를 한 번씩 넣고 영상 시계에 맞춰 재생한다. 이때 음량은 측정 없이 대략 맞춘다. `--no-embed-audio`를 쓰면 기존 `./out/sound/mix.wav`를 참조하므로 같은 폴더 구조로 함께 전달한다.
- `scenes.json`의 fps·비율·장면 구간을 사용한다. 문서가 없으면 16:9·30fps로 열리며 장면 버튼은 생략된다.
- Space 재생·정지, ←/→ 한 프레임, Shift+←/→ 0.5초, Home 처음, 1~9 장면 반복, M 소리, C 시각 복사, R 현재 위치에서 다시 읽기를 지원한다.
- **⛶ 상영(F)**은 조작 막대를 숨기고 화면 비율을 유지한 채 0초부터 소리와 함께 재생한다. 기본은 마지막 프레임에서 멈추며, 반복에 체크하면 처음부터 반복한다. Space로 일시정지·재개하고 Esc로 나가면 현재 위치에서 조작 막대가 돌아온다.
- **● 영상으로 저장**을 누른 뒤 공유창에서 **이 탭**과 **탭 오디오도 공유**를 고른다. 전체화면 전환 안내가 나오면 **⛶ 상영하며 녹화 시작**을 누른다. 1배속으로 한 번 재생한 뒤 MP4 또는 WebM이 다운로드된다. 탭 녹화가 안 되면 Windows 캡처 도구(Win+Shift+R) 또는 Xbox Game Bar(Win+Alt+R)를 쓴다. 실시간 녹화 품질은 PC 성능에 따라 달라지므로 끊기면 `render-demo.js`를 쓴다.

## 4. MP4 오프라인 렌더
```
node <스킬>/scripts/render-demo.js --url <프로젝트>/index.html --out <프로젝트>/out/video.mp4 --fps 30 --thumbnail 3
```
- 프레임마다 `seek(i/fps)` → 스크린샷 → ffmpeg(libx264, yuv420p, crf 16). 실시간 녹화가 아니라 프레임 드롭이 없다.
- 로컬 HTML 옆에 `sound.json`이 있으면 최신 믹스를 AAC 192 kbps로 붙인다. 영상 스트림을 복사하고 오디오를 영상 길이에 맞춘다. 별도 폴더나 HTTP 주소를 쓸 때는 `--sound <프로젝트>`를 지정한다. `--no-sound`는 소리 단계를 건너뛴다.
- 소리가 들어간 MP4의 측정값은 프로젝트의 `out/sound/final-<영상 이름>.json`에서 확인한다. [소리 가이드](sound-guide.md)
- 빠르게 공유할 MP4가 필요하면 `--draft`를 사용한다. 기본 960×540, 15fps, CRF 23, 파일명 `-draft.mp4`로 만들고 소리가 있으면 함께 붙인다. `--out`을 생략하면 프로젝트의 `out/<HTML 이름>-draft.mp4`에 저장한다.
- 품질을 더 올릴 때: `--scale 2`(2배 슈퍼샘플), 60fps, 영상 코드에 `?hq=1` 분기를 두어 그림자 맵 4096·샘플 수 증가.
- 모션블러가 필요한 빠른 카메라 이동: `render(t)` 를 프레임당 4~8회 서브프레임으로 호출해 누적 평균(accumulation)하는 분기를 `?hq=1` 에만 둔다. 정적인 설명 영상에는 불필요.
- 오프라인 MP4 렌더에는 ffmpeg가 필요하다. 설치는 `winget install Gyan.FFmpeg`를 사용한다.
- 헤드리스 WebGL 은 GPU 가 없으면 소프트웨어 렌더(SwiftShader)라 느리다. 결과는 같다.

## 5. 스크립트 요약
| 스크립트 | 용도 |
|---|---|
| `scripts/serve.js --open` | 갤러리·데모 정적 서버 + 스타일 선택 수신(`selection.json`) |
| `scripts/validate-demo.js [id…]` / `--url … --duration …` | 로드·오류·결정성·루프·깜빡임·리사이즈 자동 검사 + 6프레임 저장 |
| `scripts/create-contact-sheet.js [id…]` / `--url …` | 6프레임 Contact Sheet(3×2) 생성, `--all-sheet` 로 전체 스타일 비교판 |
| `scripts/capture-previews.js [id…]` | 스타일 데모의 `preview.png` / `preview.gif` 를 실제 렌더링에서 추출 |
| `scripts/sound.js <프로젝트>` | 소리 믹스, 음량 측정, 파형, 크레딧 |
| `scripts/bundle-preview.js <프로젝트>` | 상영·녹화에 쓰는 단일 파일 `preview.html` 생성 |
| `scripts/render-demo.js --url … --out …` | MP4 + 썸네일, 소리 설정이 있으면 AAC와 최종 측정 JSON. `--draft`로 공유용 MP4 |

처음 한 번 `scripts/`에서 `npm install`(playwright-core, esbuild). 브라우저는 설치된 Chrome 또는 Edge를 쓴다.
