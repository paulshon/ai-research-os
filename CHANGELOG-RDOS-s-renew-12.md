# s-renew-12 — Studium R 리브랜딩 + 몰입형 UI/UX + 모바일 재설계

## 0. 브랜드 교체 — Studium R
- 명칭: **AI Research OS → Studium R** (Studium 學 + R = Research · Researcher · Ready)
- 태그라인: 학술연구 운영체제 · Academic Research OS
- 팔레트: 미드나잇 `#0E1626` · 차콜 `#1B1E23` · 블랙 `#0A0A0B` · 페이퍼 `#F4F1EA` · 브라스 `#E0A73E` · 뮤트 `#7C8698`
- 신규 컴포넌트: `components/ui/brand-logo.tsx` → `BrandLogo` / `BrandWordmark` / `BrandLockup` / `BRAND` 토큰
- 에셋: `public/brand/*` (워드마크·칩·스택·앱아이콘 SVG+PNG, 브랜드 시트)
- PWA: `app/manifest.ts`, `app/icon.png`, `app/apple-icon.png`, `public/images/icon-*.png` 전면 교체
- 메타데이터/OG/theme-color/i18n 문자열(3개 로케일) 일괄 교체

## 1. 폰트 — 첨부 제공 폰트 전용
- `public/fonts/` 에 NanumGothic(Light/Regular/Bold/ExtraBold), NanumMyeongjo(Regular/Bold/ExtraBold) **OTF+TTF 14종** 배치
- `@font-face` OTF 우선 → TTF 폴백
- 원격 웹폰트(JetBrains Mono) 링크 제거, mono 자리도 첨부 폰트로 대체
- Tailwind `fontFamily` 정리 (`display` → NanumMyeongjo)

## 2. 몰입 레이어 (신규)
`components/immersive/`
| 파일 | 역할 |
|---|---|
| `accent-provider.tsx` | 라우트 강조색을 `--imm-ac` 로 전역 배포 |
| `ambient-background.tsx` | 앰비언트 광원 3개 + 그리드 + 그레인 |
| `page-hero.tsx` | 명조체 대형 카피 + 핵심 수치 히어로 |
| `expert-button.tsx` | EXPERT(sheen 그라디언트) / BackChip |
| `ribbon-stepper.tsx` | 6단계 리본 스테퍼(완료 연결선 채움) |
| `plan-gauge.tsx` | 사이드바 플랜 게이지 |
| `interactions.tsx` | GlassCard/PickCard/RunButton/ResultPanel/DonutScore |
| `immersive-page-frame.tsx` | 메타 기반 Atmosphere+Hero 렌더 |

`lib/immersive/page-meta.ts` — 라우트 → 강조색·아이콘·카피·수치·EXPERT 링크 **단일 진실원본**
`hooks/use-flow-progress.ts` — 흐름 단계 방문 추적(세션 스토리지)
`app/globals.css` — IMMERSIVE LAYER(Atmosphere/Glass/Hero/EXPERT/스테퍼/미시 인터랙션/세이프에어리어) 추가

## 3. 수정1 — 연구준비자(RDOS) 플랜
- **메뉴·관리자·전체 기능 원본 유지**
- Atmosphere + Hero **두 레이어만** 적용 (`components/rdos/rdos-shell.tsx`)
- 각 뷰의 중복 제목 블록 정리(정보는 보조 라벨로 유지)

## 4. 수정2 — 연구자 플랜 전체 몰입형
- `dashboard-shell.tsx` / `sidebar.tsx` / `tablet-rail.tsx` 재작성
- 사이드바: **연구 흐름 6단계**(번호·완료 체크) + **전문 엔진**(구조·문헌연구·연구방법·검토검증·논문일정·문장 라이브러리) + 운영
  → **원래 전체 메뉴와 하위 기능·엔진이 모두 그대로 살아 있음**
- 상단 리본 스테퍼, 히어로 EXPERT 버튼, 플랜 게이지, 도넛 게이지 프리미티브
- 권한(perm) 게이팅·라우트 가드 로직 100% 보존

## 5. 모바일(Android/iOS) 재설계
- **레이아웃 붕괴 원인 제거**: `ResizableRightPanel` 이 768px부터 저장된 고정 px 폭을 적용해 태블릿에서 본문이 0에 수렴(글자 세로 쪼개짐) → 리사이즈 기준을 **lg(1024px)** 로 상향, 뷰포트 **46%** 및 본문 **최소 420px** 실시간 클램프
- 모바일: 사이드바/레일 제거 → **앱바 + 리본 스테퍼 + 하단 탭바 + 드로어/시트**
- `env(safe-area-inset-*)` 기반 iOS 노치·홈 인디케이터 / Android 펀치홀·제스처바 대응(+ 미지원 폴백)
- 터치 타깃 최소 44×44px, 오버레이 중 배경 스크롤 잠금, flex 자식 `min-w-0` 보강(총 42곳)
- `prefers-reduced-motion` 존중

## 6. 검증
- `tsc --noEmit` → **0 오류**
- `next build` → **Compiled successfully / 34 페이지 정적 생성 완료**
- 프로덕션 서버 기동 후 폰트·브랜드 에셋·매니페스트·CSS 레이어 200 응답 확인
