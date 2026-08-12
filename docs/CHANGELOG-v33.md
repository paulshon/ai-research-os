# CHANGELOG — v33

데스크탑 / 태블릿 / 안드로이드(모바일) 세 가지 반응형 버전 전체를 분석한 뒤,
랜딩 페이지에 **5개 핵심 메뉴의 실행 과정**을 Framer Motion 데모로 추가했습니다.
(v32의 논문 크리틱 수정 및 랜딩 모션은 모두 그대로 유지)

> 참고: "데스크탑/태블릿/모바일 버전"은 별도 빌드가 아니라 하나의 Next.js 웹앱의
> 반응형 레이아웃입니다(데스크탑=사이드바, 태블릿=아이콘 레일, 모바일=하단 내비).

---

## 신규: 5개 메뉴 실행과정 Motion 쇼케이스 (Menu Flows in Motion)

랜딩 페이지에 자동 순환 탭 형태의 섹션을 추가하여, 각 메뉴의 실제 동작 흐름을
Framer Motion으로 재현했습니다. 탭을 클릭해 직접 전환할 수도 있고,
화면에 보일 때 7초 간격으로 자동 순환합니다(호버 시 일시정지, `prefers-reduced-motion` 존중).

각 메뉴 페이지의 실제 UI/흐름을 분석하여 동작을 충실히 시각화했습니다.

1. **문헌연구** (`/literature`)
   키워드 검색(스피너) → 논문 결과 목록 stagger 등장 → 연구 갭 분석 카드 slide-up
2. **논문구조엔진** (`/structure`)
   논문 유형 선택(하이라이트) → 6개 챕터 구조 stagger 생성 → 챕터 펼침(Good/Bad 패턴)
3. **논문크리틱** (`/critique`)
   PDF 업로드(드롭존 pulse) → AI 크리틱 → 원문 번호 배지 + 패널 카드 등장 + 번호↔카드 연동 강조
4. **참고문헌정리** (`/references`)
   DOI 입력 → 출처 체인(Crossref → OpenAlex → Semantic Scholar) 확인 → 인용 스타일 전환(APA7/MLA9/IEEE) → 목록
5. **문장라이브러리** (`/library`)
   논문 유형·챕터 선택 → AI 생성(스피너) → 문장 패턴 카드 stagger 등장

**새 파일**: `apps/web/components/marketing/menu-flow-showcase.tsx`
**i18n**: `landing.*`에 신규 키 추가(ko/en/zh).
**배치**: 랜딩 페이지 "All Menus & Features" 섹션 바로 다음.

---

## v32에서 유지되는 내용

- 논문 크리틱: 400페이지 대용량 PDF 원문 지연 렌더링(LazyPdfPage), 원문/변환텍스트 ↔ 패널 양방향 연동.
- 랜딩: 전체 메뉴 그리드(AllFeaturesMotion) + 논문 분석 흐름 데모(PaperAnalysisFlow), 히어로/기능 카드 모션.

---

## 검증

- `tsc --noEmit` 타입체크 통과(에러 0).
- `next build` 프로덕션 빌드 성공(21/21 페이지 생성, 경고/에러 없음). 랜딩 `/`는 정적 프리렌더.
- 런타임 스모크 테스트: `/` 200 — 신규 섹션("메뉴가 실제로 이렇게 흐릅니다") 및
  5개 메뉴 탭(문헌 연구·논문구조엔진·논문 크리틱·참고문헌 정리·문장 라이브러리) 렌더 확인.
  `/login`·`/features`·`/pricing` 200, `/critique` 인증 가드(307 → /login) 정상.
