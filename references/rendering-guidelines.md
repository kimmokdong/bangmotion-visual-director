# 렌더링 가이드라인

## 1. 재생 계약 (모든 영상 공통)
영상 HTML 은 스타일 데모와 같은 계약을 따른다. 그래야 스킬의 검증·렌더 스크립트를 그대로 쓸 수 있다.

- `shared/runtime.js` 를 프로젝트 폴더로 복사해 `start(render, { duration })` 로 구동한다.
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

## 3. MP4 오프라인 렌더
```
node <스킬>/scripts/render-demo.js --url <프로젝트>/index.html --out <프로젝트>/out/video.mp4 --fps 30 --thumbnail 3
```
- 프레임마다 `seek(i/fps)` → 스크린샷 → ffmpeg(libx264, yuv420p, crf 16). 실시간 녹화가 아니라 프레임 드롭이 없다.
- 품질을 더 올릴 때: `--scale 2`(2배 슈퍼샘플), 60fps, 영상 코드에 `?hq=1` 분기를 두어 그림자 맵 4096·샘플 수 증가.
- 모션블러가 필요한 빠른 카메라 이동: `render(t)` 를 프레임당 4~8회 서브프레임으로 호출해 누적 평균(accumulation)하는 분기를 `?hq=1` 에만 둔다. 정적인 설명 영상에는 불필요.
- ffmpeg 가 없으면 MP4 는 만들 수 없다 → HTML 을 최종 결과물로 주고 설치 방법(`winget install Gyan.FFmpeg`)을 안내한다.
- 헤드리스 WebGL 은 GPU 가 없으면 소프트웨어 렌더(SwiftShader)라 느리다. 결과는 같다.

## 4. 스크립트 요약
| 스크립트 | 용도 |
|---|---|
| `scripts/serve.js --open` | 갤러리·데모 정적 서버 + 스타일 선택 수신(`selection.json`) |
| `scripts/validate-demo.js [id…]` / `--url … --duration …` | 로드·오류·결정성·루프·깜빡임·리사이즈 자동 검사 + 6프레임 저장 |
| `scripts/create-contact-sheet.js [id…]` / `--url …` | 6프레임 Contact Sheet(3×2) 생성, `--all-sheet` 로 전체 스타일 비교판 |
| `scripts/capture-previews.js [id…]` | 스타일 데모의 `preview.png` / `preview.gif` 를 실제 렌더링에서 추출 |
| `scripts/render-demo.js --url … --out …` | MP4 + 썸네일 |

처음 한 번 `scripts/` 에서 `npm install`(playwright-core). 브라우저는 설치된 Chrome 또는 Edge 를 쓴다.
