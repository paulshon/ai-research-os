# CHANGELOG — RDOS s-renew-18

## 모바일 사이드바(드로어) — s-renew-17 컴팩트 디자인 철회 + 글래스이펙트

첨부된 첫 번째 그림처럼 s-renew-17 의 드로어는 폭을 `min(42vw,180px)`(최소 164px)로
좁히고 글자·아이콘·여백까지 한 단계씩 줄이는 **컴팩트 모드**였다. 그 결과
브랜드명("Studium…")·프로젝트명("새 프…") 등이 잘려 보였다.
→ 두 번째 그림(참고: methodos)처럼 **데스크톱 사이드바와 같은 크기**로 되돌리고,
바탕에 **반투명 유리(글래스이펙트)** 를 적용했다.

### 1. 드로어 폭 — 원래 크기로 복원
- `apps/web/components/dashboard/dashboard-shell.tsx`
  `w-[min(42vw,180px)] min-w-[164px]` → **`w-[268px] max-w-[86vw]`**
- `apps/web/components/rdos/rdos-shell.tsx` — 동일하게 `w-[268px] max-w-[86vw]`
  (두 셸이 같은 `.imm-drawer` 스타일을 공유하므로 함께 맞춘다.)

| 화면 | s-renew-17 | s-renew-18 |
|---|---|---|
| 360px | 164px (46%) | 268px |
| 390px | 164px (42%) | 268px |
| 430px | 180px (42%) | 268px |

### 2. 컴팩트 모드 철회 (`.imm-drawer`, `apps/web/app/globals.css`)
- 축소용 오버라이드 **전부 제거** : 글자 12px, 아이콘 타일 26px, svg 14px,
  nav/로고/사용자 카드 여백 축소.
- 폭만 부모에 맞추는 `.imm-drawer aside { width: 100% }` 만 유지.
- 이제 드로어가 데스크톱 사이드바(글자 14.5px·아이콘 30px)와 **동일한 크기**로 보인다.

### 3. 글래스이펙트 — 반투명 프로스티드 유리
- 드로어 바탕을 더 투명하게 :
  `background: color-mix(in srgb, var(--bg2) 58%, transparent)` +
  `backdrop-filter: blur(28px) saturate(160%)`
  (기존 `imm-glass-strong` 88% 불투명 → 58% 로 낮춰 뒤 배경이 은은히 비친다.)
- 딤 오버레이도 `bg-black/60 → bg-black/40` 으로 낮춰 유리 너머가 더 잘 보이게 했다.

### 4. 검증
- `npm install --ignore-scripts` 후 `next dev`(:3300) 기동.
- `GET /` 200 · `GET /dashboard` 200 — 컴파일 오류 0.
- 서빙된 `layout.css` 확인 :
  - `.imm-drawer` 축소 규칙(`font-size:12px` 등) **0건**.
  - 반투명 글래스 규칙(`color-mix … 58%` + `backdrop-filter: blur(28px)`) **적용됨**.
  - Tailwind 클래스 `w-[268px]` · `max-w-[86vw]` · `bg-black/40` **컴파일 확인**.
