---
name: bangmotion-visual-director
description: 별칭 "모션그래픽". 수업용·설명용·홍보용 모션그래픽(HTML 애니메이션, MP4)을 그래픽 스타일 선택부터 연출 설계, 구현, 프레임 검증까지 한 번에 제작한다. 8종 고정 스타일 도감(아이소메트릭, 스타일라이즈드 3D, 동화풍 2.5D, 플랫 벡터, 페이퍼 컷아웃, 미니어처 디오라마, 인포그래픽, 글래스모피즘)의 실제 5초 데모 갤러리를 보여 주고 고르게 한 뒤, BangMotion 연출기법과 그래픽 품질 디렉터(재질·조명·카메라·렌더링) 규칙으로 영상을 만든다. "모션그래픽 만들어 줘", "수업 도입 영상", "~ 과정을 N초 영상으로", "설명 애니메이션", "인트로 영상", "아이소메트릭/3D/종이/동화풍/인포그래픽 스타일로 만들어 줘", "스타일 갤러리 보여 줘", "스타일 골라 줘", "영상 그래픽 품질 올려 줘", "만든 모션그래픽 수정해 줘"처럼 말하면 사용한다. 스타일을 말하지 않았거나 "알아서 정해 줘"라고 해도 사용한다. 사용자가 "3D영상", "입체 애니메이션", "Blender"라고 하면 이 스킬이 아니라 ai-3d-motion-director(별칭 "3D영상")를 쓴다. 별칭 없이 "영상 만들어 줘"라고만 하면 평면 그래픽이 어울리는 주제는 이 스킬, 입체 구조·공간·카메라 이동이 중요한 주제는 ai-3d-motion-director 를 쓰고 어느 쪽으로 정했는지 한 줄로 알린다. 슬라이드 제작(별칭 "슬라이드", slide), 일반 웹페이지, 게임 개발에는 쓰지 않는다.
---

# BangMotion Visual Director

그래픽 스타일 도감 + BangMotion 연출기법 + 그래픽 품질 디렉터를 묶은 모션그래픽 제작 스킬.
결과물은 브라우저에서 실행되는 HTML 애니메이션이고, 필요하면 MP4 와 썸네일로 내보낸다.

이 문서에서 `<스킬>` 은 이 SKILL.md 가 있는 폴더다. 기존 `bang-motion` 스킬과는 별개이며 그 스킬을 수정하지 않는다.

## 에이전트 공통 사용
Claude Code, Codex, Antigravity 등 Agent Skills 형식을 읽는 에이전트에서 똑같이 쓴다. 설치 위치만 다르다.
| 에이전트 | `<스킬>` 위치 |
|---|---|
| Claude Code | `~/.claude/skills/bangmotion-visual-director/` |
| Codex | `~/.codex/skills/bangmotion-visual-director/` |
| Antigravity | `~/.gemini/config/skills/bangmotion-visual-director/` (프로젝트 전용이면 `.agents/skills/…`) |

필요한 에이전트 기능은 세 가지다: 셸 명령 실행, 파일 읽기·쓰기, **이미지 파일 보기**(시각 검증용). 오래 도는 명령(갤러리 서버)을 백그라운드로 띄울 수 없는 에이전트라면 사용자에게 별도 터미널에서 실행하도록 명령을 알려 준다. 이미지를 볼 수 없는 에이전트라면 Contact Sheet 경로를 사용자에게 주고 확인을 부탁하며, 시각 검증을 통과했다고 보고하지 않는다.

## 세 가지를 따로 결정한다
| 축 | 질문 | 어디서 정하나 |
|---|---|---|
| A. 그래픽 스타일 | 화면이 어떤 미술적 특징을 갖는가 | 스타일 도감 8종 중 1개 (`references/style-catalog.md`) |
| B. 공간·카메라 방식 | 공간과 시점을 어떻게 표현하는가 | 스타일이 기본값을 정함(`styles/<id>/style.json` 의 `axes.space_camera`) |
| C. 연출기법 | 장면을 어떤 방식으로 보여 주는가 | 영상 목적에 맞게 매번 선택 (`references/bangmotion-directing-library.md`) |

스타일을 바꿔도 연출은 유지할 수 있고, 연출을 바꿔도 스타일은 유지된다. 섞어서 말하지 않는다.

## 실행 순서
자세한 절차는 `references/production-workflow.md`. 요약:

1. **스타일 결정**
   - 사용자가 스타일을 지정했다 → 갤러리를 띄우지 않고 그 스타일로 간다(별칭 표: `references/style-catalog.md`).
   - "알아서 정해 줘" → 주제→스타일 선택표로 1개를 고르고 이유를 한 줄로 알린다.
   - 언급이 없다 → 갤러리를 연다: `node <스킬>/scripts/serve.js --open --clear` 를 백그라운드로 실행하고, 번호(1~8)를 말하거나 갤러리의 **이 스타일로 선택** 버튼을 누르라고 안내한다. 버튼을 누르면 `<OS 임시폴더>/bangmotion-visual-director/selection.json` 에 기록되고 서버 터미널에 `[선택됨] <id>` 가 찍힌다. 사용자가 "골랐어"라고만 하면 그 파일을 읽는다.
   - 갤러리 데모는 고정이다. 새 주제에 맞춰 데모를 다시 만들지 않는다.
2. **스타일 규칙 읽기**: `styles/<id>/style.json`, `styles/<id>/notes.md`. 구현 방식이 필요하면 `styles/<id>/demo.js` 를 본다.
3. **연출 설계**: `references/bangmotion-directing-library.md` 의 빠른 선택표에서 목적에 맞는 연출기법 1~3개. 스타일과 충돌하는 기법은 뺀다. `templates/` 에서 뼈대를 고른다.
4. **품질 시트 작성**: `references/graphic-quality-director.md` 에 따라 장면별 Art / Material / Light / Camera / Render 를 정한다. 효과는 스타일에 맞는 것만 켠다(적용표 §6).
5. **구현**: 프로젝트 폴더에 `index.html` + JS. `shared/runtime.js` 재생 계약(`render(t)` 순수 함수)을 따른다. 데모 장면을 복제하지 말고 미술 규칙과 구현 방식만 재사용한다.
6. **시각 검증**: `scripts/validate-demo.js` 와 `scripts/create-contact-sheet.js` 로 프레임을 뽑아 **이미지를 직접 열어 보고** 체크리스트로 판정 → 수정 → 재캡처. 코드가 실행된다는 것만으로 통과시키지 않는다.
7. **출력**: HTML, 요청 시 `scripts/render-demo.js` 로 MP4 + 썸네일. 결과 경로, 쓴 스타일·연출, 고친 문제, 확인 못 한 것을 보고한다.

사용자가 중간 승인을 요구하지 않았다면 2~6 은 묻지 않고 진행한다. 빠진 값은 기본값(15초, 16:9, 30fps)을 쓰고 보고에 적는다.

## 스타일 도감
| # | id | 이름 | 한 줄 |
|---|---|---|---|
| 1 | `01-isometric` | 아이소메트릭 | 왜곡 없는 정사영 미니어처 — 지도·구조·마을 |
| 2 | `02-stylized-3d` | 스타일라이즈드 3D | 애니메이션 영화 같은 입체 공간 — 과학·자연·탐험 |
| 3 | `03-storybook-2p5d` | 동화풍 2.5D | 그림책 삽화 + 패럴랙스 — 저학년·이야기·계절 |
| 4 | `04-flat-vector` | 플랫 벡터 | 기하 도형과 제한 팔레트 — 개념·절차·규칙 |
| 5 | `05-paper-cutout` | 페이퍼 컷아웃 | 오린 색종이와 층 그림자 — 역사·이야기·미술 |
| 6 | `06-miniature-diorama` | 미니어처 디오라마 | 책상 위 모형 + 얕은 심도 — 지역·생태·장소 |
| 7 | `07-infographic` | 인포그래픽 모션 | 도해·수치·타이포 — 통계·비교·원리 |
| 8 | `08-glassmorphism` | 글래스모피즘 / 시네마틱 UI | 반투명 유리 패널 — 기술·서비스·데이터 |

## 지켜야 할 규칙
- 스타일 견본과 썸네일은 **실제 코드 렌더링**에서만 나온다. 이미지 생성으로 대체하지 않는다.
- 화면 상태는 `render(t)` 의 순수 함수(무작위·실시간 시계·CSS animation 금지). 그래야 프레임 추출·MP4·검증이 된다.
- 품질 효과는 스타일에 맞는 것만. 플랫 벡터에 피사계 심도, 아이소메트릭에 원근·회전, 인포그래픽에 사실적 조명을 넣지 않는다.
- 여러 장면 영상은 장면을 fade 로 갈아 끼우지 않는다(슬라이드처럼 보인다). 하나의 세계 안에서 카메라·오브젝트가 움직여 넘어간다.
- 화면 속 수치는 사용자가 준 값만. 없으면 묻거나 "예시"라고 표시한다.
- 검증하지 못한 것은 정상이라고 보고하지 않는다.
- `bangmotion-directing-library.md` 의 기법은 기존 bang-motion 스킬에서 확인한 것이다. 그 문서에 없는 기법을 "BangMotion 기법"이라고 부르지 않는다.

## 파일 안내
| 경로 | 언제 읽나 |
|---|---|
| `references/production-workflow.md` | 요청을 받으면 먼저. 스타일 결정 세 갈래, 갤러리 사용, 수정 요청 처리 |
| `references/style-catalog.md` | 스타일을 고르거나 별칭을 id 로 바꿀 때, 스타일별 연출 궁합 |
| `references/bangmotion-directing-library.md` | 연출기법을 고를 때(크다 — 빠른 선택표부터 보고 필요한 카드만) |
| `references/graphic-quality-director.md` | 품질 시트를 쓸 때, 시각 QA 체크리스트 |
| `references/rendering-guidelines.md` | 재생 계약, 실시간/MP4 설정, 스크립트 사용법 |
| `styles/CONTRACT.md` | 재생 계약 세부, 새 스타일을 추가할 때 |
| `styles/<id>/notes.md`, `style.json`, `demo.js` | 선택된 스타일 하나만 |
| `templates/*.md` | 수업 도입 / 개념 설명 / 시네마틱 인트로 / 인포그래픽 뼈대 |
| `gallery/` | 스타일 선택 화면(서버로 열어야 한다 — 파일 더블클릭으로는 모듈이 안 뜬다) |
| `scripts/` | serve / validate-demo / create-contact-sheet / capture-previews / render-demo. 처음 한 번 `scripts/` 에서 `npm install` |

## 준비물
Node 18+, 설치된 Chrome 또는 Edge(캡처·검증용), ffmpeg(MP4·GIF 를 만들 때만). 없으면 HTML 결과물까지는 만들 수 있고, 검증은 사용자에게 브라우저에서 `?t=초` 로 열어 확인해 달라고 요청한다.
