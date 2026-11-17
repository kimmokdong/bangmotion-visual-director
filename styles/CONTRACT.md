# 스타일 데모 공통 계약

8종 데모와 앞으로 추가할 스타일이 모두 지키는 규격. 갤러리·캡처 스크립트가 이 계약에 의존한다.

## 1. 파일
```
styles/<NN-id>/
├── index.html     실제 실행되는 데모 (필요하면 demo.js 등 분리)
├── style.json     메타데이터 (아래 규격)
├── notes.md       이 스타일을 새 영상에 재사용하는 방법 (품질 디렉터 6분야 결정 사항 + 재사용 코드 위치)
├── preview.png    scripts/capture-previews.js 가 실제 렌더링에서 추출 (직접 만들지 않음)
└── preview.gif    위와 동일
```

## 2. 재생
- 길이 정확히 5초, 16:9, 자동 재생, 무한 반복.
- `shared/runtime.js` 의 `start(render)` 만 사용. `render(t)` 는 **t(0 ≤ t < 5)의 순수 함수**:
  `Date.now()`, `Math.random()`(시드 없는), 누적 상태, CSS animation/transition, GSAP 자체 시계 금지.
  난수가 필요하면 고정 시드 PRNG(mulberry32 등)로 로드 시 한 번만 생성.
- 루프 이음매: t=4.999 프레임과 t=0 프레임이 이어져야 한다. 모든 움직임은 5초의 정수 분할 주기
  (`loop()`, `saw()` 헬퍼) 로 만든다. 카메라 이동도 왕복 또는 닫힌 궤도.
- `?t=2.5` 로 열면 그 프레임에 고정된다(런타임이 처리). 첫 프레임(t=0)부터 스타일 특징이 드러나야 한다.

## 3. 화면
- 논리 스테이지 1920×1080. 창 크기에 맞춰 16:9 유지하며 가운데 정렬(letterbox, 배경 #000 아님 — 스타일에 맞는 여백색).
- `html, body { margin:0; height:100%; overflow:hidden }`. 스크롤바·UI 패널·텍스트 워터마크 없음.
- Canvas/WebGL은 `devicePixelRatio`(최대 2)를 반영. 창 리사이즈 대응.
- 외부 네트워크 요청 금지(CDN, 웹폰트 포함). three.js 는 로컬 vendor:
  ```html
  <script type="importmap">{"imports":{"three":"../../vendor/three/build/three.module.min.js","three/addons/":"../../vendor/three/examples/jsm/"}}</script>
  ```
  글꼴은 시스템 글꼴 스택(`"Pretendard","Malgun Gothic","Apple SD Gothic Neo",system-ui,sans-serif`).
- 데모는 `http://localhost` 로 제공된다(`scripts/serve.js`). ES module 사용 가능.

## 4. 공통 테스트 장면 (모든 스타일 동일)
스타일 차이만 비교되도록 **같은 배치**를 각 스타일의 미술 언어로 재해석한다.

- 강: 화면 왼쪽 뒤에서 오른쪽 앞으로 완만하게 굽어 흐른다. 물결이 흐르는 애니메이션.
- 다리: 화면 중앙에서 강을 가로지르는 아치형 다리 1개 (난간 포함). 화면의 시각적 초점.
- 집 2채: 강 왼쪽 둔덕에 빨간 지붕 집(굴뚝 연기), 강 오른쪽에 파란 지붕 집. 창문·문 있음.
- 나무: 6~8그루, 둥근 활엽수와 뾰족한 침엽수 섞어서. 바람에 살짝 흔들림.
- 하늘과 구름 3~4개(천천히 흐름), 먼 언덕/산 1~2겹, 지면(풀밭, 강둑, 오솔길이 다리로 이어짐).
- 환경 애니메이션: 물결, 구름, 나무 흔들림, 굴뚝 연기, (선택) 새·나뭇잎·반짝임.
- 카메라: 5초 동안 짧은 이동 또는 시선 유도 1회(느린 push-in, 궤도 일부, 패럴랙스 팬 등). ease-in-out, 루프 이음매에서 튀지 않게.
- 정보형 스타일(07 인포그래픽, 08 글래스 UI)은 같은 오브젝트를 설명용 그래픽/UI 로 변환할 수 있지만 강·다리·집 2채·나무는 화면에 반드시 보여야 한다.

## 5. style.json
```json
{
  "id": "01-isometric",
  "number": 1,
  "name": "아이소메트릭",
  "name_en": "Isometric",
  "tagline": "한 줄 설명 (40자 이내)",
  "features": ["주요 특징 3~4개"],
  "use_cases": ["추천 활용 분야 3~5개"],
  "axes": {
    "graphic_style": "화면의 미술적 특징",
    "space_camera": "공간 표현·카메라 방식 (예: 정사영 아이소메트릭)",
    "fits_techniques": ["잘 맞는 연출기법 이름들"]
  },
  "tech": ["Three.js", "..."],
  "quality": {
    "art": "색·형태·밀도 결정",
    "material": "재질 결정",
    "lighting": "조명·그림자 결정",
    "camera": "투영·화각·이동 결정",
    "rendering": "AA·그림자 해상도·후처리 결정",
    "skip": ["이 스타일에서 일부러 쓰지 않는 효과와 이유"]
  },
  "duration": 5,
  "aspect": "16:9"
}
```

## 6. 품질 최저선 (코드가 돌아간다고 통과가 아니다)
- 오브젝트가 바닥에서 뜨거나 서로 관통하지 않는다. 접촉 그림자가 있다(그림자가 없는 스타일 제외).
- 계단 현상(aliasing)·깜빡임(z-fighting, 그림자 아크네)·튀는 프레임이 없다.
- 전경/중경/배경이 구분되고, 다리가 시각적 초점이다.
- 팔레트는 5~7색 중심으로 통일. 스타일 간에는 서로 확실히 달라 보여야 한다.
- 1920×1080 캡처에서 빈 공간이 어색하게 넓지 않다(환경 밀도).
