# CHANGELOG — RDOS s-renew-14

renew-13 대비 변경점. 지시된 스크린샷 주석을 1:1로 반영했다.

## 1. EXPERT 버튼 — 엔진명 캡슐 제거
- `components/immersive/expert-button.tsx`
- 「EXPERT + 논문구조엔진 / 상세 문헌연구엔진 / 기본통계 엔진」 캡슐을 없애고 **EXPERT** 한 단어만 남겼다.
- 엔진명은 `title` / `aria-label` 에만 남겨 접근성은 유지한다.

## 2. 집필 · 분석 · 크리틱 — 히어로 제거
- `lib/immersive/page-meta.ts` 에서 `/writing`, `/analyzer`, `/critique` 를 `hero: false` 로 바꾸고 `expert` 링크를 제거했다.
- EXPERT 모드가 없는 화면이므로 큰 프레임 설명을 없애고 본문이 화면 상단부터 채워진다.

## 3. 로고 — 펜촉 → R
- `apps/web/app/favicon.ico` 신규 생성(브랜드 R, 7종 사이즈 내장). Next.js 는 `favicon.ico` 를 `icon.png` 보다 우선 사용한다.
- `apps/desktop/build/icon.ico` · `icon.png` 신규 생성. `package.json build.icon` 이 가리키던 파일이 **없어서** 패키징 시 기본 아이콘이 쓰이고 있었다.
- `electron/main.ts` BrowserWindow 에 `icon` 지정 → 창·작업표시줄 아이콘 고정.
- `app/manifest.ts` 아이콘 URL 에 `?v=14` 를 붙여 설치된 PWA 의 구 아이콘 캐시를 무효화한다.
- `apps/desktop/package.json` 의 하드코딩된 v15 출력 경로를 상대경로(`release`)로 정리.

## 4. 학습 메뉴 — 사이드바 연동
- `lib/rdos/learning-tree.ts` : 학습 메뉴 집합을 `LEARNING_KEYS` 단일 진실원본으로 고정.
  기존에는 레슨 콘텐츠 유무 + 메뉴 활성화 설정으로 두 번 걸러서, 대시보드에는 학습 메뉴 카드가 보이는데
  사이드바 「학습 메뉴」 그룹은 통째로 비어 보이는 불일치가 있었다.
- `components/rdos/rdos-shell.tsx` : 사이드바·모바일 전체메뉴 시트가 같은 트리를 본다.
- `app/api/rdos/progress/route.ts` (신규) : 대시보드와 **같은 커널 상태**(`getLearnerState`)를 반환.
  사이드바 하위메뉴에 대시보드와 동일한 진행률(%)이 표시된다.

## 5. 연구방법 — 카탈로그 정리
- `lib/method/registry.ts` : 골격만 있던 **주제분석 · 근거이론** 삭제.
  실제 엔진이 탑재된 **혼합 질적내용분석 · 기본통계** 2종만 남겼다.
- `app/(dashboard)/method/page.tsx` : 카드가 2장뿐이므로 작은 타일 나열 대신
  전체 워크플로우를 펼쳐 보여주는 큰 카드 2장 구성으로 재설계.

## 6. 중국어(ZH) 조판 보정
- 원인: `NanumMyeongjo` / `NanumGothic` / `Noto Serif KR` 은 한국어 전용 폰트로 **간체 한자 글리프가 없다.**
  ZH 전환 시 `html[lang]` 이 `zh-CN` 이 되면서 대형 제목이 글리프 폴백에 실패해 글자가 잘려 보였다.
- `app/globals.css` : `html[lang^="zh"]` 에 한해 중국어 CJK 폰트 스택(Noto Sans/Serif SC → PingFang/Songti → SimSun)을 앞세우고,
  한국어용 `word-break: keep-all` 을 풀고 히어로 대형 카피의 줄 잘림 방어 규칙을 추가했다.
- KO/EN/ZH 번역 키 대조: **누락 0건** (hero·pages·rdos·dash2·dash3·auth·marketing2·base 전부 일치).

## 7. 연구 어시스턴트 (신규)
```
사용자 입력 ──┬─ 🎤 음성 → STT(Web Speech API) ─┐
              └─ ⌨️ 텍스트 ────────────────────┴→ POST /api/assistant
                                                    → AI-Research-OS 내부 지식 검색
                                                    → Gemini 2.5 Flash (질문 이해·추론)
                                                    → 💬 텍스트 답변 + 근거 출처
```
- `components/assistant/research-assistant.tsx` (신규) — HTML 프로토타입을 React 클라이언트 컴포넌트로 포팅.
  대기·청취는 **성좌(3D 픽셀 별자리)**, 입력·응답은 **8비트 CRT 터미널**로 모프 전환.
- `app/api/assistant/route.ts` (신규) — Clerk 인증 + 분당 20회 레이트리밋.
  모델 `gemini-2.5-flash` (env `ASSISTANT_MODEL` 로 교체 가능).
- `lib/assistant/retriever.ts` (신규) — 검색 대상은 **RDOS 내부 지식뿐**:
  지식 코어(논문 8개 장·연구용어) · 학습 레슨 8개 모듈 · 연구방법 엔진 · 논문 유형표.
  시스템 지시로 "근거 밖 추측 금지"를 강제한다.
- 연구자 플랜 셸과 연구준비자(RDOS) 셸 양쪽에 마운트.
- STT 언어는 로케일 연동(ko-KR / en-US / zh-CN), 답변 언어도 로케일에 맞춘다.

## 8. 검증
- `tsc --noEmit` : **오류 0**
- `next build` : **성공** (55s, 전 라우트 컴파일)
- `next start` 스모크 : `/` 200 · `/favicon.ico` 200(image/x-icon) · `/manifest.webmanifest` 정상
- 모바일: 320/360/390/414px 뷰포트에서 위젯이 하단 시트로 전환, 셸 하단 탭바(62px)와 세이프에어리어를 회피하도록 z-index·offset 조정. 입력 글꼴 16px로 iOS 자동 확대 방지.
