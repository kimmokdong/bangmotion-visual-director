# sound/ — 효과음 라이브러리(번들)

`sfx/` 와 `LICENSES.md`·`TOP-PICKS.md`·`MUSIC.md` 는 사용자 스킬 `~/.claude/skills/sound-effects`(Barty-Bart/motion-graphics,
소리 작업 방식 출처: Vox [@Voxyz_ai](https://x.com/Voxyz_ai/status/2109358372873183564))에서 2026-11-18 에 그대로 복사했다. 파일은 고치지 않았다.

- **번들된 소리는 전부 CC0 1.0**(Kenney, Freesound 의 CC0 소리) — 재배포·상업 이용 가능, 출처 표기 선택. 소리별 출처는 `LICENSES.md`, `sfx/manifest.json`(`bundled[]` 의 `source_url`, `license`, `attribution`).
- **Mixkit 소리·음악은 번들하지 않는다.** `manifest.json` 의 `runtime[]` 과 `MUSIC.md` 에는 주소만 있다. 쓸 때 사용자 프로젝트 폴더로만 내려받고 스킬 폴더에 넣지 않는다(Mixkit 라이선스: 단독 재배포·도구/템플릿 포함 금지).
- 이 폴더에 새 소리를 넣을 때는 **CC0 만**, `sfx/manifest.json` 항목(file, category, duration_s, source_url, license, attribution)과 `LICENSES.md` 행을 함께 추가한다.

## 이 스킬에서 쓰는 법
프로젝트의 `sound.json` 에서 번들 소리는 `sfx:<manifest 기준 경로>` 로 부른다(예: `sfx:kit/whoosh.ogg`, `sfx:pop/fs-447910-plop.ogg`).
`scripts/sound.js` 가 쓰인 소리만 섞어서 `out/sound/mix.wav` 를 만들고 `out/sound/CREDITS.txt` 에 출처를 적는다. 절차·규칙: `references/sound-guide.md`.

## 기본 키트 (`sfx/kit/`)
| 분류 | 파일 | 쓰임(큐 종류) |
|---|---|---|
| whoosh | kit/whoosh.ogg | 카메라·물체 이동(movement), 장면 넘김(scene_cut) |
| pop | kit/pop.ogg | 등장(appear), 완료(success) |
| click | kit/click.ogg | 누르기(click) |
| riser | kit/riser.ogg | 고조(build_up) — 다음 강조 순간에 **끝나게** |
| impact | kit/impact.ogg | 공개·강조(reveal) — 가장 큰 효과음 |
| tick | kit/tick.ogg | 작은 UI·라벨(hover_or_small_ui) — 아주 작게 |
| typing | (Mixkit, 실행 때 받음) | 글자 입력 — 번들 대안: `typing/fs-447909-keyboard-typing.ogg` |
| ambience | `ambience/*.ogg` (실내 룸톤 3개뿐) | 바탕(bed). 자연·탈것 소리는 번들에 없다 → `references/sound-guide.md` §소재 소리 |
