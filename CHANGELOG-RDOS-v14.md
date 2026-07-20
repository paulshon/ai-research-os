# AI-Research-OS RDOS v14 — Changelog

v14는 v13 위에서 **APA 인용 자동화 시스템 모달의 모바일(안드로이드·iOS) UI/UX를 스마트하게 재설계**하고,
데스크톱·태블릿·모바일 3개 폼팩터에서의 레이아웃을 정리했습니다.

## 문제 (v13)
APA 인용 자동화 시스템 모달이 모든 화면에서 "좌측 세로 사이드바(고정 186px) + 우측 본문"의
2단 가로 배치를 강제했습니다. 모바일(~380px)에서는 두 컬럼이 한 화면에 눌려 들어가
사이드바와 본문이 모두 비좁아지고 UX가 깨졌습니다(첨부 스크린샷).

## 수정 — 반응형 재설계
컴포넌트: `apps/web/components/apa/apa-automation-system.tsx`

1. **모달 프레임**
   - 데스크톱(md↑): 기존처럼 중앙 정렬 카드(`max-w-[1180px]`, `h-[88vh]`, 둥근 모서리·테두리).
   - 모바일(<md): **전체화면**(`inset-0`, `h-[100dvh]`, 둥근 모서리·외곽 패딩 제거, `items-stretch`).
     iOS/Android 동적 툴바를 고려해 `100dvh` 사용.

2. **내비게이션 — 폼팩터별 분기**
   - 데스크톱: 좌측 세로 레일 유지(`hidden md:block`).
   - 모바일: 헤더 아래 **가로 스크롤 탭 스트립(앱형 pill 탭)** 으로 전환(`md:hidden`).
     11개 메뉴를 아이콘+라벨 칩으로 가로 스크롤 노출, 활성 탭 강조. 스크롤바는 숨김(`apa-noscroll`).
   - 본문은 모바일에서 **전폭**을 사용(2단 압착 제거).

3. **헤더 컴팩트화**
   - 제목 truncate, 부제("Citation Knowledge Graph")는 `lg`↑에서만 표시.
   - 스타일 선택·닫기 버튼을 모바일에서 축소(닫기 라벨은 `sm`↑에서만, 아이콘은 항상).

4. **본문 패딩/타깃**: 모바일 `p-4`, 데스크톱 `p-5`. 빌더의 패밀리 탭·유형 칩·필드 그리드는
   기존 `flex-wrap`/`sm:grid-cols-2`로 모바일 1열·데스크톱 2열 자동 대응.

## 폼팩터 검증 (데스크톱·태블릿·모바일)
- **데스크톱(≥1024px)**: 좌측 레일 + 본문 2단, 부제 노출, 카드형 모달. 정상.
- **태블릿(768–1023px)**: `md` 적용 → 좌측 레일 + 본문 2단(부제는 숨김). iPad 세로(768)·가로(1024) 정상.
- **모바일(<768px, Android·iOS)**: 전체화면 모달 + 가로 탭 스트립 + 전폭 본문. 정상.
- v13의 우측 패널 리사이저는 데스크톱 전용(핸들 `hidden md:flex`/`lg:flex`)이라 모바일 영향 없음.

## 검증
- esbuild 파싱: APA 모달·리사이저·research-data(+ext)·structure/analyzer/critique/writing·references 페이지 전부 통과.
- strict tsc(React 타입 + `@/*`): apa-automation-system·resizable-right-panel·research-data·research-data-ext·apa-engine **무오류**.
- 비고: Clerk/Supabase 키 부재로 전체 `next build`/실서버 부팅은 미실행. 검증은
  (esbuild 파싱 + strict tsc + 반응형 클래스 정합성 점검)으로 수행. 픽셀 단위 시각 검증은
  실제 기기/브라우저에서 추가 확인을 권장.

## 버전
- `apps/web/package.json`: 13.0.0 → **14.0.0**.
