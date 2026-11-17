# BangMotion 연출기법 라이브러리

BangMotion Visual Director가 영상 제작 때 "어떤 연출기법을 고를지" 찾아보는 참조 문서다.
모든 기법 카드는 기존 스킬 `bang-motion`(v1.19.0, 인도네시아어) 원문에서 확인한 내용이다.
원문에 없는데 이 문서에서 보충한 내용은 `[보충]` 표시를 붙였고 6절에 목록으로 모았다.

- 원본 스킬 경로: 에이전트 skills 폴더 안 `bang-motion/` (없으면 https://github.com/bangtutorial/bang-motion) — 읽기 전용, 수정·삭제 금지
- 출처 표기 약어: `SKILL` = `SKILL.md`, `tech` = `references/techniques.md`, `anti` = `references/anti-ppt.md`,
  `arch` = `references/architecture.md`, `expl` = `references/explainer.md`, `konsep` = `references/opener-konsep.md`,
  `panggung` = `references/kartun-panggung.md`, `ae` = `references/ae-bridge-higgsfield.md`
- 수치는 원문 그대로 옮겼다. 원문은 수치를 "법칙이 아니라 검증된 출발점"이라고 밝힌다(`tech` 머리말).
- 카드의 "권장 지속 시간"에 원문 수치가 없으면 "원문에 수치 없음"이라고 적었다.

## 목차

1. 개요와 핵심 원칙
2. 제작 절차
3. 연출기법 카드
   - (a) 장면 구성/스토리보드 방식 — A1~A14
   - (b) 카메라 연출 — B1~B9
   - (c) 타이포그래피 애니메이션 — C1~C8
   - (d) 오브젝트 등장·퇴장 — D1~D12
   - (e) 장면 전환 — E1~E9
   - (f) 배경 모션 언어 — F1~F10
   - (g) 속도·리듬 조절 — G1~G8
   - (h) explainer/카툰 무대 계열 형식 — H1~H9
4. 주제·목적별 빠른 선택표
5. 기존 템플릿·스크립트 목록
6. 확인된 자료와 새로 설계한 내용의 구분

---

## 1. 개요와 핵심 원칙

bang-motion은 브라우저에서 HTML + CSS + GSAP(필요하면 Three.js)로 "영상처럼 움직이는" 모션그래픽을 만드는 스킬이다.
대상은 opener/promo, bumper, intro/outro, kinetic typography, lower third, explainer(16:9 기본, 9:16은 요청 시)다. (`SKILL` 머리말, "Jenis pekerjaan")

핵심 원칙 (`SKILL`):

1. **Hukum #1 — 영상이지 슬라이드가 아니다.** opener는 장면당 짧은 문장 하나 + 주 오브젝트 최대 하나. kicker, 부제, 설명 문단, 기능 배지, 기술 메타데이터 금지. 새 정보에는 새 시각 반응이 따라야 한다.
2. **Hukum #2 — 결정적(deterministic)이어야 한다.** 시스템 시계를 읽는 코드가 한 줄도 없어야 한다. 모든 화면은 `tl.time()`의 순수 함수다. `Date.now()`, 렌더 경로의 `Math.random()`, `setInterval`, `pos += v*dt` 누적 금지. (`arch` "Determinisme")
3. **Hukum #3 — 스타일은 주제에서 나온다.** starter는 구조이지 스타일이 아니다(회색·시스템 폰트는 placeholder). 참고 영상에서는 리듬만 가져오고 껍데기(팔레트, 폰트, 레이아웃)는 가져오지 않는다. 직전 프로젝트와 팔레트·폰트·배경 언어·시그니처 모션 넷 중 셋 이상이 달라야 한다. 배경은 기본이 어둡지 않고, 절대 정지하지 않는다.
4. **Hukum #4 — 글자는 살아 있고 배경은 복종한다.** sentence case, 굵기 500–600. 글자 주머니(kantong teks) 안 배경 휘도는 25% 이하 또는 80% 이상.
5. **Player 규칙** (`SKILL` "Player", `arch` "Panel kontrol"): 화면에 플레이어·패널 없음, 열면 바로 autoplay, 끝나면 loop(`onComplete → play(0)`, 소리도 함께 반복). 숨은 조작은 `R` 다시 재생, `Space` 일시정지.
   - `?debug=1`: 스크럽 패널(재생/정지, 슬라이더, `t.toFixed(2)` 시계)이 나타난다. 검토 도구다.
   - `?clean=1`: 패널 없음 + autoplay 정지. 내보내기·스냅샷 스크립트용이다.
   - `?demo=1`: `starter-opener.html` 전용, 글자 등장 방식(pintu teks) 시연. (`assets/starter-opener.html` 주석)
   - 소리가 있으면 `play()`를 먼저 시도하고, 막히면 0프레임에서 멈춘 뒤 첫 클릭에 영상과 소리를 함께 시작한다. 실행 파일(`.cmd`/`.bat`)을 만들지 않는다.
6. **구조적 금지(Larangan struktural)** — 느낌이 아니라 코드로 검사한다 (`SKILL`). 하나라도 걸리면 보여 주기 전에 고친다.
   1. `<section>`/`.scene` 3개 이상을 `autoAlpha`·opacity로 켜고 끄기 → 슬라이드 덱. 장면은 세계·카메라가 움직여서 바뀌어야 한다. 예외는 kartun panggung(각 무대에 움직이는 물체 10개 이상).
   2. 끝까지 이어지는 시각적 실(하나의 주인공, 또는 카메라가 훑는 하나의 세계)이 없다.
   3. 장면당 글자 단계가 3단(eyebrow + 제목 + 본문). 최대 2단. 3줄 이하 문서·도장·날짜 블록은 오브젝트로 센다.
   4. 움직임이 Ken Burns(사진 scale 1.0→1.05)뿐이다. 옆으로 지나가는 막대·선·streak는 기본값이 아니다.
   5. 모든 컷의 전환이 fade + scale bump + light leak뿐이다.
   6. explainer를 해당 스타일의 starter가 아닌 것(`starter-opener.html` 또는 맨바닥)에서 시작했다.
   7. 미니어처: 카메라 줌이 1.08 미만이라 대상이 엄지만 하다.
   8. 템플릿 골격(opener): 확대됐다가 왼쪽으로 나가는 글자, 나란한 기능 타일 3개, 타이핑되는 입력창, hook → 기능 → 기능 → 약속 → 로고 → CTA 순서 가운데 둘 이상을 콘셉트 요구 없이 썼다.
7. **산출물**: 더블클릭으로 열리는 `index.html` 하나(CSS/JS 인라인, 라이브러리는 CDN). 시청에 `npm install`이 필요하면 안 된다. Python·Node·ffmpeg는 작업 도구로만 선택 사용. (`SKILL` "Prasyarat", `arch` "Bentuk deliverable")
8. **글자 크기 하한** (1080 무대 기준): 본문 44px, 라벨 34px, 출처 30px, 손글씨 주석 48px, 제목 100px 이상. 30px 미만 글자는 없다. (`expl` "Keterbacaan di ponsel")

원문끼리 어긋나는 곳(적용 시 주의):

- `SKILL` 체크리스트는 "구조적 금지 6개 항목 통과"라고 쓰지만 본문 목록은 8개다. 이 문서는 8개를 기준으로 삼았다.
- `tech` §4c는 "한 영상에 전환 최소 2종, 그중 최소 1종은 깊이감 있는 것, wipe는 최대 2회"라고 하고, `SKILL` Hukum #3 style brief 항목은 "2종 필수나 3D 필수가 아니라 맥락에 맞게"라고 한다. `SKILL`이 상위 문서이므로 "경계마다 필요한지 먼저 판단하고, 쓸 때는 한 종류만 반복하지 않는다"로 읽는 것이 안전하다.

---

## 2. 제작 절차

원문의 "Alur kerja"(`SKILL`)와 explainer의 "Langkah nol"(`expl`)을 합친 순서다.

| 단계 | 하는 일 | 출처 |
|---|---|---|
| 0. 종류 판별 | "Jenis pekerjaan" 표로 종류를 정한다. explainer면 **질문 하나**에 스타일(6종 + 추천), 비율, 길이, 소리를 묶어 묻는다. 그 밖에는 brief에서 유도할 수 없는 것(비율, 길이, 음악·VO 유무)만 한 번에 묻는다. | `SKILL` 0, `expl` |
| 0b. style brief | 코드보다 먼저 쓴다. 승인 전에는 코드를 건드리지 않는다. 항목은 아래 표. | `SKILL` Hukum #3 |
| 1. 참고·브랜드 흡수 | 참고 영상은 shot별 길이, 움직임, 전환 종류, 시선 순서만(리듬) 가져온다. 색·로고(원본 벡터 path)·폰트·기능 문구는 제작 대상의 공식 출처에서 가져온다. | `SKILL` 1 |
| 2. rundown | `초 | 장면 | 문장 | 시각` 표. 장면 수와 종류는 고른 콘셉트를 따른다. opener는 총 25–40초. 코드 전에 사용자 승인을 받는다. | `SKILL` 2 |
| 3. scaffold | 종류에 맞는 starter를 복사하고 색 토큰, 폰트, 배경 언어를 즉시 바꾼다. | `SKILL` 3 |
| 4. 장면 구현 | `tech`의 레시피로 한 장면씩. 레시피는 도구이지 장바구니가 아니다. | `SKILL` 4 |
| 5. 시각 검증 | `scripts/snap.mjs`로 핵심 시점 6–20장(kartun panggung은 20–24장, 4열 contact sheet)을 찍어 눈으로 본다. 전체 프레임 렌더는 검증이 아니다. Node가 없으면 `?debug=1`로 스크럽하고 수동 캡처. | `SKILL` 5, `arch`, `panggung` |
| 6. 인계 | 더블클릭 가능한 `index.html` 하나. `?debug=1`을 안내한다. **MP4는 사용자가 요청할 때만** `scripts/export-frames.mjs`(60fps PNG) + ffmpeg. | `SKILL` 6 |
| 7. explainer 전용 | 마무리 메시지에 VO 대본 전문을 싣고, 녹음·생성한 음성을 다시 보내 달라고 요청한다. 같은 대본을 `vo-script.md`로 저장하고, 음성이 오면 retime한다. | `SKILL` 7, `expl` "Penyerahan" |

style brief 항목 (`SKILL` Hukum #3-1):

| 항목 | 내용 |
|---|---|
| 주제 + 형용사 3개 | 남기고 싶은 느낌 |
| 콘셉트 + 구조 지문 | 후보 3개 → 1개 선택(제품 성질에서 나온 이유). `konsep · 장면 수 · 장면별 주 오브젝트 · 오프닝 · 엔딩` |
| 팔레트 | 브랜드에서 온 주색 1, 배경색 1, 강조색 1. hex와 출처를 적고, 브랜드 색이 아니면 "파생: 이유" |
| 폰트 | 성격 있는 display 폰트(Poppins/Inter/Roboto/Montserrat/Arial 제외) + 보조 폰트. 예외: klaim → cara → hasil은 제품 UI 폰트 |
| 글자 강조 | 강조 없음, 또는 강조 모양 한 가지(C3) |
| 배경 방향 | "Arah gaya" 표에서 한 줄(F6), 또는 구간별 교체 계획(어느 구간, 무엇으로, 왜, 무엇이 계기) |
| 시그니처 모션 | 정체성으로 반복할 움직임 한 가지(오브젝트 wipe, 단어별 3D roll, 날아오는 종이, 그려지는 선 등) |
| 배경 모션 | `tech` §7c 메뉴에서 한 가지(F1). 시그니처 모션과 다른 것 |
| 배경 표면 | `tech` §7d 메뉴(F2), 2겹 이상 |
| 오브젝트 렌더 스타일 | `tech` §7e 한 계열(F7) |
| 사진·영상 자산 | 출처를 사용자에게 묻는다(사용자 사진 / MCP 생성 / 라이선스 스톡) + 구간별 shot 목록 |
| 전환 | 어느 경계에 효과가 필요하고 어디는 컷이면 되는지 |
| 특별한 순간 | 가장 비싼 효과를 한 번 쓰는 지점 |

검증 때 감독처럼 보는 질문: 글자가 잘렸나, 겹쳤나, 카메라가 끝나기 전에 글자가 나오나, 아직 슬라이드 같은가. (`SKILL` 5)
감각 보정 질문 (`anti` "Kalibrasi rasa"): 이 프레임이 그대로 회사 슬라이드가 될 수 있나(그렇다면 실패). 0.2초 안에 어디를 볼지 알 수 있나. 글자를 숨겨도 배경이 흥미롭되 시끄럽지 않나. 전환마다 카메라 때문에 움직이는 것이 있나.

---

## 3. 연출기법 카드

카드 항목: 출처 / 시각적 특징 / 적합·부적합 / 권장 지속 시간 / 화면 구성 원칙 / 카메라·오브젝트 동작 / 구현 / 조합.

### (a) 장면 구성/스토리보드 방식

#### A1. Sidik jari struktur + tiga kandidat konsep (구조 지문과 콘셉트 후보 3개)
- 출처: `konsep` "Hukum kerangka" 1–7, `SKILL` Hukum #3-4
- 시각적 특징: 기법이라기보다 골격 선택 규칙이다. 색만 바꾼 같은 장면 순서를 막는다.
- 적합: opener, promo, intro, teaser의 rundown 작성 전. 부적합: explainer(별도 뼈대 A14).
- 권장 지속 시간: opener 총 25–40초(`SKILL`).
- 화면 구성 원칙: 장면은 "문장 + 오브젝트"일 필요가 없다. 글자 없는 장면, 글자만 있는 장면, 서로 반응하는 여러 오브젝트 모두 가능하다.
- 카메라·오브젝트: 정석 부품(확대 후 왼쪽으로 나가는 글자, 타일 3개, 타이핑 입력창, push-through, 컷의 light leak, 가운데 로고 + CTA)은 콘셉트가 요구할 때만, 한 opener에 최대 2개.
- 구현: 한 줄 지문 `konsep · jumlah adegan · objek utama tiap adegan · pembuka · penutup`을 style brief와 마무리 메시지에 적는다.
- 조합: 콘셉트 둘을 섞을 수 있지만(예: 9 + 3) 골격은 하나에서 온다. 직전 opener와 콘셉트가 다르거나 지문 5요소 중 3개 이상이 달라야 한다. hook → 기능 → 기능 → 약속 → 로고 → CTA 순서를 두 opener에 연달아 쓰지 않는다.

#### A2. Menu konsep 1–12 (opener 콘셉트 메뉴 기본 12종)
- 출처: `konsep` "Menu konsep" 표
- 권장 지속 시간: 개별 수치는 11번(조각 0.3–0.8초, 12–20조각)만 있다. 나머지는 원문에 수치 없음(opener 전체 25–40초).
- 구현: 원문은 콘셉트별 코드를 주지 않는다. `tech`의 카메라·전환 레시피로 구현한다.

| # | 콘셉트(원어 / 풀이) | 전제 | 구조 | 카메라·전환 | 적합 |
|---|---|---|---|---|---|
| 1 | Satu shot kontinu / 연속 한 컷 | 영상 전체가 컷 없는 한 공간 | 긴 장면 1개, 순간 4–6개, 글자는 세계 표면에 붙는다 | 카메라가 계속 이동(dolly, orbit), 도착이 곧 장면 전환 | 창작 도구, 하드웨어, 공간 브랜드 |
| 2 | Tipografi murni / 순수 타이포 | 단어가 주인공, mockup 없음 | 문장이 쌓이고 깨지고 재배열, 끝에 글자가 로고가 된다 | 오디오 리듬, 5개 이상 방향에서 등장 | 강한 태그라인, 행사, 버전 출시 |
| 3 | Masalah → lenyap / 문제 → 사라짐 | 혼란이 제품의 한 동작으로 정리된다 | 혼란 장면 → 제품의 한 동작 → 깨끗한 세계 → 로고 | 혼란은 떨리고 쌓인다, 제품 동작은 큰 쓸기 한 번 | 생산성, 유틸리티 |
| 4 | Sebelum / sesudah / 전후 비교 | 차이를 나란히 본다 | 분할 화면 또는 움직이는 분할선, 이동 한 번이 기능 하나 | 분할선이 전환이다 | 편집기, 필터, 최적화 |
| 5 | Perjalanan di dalam UI / UI 속 여행 | 카메라가 거대한 UI 안을 난다 | 버튼이 발판, 커서·손가락이 안내자 | fly-through, UI 층 parallax | UI가 독특한 앱 |
| 6 | Makro produk / 제품 매크로 | 극단적 클로즈업, 디테일 하나씩 | 디테일 4–6개, 글자 최소, 전체 모습은 끝에 | rack focus, 느린 회전, 표면을 쓰는 빛 | 하드웨어, 패키지, F&B, 패션 |
| 7 | Metafora benda / 사물 은유 | 제품을 모양이 변하는 실제 사물로 | 사물 하나가 계속 변형되어 로고가 된다 | morph가 전환이다 | 보안, 클라우드, 금융 같은 추상 서비스 |
| 8 | Angka hidup / 살아 있는 숫자 | 큰 숫자 하나가 이야기 | 숫자가 바뀔 때마다 맥락이 드러난다 | 숫자는 프레임에 남고 뒤 세계가 바뀐다 | 성과, 성능, 마일스톤 |
| 9 | Satu fitur, didemo penuh / 기능 하나 완전 시연 | 최고의 동작 하나를 처음부터 결과까지 | 입력 → 처리 → 결과, 다른 기능은 끝에 스치듯 | 손·커서를 따라가고 디테일로 cut-in | 강점이 하나로 분명한 앱 |
| 10 | Tanya → jawab diegetik / 세계 안의 질문과 답 | 질문이 세계 안에 쓰이고 답은 제품의 행동 | 칠판·메시지·화면의 질문 → 제품이 행동으로 답 | 질문에서 답의 자리로 카메라 이동 | AI, 검색, 도움 서비스 |
| 11 | Kolase ritmis / 리듬 콜라주 | 박자에 맞춘 빠른 조각, 한 모티프로 회귀 | 0.3–0.8초 조각 12–20개 + 4박마다 반복 모티프 | cut-on-beat, 모양 match cut | 음악, 라이프스타일, 행사, 커뮤니티 |
| 12 | Logo sebagai panggung / 로고가 무대 | 로고 모양이 공간이 된다 | 모든 장면이 로고 기하 안에서, 끝에 카메라가 물러나 로고 전체 | 로고의 구멍·곡선으로 진입 | 모양이 강한 로고 |

- 조합: 두 opener가 연달아 같은 콘셉트를 쓰지 않는다(A1).

#### A3. Estafet benda (사물 릴레이, 콘셉트 13)
- 출처: `konsep` "Menu konsep" 13, "Estafet benda — menurunkannya dari brand"
- 시각적 특징: 주인공 사물 하나가 모습을 바꾸며(화면 속 아이템 → 손에 든 카드 → 실제 물건 → 포장 → 도착한 택배) 서비스 단계를 통과한다. 글자는 사물에 붙은 브랜드뿐이다.
- 적합: e-commerce, 배송, 주문·배달, 마켓플레이스, 서비스업. 부적합: 원문에 명시 없음.
- 권장 지속 시간: 4–6막. 오프닝·엔딩 막 약 2초, 고르기·모으기 막 3–4.5초.
- 화면 구성 원칙: 막마다 소리와 글자 없이 읽히는 주 동작 하나. 브랜드 주색을 막마다 가장 중요한 오브젝트(유니폼, 기기, 카드, 포장)에 둔다. 오프닝 초점 기법: 세계는 회색 선, 배우·브랜드만 색.
- 카메라·오브젝트: 모든 전환을 그 사물이 운반한다(E8). 프레임에 들어오는 손·발·발톱이면 충분하고 온전한 인물은 필수가 아니다.
- 구현: 서비스 여정(필요 → 선택 → 수집 → 처리·포장 → 도착)을 막으로 옮기고, 브랜드답지 않은 막은 버린다. 코드 패턴은 원문에 없다.
- 조합: 배경은 막마다 밝음 ↔ 어두움 ↔ 흰색으로 바꿀 수 있다. 엔딩은 "Penerimaan"(A11)으로 end card 없이 끝낼 수 있다.

#### A4. Pamer sistem brand (브랜드 시스템 쇼케이스, 콘셉트 14)
- 출처: `konsep` "Pamer sistem brand — layout, warna, ritme"
- 시각적 특징: 로고, 심벌, 마스코트, 스티커, 타이포, 팔레트를 한 가족으로 소개한다. 중립 밝은 배경 위에 브랜드 색 면이 두 번 가득 찬다.
- 적합: 론칭, 리브랜딩, 커뮤니티, 플랫폼, 에이전시. 부적합: 원문에 명시 없음.
- 권장 지속 시간: 25–30초, loop. 막 8–12개, 막당 2.5–4초. 브랜드 색 가득 채우기는 두 막, 각 약 3초.
- 화면 구성 원칙: 거의 모든 막이 중앙 축. 주 오브젝트는 프레임 높이의 약 25–35%, 나머지는 여백. 글자는 줄당 프레임 높이 약 6%, 최대 2줄, 가운데 정렬. 스티커는 오브젝트 모서리에 8–15° 기울여, 오브젝트의 25–40% 크기. 브랜드 가이드 페이지는 프레임 폭 70–90%로 크게, 원근으로 기울여서. 중립 배경이 화면 면적의 약 55%.
- 카메라·오브젝트: 하드 컷 없음. 에너지 정점 두 번(주색 면 진입, 카메라가 심벌 관통). 큰 움직임은 박자에, manifesto는 박자에 맞춰 단어별로.
- 구현: 코드 패턴은 원문에 없다. 전환은 E8의 "Medan warna bertingkat + logo berbalik warna", "Menembus simbol", "Parade mendorong", "Putar tipis → kartu warna membuka", "Halaman naik bertumpuk", "Titik tumbuh".
- 조합: 엔딩은 "Callback ke pembuka"(loop). 예시 순서는 대본이 아니다(Hukum kerangka #7): 오프닝·엔딩을 예시와 다르게 하고 ✦ 순간은 최대 1개만 변형해서 쓴다.

#### A5. Klaim → cara → hasil (주장 → 방법 → 결과, 콘셉트 15)
- 출처: `konsep` "Klaim → cara → hasil — layout, warna, ritme"
- 시각적 특징: 조용한 기능 발표. 짧은 문장, 커서가 쓰는 실제 UI, UI에서 피어나는 결과. 거의 무채색에 장식이 없다.
- 적합: 새 기능, 생성형 AI, 창작 도구, SaaS, 카메라·편집기. 부적합: 제품 결과물이 시각적이지 않을 때(원문: 다른 콘셉트를 쓴다).
- 권장 지속 시간: 주장 1–2.5초 → 방법 2–6초 → 결과 4–6초를 2–3회 반복, 엔딩 4–5초. 이징은 ease in-out 0.8–1.2초.
- 화면 구성 원칙: 중앙 축. 글자는 한 가지 스타일(중립 grotesk regular, sentence case, 짙은 회색), 줄 높이 프레임 높이의 약 8%, 최대 2줄, 블록 폭 30–65%. 글자 폰트 = 제품 UI 폰트. UI는 기기 베젤 없이 떠 있고 시연 때 프레임 폭 약 80%까지 확대. 결과 카드는 정점에서 프레임의 75–90%. 화면의 약 80% 따뜻한 흰색, 15% 중립 회색, 5% 색(색은 제품 결과물에서만).
- 카메라·오브젝트: 컷 없음. 큰 커서가 배우(끌어다 놓기, 메뉴 열기, 선택). 결과 슬롯이 빈 회색 카드로 떨어져 가운데로 피어나고, 줄어들어 pill → 점이 되면 그 점에서 다음 문장이 나온다.
- 구현: 커서 추적은 B5 `camTo/camWide`. 단어는 흐린 회색에서 선명한 짙은색으로 순서대로, 퇴장은 회색으로 흐려진 뒤 사라진다. 엔딩 "Alamat → nama"는 C5(hapus-ketik).
- 조합: E8의 "Wadah mekar / menyusut", "Hasil menjauh jadi kalimat", "Zoom ke potongan UI", "Meredup lalu berganti"와 한 세트. 단어 강조(C3)는 쓰지 않는 쪽이 어울린다(`tech` 강조 메뉴의 `tanpa` 행).

#### A6. Ekosistem UI hidup (살아 있는 UI 생태계, 콘셉트 16)
- 출처: `konsep` "Animasi UI untuk app & SaaS", "Menu konsep" 16
- 시각적 특징: 흩어진 옛 도구 → 제품 아이콘 탄생 → UI 조립·사용 → 결과와 데이터 → 통합·역할 → 내용 교체 → 선언 + 기기 → 권유.
- 적합: B2B SaaS, AI 비서, 워크플로, 대시보드, 팀 협업. 부적합: 원문에 명시 없음.
- 권장 지속 시간: 50–60초, 막 12–16개, 막당 2–6초. 음악만 있고 VO 없음.
- 화면 구성 원칙: 순간마다 초점 오브젝트 하나. 제품 아이콘은 프레임 높이의 약 15–27%, 시연 UI 패널은 폭 60–90%, 기기는 폭 약 45–55%. 글자는 UI 위에 쌓지 않고 오브젝트 옆에 선다. 예시 색 비율: 흰색·아주 밝은 회색 약 86%, 중간 회색 7%, 어두운 색 2%, 브랜드 색 4%.
- 카메라·오브젝트: 거의 모든 이동을 UI가 운반한다. 하드 컷은 최대 2회, 각각 장(章) 표시.
- 구현: UI는 스크린샷이 아니라 단순화한 DOM/벡터 컴포넌트로 다시 만든다. 한 화면 = 한 과업. 동작은 D4(Menu gerak UI)에서 고른다.
- 조합: 브랜드 색이 화면을 채우는 것은 1–2회뿐(지나가는 거대한 3D 아이콘 옆면). 엔딩 "Perangkat di alas + ikon ke lensa". 단어 강조 없음.

#### A7. Pop flat berfoto (사진이 있는 플랫 팝, 콘셉트 17)
- 출처: `konsep` "Pop flat berfoto — layout, warna, ritme", `SKILL` "Arah gaya"의 Flat pop berfoto 행
- 시각적 특징: 오려낸 인물 사진이 아래에서 탄력 있게 튀어나오고, 로고에서 파생한 플랫 도형이 사진 그릇·스티커·광선이 되며, 브랜드 색 면이 빠르게 바뀐다.
- 적합: 소비자 앱, 핀테크, e-commerce, 통신, 젊은 층 캠페인. 부적합: 사진이 없을 때(다른 콘셉트나 일러스트 렌더 스타일을 고른다).
- 권장 지속 시간: 30초, 약 25 shot, 평균 약 1.2초. 인물 소개 막 1.5–3초, 사진 몽타주 0.3–0.8초. 색 면 snap 0.15–0.3초.
- 화면 구성 원칙: 인물은 프레임 높이의 60–100%로 크고 아래가 잘리며 비대칭 위치. 한 프레임 = 인물 1명 + 플랫 요소 1–3개. 글자는 두 크기뿐(오브젝트에 붙는 pill 라벨 약 5%, 인물 뒤 거대한 단어 약 30–35%). 어두운 장면은 최대 1개.
- 카메라·오브젝트: 스티커·pill·작은 도형은 `back.out`으로 pop. 카메라 push/zoom은 색 면으로 들어갈 때만. 배경은 예시에서 30초에 약 12번 바뀌고 항상 계기가 있다.
- 구현: 사진 준비와 애니메이션은 D5. 플랫 도형은 그라디언트 없음. 색 면이 질감 없이 허용되는 예외다(`tech` §7d).
- 조합: 박자 몽타주(G4), E8의 "Pil mekar jadi wadah foto", "Push ke bidang warna", "Aksi UI mengganti latar", "Benda ke lensa", "Ikon menjadi medan". 참고 영상의 모양·글자·소품·문장을 복사하지 않는다.

#### A8. Menembus bentuk bergradien (그라디언트 도형 관통, 콘셉트 18)
- 출처: `konsep` "Menembus bentuk bergradien — layout, warna, ritme"
- 시각적 특징: 브랜드의 도형 하나가 겹겹이 반복되며 안에서 빛난다. 카메라나 빛의 공이 한 겹씩 뚫고 들어가고, 겹마다 막이 열린다. 전체에 고운 grain.
- 적합: tech, AI, 음악, 보안, 핀테크, 프리미엄 론칭. 부적합: 원문에 명시 없음.
- 권장 지속 시간: 5–8막, 막당 2–4초. ease in-out 1–2초, 겹 회전 초당 10–20°, 카메라 진입 겹당 0.8–1.2초.
- 화면 구성 원칙: 중앙 축. 도형 겹은 프레임 높이의 80–120%(가장자리에서 잘림), 중심은 가운데보다 약간 위나 아래. 안내 공은 프레임 높이의 약 3–6%로 유일하게 선명하고 빠른 오브젝트. 글자는 아주 적다. 어두운 바탕이 60–70%.
- 카메라·오브젝트: 컷 없음. 정점은 포털 관통.
- 구현: 배경은 F3(Grainy gradient). 도형 `.shape{background:radial-gradient(60% 60% at 50% 30%,var(--c-lit),var(--c-mid) 45%,var(--c-deep) 100%)}`.
- 조합: 오프닝 "Titik cahaya di gelap", 엔딩 "Menembus portal ke logo" 또는 "Objek di podium", 전환 "Menembus lubang bentuk", "Bola pemandu", "Gema bentuk logo". grainy gradient는 껍데기이지 골격이 아니다.

#### A9. Tur produk berselang klaim (주장이 끼어드는 제품 투어, 콘셉트 19)
- 출처: `konsep` "Tur produk berselang klaim — layout, warna, ritme"
- 시각적 특징: 실제 UI를 투어하듯 쓰다가 몇 초마다 브랜드 색 면 위의 짧은 주장에서 멈춘다.
- 적합: SaaS, HR/팀, CRM, 대시보드, 기업 재무. 부적합: 원문에 명시 없음.
- 권장 지속 시간: 25–30초, 막 10–11개(메뉴 표는 9–11), 막당 2–5초. 컷 1–2회. 주장은 단어당 약 0.12–0.15초로 나타나 1.5–2초 유지, 약 50%로 흐려진 뒤 사라진다. 오프닝 zoom hentak 약 0.5초.
- 화면 구성 원칙: 제목·주장은 중앙 축, 1–2줄(줄당 2–4단어), 줄 높이 프레임 높이의 약 6–8%. UI는 두 크기(전체 화면, 폭 25–40%의 떼어낸 카드). 분할은 50/50 또는 55/45이고 글자는 항상 색 쪽. 배경 상태 3가지: 따뜻한 흰색(약 40%), 브랜드 그라디언트(약 45%), 아주 옅은 브랜드색(약 15%).
- 카메라·오브젝트: 순서는 UI → 주장 → UI → 주장 → UI → 주장 → 로고. 주장 둘을 연달아 두지 않는다. 오프닝에 에너지 한 번, 나머지는 ease in-out 0.8–1.2초.
- 구현: D4의 "Kartu diangkat keluar", "UI meledak menjadi diagram", "Fokus kedalaman", "Layar terbelah UI / klaim" + B5.
- 조합: 오프닝 "Objek di celah kata", 엔딩 "Wordmark mengecil dari buram". "Zoom hentak lalu kembali"는 한 번만.

#### A10. Menu pembuka (오프닝 3초 메뉴)
- 출처: `konsep` "Menu pembuka (3 detik pertama)"
- 권장 지속 시간: 처음 3초. 개별 수치는 원문에 없음.
- 구현: 원문은 이름과 설명만 준다.

| 원어 | 풀이 |
|---|---|
| In media res | 첫 프레임에 오브젝트가 이미 움직이고 있다 |
| Suara dulu | 소리가 먼저, 화면은 한 박 뒤 |
| Kata raksasa terpotong tepi | 가장자리에서 잘린 거대한 단어, 카메라가 물러나며 문장 전체가 드러난다 |
| Garis menggambar | 선이 그려지고 보니 제품·로고 모양이다 |
| Tekstur close-up | 질감 클로즈업이 제품의 일부로 밝혀진다 |
| Pertanyaan diketik diegetik | 세계 속 사물에 질문이 타이핑된다(떠 있는 입력창이 아니다) |
| Gelap → satu cahaya → dunia | 어둠 → 빛 하나 → 세계 |
| Masalah langsung | 혼란 한가운데에서 시작한다 |
| Dunia abu-abu, satu subjek berwarna | 회색 선의 세계에 색 있는 주인공 하나 |
| Aktor tak terduga | 뜻밖의 사용자(손·발톱)를 첫 프레임에 |
| Frame kosong, benda motif naik dari tepi | 빈 프레임에 겹겹의 모티프가 가장자리에서 올라온다(loop 엔딩 준비) |
| Hasil dulu | 결과물이 아주 가깝고 흐리게 먼저 나오고 멀어지며 문장에 자리를 준다 |
| Alat lama berserakan | 옛 도구 창들이 3D로 기울어 떠다닌다 |
| Simbol dulu, wadah menyusul | 심벌이 혼자 돌다가 앱 아이콘 틀이 뒤에서 자란다 |
| ✦ Kata yang meregang | 짧은 단어가 프레임 폭을 채울 때까지 늘어난다(시그니처 순간: 단어가 제품에 그런 뜻일 때만) |
| Titik cahaya di gelap | 점 하나가 그라디언트 도형 겹으로 피어난다 |
| Judul kinetik tersusun | 제목 글자가 여러 방향에서 들어와 잠긴다 |
| Objek di celah kata | 제목 두 단어 사이에 오브젝트, zoom hentak 후 복귀 |

- 조합: 글자 등장 방식(C1의 8 pintu)은 문장의 뜻에서 고르고, 연속한 두 장면이 같은 방식을 쓰지 않는다.

#### A11. Menu penutup (엔딩 메뉴)
- 출처: `konsep` "Menu penutup"
- 권장 지속 시간: "Alamat → nama"는 2–3초 정지 후 배경으로 사라진다. 나머지는 원문에 수치 없음. 멈춰 있는 엔딩(로고, CTA)에도 느린 push를 준다(`tech` §3b).

| 원어 | 풀이 |
|---|---|
| Logo lahir dari objek terakhir | 마지막 오브젝트에서 로고가 태어난다(morph) |
| Kamera mundur | 카메라가 물러나니 세계가 로고 모양이다 |
| Kata kunci kalimat terakhir digantikan logo | 마지막 문장의 핵심어를 로고가 대신한다 |
| CTA diegetik | 세계 속 UI·사물의 버튼이 눌린다(떠 있는 CTA 글자가 아니다) |
| Loop mulus | 마지막 프레임이 첫 프레임으로 이어진다 |
| Diam tegas | 모든 움직임이 동시에 멈추고 문장 하나, 컷 |
| Penerimaan | 주인공 사물이 도착하고 받는 손이 들어온다, end card 없음 |
| Callback ke pembuka | 로고가 오프닝 사물의 모양을 얻고 그 사물이 들어온 가장자리로 나간다 |
| Alamat → nama | 주소 타이핑 → 왼쪽부터 지움 → 제품명 타이핑 |
| Perangkat di alas + ikon ke lensa | 받침 위의 기기가 천천히 돌고, 아이콘이 렌즈로 커져 색 면이 됐다가 bumper로 물러난다 |
| ✦ Huruf brand sebagai panggung | 사람이 거대한 브랜드 글자를 관통해 포즈(시그니처 순간) |
| Menembus portal ke logo | 도형 구멍으로 들어가면 어둠 뒤에 로고 |
| Objek di podium | 주 오브젝트가 블록으로 쌓인 단상에 떨어진다 |
| Wordmark mengecil dari buram | 짙은 브랜드색 면에서 크고 흐린 wordmark가 선명하게 줄어든다 |

- 조합: 가운데에 쌓은 로고 + CTA는 brief가 CTA를 명시적으로 요구할 때만.

#### A12. Menu menyajikan fitur (기능 제시 메뉴 — "타일 3개"의 대체)
- 출처: `konsep` "Menu menyajikan fitur", `SKILL` Hukum #1, `anti` 표
- 시각적 특징: 글머리 목록을 시각으로 바꾸는 방법 모음.
- 권장 지속 시간: "Satu fitur didemokan"의 나머지 기능 스침 0.4초, "Isi berganti cepat" 1초 미만, "Isi berganti, wadah tetap" 약 1.5초마다. 나머지는 원문에 수치 없음.
- 메뉴(원어 / 풀이): Satu fitur didemokan(기능 하나 시연), Kata berganti(같은 문장에서 단어 교체: "Edit ___"), Objek bertransformasi(기능 A가 B로 morph), Kartu dikocok atau dilempar(카드를 섞거나 던진다), Orbit(아이콘이 제품을 돌다 들어간다), Mockup yang dipakai(스크롤·클릭되는 mockup), Checklist diegetik(세계 속 행동으로 체크), Garis pembelah sebelum/sesudah(이동하는 전후 분할선), Layar yang terbangun lalu dipakai(뼈대 → 카드 채움 → 커서 선택), Dikumpulkan tangan(손이 하나씩 집는다), Stiker kepribadian(성격 스티커), Isi berganti cepat(그릇 하나의 내용이 빠르게 교체), Halaman panduan brand(브랜드 가이드 페이지), Siklus klaim → cara → hasil per fitur, Kursor sebagai aktor(커서가 배우), Alur UI dipakai persona, Isi berganti/wadah tetap(그릇은 그대로, 내용 교체), Chip berjalan(흐르는 chip 줄), Peran pop + pil label(역할 아바타 + 라벨), Letupan integrasi(통합 아이콘 터짐), Kata raksasa berganti bersama orang, Wadah meletupkan fitur, Brand di dunia nyata, Objek 3D diapit teks kecil, Meja yang dirakit(조립되는 책상), Parade benda gaya hidup, Pola kata sebagai latar(단어 패턴 배경), Tur berselang klaim, Grid tile ikon(D2).
- 조합: 두 opener가 연달아 같은 방법을 쓰지 않는다.

#### A13. Akresi per frasa — satu adegan = 3–5 elemen (구절마다 쌓기)
- 출처: `expl` "Satu adegan = 3–5 elemen yang menumpuk", `SKILL` 구조적 금지 2
- 시각적 특징: VO 구절마다 요소가 하나씩 더해지고 이전 요소는 자리에 남는다. 장면은 요소 3–5개(최대 5)로 끝난다: 주체(사진·cutout) + 증거(문서, 신문 스크랩, 화면) + 규모(숫자나 반복 grid) + 라벨·날짜 도장 + 낙서.
- 적합: 콜라주 계열 explainer(H1–H4). 부적합: kartun panggung(글자 없음, 무대 안 연기로 설명).
- 권장 지속 시간: 좋은 저널리즘 explainer는 30초에 약 20 beat.
- 화면 구성 원칙: 글자 한도는 그대로(큰 문장 하나 + 라벨 하나). 3줄 이하 문서·도장·날짜 블록·손글씨 메모는 오브젝트로 센다. 요소는 장식이 아니라 "어떻게 생겼나"에 답하는 증거여야 한다.
- 카메라·오브젝트: 장면당 카메라는 하나. 새 요소는 컷이 아니라 작은 `look`(약 ±200px, z 1–1.15)으로 맞이한다.
- 구현: D8(`slam`, `block`, `multiply`) + B6(`look`). 문서는 HTML로 만든다(흰 종이 + 얇은 테두리 + mono + 기울어진 빨간 도장).
- 조합: 규모는 숫자만 쓰지 말고 반복 grid와 함께. "사진 → 문서"(사진이 줌아웃되니 잡지 표지였다)로 자산 하나에 뜻 둘.

#### A14. Tulang explainer 8 bagian (explainer 8단 뼈대)
- 출처: `expl` "Struktur yang dipelajari dari referensi"
- 시각적 특징: 1) Hook(그림 하나 + 궁금한 주장) 2) 화면 위 명시적 질문 3) 시각 맥락(지도·현장 사진 + 라벨 + 빨간 원 하나) 4) 세어 올라가는 큰 숫자와 전후 막대 비교 5) Linimasa(날짜 2–3개, 날짜당 한 문장) 6) 스스로 그려지는 그래프 7) 시청자에게 미치는 영향 8) hook으로 돌아가는 엔딩 + 작은 출처 목록.
- 적합: 콜라주·저널리즘 explainer. 부적합: opener.
- 권장 지속 시간: explainer 전체 30–90초(기본 60초). 단계별 수치는 원문에 없음.
- 화면 구성 원칙: 팔레트, 폰트, 정확한 레이아웃, 마스코트, 문장은 가져오지 않는다.
- 구현: 큰 숫자는 C6, 그래프는 D7의 `draw`, 지도는 H7.
- 조합: 장면 수는 길이 ÷ 6이 아니라 바뀌는 맥락이 정한다(`SKILL` 체크리스트). 넘치는 내용은 자르고 영상을 늘리지 않는다. "10분" 요청은 확인 뒤 90초 이하 장으로 나눠 별도 파일로.

### (b) 카메라 연출

#### B1. Kamera bernapas (숨 쉬는 카메라)
- 출처: `tech` §4b-1, `anti` 원칙 7·8, `assets/starter-opener.html`의 `breathe()`
- 시각적 특징: 세계 rig 전체가 아주 느리게 줌 drift한다. 정지도 급격한 움직임도 없다.
- 적합: 모든 영상의 바닥 층. 부적합: 영상이 정적이라는 불만의 해결책(거의 보이지 않으므로 B2를 쓴다). `shot()`을 쓰는 장면에서 `#world` scale을 따로 tween하면 안 된다.
- 권장 지속 시간: 장면 길이 전체. 장면당 ±4–5%, `sine.inOut`.
- 화면 구성 원칙: 카메라가 움직이면 세계 전체(글자와 배경)가 함께 움직인다. light leak, vignette는 rig 밖.
- 카메라·오브젝트: 방향을 장면마다 번갈아, 튀는 곳 없이 이어 붙인다.
- 구현(GSAP):
  ```js
  const breathe=(from,to,{z0=1,z1=1.045,origin='50% 50%'}={})=>{
    tl.set(rig,{transformOrigin:origin},from);
    tl.fromTo(rig,{scale:z0},{scale:z1,duration:to-from,ease:'sine.inOut',immediateRender:false},from); };
  ```
- 조합: B2와 함께 쓸 때는 `applyCam` 안의 `1 + .01*Math.sin(t*.7)`로 숨을 얹는다. 콜라주 카메라(B6)에서는 이 숨 대신 koreografi가 맡는다.

#### B2. Ukuran shot — kamera ke elemen (shot 크기 전환: wide ↔ medium close-up ↔ close-up)
- 출처: `tech` §3b, `SKILL` Hukum #1, `anti` 표
- 시각적 특징: 지금 이야기하는 요소로 카메라가 다가갔다가 wide로 물러난다. 원문이 말하는 "zoom in-out"의 실체다.
- 적합: 영상이 정적일 때, 사용자가 줌을 요청할 때, 큰 오브젝트 동작이 없는 구간. 부적합: 읽을 틈 없이 빠른 왕복(어지럽다).
- 권장 지속 시간: shot 이동은 예시에서 0.7–0.8초(`power2.inOut`). 유지 중에는 느린 push(`sine`). 구체적 유지 시간은 원문에 수치 없음.
- 화면 구성 원칙: wide = 구성 전체, medium close-up = 대상이 프레임의 약 1/3–1/2, close-up = 대상이 프레임 대부분. 크기는 고정 수가 아니라 요소 크기에서 계산한다. 같은 크기의 shot을 연달아 쓰면 밋밋하다. 세계 일부인 요소는 줌을 따라가고, 라벨·caption·화면 UI는 rig 밖 HUD 층에 둔다. 세계는 프레임보다 넓어야 한다(overscan).
- 카메라·오브젝트: 초점은 지금 이야기하는 요소의 중심. 카메라는 쫓지 않고 맞이한다. 글자는 카메라가 도착한 뒤 나온다. 컷 지점에서는 tween 없이 close-up에서 태어나도 된다.
- 구현(GSAP + 상태 객체):
  ```js
  const CAM={s:1,fx:W/2,fy:H/2};
  const shot=(at,dur,s,fx,fy,ease='power2.inOut')=>tl.to(CAM,{s,fx,fy,duration:dur,ease},at);
  const cutTo=(at,s,fx,fy)=>tl.set(CAM,{s,fx,fy},at);
  // frameOn(el, fill) → [scale, cx, cy];  shot(T,.8,...frameOn($('#judul'),.6)); shot(T+2,.7,1,W/2,H/2);
  ```
  `applyCam(t)`에서 `translate/scale`을 쓰고 가장자리를 clamp한다. 정점마다 스냅샷으로 글자 잘림과 세계 가장자리 노출을 확인한다. raster 자산 해상도는 scale × 표시 크기 이상.
- 조합: 래퍼 하나에 scale 체계 하나. `breathe()`나 `camThrough`와 같은 rig에서 섞지 않는다. explainer starter의 `look()`/`home()`이 같은 역할이다.

#### B3. Push-through (`camThrough`, 관통 줌)
- 출처: `tech` §3, §4b-4, `assets/starter-opener.html`
- 시각적 특징: 떠나는 글자 속으로 가속해 밀고 들어가 컷, 크게 태어난 새 글자에서 물러난다.
- 적합: 이유가 있을 때만(mockup 화면 속으로, 로고 구멍 속으로). 부적합: 모든 구간의 전환(원문: "비싼 버전의 PPT 템플릿").
- 권장 지속 시간: 진입 0.5초(`power2.in`) + 후퇴 0.95초(`power3.out`). 영상당 약 1회.
- 화면 구성 원칙: `transformOrigin`은 글자 위치(가운데 hero는 중앙, 글자가 위에 있으면 약 `'50% 22%'`). 컷 지점의 scale 점프는 빈 프레임이거나 light leak에 가려져 보이지 않는다.
- 구현(GSAP):
  ```js
  const camThrough=(atCut,{push=2,from=1.5,inDur=.5,outDur=.95,oOut='50% 50%',oIn='50% 50%'}={})=>{
    tl.set(rig,{transformOrigin:oOut},atCut-inDur);
    tl.to(rig,{scale:push,duration:inDur,ease:'power2.in'},atCut-inDur);
    tl.set(rig,{transformOrigin:oIn,scale:from},atCut);
    tl.to(rig,{scale:1,duration:outDur,ease:'power3.out'},atCut); };
  ```
- 조합: WebGL 카메라 `camZ`와 맞추면 깊이가 더해진다. 층마다 `translateZ`를 달리하면(perspective 1400px) 3D push-through(E2 #1). 정석 부품이므로 A1의 "최대 2개" 한도에 든다. UI 클릭을 따라가는 줌(B5)은 이 횟수에 세지 않는다.

#### B4. Pan 3D menyusur kalimat (문장을 따라가는 3D 팬)
- 출처: `tech` §4, `anti` 원칙 10
- 시각적 특징: 프레임보다 넓은 한 문장을 카메라가 훑고, 지나가는 순간 단어가 깨어난다. 앞의 단어는 약 20%로 흐리게 기다리고 지난 단어는 밝게 남는다.
- 적합: 특별한 구간 1개(최대 2개). 부적합: 모든 문장(특별함이 사라진다).
- 권장 지속 시간: 예시 2.9초(`power1.inOut`), 단어 등장 0.55초.
- 화면 구성 원칙: 부모에 `perspective`. 폰트 실제 폭과 무관하도록 `xPercent`로 이동한다.
- 구현(GSAP + CSS 3D):
  ```js
  tl.set(line,{x:W/2,xPercent:-6,rotateY:10});
  tl.to(line,{xPercent:-94,duration:2.9,ease:'power1.inOut'});
  tl.to(line,{rotateY:-10,duration:2.9,ease:'power1.inOut'});
  tl.fromTo(words,{opacity:.2,yPercent:16,scale:.96},{opacity:1,yPercent:0,scale:1,duration:.55,ease:'power2.out',stagger:panDur/(nKata-1)*0.95});
  ```
- 조합: `rotateY`를 흔들어(고정이 아니라) 곡선 dolly처럼. WebGL `camX`를 같은 방향으로 밀면 배경 parallax.

#### B5. Kamera mengikuti interaksi UI (`camTo` / `camWide`, UI 클릭을 따라가는 카메라)
- 출처: `tech` §8, `anti` 표, `konsep` "Animasi UI"
- 시각적 특징: 클릭 전에 대상 영역으로 다가가고, 클릭이 크게 읽히고, 결과 쪽으로 물러나거나 옮겨 간다.
- 적합: 이야기에 중요한 클릭. 부적합: 모든 클릭, 차분한 UI 장면(대시보드 전시, 데이터 채움).
- 권장 지속 시간: 커서 도착 0.3–0.5초 전에 줌(scale 1.4–2.2, `power2.inOut` 0.6–0.9초), 커서 정지 약 0.2초, 결과로 이동 0.7–1초. 왕복은 약 1.5초보다 빠르면 안 된다.
- 화면 구성 원칙: 대상을 프레임 중앙보다 약간 위에(`fy=.45`). 막당 중요한 클릭 1–3개만 줌. 방사형 blur 없이 부드럽게.
- 카메라·오브젝트: 버튼 눌림 scale .92 → 1, 클릭 순간 카메라는 거의 정지.
- 구현(GSAP):
  ```js
  const camTo=(ui,target,at,{s=1.8,dur=.8,fy=.45}={})=>{const W=ui.offsetWidth,H=ui.offsetHeight;
    const cx=target.offsetLeft+target.offsetWidth/2,cy=target.offsetTop+target.offsetHeight/2;
    tl.to(ui,{x:W/2-cx*s,y:H*fy-cy*s,scale:s,duration:dur,ease:'power2.inOut'},at);};
  const camWide=(ui,at,dur=.9)=>tl.to(ui,{x:0,y:0,scale:1,duration:dur,ease:'power2.inOut'},at);
  // camTo(ui,btn,T-.5) → T에 클릭 → camWide(ui,T+.6)
  ```
  커서는 `ui` 안에 둔다(`transform-origin:0 0`, 바깥 프레임은 `overflow:hidden`).
- 조합: A5, A6, A9, D4와 함께. 전환용 push-through 횟수에 세지 않는다.

#### B6. Kamera kolase: `into` → `settle` → `look` → `home` (콜라주 카메라: close-up → 미끄러짐 → zoom out)
- 출처: `expl` "Resep kamera kolase", "Mulai dari starter yang benar", `assets/starter-explainer-katalog.html`
- 시각적 특징: 첫 자산의 close-up에서 태어나 둘째 자산으로 미끄러지고, 제목이 나올 때 zoom out해 HOME에서 **정지**한다.
- 적합: 글자가 있는 콜라주 explainer(H1–H4). 부적합: 캐릭터·과정 애니메이션의 모든 구간(카메라가 머물거나 주체를 따라가도 된다). 원문: 이 레시피를 모든 구간에 강요하지 않는다.
- 권장 지속 시간: `into` 0.9초(`power2.in`), `settle` 1.1초(`power3.out`), `look` 기본 1.6초(`sine.inOut`), `home` 1.0–1.2초. 파노라마 팬은 z 1.3–1.5에서 2.5–3초.
- 화면 구성 원칙: 종이·배경은 프레임보다 훨씬 넓게(`inset:-1400px`), vignette는 rig 밖. **zoom out이 끝난 뒤에 글자가 나온다**(`home()` 종료 후 0.1초 이상). zoom out 뒤에는 다시 밀지 않는다.
- 카메라·오브젝트: 태어날 때 z 약 1.4 → 1.32로 가라앉는다. 전환은 컷 0.9초 전에 옛 요소가 떠나고 카메라가 다음 장면 첫 자산 지점으로 밀며, 컷 순간 새 장면이 그 프레이밍에서 태어난다. 첫 자산은 컷 뒤 0.1초 안에 들어와 있어야 한다.
- 구현(GSAP, 상태 `C={x,y,z}`):
  ```js
  const look=(at,x,y,z,dur=1.6,ease='sine.inOut')=>tl.to(C,{x,y,z,duration:dur,ease,onUpdate:applyCam},at);
  const home=(at,x=960,y=540,dur=1.2)=>look(at,x,y,1,dur,'power2.inOut');
  const into=(cutAt,x,y,z)=>tl.to(C,{x,y,z,duration:.9,ease:'power2.in',onUpdate:applyCam},cutAt-.9);
  const settle=(cutAt,x,y,z)=>tl.to(C,{x,y,z:z*.94,duration:1.1,ease:'power3.out',onUpdate:applyCam},cutAt);
  ```
  스크럽 함정: `tl.pause(t)`는 callback을 누른다. `seek`는 `tl.pause(t,false)` 뒤 `applyCam()`.
- 조합: `say`(C4), `draw`(D7), `fly`(D1)와 한 세트. rig에 다른 scale tween을 쌓지 않는다.

#### B7. Kamera dalam panggung (무대 안 카메라 — wide 금지)
- 출처: `panggung` Hukum 1·2, `SKILL` 구조적 금지 7
- 시각적 특징: 무대마다 자기 카메라. 무대 안에서만 움직이고 줌은 1.08–1.95.
- 적합: kartun panggung(H6). 부적합: 거대한 지도 한 장을 줌 0.2–0.7로 돌아다니는 구성(미니어처가 된다).
- 권장 지속 시간: **0.45–0.7초 유지 → VO beat당 움직임 하나 → 유지.** 기본 이동 1.6초(`sine.inOut`, starter의 `cam()`).
- 화면 구성 원칙: 캐릭터는 close-up에서 프레임 높이의 약 55–65%, 가장 넓을 때도 약 35%. 캐릭터 높이는 scale 1에서 약 520px.
- 카메라·오브젝트: 허용되는 움직임은 오브젝트로 push-in(1.12 → 1.45), 일부러 프레임보다 높게 만든 무대에서 지붕·땅속으로 tilt, 주체 따라가기(점프 궤적). 줌은 로그 보간.
- 구현: `const cam=(sc,at,x,y,z,dur=1.6,ease='sine.inOut')=>tl.to(sc.cam,{x,y,z,duration:dur,ease,onUpdate:sc.apply},at);`
- 조합: 무대 사이는 E7(cut 또는 96px 이동). 세계를 3초 동안 가로지르는 비행(하늘로, 땅속으로, 줌아웃)은 금지.

#### B8. Sudut pandang berganti + instrumen (시점 전환과 계기)
- 출처: `expl` "Sudut pandang WAJIB berganti", "Gaya kelima"
- 시각적 특징: 주체는 가운데 그대로, 시점이 옆 → 운전실 → 지도 → 고도 프로필 → 지도 경주 → 정면 → 실내 → 옆으로 바뀐다. 사실마다 계기가 하나씩 붙는다.
- 적합: 속도, 경로, 교통, 스포츠, 과정. 부적합: 원문에 명시 없음.
- 권장 지속 시간: 시점 교체 whip 0.25–0.3초. 굽이 구간은 `#world` 전체를 8–15° 회전 1.5초.
- 화면 구성 원칙: 같은 시점이 세 장면 연속이면 안 된다. 오프닝·엔딩만 옆모습으로 "지나가기"가 허용된다.

| 사실 | 시점·계기 |
|---|---|
| 속도 | 운전실: speedometer 바늘 + 디지털 숫자, 앞유리에 흐르는 레일 |
| 경로·거리·정차 | 지도 시뮬레이션(H7) |
| 지형·터널·오르막 | 고도 프로필, 가장 긴 구간을 강조하고 줌 |
| 시간 비교 | 지도 위 경주: 표식 셋이 동시 출발, 승자가 도착할 때 나머지는 1/4 |
| 수·정원 | 실내: 원근 통로, 차례로 켜지는 좌석 |
| 근접·규모 | 정면: 소실점에서 다가와 프레임을 채운다 |

- 구현: 시점마다 `<div class="view">` + 자체 SVG. 모든 view는 같은 시간·세계 거리의 순수 함수라 VO 싱크가 유지된다. 옆 카메라는 `[t, zoom, cx, cy]` keyframe(중요한 순간 1.06–1.12배 push) + 느린 ±0.6% 진동을 SVG 내용을 감싼 `<g>` 하나에 적용한다.
- 조합: E5(whip). 화면을 패널로 쪼개는 비교는 금지(같은 세계 안에서 비교한다).

#### B9. Kamera WebGL (Three.js 카메라: dolly `camZ`, sway, shake)
- 출처: `tech` §7, `arch` "State-driven WebGL"
- 시각적 특징: 장면마다 `camZ` dolly, 느린 사인 handheld sway, 고주파 사인으로 beat shake.
- 적합: WebGL 배경을 쓰는 opener. 부적합: 2D explainer(원문: Three.js를 건너뛴다).
- 권장 지속 시간: 원문에 수치 없음.
- 구현(Three.js + GSAP): scene은 시간을 모르고 `state` 객체만 노출한다. timeline이 `state.camX/camY/camZ/camRoll/shake/bloom`을 tween하고 `render(t)`가 `t = tl.time()`을 받는다. 흔들림은 `Math.random()`이 아니라 `Math.sin(t*137.2)` 같은 고주파 사인.
- 조합: "카메라" 느낌은 DOM rig가 담당하고 WebGL 카메라는 깊이를 더한다(B3, B4와 같은 방향으로).

### (c) 타이포그래피 애니메이션

#### C1. Split per huruf + 8 pintu teks (글자 단위 분할과 8가지 등장 방식)
- 출처: `tech` §1, `konsep` "Menu pembuka" 끝, `assets/starter-opener.html`
- 시각적 특징: 글자 하나하나가 stagger로 들어오고 방향 blur가 붙는다. 8가지 방식: 위로(`inUp`), 아래로(`inDown`), 왼쪽(`inLeft`), 오른쪽(`inRight`), 깊이에서(`inDepth`), mask reveal(`inMask`), 단어별(`inWords`), 타이핑(`typeOn`).
- 적합: opener, kinetic typography, 제목. 부적합: 긴 본문.
- 권장 지속 시간: `inUp` 0.8초·stagger 0.024, `inLeft` 0.75초·0.02, `inDepth` 1초·0.018(가운데부터, `expo.out`), `inMask` 0.9초, `inWords` 0.6초·0.14, 퇴장 `outUp/outLeft` 0.4초·0.01(`power2.in`).
- 화면 구성 원칙: 연속한 두 장면이 크기(sm 74 / md 92 / 기본 112 / lg 128 / xl 150px), 등장 방향, 위치(가운데 / 오브젝트 근처 / 왼쪽 위) 모두 같으면 안 된다. 긴 문장은 굵기가 다른 두 줄(500, 600)로 나눈다. 오브젝트에 붙는 글자는 그 옆에 둔다.
- 구현(GSAP + SVG filter):
  ```js
  const inUp=(ch,el,at,{dur=.8,st=.024}={})=>{tl.fromTo(ch,{opacity:0,yPercent:60,scaleY:1.45},
    {opacity:1,yPercent:0,scaleY:1,duration:dur,ease:'power4.out',stagger:st,immediateRender:false},at);blurTween(tl,el,at,30,0,dur,VERT);};
  const outUp=(ch,el,at,{dur=.4,st=.01}={})=>{tl.to(ch,{opacity:0,yPercent:-70,duration:dur,ease:'power2.in',stagger:st},at);blurTween(tl,el,at,0,45,dur+.1,{ease:'power2.in',...VERT});};
  ```
  초기 상태 `opacity:0`은 CSS에 둔다(`.ch`, `.hl-t`, 문장부호). 폰트가 로드된 뒤(`document.fonts.ready`) split한다.
- 조합: C2는 필수 짝(모든 글자 입·퇴장에 방향 blur). 방식은 문장의 뜻에서 고른다.

#### C2. Motion blur berarah (방향성 모션 블러, `feGaussianBlur`)
- 출처: `tech` §2, §10
- 시각적 특징: 움직이는 방향으로만 번진다. CSS `filter: blur()`는 사방으로 번져 초점이 안 맞은 것처럼 보인다.
- 적합: 모든 글자 입·퇴장, 날아가는 cutout. 부적합: 상시 적용(매 프레임 다시 rasterize되어 비싸다).
- 권장 지속 시간: tween 길이와 같다. 값은 입장 30 → 0(세로)·50 → 0(가로), 퇴장 0 → 45·55.
- 구현(SVG):
  ```js
  f.setAttribute('x','-70%'); f.setAttribute('y','-70%'); f.setAttribute('width','240%'); f.setAttribute('height','240%');
  blur.setAttribute('stdDeviation', `${v} ${v*0.08}`);   // 가로 이동
  ```
  tween 시작 때 filter를 달고 끝나면 `filter:'none'`으로 뗀다. filter 영역을 넓히지 않으면 blur 꼬리가 잘린다.
- 조합: `blurTween`은 래퍼의 `filter`를 덮어쓴다. grayscale 같은 색 filter는 `<img>`에 둔다(`expl`).

#### C3. Menu penekanan (단어 강조 메뉴: `tanpa` / `pill` / `under` / `marker` / `box` / `color` / `strike`)
- 출처: `tech` §1, `SKILL` Hukum #4
- 시각적 특징과 적합:

| 원어 | 모양 | 느낌 | 적합 |
|---|---|---|---|
| `tanpa` | 면·선 없음. 단어별 흐림 → 선명, 크기, 간격, 단어 옆 아이콘 | 차분, 제품이 말한다 | SaaS, AI, 미니멀 브랜드 |
| `pill` | 왼쪽에서 부푸는 색 블록 | 단호, 디지털 제품 | 앱, SaaS, tech |
| `under` | 왼쪽에서 그려지는 굵은 밑줄 | 에디토리얼 | 금융, 생산성, 저널리즘 |
| `marker` | 기울어진 반투명 형광펜 | 따뜻함 | 교육, 커뮤니티, 음식 |
| `box` | 둘레를 그리는 얇은 선 상자 | 기술적, 정밀 | 개발 도구, 하드웨어 |
| `color` | 단어 색만 바뀐다 | 고급, 미니멀 | 패션, 부동산, 자동차 |
| `strike` | 취소선 뒤 대체 단어 | 반어, 전후 | "X가 아니라 Y" 프로모 |

- 부적합: 모든 문장에 강조, 다른 프로젝트와 같은 pill + 별 장식.
- 권장 지속 시간: 문장 `inUp` → 0.4–0.6초 뒤 `mark(hl)`(면 0.5초, 단어 0.7초) → 0.25초 뒤 `popDot`(문장부호가 실제로 있을 때만).
- 화면 구성 원칙: 강조는 선택 사항이며 style brief에서 정한다. 영상당 한 모양. 장식(ornamen)은 브랜드 모양에서 나올 때만.
- 구현(GSAP + CSS): `.hl i{position:absolute;transform:scaleX(0);transform-origin:0 50%}`
  ```js
  const mark=(hl,at)=>{const i=$('i',hl);if(i)tl.fromTo(i,{scaleX:0},{scaleX:1,duration:.5,ease:'power3.out',immediateRender:false},at);
    tl.fromTo($('.hl-t',hl),{opacity:0,yPercent:60},{opacity:1,yPercent:0,duration:.7,ease:'power4.out',immediateRender:false},at); };
  ```
- 조합: 문장부호 규칙과 함께 본다(C8). 4단어 이하 제목·주장에는 마침표를 붙이지 않는다.

#### C4. `say` / `unsay` — kalimat per kata (단어별 문장)
- 출처: `expl` "Resep teknis", explainer starter
- 시각적 특징: 단어가 하나씩 올라오고(`yPercent 60→0, scaleY 1.3→1`, 세로 blur), 다 나온 뒤 핵심어의 형광펜이 왼쪽에서 그려진다.
- 적합: 콜라주 explainer. 부적합: kartun panggung(caption 0).
- 권장 지속 시간: stagger 0.07–0.12초(starter 기본 dur 0.55·st 0.08), `unsay` 0.3초·stagger 0.02.
- 화면 구성 원칙: 줄바꿈이 필요한 구절을 `.wd`(nowrap) 하나로 만들지 않는다(9:16에서 프레임 밖으로 넘친다).
- 구현: 단어마다 `<span class="wd">`, 핵심어는 `<span class="wd hl"><i></i>단어</span>`이고 `<i>`가 `scaleX 0→1`(`hlAt`). `const unsay=(sel,at,{dur=.3}={})=>{...tl.to(ws,{opacity:0,yPercent:-50,duration:dur,ease:'power2.in',stagger:.02},at);...}`
- 조합: B6의 `home()`이 끝난 뒤에 호출한다.

#### C5. Ketikan / hapus-ketik (`typeOn`, 타이핑과 지우고 다시 쓰기)
- 출처: `tech` §9, `konsep` 전환 메뉴 "Hapus-ketik", 엔딩 "Alamat → nama", `assets/starter-opener.html`
- 시각적 특징: 글자가 한 자씩 타이핑된다. 지우기는 왼쪽부터 한 자씩.
- 적합: 콘셉트 세계에서 실제로 타이핑되는 글(메시지, 명령, 제품의 핵심인 검색). 부적합: 모든 opener에 놓는 입력창(정석 부품).
- 권장 지속 시간: starter 기본 `cps=18`(초당 18자). 엔딩에서는 2–3초 정지.
- 구현(GSAP): `tl.fromTo(o,{i:0},{i:n,ease:'none',onUpdate:()=>el.textContent=str.slice(0,Math.round(o.i))})`. `setInterval` 금지.
- 조합: A5 엔딩. 타이핑 입력창은 A1의 정석 부품 한도에 든다.

#### C6. Angka hidup — counter, odometer, spektrum (살아 있는 숫자)
- 출처: `tech` §9, `expl` "Resep teknis"·"Gaya kelima", `konsep` 콘셉트 8
- 시각적 특징: 세어 올라가는 큰 숫자, 제자리에서 도는 odometer(35 → 43), 사인 합으로 만든 sparkline·스펙트럼.
- 적합: 성과·성능, explainer의 규모. 부적합: 검증되지 않은 숫자(원문: 표시하지 않고 정성적 주장만 쓴다).
- 권장 지속 시간: 원문에 수치 없음.
- 화면 구성 원칙: aksi kontinu에서는 숫자가 overlay가 아니라 세계 안에 서 있고(`.deep` 층: scale .9, 앞 배경 속도의 3/4) 주체가 그 앞을 지나가며 쓸어낸다. 바뀌는 숫자는 `font-variant-numeric:tabular-nums` + `min-width`.
- 구현: 숫자 `{v}` 객체를 tween → `textContent = Math.round(v)`. uptime은 `f(t) = base + (t - tStart)`. odometer는 `overflow:hidden` 안에 겹친 `<span>` 둘의 `y` tween.
- 조합: 비교는 전후 막대나 같은 세계 안의 비교 오브젝트로(패널 분할 금지).

#### C7. Teks hantu raksasa (거대한 유령 글자)
- 출처: `tech` §7c #9, `expl` "Variasi, bukan pola tetap", sketsa 절
- 시각적 특징: 뒤에서 천천히 미끄러지는 낮은 대비의 거대한 글자·연도.
- 적합: 에디토리얼, 연대(연도를 위에 ghost outline으로, 아래에 "장소 · 연도" 라벨 = 선 없는 타임라인). 부적합: 한 영상 안에서 스타일 섞기(어떤 장면은 outline, 어떤 장면은 채움).
- 권장 지속 시간: 원문에 수치 없음.
- 화면 구성 원칙: 영상당 한 스타일. 채움 투명도는 `expl` 기준 .18–.25 이상(.08–.12는 배경에 묻힌다), `tech` §7c는 대비 .12 이상.
- 구현: 원문에 코드 없음.
- 조합: 배경 모션 메뉴 F1의 #9로 선택한다.

#### C8. Aturan tipografi (타이포 규칙 묶음)
- 출처: `SKILL` Hukum #4, `tech` §1 "Aturan keras", §6
- 내용: sentence case, 굵기 500–600. 전부 대문자 + 800은 강조 장면 **하나**에만. 제목·주장·짧은 구절은 기본적으로 마침표 없음(`?`는 진짜 질문, 마침표는 의도한 두 짧은 문장, `!`는 아주 드물게). 문장부호를 쓰면 마지막에 따로 나오는 요소(`.txt2` + `popDot` 0.5초). 제목은 순백 + `text-shadow:0 4px 28px rgba(0,0,0,.5)`만, glow는 오브젝트에(D10). display 폰트와 UI mockup 폰트는 달라야 한다.
- 권장 지속 시간: 해당 없음(규칙).
- 조합: 어둠–밝음 교차는 구간의 분위기가 실제로 바뀔 때 고려한다(기계적 의무 아님).

### (d) 오브젝트 등장·퇴장

#### D1. `fly` / `flyOut` — cutout terbang lalu mendarat (날아와 내려앉는 cutout) + 살아 있는 자산
- 출처: `expl` "Cutout ilustrasi", "Aset harus terasa hidup", explainer starter
- 시각적 특징: cutout이 아래에서 overshoot로 들어와 내려앉고, 머무는 동안 계속 흔들린다.
- 적합: 콜라주 explainer, 종이·인쇄 방향. 부적합: kartun panggung(관절 rig 사용).
- 권장 지속 시간: `fly` 0.9초(`power4.out`), `flyOut` 0.45초(`power2.in`). 흔들림 ±22–28px, 1.3–1.8초(`sine.inOut`, yoyo) + 회전 ±1.5° + 장면 내내 scale 1 → 1.06.
- 화면 구성 원칙: 오브젝트마다 위상·길이를 다르게. 큰 오브젝트(배, 도시)는 `ease:'none'` 방향 이동을 더한다. ±10px·2초 흔들림은 정지로 보인다.
- 구현: `fly(sel,at,{from:{x:0,y:500,rotate:10,scale:.9},dur:.9,ease:'power4.out',float:true,rot:0})`. drop-shadow는 래퍼에, 색 filter는 `<img>`에.
- 조합: `multiply` blend 요소에는 `drop-shadow`를 주지 않는다(그림자가 네모가 된다).

#### D2. Tile ikon (아이콘 타일)
- 출처: `tech` §8, `konsep` 기능 메뉴 마지막 항목
- 시각적 특징: 약 210px 둥근 사각형, 밝은 강조색 2px 테두리, 아래에서 올라오는 inner glow, 흰 stroke 3.5–4.5 아이콘, 아래 1–2단어 라벨.
- 적합: 기능 제시의 **한** 선택지. 부적합: 기본값, 무조건 3개(정석 부품).
- 권장 지속 시간: `back.out(1.9)`, stagger 0.15. 유지 시간은 원문에 수치 없음.
- 구현: inner glow는 `radial-gradient(... at 50% 115%)`. GSAP `fromTo` + `back.out(1.9)`.
- 조합: A12의 다른 방법과 번갈아. 개수는 기능 수를 따른다.

#### D3. Mockup UI masuk sebagai objek (오브젝트로 들어오는 UI mockup)
- 출처: `tech` §8, `anti` 원칙 5
- 시각적 특징: 큰 `border-radius` 베젤 + `overflow:hidden` 화면. 프레임 아래에서 올라오며 `rotateY` ±10–24°.
- 적합: 앱·SaaS. 부적합: 레이아웃 열(column)처럼 배치하기.
- 권장 지속 시간: 원문에 수치 없음.
- 화면 구성 원칙: 내용은 제품의 실제 폰트와 색. mockup은 작은 글자가 많아도 된다(그림으로 읽힌다). 안의 살아 있는 요소는 3D 배경과 같은 데이터 원천으로 움직인다.
- 구현: 부모에 `perspective`, GSAP으로 `y` + `rotateY`.
- 조합: B3의 동기("mockup 화면 속으로"). 영상 clip을 화면 안에 넣을 수 있다(D6).

#### D4. Menu gerak UI (UI 동작 메뉴)
- 출처: `konsep` "Menu gerak UI"
- 권장 지속 시간: 클릭 정지 약 0.2초, 그래프 stagger 약 0.08초, 내용 교체 약 1.5초마다. 나머지는 원문에 수치 없음.
- 화면 구성 원칙: 제품 흐름이 요구하는 것만 고른다. 한 화면 = 한 과업. 데이터는 항상 살아 있다.

| 원어 | 풀이 |
|---|---|
| Perakitan komponen | 제목 → 가운데서 피는 입력 바 → placeholder 타이핑 → chip 줄 stagger |
| Klik yang terasa | ease-out 도착 → 약 0.2초 정지 → 버튼 scale .92 → 1 → 화면 반응 |
| Panel mekar ke langkah berikut | 클릭한 패널이 커지며 내용이 다음 단계로 바뀐다(그릇 하나) |
| Berkas terbang ke dropzone | 커서가 파일을 끌어다 놓으면 분석 진행 줄이 하나씩 찬다 |
| Grafik mengisi berurutan | 가로 막대가 왼쪽에서 stagger로 자란다 |
| Jendela melayang miring 3D | `rotateX 20–35°`, `rotateZ −10…−20°` 기울어진 면의 창 |
| Karusel jendela | 창들이 원통으로 휘어 제품 아이콘 둘레를 돈다 |
| Isi berganti, wadah tetap | 패널은 그대로, 제목이 세로 roll로 바뀌고 glyph가 flip |
| Chip berjalan | 2–3줄 chip이 줄마다 반대 방향으로 천천히 흐른다 |
| Peran pop + pil label | 아바타가 비대칭 위치에 pop, 선이 뻗어 역할 라벨이 된다 |
| Lencana integrasi | 흰 원 배지, 둘째 배지가 점에서 피어 옆에 붙는다 |
| Letupan & orbit integrasi | 서비스 아이콘이 터져 나와 떠다니다 다시 빨려 든다 |
| Ikon app 3D tebal | 옆면 두께가 보이는 아이콘, 장 구분과 엔딩 bumper |
| Perangkat membawa UI | 기기가 문장을 밀어내며 들어오고 UI 창이 화면 밖으로 나온다 |
| Kartu diangkat keluar | UI가 회색으로 흐려지고 위젯 하나가 떠오르며 뒤가 브랜드 색 면이 된다 |
| UI meledak menjadi diagram | 열(column)이 부모 → 자식 선으로 이어진 카드로 흩어진다 |
| Fokus kedalaman | 카드 하나는 선명하게 커지고 나머지는 작고 흐리게 |
| Layar terbelah UI / klaim | 밝은 쪽에 UI 조각, 색 쪽에 주장, 닫히며 다음 디테일로 줌 |

- 구현: 타이핑 C5, 데이터 C6, 카메라 B5. 나머지 항목의 코드는 원문에 없다.
- 조합: 서드파티 로고는 실제 통합이 있고 사용자가 동의할 때만.

#### D5. Menganimasikan foto (사진 애니메이션: pop, parallax, wadah, menembus, montase)
- 출처: `konsep` "Foto dalam opener" 5, `expl` "Foto", `SKILL` 체크리스트
- 시각적 특징: 인물이 아래에서 overshoot로 pop, 2–3겹 parallax, 그릇(blob·테두리)이 사진을 자르고 머리·손이 테두리 밖으로 나오며, 브랜드 글자를 관통하는 포즈, 박자 몽타주.
- 적합: 콘셉트 17, 그리고 3, 4, 6, 9, 13. 부적합: Ken Burns만 쓰기(거절).
- 권장 지속 시간: pop 회전 −4° → 0°, 유지 중 scale 1 → 1.02. 몽타주 0.3–0.8초마다 교체. explainer의 전면 사진은 Ken Burns scale 1 → 1.12–1.25 + 약간 이동(`ease:'none'`)에 방향 blur 등장을 더한다.
- 화면 구성 원칙: 해상도는 최대 표시 크기의 1.5–2배 이상. 투명 여백을 잘라 CSS 크기 = 내용. 사진들에 같은 얇은 grade. 서 있는 인물에는 접지 그림자, 아래가 잘린 인물에는 없음.
- 구현: 그릇 밖으로 나오는 인물은 사본 둘(그릇으로 mask한 것 + mask 없는 윗부분). 글자 관통은 뒤의 온전한 도형 + 앞의 부분 mask 사본. `back.out` pop.
- 조합: 사진 출처는 사용자에게 먼저 묻는다(사용자 사진 > MCP 생성 > 라이선스 스톡). 생성 시 가상의 얼굴만, 로고·글자는 코드에서 얹는다. 전면 사진을 장면마다 바꾸기만 하면 PPT다(구조적 금지 2).

#### D6. Video sebagai layer footage (`clip()`, 영상 레이어)
- 출처: `tech` §9b, `anti` 표, 모든 starter의 `clip` helper
- 시각적 특징: 영상 클립이 timeline에 묶인 footage 층으로 들어간다. 기기 화면 안, 카드·원·거대한 글자 안, 화면 반쪽, 전체 화면 + 위에 얹은 층.
- 적합: 실제 움직임이 증거일 때(제품 화면 녹화, 사용 장면, 진행 과정, 장소 분위기). 부적합: 정지 그림으로 충분할 때, `autoplay loop`로 붙인 전체 화면 영상.
- 권장 지속 시간: 강조 순간 3–8초.
- 화면 구성 원칙: `<video>`가 아니라 **래퍼**를 애니메이션한다. 동시에 보이는 클립은 최대 2–3개. 클립 범위 밖에서는 래퍼를 `autoAlpha`로 숨긴다.
- 구현:
  ```html
  <div class="clipbox" id="box1"><video id="v1" src="assets/klip.mp4" muted playsinline preload="auto"></video></div>
  ```
  ```js
  clip($('#v1'),{at:4,in:1.5,out:6,rate:1,hold:false});
  tl.set('#box1',{autoAlpha:1},4);
  tl.fromTo('#box1',{scale:.8},{scale:1,duration:1,ease:'power3.out',immediateRender:false},4);
  ```
  `autoplay`/`loop` 속성 금지, `play()` 직접 호출 금지. 형식은 MP4 H.264(`yuv420p`, `+faststart`) 또는 WebM VP9, 무음, 720p–1080p.
- 조합: 산출물이 `index.html` + `assets/` 폴더가 된다는 점을 사용자에게 알린다. 클립이 있는 초를 `snap.mjs`로 확인한다. 사실 주제에서 생성 클립은 "일러스트/재구성" 라벨을 붙인다.

#### D7. Anotasi `draw` / `drawDash` (그려지는 주석선)
- 출처: `expl` "Anotasi SVG", "Grafik garis", "Variasi"
- 시각적 특징: SVG 선·원·화살표가 그려진다. 선 그래프도 같은 방식으로 스스로 그려진다.
- 적합: explainer의 강조, 지도 경로, 그래프. 부적합: 매번 점선 원(번갈아 쓴다: 얇은 실선, 강조색 선, 이중선, 모서리 상자, 손 밑줄, 원 없음).
- 권장 지속 시간: starter `draw` 기본 0.7초.
- 구현: `strokeDasharray = L`, `strokeDashoffset L→0`. 시작 초까지 `opacity:0`(둥근 linecap이 길이 0에서 점으로 보인다). 점선은 dashoffset을 못 쓰므로 `clip-path: inset()`을 왼쪽부터 연다(`drawDash`). 그래프는 JS에서 점을 계산해 path를 그리고, 뒤이어 면 그라디언트 fade-in, 데이터 점 pop stagger, 라벨은 중요한 2–3점만.
- 조합: B6의 `home()` 뒤에 `say`와 함께.

#### D8. Elemen bukti: `slam` / `block` / `multiply` (증거 요소: 도장, 날짜 블록, 반복 grid)
- 출처: `expl` "Satu adegan = 3–5 elemen", katalog 절, `assets/starter-explainer-katalog.html`
- 시각적 특징: 쾅 찍히는 도장, 왼쪽에서 드러나는 날짜 블록, 한 그림이 수십 개 grid로 불어난다. 문서 카드(`.doc`), 사진 카드(`.cut.card`), 손글씨 메모(`.pnote`).
- 적합: 저널리즘·katalog explainer의 증거. 부적합: 4줄 이상 글이 든 문서(글자 단계로 세어진다).
- 권장 지속 시간: `slam` 0.26초(`power4.in`, scale 2.2 → 1), `block` 0.5초(`power3.out`), `multiply` 개당 0.4초·stagger 0.06(`back.out(2)`).
- 구현(GSAP):
  ```js
  const slam=(sel,at)=>tl.fromTo($(sel),{opacity:0,scale:2.2},{opacity:.92,scale:1,duration:.26,ease:'power4.in',immediateRender:false},at);
  const block=(sel,at)=>{tl.set($(sel),{opacity:1},at);tl.fromTo($(sel),{clipPath:'inset(0 100% 0 0)'},{clipPath:'inset(0 0% 0 0)',duration:.5,ease:'power3.out',immediateRender:false},at);};
  const multiply=(sel,at,st=.06)=>tl.fromTo($$(sel+' img'),{opacity:0,scale:.4,rotate:-30},{opacity:1,scale:1,rotate:0,duration:.4,ease:'back.out(2)',stagger:st,immediateRender:false},at);
  ```
- 조합: A13. 시계 SVG 바늘은 `rotation` + `svgOrigin`.

#### D9. Element-driven exit / `pass` (렌즈를 지나쳐 나가는 요소)
- 출처: `tech` §4b 끝, `expl` katalog 절 "Objek lewat lensa"
- 시각적 특징: 옛 요소가 렌즈를 **지나쳐** 날아간다(scale 약 2.2 + blur + stagger). 카메라는 부드럽게 따라갈 뿐이다. katalog의 `pass`는 큰 cutout이 일정한 가로 blur로 대각선 통과.
- 적합: 컷 없는 장면 교체. 부적합: 원문에 명시 없음.
- 권장 지속 시간: `pass` 1.2–1.3초, 장면당 1–2회. element-driven exit의 길이는 원문에 수치 없음.
- 구현: GSAP scale + 방향 blur(C2).
- 조합: E1의 2단계(겹치는 koreografi)와 함께.

#### D10. Glow yang benar (올바른 glow)
- 출처: `tech` §6, §10
- 시각적 특징: glow는 제품 오브젝트(타일·카드의 rim, mockup, 장식, 스펙트럼 막대)에만. 제목은 깨끗한 흰색.
- 부적합: 모든 제목의 glow(탁하고 촌스럽다), 사실적인 요소(스토어 줄, 버튼)의 glow.
- 권장 지속 시간: 해당 없음.
- 구현: WebGL bloom은 `threshold ≥ 0.5`(낮으면 프레임 전체가 하얗게 된다). `UnrealBloomPass(strength .75–.95, radius .7, threshold .52)`.
- 조합: F4.

#### D11. Rig sendi karakter — `J()`, `idle`, `walk` (관절 캐릭터 rig)
- 출처: `panggung` Hukum 4·5, "Karakter", `assets/starter-explainer-panggung.html`
- 시각적 특징: 벡터 몸 + raster 머리. 아무것도 하지 않아도 살아 있는 idle, 걷기, 점프, 문장마다 작은 동작. 표정은 머리 그림 교체.
- 적합: kartun panggung. 부적합: 통짜 그림(관절이 없다).
- 권장 지속 시간: idle 몸통 ±1.1°/1.7초, 머리 ±1.7°/2.3초, 팔 ±1–1.5°/1.9초, 깜빡임 약 3.5초마다 0.13초. 걷기 `step = sin(t·8)`, 허벅지 `step·15°`, 정강이 `max(0,step)·18°`, 몸 상하 `|step|·3–4px`. 가리키기 6° → −72°를 0.7초에.
- 화면 구성 원칙: 발 그림자 타원(`rx ≈ 72·scale, ry 16, opacity .13`)을 캐릭터보다 먼저 그리고 함께 움직인다. 머리 폭 약 150px, 몸 폭 130px.
- 구현(SVG + GSAP proxy). GSAP이 관절을 직접 건드리면 안 된다(`transformOrigin`은 bbox 기준이라 축이 흔들리고, `x/y` tween은 기존 `translate`를 덮어쓴다):
  ```js
  function J(el,tx=0,ty=0){const j={el,tx,ty,x:0,y:0,r:0,sx:1,sy:1,
    apply(){el.setAttribute('transform',`translate(${j.tx+j.x},${j.ty+j.y}) rotate(${j.r}) scale(${j.sx},${j.sy})`);}};j.apply();return j;}
  tl.to(j,{r:-62,duration:.42,onUpdate:j.apply},at);
  ```
  배치용 그룹(`translate`)과 애니메이션 그룹은 항상 다른 요소로 둔다. 표정·깜빡임 머리는 `scripts/kepala-ekspresi.py`로 로컬 생성.
- 조합: D12, B7, E7.

#### D12. Benda hidup di panggung (무대의 살아 있는 물체 ≥ 10)
- 출처: `panggung` Hukum 3, starter의 `spin`, `sway`, `drift`, `flowAlong`
- 시각적 특징: 도는 팬, 떨리는 계기 바늘, 깜빡이는 상태등, 파이프를 따라 흐르는 물방울, 강 물결, 올라가는 연기, 지나가는 새, 흔들리는 빨래, 자라고 시드는 식물, 번지는 균열.
- 적합: kartun panggung의 모든 무대. 부적합: 장식뿐인 움직임(각 물체가 장소·활동·관계를 설명해야 한다).
- 권장 지속 시간: 예시 팬 회전 `t·100°`. 개별 주기는 starter 호출 값(예: `spin(P2.roofFan,5.8,1.1)`)이며 원문 규칙으로는 수치 없음.
- 구현: 입자는 **움직임 tween 하나 + keyframe opacity tween 하나**(`keyframes:{opacity:[0,.9,.9,0]}`), 둘 다 `repeat:-1`. 같은 요소에 무한 opacity tween 둘을 걸면 서로 덮어쓴다. 물방울은 dash-offset이 아니라 `getPointAtLength`.
- 조합: 무대당 10개 이상이어야 E7의 컷이 구조적 금지 1의 예외로 인정된다.

### (e) 장면 전환

#### E1. Hierarki transisi (전환의 위계)
- 출처: `tech` §4b, `anti` 원칙 7
- 내용(이 순서로 쌓는다): 1) Kamera bernapas(B1, 항상) 2) **Koreografi elemen beririsan**: 옛 요소가 빠르게 나가는 **동안** 새 요소가 들어온다. 겹치는 시간이 전환을 살린다 3) Object wipe(E4) 4) Zoom termotivasi(B3, 영상당 약 1회).
- 부적합(싸구려로 읽힌다): 세계 가장자리가 드러나는 translate whip("페이지 넘김"), 컷마다 갑작스러운 spin/yaw/roll + blur(영상 편집기 preset의 언어).
- 권장 지속 시간: 퇴장 0.35–0.55초(`power2.in`), 등장 0.7–1.3초(`power4.out`) (`anti` 원칙 9).
- 조합: 모든 컷에 같은 전환 한 종류를 쓰지 않는다.

#### E2. Menu transisi §4c (전환 메뉴 9종)
- 출처: `tech` §4c

| # | 원어 / 풀이 | 방법 | 느낌 |
|---|---|---|---|
| 1 | Push-through 3D | `camThrough` + `translateZ`가 다른 층(perspective 1400px) | 세계로 잠수 |
| 2 | Kartu/objek berputar masuk / 돌며 들어오는 카드 | `rotateY` −35° → 0, `perspective` | 프리미엄, 촉각적 |
| 3 | Objek melewati lensa dengan ketebalan / 두께 있는 오브젝트가 렌즈 통과 | 압출 로고·유리 카드·3D 타일이 1 → 2.5배, 방향 blur | 시네마틱 |
| 4 | Sapuan cahaya / 빛 쓸기 | 컷 지점에서 빛이 프레임의 40–60%를 덮는다(100% 아님) | 부드러움 |
| 5 | Mask reveal lewat bentuk brand / 브랜드 모양 mask | 커지는 로고·글자 구멍으로 새 장면(`clip-path`/`mask`) | 강한 브랜드 |
| 6 | Whip dengan blur berarah / 방향 blur whip | 세계가 120–200px 이동 + blur 18px, 0.3초, 방향 교대 | 에너지 |
| 7 | Rack focus / kedalaman | 옛 장면은 흐려지고 뒤로 작아지며 새 장면이 앞에서 선명 | 서사적 |
| 8 | Koreografi beririsan tanpa cut / 컷 없는 겹침 | 옛 요소가 나가는 동안 새 요소가 들어온다 | 흐름 |
| 9 | Ganti latar di balik #1–#5 / 가려진 사이 배경 교체 | 프레임이 덮인 순간 어둠 ↔ 밝음·색 블록 교체 | 새 구간 |

- 부적합(기본값으로 거절): 프레임 전체를 쓰는 평평한 색 사각형·막대, 얇은 선 쓸기, 한 종류 전환의 반복.
- 권장 지속 시간: #6만 0.3초. 나머지는 각 카드(B3, E3, E4) 참조.
- 조합: 1절의 "원문끼리 어긋나는 곳" 참조. wipe는 영상당 최대 2회.

#### E3. Light leak (`sweep`, 빛샘)
- 출처: `tech` §5, `arch` rig 구조, `assets/starter-opener.html`
- 시각적 특징: 쓸고 가는 빛줄기가 아니라 가장자리에서 스며드는 부드러운 빛 공. 좌우 번갈아.
- 적합: 특별한 순간 한 번. 부적합: 모든 컷(영상 편집기 preset). 정석 부품.
- 권장 지속 시간: starter 기본 1.0초. 등장 `sine.in` 40% → 퇴장 `sine.out` 60%.
- 화면 구성 원칙: **가장 위 층**, vignette보다 위, `#world` 밖(렌즈 앞의 빛이지 세계의 속성이 아니다).
- 구현(CSS + GSAP): 지름 약 2400px 원, 밝은 중심 → 투명 radial-gradient, `blur(64px)`, `mix-blend-mode:screen`, 브랜드 강조색.
  ```js
  tl.fromTo(leak,{x:side*1500,y:-240,scale:.85},{x:side*330,y:130,scale:1.12,duration:dur,ease:'sine.out',immediateRender:false},at);
  tl.fromTo(leak,{opacity:0},{opacity:.85,duration:dur*.4,ease:'sine.in',immediateRender:false},at);
  tl.to(leak,{opacity:0,duration:dur*.6,ease:'sine.out'},at+dur*.4);
  ```
- 조합: B3의 scale 점프를 가린다. E9의 배경 교체를 가린다.

#### E4. Object wipe (오브젝트 wipe)
- 출처: `tech` §4b-3, §4c
- 시각적 특징: 장식(별, 브랜드 모양)이 렌즈 가까이를 쓸고 컷 지점에 프레임을 덮는다. 장면은 그 뒤에서 바뀐다.
- 적합: 의미와 깊이가 있는 오브젝트(유리 카드, 압출 로고, 타일). 부적합: 평평한 색 막대, 장면과 무관한 오브젝트.
- 권장 지속 시간: 대각선 궤적 약 1초(`power1.inOut`), scale 정점이 정확히 컷에.
- 구현(Three.js): z ≈ (`camZ` − 3), 세계 scale은 그 거리에서 프레임 높이의 약 2배. 사용할 때마다 방향 교대. 같은 속성을 쓰는 이전 tween이 겹치면 wipe가 죽는다(시간 overlap 확인).
- 조합: 영상당 최대 2회. 팔레트 색 면이 다음 막의 **배경이 되는** 경우(로고는 제자리에서 색 반전)는 장식 막대가 아니므로 허용되며 이것도 최대 2회.

#### E5. Whip antar view (시점 사이 whip)
- 출처: `expl` "Gaya kelima", `assets/starter-explainer.html`의 `whip()`
- 시각적 특징: 방향 blur + 짧은 이동으로 시점이 바뀌고, 다음 세트는 이미 움직이고 있다.
- 적합: aksi kontinu의 시점 교체, 콜라주에서 지도 시뮬레이션으로 넘어갈 때. 부적합: 세계 가장자리가 드러나는 translate(검은 틈).
- 권장 지속 시간: 0.25–0.3초(starter: `y:-120*dir`, `blur(18px)`, 0.28초, `power2.in`). 문서 설명은 이동 60px.
- 구현: `function whip(t,from,to,dir=1){tl.to(from,{y:-120*dir,filter:'blur(18px)',duration:.28,ease:'power2.in'},t); ...}`
- 조합: B8. `visibility:hidden`은 자체 `visibility="visible"` 속성이 있는 SVG 자식을 숨기지 못한다(속성을 `removeAttribute`로 지운다).

#### E6. Potongan antar adegan `cut` (콜라주 장면 컷)
- 출처: `expl` "Resep teknis"의 "Potongan antar adegan"
- 시각적 특징: 세계를 1.05배 밀고, 새 장면이 1.08–1.12배에서 태어나 1로 가라앉는다. 옛 요소는 blur와 함께 위로 나가는 **동안** 새 요소가 들어온다.
- 적합: 콜라주 explainer. 부적합: 원문에 명시 없음.
- 권장 지속 시간: 가라앉기 0.8초.
- 구현: rig scale tween + `flyOut`/`unsay` + `fly`.
- 조합: 같은 문서의 "Resep kamera kolase"는 push-through(`into`/`settle`, B6)를 전환으로 쓴다. 한 영상에서는 한쪽 체계를 기준으로 삼는다 `[보충]`.

#### E7. Cut / geser 96 px (kartun panggung의 무대 전환)
- 출처: `panggung` Hukum 2, `assets/starter-explainer-panggung.html`의 `cut()`, `slide()`
- 시각적 특징: 대부분 그냥 컷. 장소가 정말 바뀔 때만 짧은 미끄러짐.
- 적합: kartun panggung. 부적합: 정지 그림을 fade로 바꾸기, 다른 형식.
- 권장 지속 시간: 퇴장 0.28초(offset = −d·q²) → 컷 → 등장 0.42초(offset = +d·(1−q)³). d = 가로 96px 또는 세로 72px, 컨테이너 blur 10px 이하.
- 화면 구성 원칙: scale bump 없음, 추가 쓸기 선 없음. offset은 crop된 프레임이 아니라 무대 카메라 rig에 준다.
- 구현: `slide(at,from,to,axis='x',dist=96)` — `tl.to(from.cam,{ox:-dist,duration:.28,ease:'power2.in',onUpdate:from.apply},at)` → `cut(at+.28,from,to)`(`display` 전환) → 새 무대 offset을 0으로.
- 조합: 참고 프로젝트에서 강조 전환은 6번 중 2번, 나머지는 컷. VO 문장이 바뀐다고 무대를 바꾸지 않는다(39.6초 = 무대 5개, 81초 = 7개).

#### E8. Menu transisi yang dibawa benda (오브젝트가 운반하는 컷 없는 전환)
- 출처: `konsep` "Menu transisi yang dibawa benda" (`tech` §4c를 보완)
- 권장 지속 시간: "Hasil menjauh jadi kalimat" 겹침 약 0.4초, "Medan warna bergantian" 색당 0.2–0.3초, "Zoom hentak lalu kembali"는 한 번(보통 오프닝). 나머지는 원문에 수치 없음.
- 구현: 원문은 설명만 준다. mask는 `clip-path`/`mask`, 색 반전은 색 면의 경계선에서.

| 묶음 | 원어 / 풀이 |
|---|---|
| 사물이 덮는다 | Benda adegan berikutnya menjadi wipe(다음 장면의 사물이 wipe가 된다) · Sisi ikon 3D sebagai wipe(거대한 3D 아이콘 옆면) · Benda ke lensa(렌즈로 날아오는 사물) · Halaman naik bertumpuk(쌓여 올라오는 페이지) · Parade mendorong(행렬이 글자를 밀어낸다) · Perangkat mendorong kalimat |
| 모양·렌더 변화 | Match cut bentuk + ganti gaya render(같은 모양, 다른 렌더) · Flat menjadi 3D · Putar tipis → kartu warna membuka(얇아질 때까지 돌고 색 카드가 열린다) · Ikon flip ganti isi · Ubin berbalik(뒤집히는 타일) · Gema bentuk logo(로고 모양 메아리) |
| 관통·확대 | Menembus simbol · Menembus lubang bentuk · Mask bentuk logo membuka · Push ke bidang warna · Ikon menjadi medan · Kartu foto memenuhi frame · Zoom ke potongan UI · Zoom hentak lalu kembali |
| 그릇의 변형 | Wadah mekar / menyusut(슬롯 → 카드 → pill → 점) · Panel mekar ke langkah berikut · Lencana menyusut · Pil mekar jadi wadah foto · Wadah meletupkan isi · Jendela melengkung jadi karusel · UI masuk ke ponsel · Keluar dari layar(화면 밖으로 나와 실물이 된다) |
| 배경이 바뀐다 | Medan warna bertingkat + logo berbalik warna · Medan warna bergantian · Aksi UI mengganti latar(toggle이 배경색을 바꾼다) · Titik tetap, latar berganti · Penanda tetap, dunia berganti · UI meredup → kartu terangkat |
| 글자·흐름 | Hasil menjauh jadi kalimat · Meredup lalu berganti · Hapus-ketik · Klaim meredup → UI larut masuk · Belahan menutup menjadi zoom |
| 안내·도착 | Bola pemandu(안내 공) · Tangan penjemput(집어 가는 손) · Tarik mundur menyingkap tujuan(물러나며 목적지가 드러난다) · Titik tumbuh · Benda keluar ke sudut · Panel vertikal bergeser · Kuas menulis logo · Objek jatuh ke podium |

- 조합: 콘셉트 13–19의 기본 어휘다. 배경색 교체는 항상 보이는 계기가 있어야 한다(E9).

#### E9. Ganti latar di balik transisi (가려진 사이의 배경 교체)
- 출처: `tech` §7b, `SKILL` Hukum #3-5, `assets/starter-opener.html`의 `gantiLatarTerang()`
- 시각적 특징: 프레임이 덮였거나 컷인 순간 어둠 ↔ 밝음, 색 블록으로 바뀐다.
- 적합: 구간의 분위기·주제가 바뀔 때(문제 → 해결, 주장 → 제품, 본론 → CTA), 다채로운 브랜드, 화면 속 행동이 바꿀 때. 부적합: 이유 없는 cross-fade("슬라이드 넘김"으로 느껴진다).
- 권장 지속 시간: 0.25–0.4초(코드의 tween 길이). 밝은 장면의 vignette는 0.3–0.4로 약하게.
- 구현(GSAP):
  ```js
  tl.set('#paper',{autoAlpha:1},atCut); tl.to('#gl',{opacity:0,duration:.25},atCut);
  tl.to('.vignette',{opacity:.35,duration:.4},atCut); tl.to('.bgfx',{opacity:0,duration:.25},atCut);
  tl.set('#paper',{autoAlpha:0},0); tl.set(['#gl','.vignette','.bgfx'],{opacity:1},0);   // loop를 위해 t=0에서 복원
  ```
  밝은 장면에서는 글자를 `.ink` 변형으로, 어두운 `.pocket`과 WebGL bloom을 끈다.
- 조합: E2의 #1–#5, E3, E4 뒤에서. 짧은 bumper나 한 분위기 opener는 배경색이 하나여도 되지만 움직여야 한다(F1).

### (f) 배경 모션 언어

#### F1. Menu gerak latar §7c (배경 모션 메뉴 12종)
- 출처: `tech` §7c, `SKILL` 구조적 금지 4

| # | 배경 모션 언어 | 느낌 | 수치·메모 |
|---|---|---|---|
| 1 | 질감 배경 + 숨 쉬는 카메라 + 미세한 움직임 하나(tint·빛·grain) | 차분, 고급 | 허용되는 가장 조용한 선택. 완전 정지는 거절 |
| 2 | 천천히 이동·회전하는 큰 그라디언트(팔레트 2–3색) | 부드러움, 모던 | `background-position`·각도를 8–15초에 tween |
| 3 | 떠다니는 색 blob(blur 원 2–4개) | 친근, 가벼움 | drift ±60px, 4–6초 |
| 4 | 살아 있는 grain·종이 질감 | 유기적, 인쇄 | 무작위 noise가 아니라 `t`에서 offset |
| 5 | 구간당 **한 번** 빛 쓸기(light sweep) | 프리미엄 | 계속 쓸지 않는다 |
| 6 | 큰 기하 도형(원·선·로고 음각) 회전, parallax 2겹 | 브랜드, 강함 | 한 바퀴 20–40초 |
| 7 | 천천히 **올라가는** 입자(먼지, 방울, 불티) | 따뜻함 | 가로 아님. 글자 주머니에서 opacity .35 이하 |
| 8 | 숨 쉬는 grid·패턴 | 기술적, 정밀 | scale/opacity 1.0 ↔ 1.04, 6–10초, 스크롤 없음 |
| 9 | 뒤에서 느리게 미끄러지는 거대한 유령 글자 | 에디토리얼 | 대비 .12 이상, 한 스타일(C7) |
| 10 | 주제 사진·일러스트 + Ken Burns + parallax 2겹 | 서사적 | 글자 쪽에 어두운 그라디언트 필요 |
| 11 | 가로 흐름(streak, lane, range, 입자 비) | 속도, 데이터 | **주제가 속도·흐름일 때만**. 두 프로젝트 연속 사용 금지 |
| 12 | 교대하는 팔레트 색 면 | 팝, 에너지 | 쓸기·snap 0.15–0.3초, 사물·UI 동작·박자가 계기 |

- 화면 구성 원칙: opener당 한 가지(구간별로 배경이 바뀌면 둘까지). style brief의 "배경 모션" 줄에 쓰고 시그니처 모션(오브젝트·글자를 움직이는 것)과 구분한다. 직전 프로젝트와 달라야 한다.
- 구현: grain은 F3의 `grainAt`, blob은 F5의 `.paper .b` tween.
- 조합: 배경은 어떤 장면에서도 정지하지 않는다. 배경색 교체(E9)는 어느 언어 위에도 얹을 수 있다.

#### F2. Menu permukaan latar §7d (배경 표면 메뉴 a–g)
- 출처: `tech` §7d
- 시각적 특징: a. glow horizon(어두운 바탕 + 지평선 radial glow) · b. duotone diagonal · c. mesh terang(밝은 바탕 + 800–1200px blob 3–4개, drift ±60px) · d. spotlight + tint · e. langit berlapis(겹친 하늘 + opacity .2–.4 얇은 띠 2–3겹) · f. tekstur + tint(`feTurbulence` 종이·grain을 multiply/overlay, opacity .1–.3) · g. grainy gradient(F3).
- 부적합: 한 색 flat(예외: "poster color-block" 방향은 고운 grain을 얹어서, "flat pop berfoto"는 빠르게 바뀌고 움직이는 도형으로 채워지므로 허용). 순수 검정·흰색.
- 권장 지속 시간: 해당 없음.
- 구현(CSS, 예: a):
  ```css
  background:radial-gradient(70% 42% at 50% 108%,color-mix(in srgb,var(--accent) 34%,transparent),color-mix(in srgb,var(--accent) 12%,transparent) 48%,transparent 70%),linear-gradient(180deg,#05060a,var(--base) 60%,#0b1020);
  ```
- 조합: 모든 배경은 2겹 이상(바탕 + 빛·질감·blob). 색은 팔레트 토큰에서. 글자 주머니 규칙(F8)과 함께.

#### F3. Grainy gradient (입자가 있는 그라디언트)
- 출처: `tech` §7d "Grainy gradient", `SKILL` "Arah gaya", 체크리스트
- 시각적 특징: 채도 높은 2–3색 그라디언트를 **도형에** 넣고(안에서 빛나고 가장자리는 선명) 프레임 전체에 고운 단색 grain. grain이 dither 역할을 해 압축 banding을 막는다.
- 적합: tech, AI, 음악, 핀테크, 창작 론칭. 부적합: 원문에 명시 없음.
- 권장 지속 시간: grain 위치를 초당 12번 바꾼다.
- 구현(SVG filter + CSS + JS):
  ```html
  <filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
  ```
  ```css
  .grain{position:absolute;inset:-60px;pointer-events:none;filter:url(#grain);opacity:.22;mix-blend-mode:overlay}
  ```
  ```js
  const grainAt=t=>{const k=Math.floor(t*12);grainEl.style.transform=`translate(${k*37%60-30}px,${k*61%60-30}px)`;};
  ```
  어두운 배경은 overlay/soft-light opacity .15–.3, 밝은 배경은 multiply .08–.15. `baseFrequency` .65–.9(1920×1080에서 1–2px). WebGL은 fragment shader 끝에 `col += (hash(gl_FragCoord.xy + floor(uTime*12.)) - .5) * .06;`.
- 조합: 인코딩은 `-crf 10–12 -tune grain`(libx264)으로 하고 MP4에서 grain과 banding을 확인한다. A8의 기본 표면.

#### F4. Latar Three.js (nebula, debu, grid, ornamen 3D, tunnel, bloom)
- 출처: `tech` §7, `arch` "State-driven WebGL"
- 시각적 특징: 뒤에서 앞으로 nebula(fbm noise shader plane, 지평선이 빛나는 세로 그라디언트) → 먼지 `Points` 1000–1500개 → 바닥 grid(지평선 훨씬 전에 fade, opacity 0.2–0.6) → 3D 장식(`ExtrudeGeometry` + bevel + `MeshStandardMaterial`) → tunnel/rush(짧은 입자 300개 이하, opacity 0.6 이하) → bloom.
- 적합: "Sinematik gelap" 방향(창작 도구, 게임, 기술). 부적합: 다른 방향(원문: WebGL 배경은 여러 배경 언어 중 하나일 뿐이니 방향이 다르면 끈다), 2D explainer.
- 권장 지속 시간: 해당 없음.
- 구현(Three.js): nebula는 `NormalBlending`(additive는 bloom에서 쌓여 하얗게 된다). 장식은 Y축을 사인 ±0.55rad로 **흔든다**(완전 회전하면 얇은 물체가 선으로 보인다). `UnrealBloomPass(strength .75–.95, radius .7, threshold .52)`. 흐르는 것은 `state.flow`를 거리로 tween하고 위치 = `(seed + flow*speed) % span`.
- 조합: F1 기준으로 nebula drift + 숨 = #1, 올라가는 먼지 = #7, tunnel = #11. 값싼 추가 그라디언트는 `#world` **안**의 `mix-blend-mode:screen` div.

#### F5. Latar terang `.paper` + blob (밝은 배경과 blob)
- 출처: `tech` §7b
- 시각적 특징: 부드러운 밝은 그라디언트 위에 팔레트 색 blob이 천천히 움직인다. 종이와 그라디언트가 같은 CSS를 쓴다(`background`만 교체).
- 적합: 해결·제품 구간, 에디토리얼, 종이 방향. 부적합: 고민 없이 기본값으로 쓰는 어두운 배경의 대안으로만 생각하기(배경은 주제에서 정한다).
- 권장 지속 시간: blob tween 3초(`sine.inOut`, yoyo, repeat 1, stagger 0.4).
- 구현(CSS + GSAP):
  ```css
  .paper{position:absolute;inset:0;opacity:0;visibility:hidden;background:linear-gradient(180deg,#F7FAFF 0%,#EEF4FF 55%,#E6EEFF 100%)}
  .paper .b1{left:-260px;top:-380px;width:1100px;height:1100px;background:radial-gradient(circle,color-mix(in srgb,var(--accent-lit) 38%,#fff) 0%,transparent 68%)}
  ```
  `tl.to('.paper .b',{x:60,y:-40,duration:3,ease:'sine.inOut',yoyo:true,repeat:1,stagger:.4},atCut);`
- 조합: E9. 글자는 `.line.ink`.

#### F6. Arah gaya (스타일 방향 10종)
- 출처: `SKILL` "Arah gaya" 표

| 원어 / 풀이 | 배경 | 타이포 | 대표 움직임 | 적합 |
|---|---|---|---|---|
| Sinematik gelap / 어두운 시네마틱 | 거의 검은 그라디언트, WebGL 입자·nebula, bloom은 오브젝트에만 | 굵고 깨끗한 grotesk | push-through, 렌즈 앞의 빛 | 창작 도구, 게임, 기술 |
| Poster color-block | 장면마다 바뀌는 큰 단색 면 | 아주 굵은 display, 가장자리에서 잘린 거대한 글자 | 블록 wipe, 프레임 가장자리에 부딪히는 글자 | 소비자 앱, 음악, 행사 |
| Editorial terang / 밝은 에디토리얼 | 흰색·크림, 넓은 여백, 얇은 선 | serif display + 작은 grotesk | 부드러운 이동, 그려지는 선, 차분한 카메라 | 생산성, 금융, SaaS |
| Kertas & cetak / 종이와 인쇄 | 종이 질감, 콜라주 조각, 도장, 테이프 | 손글씨 + serif | 날아와 내려앉는 물건, 기울어진 각도 | 교육, 커뮤니티, 음식 |
| Retro / analog | 바랜 색, grain, scan line, VHS 틀 | 70–90년대 기하 서체 | 절제된 glitch, 거친 zoom, freeze | 향수, 음악, 오락 |
| Brutalis mono | 흑백, 딱딱한 grid, 선 상자 | monospace + condensed | 하드 컷, 밀리는 블록, 깜빡이는 커서 | 개발 도구, 기술 |
| Pastel ceria / 밝은 파스텔 | 겹친 파스텔, 큰 둥근 도형 | 굵은 rounded sans | 탄성 바운스, 피어나는 도형 | 어린이, 건강, 라이프스타일 |
| Mewah gelap / 어두운 럭셔리 | 검정 + 금·청동, 부드러운 그림자 | 자간 넓은 높은 serif | 느린 움직임, 쓸고 가는 빛, 깊이 | 패션, 자동차, 부동산 |
| Flat pop berfoto | 밝은 중립과 브랜드 단색 면 교대, 로고 파생 플랫 도형·스티커 | 굵은 둥근 기하 sans + 잘린 거대한 단어 | 아래에서 pop하는 인물 사진, 터지는 스티커, 박자에 snap하는 색 면 | 소비자 앱, 핀테크, e-commerce |
| Grainy gradient | 어두운·깊은 바탕, 안에서 빛나는 2–3색 그라디언트 도형, 전체 grain | 작은 깨끗한 grotesk 또는 최소한의 굵은 display | 천천히 열리고 도는 도형 겹, 구멍을 관통하는 카메라, 안내 빛 공 | tech, AI, 음악, 핀테크 |

- 조합: 하나를 고르되 둘을 의식적으로 섞을 수 있다. 두 opener가 연달아 같은 줄을 쓰면 위험 신호다.

#### F7. Menu gaya render objek §7e (오브젝트 렌더 스타일)
- 출처: `tech` §7e

| 원어 | 특징 | 웹 구현 | 적합 |
|---|---|---|---|
| Flat solid | 균일한 색, 그림자 없음 | SVG/CSS | 소비자 앱, 교육, 인포그래픽 |
| Flat + titik warna | 팔레트 원이 오브젝트 주변에서 탄력 있게 | SVG + GSAP | 밝은 브랜드, 로고 reveal |
| Soft 3D / clay | 매트 파스텔, 두꺼운 둥근 모서리 | Three.js `MeshStandardMaterial` roughness .7–.9 또는 생성 이미지 | 친근한 핀테크, 교육 |
| Glossy 3D | 광택 플라스틱, rim light | `MeshPhysicalMaterial` clearcoat 1 + envMap | tech, 보안, 게임 |
| Kaca / bola bercahaya | 투명, 굴절, 빛나는 핵 | `MeshPhysicalMaterial` transmission 1 + 작은 bloom | AI, 포털, 시선 안내 |
| Isometrik | 30° 각, 원근 없음 | CSS isometric transform 또는 orthographic 카메라 | 부동산, SaaS, 과정 지도 |
| Logam/marmer realistis | PBR, 피사계 심도 | Three.js PBR + HDRI + DOF 또는 가져온 렌더 | 시상, 럭셔리, 행사 |
| Garis neon di gelap | 빛나는 얇은 outline | SVG stroke + 얇은 glow | tech, 음악, 포털 |
| Ilustrasi karakter flat | 벡터 인물, 따뜻한 색 | 겹친 SVG/PNG | 커뮤니티, 서비스, explainer |

- 조합: 영상당 한 계열. 둘을 쓰려면 교체 자체를 순간으로 만든다(플랫 도형이 돌더니 3D 물체였다). 사실적인 오브젝트는 생성·렌더 이미지를 층으로 가져와 애니메이션하는 편이 효율적이다.

#### F8. Kantong teks / `.pocket` (글자 주머니 대비)
- 출처: `tech` §1b, `SKILL` Hukum #4
- 내용: 글자 영역의 배경 휘도는 흰 글자면 25% 이하, ink 글자면 80% 이상. 배경이 복잡하면 `.pocket`(어두운 radial-gradient 55% → 투명)을 글자 아래에 두고 글자와 함께 켠다. 배경 요소는 팔레트의 어두운 쪽 색, 주머니 안 opacity .35 이하, 보이는 밝은 요소 40개 이하. bloom threshold .55 이상이고 오브젝트에만.
- 검사: 제목이 다 나온 프레임을 grayscale로 바꿔 글자만큼 밝은 배경이 있으면 너무 시끄럽다. 글자를 숨겼을 때 배경은 "흥미롭다"가 아니라 **차분**해야 한다.
- 조합: 주머니 밖 배경은 오히려 풍부해야 한다(F2).

#### F9. Tint per adegan (장면별 tint)
- 출처: `expl` "Resep teknis"
- 시각적 특징: `#world` 안의 전면 `.tint` 층(밤·차가움·어두움)의 opacity를 tween해 분위기를 바꾼다.
- 적합: 2D explainer의 분위기 전환. 권장 지속 시간: 원문에 수치 없음.
- 구현: `.tint` div + GSAP opacity tween.
- 조합: 원문은 2D explainer에 "rig `#world` + tint + grain"이면 충분하다고 한다.

#### F10. Strip parallax mengalir (흐르는 parallax 띠 — aliran 모드)
- 출처: `expl` "Gaya kelima" 레시피, `assets/starter-explainer.html`의 `strip()`, `wobj()`
- 시각적 특징: 주체는 프레임에 고정, 2–3겹 띠가 흐르고 세계 오브젝트가 지나간다.
- 적합: 속도·경로 주제. 부적합: 주제가 속도·흐름이 아닌 opener(F1 #11 제한).
- 권장 지속 시간: 계속. 글을 읽을 때도 멈추지 않고 40%로 늦춘다. 팔레트 교체 0.3초.
- 구현: 폭 300% 띠(starter는 주기 `P=2400`의 SVG 그룹 2벌)를 속도 프로필에서 계산한 세계 거리로 이동. 뒤 층 속도는 앞의 1/2(starter 계수 .18 / .38 / .62). 세계 오브젝트는 `wobj(parent,f,x0,t0,w,t1)`로 등장 `t0`와 폐기 `t1`을 준다. 색은 CSS 변수로 두고 객체를 tween한 뒤 `style.setProperty`.
- 조합: C6의 세계 속 숫자, B8의 시점 전환. `(0,0)` 기준으로 scale·회전하는 SVG 그룹은 `gsap.set`이 아니라 `transform` 속성을 직접 쓴다.

### (g) 속도·리듬 조절

#### G1. Ritme masuk-keluar asimetris (비대칭 입·퇴장)
- 출처: `anti` 원칙 9, `SKILL` Hukum #3-7
- 내용: 등장은 느리고 단호하게(0.7–1.3초, `power4.out`), 퇴장은 빠르게(0.35–0.55초, `power2.in`). 대칭은 기계적으로 느껴진다. 모든 작업에서 같아도 되는 것 중 하나다.
- 구현: C1의 `inUp`(0.8초) / `outUp`(0.4초)이 이 비율이다.

#### G2. Momen istimewa (특별한 순간 1–2개)
- 출처: `anti` 원칙 10, `SKILL` style brief
- 내용: 가장 비싼 효과(단어별 3D pan, logo build-on)는 한두 번만. 어디서 쓸지 style brief에 적는다. 모든 곳에 쓰면 특별하지 않다.
- 조합: B4, B3, E3이 대표 후보. 각각 "영상당 약 1회" 한도가 있다.

#### G3. Durasi lazim per jenis (종류별 통상 길이)
- 출처: `SKILL` "Jenis pekerjaan", `expl`, `panggung`

| 종류 | 길이 | 특징 |
|---|---|---|
| Opener / promo | 25–40초 | 메뉴에서 고른 콘셉트 하나, 특별한 순간 하나, 브랜드 엔딩 |
| Bumper / ident / logo sting | 3–8초 | logo build-on, 시그니처 모션 하나 |
| Intro / outro 채널 | 5–12초 | 채널명 + 매회 같은 시그니처 모션 |
| Kinetic typography / 가사 | 15–60초 | 글자가 주인공, 리듬은 오디오를 따른다 |
| Title / lower third | 2–6초 | footage 위 작은 요소, 깨끗한 입·퇴장, 투명 배경 |
| Explainer | 30–90초(기본 60초) | 출처 있는 사실, 언급된 대상이 화면에, 시점 전환 |
| Kartun panggung 참고값 | 39.6초 = 무대 5개, 81초 = 무대 7개 | 무대 수는 문장 수가 아니라 장소·규모·설명 방식의 변화가 정한다 |

#### G4. Cut-on-beat / montase di ketukan (박자 컷과 몽타주)
- 출처: `konsep` 콘셉트 11, 17, "Foto dalam opener" 5, "Pamer sistem brand" 리듬
- 시각적 특징: 박자에 맞춰 조각이 바뀐다. 몽타주에서는 주체의 위치·크기는 그대로, 사진만 바뀐다. 4박마다 반복 모티프.
- 적합: 음악, 라이프스타일, 행사, 브랜드 캠페인. 부적합: 원문에 명시 없음.
- 권장 지속 시간: 조각 0.3–0.8초, 12–20조각(콘셉트 11). 색 면 snap 0.15–0.3초.
- 구현: timeline 절대 초에 `tl.set`/짧은 tween. 박자 시각은 오디오에서 구한다. 원문에 전용 helper는 없다.
- 조합: E8의 "Penanda tetap, dunia berganti", "Medan warna bergantian".

#### G5. Retime ke VO (VO에 맞춘 재타이밍)
- 출처: `expl` "Retime ke VO", "VO diikat timeline", `SKILL` Prasyarat 표, `scripts/vo-pauses.html`
- 내용: 영상을 소리 없이 읽기 속도로 먼저 만들고, 음성이 오면 `build()`를 다시 쓰지 않고 `tl.to/fromTo/set`을 장면별 선형 위치 매핑 `T(t)`로 감싼다(옛 장면 경계 OLD → VO 문단 시작 NEW). tween 길이는 그대로, 위치만 늘어난다. push-through는 새 시간에서 직접 계산(`T(cut)-.9`).
- 수치: 무음 감지 기준은 최고점 대비 −30dB, 간격 0.45초 이상, 문단 0.8초 이상(ffmpeg `silencedetect` 쪽 설명은 0.9초 이상, 잡음 많은 VO는 −25dB). VO 파일은 여러 개보다 하나가 쉽다.
- 구현: ffmpeg가 없으면 `scripts/vo-pauses.html`을 브라우저에서 열어 `SEG`/`PARA`/`DUR`을 복사한다. timeline에 묶인 VO는 `<audio>` + rAF loop의 `syncAudio()`(`currentTime = t - start`).
- 조합: 대본은 문단 하나 = 장면 하나, 숫자는 글자로 쓰고, 문단 사이 약 1초 쉰다.

#### G6. Hold yang tidak mati (죽지 않는 정지)
- 출처: `SKILL` 체크리스트, `tech` §3b, `panggung` Hukum 1
- 내용: 큰 오브젝트 동작이 없는 구간에는 shot 크기 변화(wide ↔ medium close-up ↔ close-up)나 느린 push를 준다. 카메라 숨만으로는 인정되지 않는다. 멈춘 엔딩(로고, CTA)에도 느린 push. kartun panggung은 "0.45–0.7초 유지 → beat당 움직임 하나 → 유지".
- 조합: B2. 글자는 카메라가 도착한 뒤에.

#### G7. Perubahan palet = perubahan tempo (팔레트 변화 = 템포 변화)
- 출처: `expl` "Gaya kelima" 5, 끝의 함정 메모
- 내용: 이야기가 고조되면(속도, 위험) 배경색이 0.3초 안에 바뀌고 motion blur가 붙는다. 주체는 그대로. 템포가 내려가면 원래 팔레트로 돌아온다. 글을 읽히려고 배경을 멈추지 말고 40%로 늦춘다.
- 적합: aksi kontinu. 구현: CSS 변수 `--bg`, `--ink`를 객체 tween + `style.setProperty`.

#### G8. Ritme per konsep (콘셉트별 리듬 요약)
- 출처: `konsep` 각 콘셉트의 "Ritme"

| 콘셉트 | 총 길이 | 막 | 이징·특이점 |
|---|---|---|---|
| 13 Estafet benda | 원문에 총 길이 수치 없음 | 4–6막, 시작·끝 약 2초, 고르기·모으기 3–4.5초 | 막당 주 동작 하나 |
| 14 Pamer sistem brand | 25–30초, loop | 8–12막, 2.5–4초 | 하드 컷 없음, 에너지 정점 2회 |
| 15 Klaim → cara → hasil | 원문에 총 길이 수치 없음 | 주장 1–2.5 / 방법 2–6 / 결과 4–6초 × 2–3회 + 엔딩 4–5초 | ease in-out 0.8–1.2초, 컷 없음 |
| 16 Ekosistem UI hidup | 50–60초 | 12–16막, 2–6초 | 하드 컷 최대 2회, 단어당 약 0.12–0.2초 |
| 17 Pop flat berfoto | 30초 | 약 25 shot, 평균 약 1.2초 | 색 면 snap 0.15–0.3초 |
| 18 Menembus bentuk bergradien | 원문에 총 길이 수치 없음 | 5–8막, 2–4초 | ease in-out 1–2초, 컷 없음 |
| 19 Tur produk berselang klaim | 25–30초 | 10–11막, 2–5초 | 컷 1–2회, 오프닝에 한 번 강타 |

### (h) explainer/카툰 무대 계열 형식

공통 (`expl`): 기본 16:9, 9:16은 요청 시. 자막·caption 없음(요청 시에만). 언급된 사람·회사·장소·제품은 그 장면에 사진으로 나와야 한다(실존 인물 얼굴은 생성하지 않는다). 뉴스 explainer는 출처 필수이고 검증되지 않은 숫자는 표시하지 않는다. 스타일 추천: 역사 → 4 또는 1, 뉴스 → 2, 제품 → 3, 움직임·경로 → 5, 캐릭터가 있는 과학·교육 → 6, 가벼운 주제 → 1.

#### H1. Kartun kolase (카툰 콜라주, 스타일 1)
- 출처: `expl` 머리 표, "Langkah nol", `SKILL` "Isi paket"
- 시각적 특징: 크림색 질감 종이 + grain + 색 얼룩, 플랫 일러스트 cutout, 색 pill, 손글씨.
- 적합: 과학·어린이 교육, 가벼운 주제. 부적합: 캐릭터가 연기해야 하는 이야기(H6).
- 권장 지속 시간: 머리 표 기준 약 75초(9:16 예시), 일반 선택지는 30/60/90초.
- 화면 구성 원칙: A13(요소 3–5개), 글자 2단. 폰트 Bricolage Grotesque + Caveat.
- 카메라·오브젝트: B6, D1, C4, D7.
- 구현: `assets/starter-explainer-kartun.html`. 일러스트는 한 스타일 prompt로 한 batch 생성 → 배경 제거 → 투명 PNG.
- 조합: VO와 묶는 것이 기본. 종이·grain 껍데기를 kartun panggung에 쓰면 안 된다(빈티지로 보인다).

#### H2. Jurnalisme visual (비주얼 저널리즘, 스타일 2)
- 출처: `expl` 머리 표, "Sumber gambar", "Fakta"
- 시각적 특징: 짙은 검정 + 얇은 grain, 실제 사진 + 출처 tag, 노란 형광펜, 경고용 빨강, 점선 주석.
- 적합: 뉴스, 화제 이슈, 지정학. 부적합: 출처를 확인할 수 없는 주제.
- 권장 지속 시간: 약 75초 예시. VO 없이 글자가 이야기를 끌 때 beat 3–5초.
- 화면 구성 원칙: 폰트 Barlow Condensed + IBM Plex Mono. 사진 위아래에 어두운 그라디언트(`.dim`, `.top`). 화면에 credit 표기.
- 구현: `assets/starter-explainer-jurnalisme.html`. 사진은 자유 라이선스(Wikimedia Commons, NASA, DVIDS). 뉴스·TV 스크린샷 금지. 정확한 현장 사진이 없으면 비슷한 사진에 "일러스트" 라벨.
- 조합: A14 뼈대, D8 증거 요소, H7 지도.

#### H3. Katalog putih (흰 카탈로그, 스타일 3)
- 출처: `expl` "Gaya ketiga"
- 시각적 특징: 흰 배경 + 120px 옅은 grid(가장자리로 fade), 사진 cutout + 2겹 drop-shadow, 섞어 쓰는 타이포(script + sans 900 + italic 900), 점선 원. grain·vignette 없음.
- 적합: 제품, 브랜드, 회사 소개(예시 약 60초, 9:16, VO 없음). 부적합: 원문에 명시 없음.
- 권장 지속 시간: `pass` 1.2–1.3초(장면당 1–2회).
- 화면 구성 원칙: 9:16은 W=1080, H=1920, `#world`를 `.safe`(scale .78)로 감싼다. 장면 영역은 세계에 가로 1600px, 세로 2400–3000px 간격. grid 종이 14000×12500px. 세로 사진 cutout이 본문과 부딪히기 쉽다(사진 비율로 높이 계산).
- 구현: `assets/starter-explainer-katalog.html`(Archivo Black + Caveat + Inter). 추가 helper `slam`, `block`, `multiply`. 흰 배경 소품은 `mix-blend-mode:multiply`로 얹으면 배경 제거가 필요 없다.
- 조합: D8, D9(`pass`), 세계지도 SVG(opacity 약 .16) + 빨간 점 + 점선 경로.

#### H4. Sketsa vintage (빈티지 스케치북, 스타일 4)
- 출처: `expl` "Gaya keempat"
- 시각적 특징: 세피아 종이, 동판화풍 일러스트를 `multiply`로 얹어 잉크가 종이에 스민 느낌, 고전 serif, 녹슨 색 손글씨, 반투명 금색 형광펜.
- 적합: 역사, 전기, 발명(예시 64초, 9:16, 무음). 부적합: 원문에 명시 없음.
- 권장 지속 시간: 원문에 장면별 수치 없음.
- 화면 구성 원칙: 폰트 Playfair Display 900 + Garamond italic + Cinzel. 큰 연도를 위에 ghost outline, 아래에 "장소 · 연도" 라벨(선 없는 타임라인). 그림자는 큰 오브젝트에만.
- 구현: `assets/starter-explainer-sketsa.html`. 모든 그림을 같은 prompt 접두어로 한 batch 생성. 역사 인물 초상은 이름이 아니라 시대·직업으로 쓰고 화면에 이름 라벨과 "동판화풍 일러스트" credit. 생성기 rate limit(동시 4개)에 맞춰 3–4개씩.
- 조합: C7, B6.

#### H5. Aksi kontinu (연속 액션, 스타일 5)
- 출처: `expl` "Gaya kelima", `SKILL` 체크리스트
- 시각적 특징: 주인공 하나가 0초부터 끝까지 프레임을 떠나지 않는다. 바뀌는 것은 세계다. 100% SVG 벡터를 JS로 그릴 수 있다.
- 적합: 속도, 경로, 교통, 스포츠, 과정. 부적합: 주인공이 장면마다 다른 그림(실루엣·색·위치를 지킨다).
- 권장 지속 시간: 시점 whip 0.25–0.3초, 굽이 1.5초, 팔레트 교체 0.3초. 완전히 정지한 초는 없다.
- 화면 구성 원칙: 글자 2단(큰 숫자 + 세계 라벨). 주인공은 영상 길이의 60% 넘게 등장(`anti`). 비교는 같은 세계 안에서.
- 카메라·오브젝트: 주인공은 여러 층(몸, 머리, 탈것, 그림자)을 `#hero` 하나에 넣어 층마다 다른 주기의 yoyo ±6–10px, `#hero`는 ±25px nudge.
- 구현: `assets/starter-explainer.html`(aliran 모드 + 지도 view + whip + 콜라주 모드 예시).
- 조합: B8, C6, E5, F10, G7, H7. 콜라주 모드와 한 영상에서 섞을 수 있다.

#### H6. Kartun panggung (카툰 무대, 스타일 6)
- 출처: `panggung` 전체, `SKILL` "Explainer dan karakter"
- 시각적 특징: 장면마다 프레임 크기의 벡터 무대(1920×1080 + overscan), 밝은 플랫 색, 관절 캐릭터가 연기하고 기계·물·식물이 살아 있다. **caption 0**, 글자는 세계 속 간판뿐.
- 적합: 캐릭터가 있는 과학·사회 교육, 과정과 영향, 이야기. 부적합: 종이·grain 질감, 문장 강조 pill(콜라주 전용).
- 권장 지속 시간: 참고 39.6초(무대 5개), 81초(무대 7개).
- 화면 구성 원칙: 줌 1.08 미만인 프레임이 없다. 무대마다 움직이는 물체 10개 이상. 플랫 채움, outline·질감·vignette 없음. 그림자는 접지 타원과 건물의 어두운 면(바탕색의 0.86–0.9배)뿐. 검증된 팔레트 예: 하늘 `#BFDDE3 → #F6EFDD`, navy `#345867`, teal `#237C80`, mint `#8DD3C3`, 금 `#F4BC52`, coral `#E0714F`(팔레트는 여전히 주제에서 고른다. 고정되는 것은 "질감 없음"뿐).
- 카메라·오브젝트: B7, D11, D12, E7.
- 구현: `assets/starter-explainer-panggung.html`(`scene()`, `cam()`, `J()`, `character()`, `idle()`, `walk()`, `cut()`, `slide()`, `flowAlong()`). 생성 접근이 없으면 `character()`의 벡터 머리로 충분하다.
- 조합: "과정과 영향" 이야기에 검증된 무대: 집 마당 · 큰 기계 외부(push-in → 벽이 들림 → 내부 점등 → 지붕으로 tilt) · 강가 공장 · 탑과 하늘(세로로 긴 무대) · 우물과 땅 단면 · 마른 땅 · 논 구획 지도 · 앞 무대로 돌아와 더 가까운 카메라로 마무리. 검증은 20–24장 contact sheet + 무대 하나 전체의 8fps GIF.

#### H7. Simulasi peta rute (경로 지도 시뮬레이션)
- 출처: `expl` "Sudut pandang WAJIB berganti" 뒤 문단, "Peta", `assets/starter-explainer.html`의 `renderMap()`
- 시각적 특징: 양식화한 벡터 지도 위에 경로가 그려지고, 표식이 따라가며, 정차 지점이 pop한다. 원문이 꼽는 가장 값싼 단조로움 해소책.
- 적합: 경로·거리·정차 지점. 부적합: 원문에 명시 없음.
- 권장 지속 시간: starter의 그리기 진행은 약 3.2–3.4초. 규칙으로서의 수치는 원문에 없음.
- 카메라·오브젝트: 지도 카메라는 출발점에서 2–2.5배로 시작해 표식을 따라가다 경로 전체로 풀린다. 총계 숫자(거리, 시간)는 zoom out 뒤에.
- 구현(SVG): 경로 `stroke-dasharray = 길이`, `dashoffset`이 진행도를 따른다. 표식은 `getPointAtLength`로 이동하고 접선 방향으로 회전. 지점은 진행도가 그 비율을 지날 때 scale 0 → 1 pop. 카메라는 `translate(중심) scale(z) translate(-cx -cy)`. 저널리즘에서는 공개 위성 사진(NASA MODIS/Worldview)을 바탕으로 `.tag` 라벨 + 빨간 원 + 점선 경로.
- 조합: B8의 한 view. E5(whip)로 들어가고 나온다.

#### H8. Format sosial 9:16 (세로 소셜 형식과 safe area)
- 출처: `expl` "Format sosial", "Resep teknis"의 "Panggung 9:16", "Keterbacaan di ponsel"
- 내용: `#stage` 1080×1920. 모든 장면을 `.safe{transform:scale(.78);transform-origin:50% 45%}`로 감싼다(위 약 190px, 아래 약 230px 여백). grid·배경은 전체 화면. 제목 88–168px. safe-scale을 쓰면 최소 글자 크기에 1/0.78을 먼저 곱한다.
- 부적합: explainer를 기본 세로로 가정하기(9:16은 요청 시에만).
- 조합: 소리 autoplay 규칙(1절 5)과 함께.

#### H9. After Effects lewat bridge Higgsfield (AE 브리지 빌드)
- 출처: `ae`, `SKILL` "After Effects"
- 내용: AE가 열려 있고 MCP bridge `ae_*`가 연결돼 있으며 사용자가 AE에서 만들어 달라고 할 때만. 작은 Lottie로 comp 뼈대, 무대마다 null `CAM`(parenting **전에** anchor와 position을 0으로), 일러스트는 SVG 코드 → PNG 2배(`scripts/ae/bridge/aset-svg.py` + `svg2png.cjs`), 캐릭터는 AE shape 관절 rig(`rig-tokoh.py`, 캐릭터당 약 90 op). 층은 뒤에서 앞으로 만든다(bridge는 층 순서를 바꾸지 못한다). bridge는 저장·렌더를 못 하므로 사용자가 Ctrl+S, 렌더는 Render Queue나 aerender.
- 참고 수치: 무대 10개 빌드에 약 1시간(문서 본문은 약 67분, AE tool 호출 약 100회).
- 조합: kartun panggung의 법칙이 그대로 적용된다. 이 문서의 웹 구현 카드와는 별도 경로다.

---

## 4. 주제·목적별 빠른 선택표

`[보충]` 이 표의 "목적" 분류와 묶음은 이 문서에서 새로 짠 것이다. 묶인 기법 하나하나는 원문에 있고, 적합 판단은 각 카드의 "적합" 항목(원문)을 따랐다. "수업 도입" 같은 교육 현장 용도는 원문에 없는 분류다.

| 목적 | 형식·골격 | 카메라 | 글자 | 전환 | 배경 | 길이(원문 수치) |
|---|---|---|---|---|---|---|
| 수업 도입 (짧은 hook) `[보충]` | bumper/intro, A10에서 "Pertanyaan diketik diegetik" 또는 "Kata raksasa terpotong tepi" | B1 + B2 한 번 | C1(방식 1–2개), C5 | 컷 또는 E2 #8 | F1 #1·#3, F6 "Kertas & cetak" 또는 "Pastel ceria" | 3–12초 |
| 개념 설명 | H1(가벼운 주제) / H6(캐릭터 과학·사회) / A14 뼈대 | B6 또는 B7 | C4, D7 | B6의 push-through 또는 E7 | F9, 종이 질감 또는 플랫 | 30–90초 |
| 과정 시각화 | H6(무대 안 연속 동작) 또는 H5 | B7, B8 | 세계 속 라벨만 | E7, E5 | D12, F10 | 39.6초 = 무대 5개 참고 |
| 비교·대조 | 콘셉트 4(A2), H5의 지도 경주, C3 `strike` | B2 | C6(전후 막대, 숫자) | 분할선이 전환(콘셉트 4) | F2, 구간별 색 교체(E9) | opener 25–40초 |
| 타임라인 | A14의 Linimasa(날짜 2–3개), H4(ghost 연도 + 라벨) | B6 | C7, D8 `block` | B6, E6 | 세피아 종이 또는 검정 + grain | 30–90초 |
| 제품/서비스 홍보 | 콘셉트 9, 13, 15, 16, 19 중 후보 3개(A1) | B5, B2 | C1, `tanpa` 강조 | E8 | F6에서 브랜드에 맞는 줄 | 25–40초(16은 50–60초) |
| 브랜드·론칭 | A4 또는 A8 | 심벌·포털 관통 | 단어별 manifesto | E8(색 면, 관통) | F3, F1 #6·#12 | 25–30초 |
| 숫자·성과 | 콘셉트 8(A2), H5 | B2 | C6 | E2 #8 | F1 #2·#8 | 원문에 수치 없음 |
| 루프 애니메이션 | A11 "Loop mulus" 또는 "Callback ke pembuka", A10 "Frame kosong, benda motif naik dari tepi" | B1(방향 교대, 이어 붙임) | 최소 | 컷 없음 | F1 #2·#3·#6(주기적인 것) | A4 기준 25–30초 |
| 뉴스·이슈 해설 | H2 + A13 | B6 | C4 + 노란 형광펜 | B6 | 검정 + grain | beat 3–5초 |
| 가사·kinetic typography | 콘셉트 2(A2) | B4 한 번 | C1(5개 이상 방향), C2 | E2 #8 | F1 #9 | 15–60초 |

루프에 관한 원문 사실: 모든 산출물은 기본으로 loop한다(`onComplete → play(0)`). loop하는 배경 교체는 t=0에서 상태를 복원해야 한다(E9 코드). 무한 반복 tween(`repeat:-1`)은 kartun panggung의 살아 있는 물체에 쓴다(D12).

---

## 5. 기존 템플릿·스크립트 목록

필요할 때 원본 스킬에서 가져다 쓴다. 원본 폴더는 수정하지 않고 프로젝트 폴더로 **복사**한다.
원본 위치: 에이전트 skills 폴더 안 `bang-motion/` (없으면 https://github.com/bangtutorial/bang-motion 에서 받는다)

### Starter HTML (`assets/`)

| 파일 | 용도 | 주요 helper |
|---|---|---|
| `assets/starter-opener.html` | opener, promo, bumper, intro, kinetic typography. 무대 1920×1080, `#world` rig, state 기반 Three.js scene. 일부러 예시 장면 순서가 없다. 회색·시스템 폰트·WebGL 배경은 placeholder | `splitChars`, `blurTween`, 글자 방식 `inUp/inDown/inLeft/inRight/inDepth/inMask/inWords/typeOn` + `out*`, `mark`, `popDot`, `breathe`, `camThrough`, `sweep`, `gantiLatarTerang`, `clip` |
| `assets/starter-explainer.html` | aksi kontinu(벡터): 흐름 모드 + 지도 view + whip + 콜라주 모드 예시 | `strip`, `wobj`, `renderMap`, `whip`, `camAt`, `look/home/into/settle`, `fadeUp` |
| `assets/starter-explainer-kartun.html` | kartun kolase: 크림 종이 + grain + 얼룩, Bricolage + Caveat | `say/unsay`, `fly/flyOut`, `draw`, `label`, `look/home/into/settle`, `breath` |
| `assets/starter-explainer-jurnalisme.html` | jurnalisme visual: 검정 + grain, 사진 + 출처 tag, Barlow Condensed + Plex Mono | 위와 같음 |
| `assets/starter-explainer-katalog.html` | katalog putih: 옅은 grid, 사진 cutout, Archivo Black + Caveat + Inter | 위 + `slam`, `block`, `multiply` |
| `assets/starter-explainer-sketsa.html` | sketsa vintage: 세피아 종이(CSS 질감), multiply cutout, Playfair + Garamond + Cinzel | kartun과 같음 |
| `assets/starter-explainer-panggung.html` | kartun panggung: 무대 시스템 + 무대별 카메라, 예시 무대 2개 | `scene`, `cam`, `J`, `character`, `idle`, `walk`, `face`, `sway`, `spin`, `drift`, `flowAlong`, `cut`, `slide` |

모든 starter의 공통 구조: 일시정지 상태로 만든 GSAP master timeline 하나(절대 초로 배치), `fit()`으로 무대를 창에 맞춰 scale, `Space`/`R` 키, `?debug=1`일 때만 보이는 `#ui` 패널, `onComplete → play(0)` loop, `document.fonts.ready` 뒤 `OPENER.ready=true` 그리고 `?clean=1`이 아니면 autoplay. 전역 `window.OPENER = { tl, DURATION, W, H, ready, seek(t), seekFrame(t), clipsReady() }`를 스크립트와 콘솔이 쓴다. `seek(t)`는 `tl.pause(t,false)` + `applyCam()` + `gsap.ticker.tick()`.

### 스크립트 (`scripts/`)

| 파일 | 용도 | 요구 사항 | 사용법 |
|---|---|---|---|
| `scripts/snap.mjs` | **검증**: 지정한 초에서 timeline을 멈추고(`OPENER.seek`) 스크린샷. `<out>/t1_00.png` 형식 | Node + `npm i puppeteer`. 서버 불필요(`file://`) | 프로젝트 폴더에서 `node <경로>/snap.mjs shots 1 3.5 8 12 20`. `URL` 환경변수로 대상 지정 가능. 뷰포트는 `OPENER.W/H`를 따른다(9:16 가능) |
| `scripts/export-frames.mjs` | **내보내기**: 모든 프레임을 PNG로(`frames/f00000.png`…). 화면 녹화가 아니라 프레임마다 시간을 설정하고 rAF 2번을 기다린 뒤 캡처하므로 frame drop이 없다 | Node + puppeteer, 그리고 합치기용 ffmpeg. 환경변수 `URL`, `FPS`(기본 60), `OUT`(기본 `frames`), `SCALE` | `node export-frames.mjs` 뒤 `ffmpeg -framerate 60 -i frames/f%05d.png -c:v libx264 -pix_fmt yuv420p -crf 16 out.mp4` |
| `scripts/serve.py` | no-cache 개발 서버(`Cache-Control: no-store`), 127.0.0.1:5178(인자로 포트 변경) | Python 표준 라이브러리만 | `python serve.py [port]`. 로컬 ES module을 쓸 때만 필요 |
| `scripts/vo-pauses.html` | 브라우저에서 VO 무음 구간 감지(Web Audio). `SEG`/`PARA`/`DUR` 출력 | 설치 불필요 | 브라우저에서 열고 오디오 선택 |
| `scripts/kepala-ekspresi.py` | 생성한 머리 그림 → 기쁨·걱정·놀람 + 깜빡임 변형과 `kepala-meta.json` | Python(이미지 라이브러리는 파일 확인 필요, 이 문서 작성 때 내용은 열어 보지 않음) | kartun panggung 전용 |
| `scripts/ae/bridge/aset-svg.py`, `svg2png.cjs`, `rig-tokoh.py` | AE bridge용 자산 생성과 캐릭터 rig op 생성 | Python, Node + puppeteer | H9 전용 |

스크립트를 직접 읽고 확인한 주의점:

- `export-frames.mjs`의 기본 `URL`은 `http://127.0.0.1:5178/index.html?clean=1`이다. 즉 기본값으로는 `serve.py`가 떠 있어야 한다. `arch`는 "스크립트 기본값이 `file://`"이라고 쓰지만 그 동작은 `snap.mjs`에만 구현돼 있다. 서버 없이 내보내려면 `URL="file:///.../index.html?clean=1"`을 넘긴다.
- `export-frames.mjs`는 뷰포트와 캡처 영역이 1920×1080으로 고정돼 있다. 9:16(1080×1920) 영상은 스크립트 사본에서 크기를 바꿔야 한다. `snap.mjs`는 `OPENER.W/H`를 읽으므로 그대로 된다.
- 두 스크립트 모두 `window.OPENER.ready`(그리고 있으면 `clipsReady()`)를 최대 대기 시간 안에 기다린다(`snap` 60초, `export` 120초). 영상 clip이 있으면 `seekFrame`으로 프레임이 준비될 때까지 기다리므로 더 느리다.
- puppeteer 실행 인자는 WebGL용 `--enable-gpu --use-gl=angle --enable-webgl --ignore-gpu-blocklist`다. `snap.mjs`는 `--autoplay-policy=no-user-gesture-required`도 준다.
- grain이 있는 영상은 `-crf 10–12 -tune grain`으로 인코딩한다(F3).

---

## 6. 확인된 자료와 새로 설계한 내용의 구분

### 원문에서 확인한 것

3절의 모든 기법 카드(A1–A14, B1–B9, C1–C8, D1–D12, E1–E9, F1–F10, G1–G8, H1–H9)는 `bang-motion` v1.19.0의 `SKILL.md`, `references/*.md`, `assets/starter-*.html`, `scripts/*`에서 확인한 내용만 담았다. 기법 이름(원어), 수치, 코드 패턴은 원문 그대로다. 카드의 "출처" 줄에 확인한 파일과 절을 적었다.

읽은 범위: `SKILL.md`, `techniques.md`, `anti-ppt.md`, `architecture.md`, `explainer.md`, `opener-konsep.md`, `kartun-panggung.md`는 전문. `export-frames.mjs`, `snap.mjs`, `serve.py`는 전문. starter HTML 7개는 구조와 helper 정의 줄만. `ae-bridge-higgsfield.md`는 앞부분과 목차만, `roadmap.md`는 목차만. `README.md`, `CHANGELOG.md`, `vo-pauses.html`, `kepala-ekspresi.py`, `scripts/ae/bridge/*`는 열어 보지 않았고 `SKILL.md`의 설명에 의존했다.

### `[보충]` 목록 (원문에 없고 이 문서에서 더한 것)

1. **카드의 분류 체계 (a)–(h)와 카드 번호(A1, B2 …)**: 원문은 이렇게 분류하지 않는다. 찾아보기 편하도록 이 문서에서 나눴다. 한 기법이 여러 분류에 걸치는 경우 한 곳에만 두었다.
2. **4절 "주제·목적별 빠른 선택표" 전체**: 목적 분류와 기법 묶음은 새로 짠 것이다. 특히 "수업 도입" 행은 원문에 대응하는 용도가 없다. 표 안의 개별 기법과 수치는 원문에서 왔다.
3. **E6 카드의 조합 메모** "한 영상에서는 `cut` 체계와 `into`/`settle` 체계 중 한쪽을 기준으로 삼는다": 원문은 두 레시피를 각각 설명할 뿐 함께 쓰는 규칙을 말하지 않는다.
4. **1절 끝 "원문끼리 어긋나는 곳"의 해석**(전환 2종 규칙을 `SKILL` 우선으로 읽기, 구조적 금지를 8개로 세기): 불일치 자체는 원문에서 확인한 사실이고, 어느 쪽을 따를지는 이 문서의 판단이다.
5. **5절의 스크립트 주의점 가운데 "9:16은 `export-frames.mjs` 사본에서 크기를 바꿔야 한다", "서버 없이 내보내려면 `URL`에 `file://`을 넘긴다"**: 스크립트 코드에서 읽어 낸 귀결이다. 원문 문서에는 이 안내가 없고, 실제로 실행해 확인하지는 않았다.
6. **한국어 풀이 이름**: 원어 이름 옆의 한국어 번역은 모두 이 문서에서 붙였다.

### 원문에 수치가 없어 비워 둔 곳

A2(콘셉트 1–10, 12의 길이), A3·A5·A8의 총 길이, A10·A11의 개별 길이, B9, C6, C7, D3, D9(element-driven exit), F9, H4의 장면별 길이. 해당 카드에 "원문에 수치 없음"이라고 적었고 추정값을 넣지 않았다.
