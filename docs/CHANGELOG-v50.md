# CHANGELOG — v50

맥(아이패드·아이폰) 버전에서 발견된 레이아웃·반응형 이슈를 정리한 릴리스입니다.
첨부 스크린샷(스플래시 모션, 랜딩 상단 메뉴, 사이드/페이지 레이아웃)에서 지적된
세로쓰기 깨짐·아이콘 전용 사이드바·패널 비율·밀도 문제를 해결하여, 맥 버전을
윈도우 데스크탑/태블릿/모바일 버전과 동일한 밀도·정렬로 통일했습니다.

---

## 1. 스플래시(인트로 모션) — 사라지던 로고 글자 복구

- 증상: 랜딩 진입 전 인트로 모션에서 `AI Research` 글자가 보이지 않고 `OS`만 표시.
- 원인: `AI Research`는 그라데이션 텍스트(`bg-clip-text` + `text-transparent`)를 사용했는데,
  글자를 애니메이션용 `inline-block` 자식 span으로 쪼개면서 부모 박스에 직접 그려지는 글리프가
  없어, 클립된 배경이 투명하게 렌더 → 글자가 사라짐.
- 수정(`components/marketing/splash-screen.tsx`): `AnimatedWord`에 글자별 클래스(`charClassName`)
  옵션을 추가하고, 그라데이션·클립을 **각 글자 span에 직접** 적용. 각 글자가 자신의 글리프와
  배경을 함께 가지므로 클립이 정상 동작하여 `AI Research OS` 전체가 안정적으로 표시됨.

## 2. 랜딩 상단 메뉴 — 세로쓰기 깨짐 → 가로쓰기

- 증상: 랜딩 헤더의 메뉴(기능·아키텍처·사용법·요금·문서·블로그·로그인 등)가 태블릿 폭에서
  글자 단위로 세로로 쌓임.
- 원인: 데스크탑 네비를 `md`(768px)부터 한 줄에 모두 노출 → 아이패드 세로 폭에서 항목이
  압축되며 한국어가 글자 단위로 줄바꿈.
- 수정(`app/page.tsx`, `components/marketing/navbar.tsx`):
  - 데스크탑 풀 네비 표시 기준을 `md` → **`lg`(1024px)** 로 상향. 그 미만(태블릿 세로/모바일)은
    깔끔한 햄버거 메뉴로 통일.
  - 모든 메뉴 링크/버튼에 `whitespace-nowrap` 부여, 세계시계는 `xl` 이상에서만 노출하여 공간 확보.

## 3. 전역 한국어 줄바꿈 안전장치 (`word-break: keep-all`)

- 여러 화면에서 “어떤 문자는 가로, 어떤 문자는 세로”로 섞여 보이던 근본 원인은, 좁은 컨테이너에서
  한국어가 글자 단위로 줄바꿈되었기 때문.
- 수정(`app/globals.css` `body`): `word-break: keep-all`(공백 단위로만 줄바꿈) +
  `overflow-wrap: break-word`(긴 영문/URL은 비상 줄바꿈 허용)를 전역 적용 → 앱 전체에서
  한국어 라벨이 글자 단위로 세로로 쌓이는 현상 제거.

## 4. 태블릿 사이드바 — 아이콘 전용 → 아이콘 + 메뉴명

- 증상(아이패드 세로): 사이드바가 아이콘만 표시되어 메뉴명을 알 수 없음.
- 수정(`components/dashboard/tablet-rail.tsx`): `md~lg` 구간의 아이콘 전용 레일(w-16)을
  **아이콘 + 라벨 컴팩트 사이드바(w-200px)** 로 교체. 로고·섹션 헤더(Research Flow / AI Tools)·
  활성 강조 바를 데스크탑 풀 사이드바와 동일한 스타일로 정렬하여 데스크탑/태블릿 일관성 확보.

## 5. 본문 페이지 레이아웃·밀도 조정

- **논문 작성(writing)**: 중앙 에디터가 좌우 패널 대비 작게 보이던 문제 → 좌측 목차 `w-72 → w-60`,
  우측 Copilot `lg:w-80 → lg:w-72`(xl에서 w-80 복원)로 축소하여 **중앙 집필 영역을 확대**.
- **논문 크리틱(critique)**: 좌측 구조 패널 `lg:w-52 → lg:w-48`로 축소해 중앙 뷰어를 더 강조.
- **참고문헌(references)**: 정렬/스타일/내보내기 컨트롤 바에 `flex-wrap` + `whitespace-nowrap`을
  적용 → 정렬(가나다·연도순·제목순)·내보내기 버튼이 글자 단위로 깨지지 않고 버튼 단위로 정렬·줄바꿈.
- **데스크탑 사이드바(sidebar)**: 항목 간격(`space-y-1 → space-y-1.5`)을 넓혀 “너무 빽빽” 느낌 완화.

---

## 변경 파일 요약

- `app/globals.css` — 전역 `word-break: keep-all` / `overflow-wrap: break-word`
- `components/marketing/splash-screen.tsx` — 그라데이션 글자 per-char 클립 적용
- `app/page.tsx` — 랜딩 네비 `lg` 브레이크포인트 + nowrap, 시계 `xl`
- `components/marketing/navbar.tsx` — 마케팅 네비 `lg` 브레이크포인트 + nowrap
- `components/dashboard/tablet-rail.tsx` — 라벨형 컴팩트 사이드바로 재설계
- `components/dashboard/sidebar.tsx` — 항목 간격 완화
- `app/(dashboard)/references/page.tsx` — 컨트롤 바 wrap/nowrap
- `app/(dashboard)/writing/page.tsx` — 좌/우 패널 축소(중앙 확대)
- `app/(dashboard)/critique/page.tsx` — 좌측 패널 축소

빌드 검증: `next build` 성공(Compiled successfully · 타입/린트 통과 · 정적 페이지 22/22 생성).
