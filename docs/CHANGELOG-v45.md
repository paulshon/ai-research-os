# CHANGELOG — v45

랜딩페이지 진입 전 **3초 몰입형 스플래시 스크린(Framer Motion)** 을 추가한 릴리스입니다.
(v44는 건너뛰고 v45로 패키징)

---

## 스플래시 스크린 (Splash Screen)

첨부 기획안(TikTok 스타일 몰입 인트로 + 사방별 심볼)을 바탕으로, 앱 첫 화면에서 3초간
재생된 뒤 랜딩페이지가 매끄럽게 드러나도록 구현했습니다.

- 신규: `apps/web/components/marketing/splash-screen.tsx`
  - `SplashScreen` + `SplashGate`(AnimatePresence 래퍼) export.
- 적용: `apps/web/app/page.tsx`(랜딩 "/")에 `showSplash` 상태와 함께 오버레이로 렌더.
  - 첫 화면으로 스플래시가 표시되고, 3초 후 페이드/스케일 아웃하며 랜딩이 노출됩니다.
  - 스플래시 표시 중 body 스크롤을 잠가 몰입감 유지.
  - 정적 프리렌더 HTML 첫 페인트에 스플래시 마크업이 포함되어, 로드 즉시 표시됩니다.

### 3초 타임라인 (Framer Motion)
- **Phase 1 — 등장/활성화 (0~0.8s):** 사방별 심볼이 scale 0.45→1, opacity 0→1로 스프링 등장.
  중앙 보라 그라데이션 광무가 퍼지고, 텍스트 "AI Research OS"가 글자 단위 Stagger로 떠오름.
- **Phase 2 — 인텔리전스 호흡 (0.8~2.2s):** 심볼이 위아래로 미세하게 떠다니고(y float),
  내부 별이 은은하게 회전·스케일하며 "연산 중"인 느낌을 전달.
- **Phase 3 — 분해/퇴장 (2.2~3.0s):** 전체가 scale 1.06 + blur + opacity 0으로 스케일 아웃되며
  `AnimatePresence` exit로 언마운트 → 랜딩페이지 노출.

### 디바이스별 반응형 연출
- **모바일:** 세로(Column) 배치 — 심볼이 시선 정중앙에 오도록 상하 밸런싱.
- **태블릿/데스크탑:** 가로(Row) 배치 — 그라데이션 광무 반경을 모바일보다 넓게(md 그림자 확대)
  설정하여 하이엔드 하드웨어 느낌.
- 우측 상단 **AI 활성화 인디케이터**(보라색 점 + ping 펄스 + "initializing" 라벨, ≥md)로
  시스템 로딩 중임을 암시(TikTok 우상단 인디케이터 오마주).

### 접근성
- `useReducedMotion` 감지 시 루핑/회전 모션을 끄고 재생 시간을 1.2초로 단축.
- 스플래시 컨테이너에 `role="img"` + `aria-label="AI Research OS 로딩"` 부여.

### 브랜드 일관성
- 심볼: 앱 브랜드 보라 그라데이션(#6c8cff→#a855f7) 라운드 박스 + 사방별(4-point star).
- 텍스트: "AI Research"는 화이트→그레이 그라데이션, "OS"는 앰버(#e8b84b) — 헤더 로고와 동일 톤.

---

### 검증
- `tsc --noEmit`: 통과(0 errors)
- `next build`: 성공. 랜딩 "/"는 정적 프리렌더(○)되며 첫 페인트 HTML에 스플래시 오버레이 포함 확인.

### 비고
- 스플래시는 랜딩 진입 시마다 재생됩니다(요청: "랜딩페이지가 나오기 전에 첫화면에").
  세션당 1회만 재생되도록 바꾸려면 `showSplash` 초기값을 sessionStorage로 게이팅하면 됩니다.
