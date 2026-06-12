# CHANGELOG — v35

데스크탑 / 태블릿 / 안드로이드(모바일) 세 가지 반응형 버전 전체를 분석한 뒤,
랜딩 페이지를 DesignMe(designme.agency) 스타일로 한층 리뉴얼하고, 요청한 삭제·문구 변경과
모바일 크리틱 선택 문제를 수정했습니다.

> 참고: "데스크탑/태블릿/모바일 버전"은 별도 빌드가 아니라 하나의 Next.js 웹앱의
> 반응형 레이아웃입니다(데스크탑=사이드바, 태블릿=아이콘 레일, 모바일=하단 내비).

---

## 1. 랜딩 페이지 DesignMe 스타일 리뉴얼 (메뉴/전체 UI·UX)

- **상단 네비게이션**: DesignMe식 실시간 모노 클럭 메타(SEL · NYC 타임존) 추가
  (`components/marketing/live-clock.tsx`), CTA 버튼에 스크램블 텍스트 효과.
- **히어로**: 중앙 정렬 → 좌측 정렬 편집형 구성, 거대 명조 디스플레이 타이포
  (`clamp(2.2rem,5.5vw,4.2rem)`), 소문자 모노 섹션 라벨("ai research operating system")과
  라임 액센트 도트, 메인 카피에 스크램블 텍스트 적용.
- (v34에서 도입한 번호 매긴 메뉴 리스트·브라우저 크롬 데모 프레임·모노 메타·스크램블 헤드라인
  유지) 전반적으로 DesignMe의 편집형·미니멀·모노 디테일 언어를 강화.

## 2. 랜딩 페이지에서 "논문 분석 흐름" 데모 섹션 삭제

첨부 이미지(빨간 점선 박스)의 PaperAnalysisFlow 섹션(업로드→분석→키워드/연구방법/참고문헌)을
랜딩에서 완전히 제거(`app/page.tsx`에서 컴포넌트 및 import 삭제). 컴포넌트 정의 자체는
보존하되 랜딩에서만 노출 제거.

## 3. 지정 문구 삭제

- "업로드 → 분석 → 결과까지, Framer Motion으로 살아 움직이는 흐름" (demoSubtitle) — 섹션 삭제로 함께 제거.
- "5개 핵심 메뉴의 실행 과정을 Framer Motion으로 재현" (flowsSubtitle) — 빈 값 처리 + 빈 경우 미렌더.
  (ko/en/zh 모두)

## 4. 메뉴 흐름 섹션 제목 변경

- "메뉴가 실제로 이렇게 흐릅니다" → **"학문적 탐구의 맥락이 유기적으로 연결된 메뉴, 지금 경험해보십시오"**
  - en: "Where academic inquiry connects, experience it now"
  - zh: "学术探究的脉络有机相连的菜单，现在就来体验"

## 5. 논문 크리틱(모바일) 변환텍스트 크리틱 번호 미생성 수정

- 원인 — 변환텍스트가 `onMouseUp`만 사용해 **모바일 터치 드래그 선택 시 크리틱 생성이
  트리거되지 않았음**(터치에서 onMouseUp 미발화). 또한 인라인 번호 버튼이 선택 영역에 섞여
  selection이 깨질 수 있었음.
- 수정 —
  - 선택 핸들러를 마우스+터치 공용(`handleSelection`)으로 재작성하고, 변환텍스트·텍스트 모드·
    원문 재현(DocumentReproduction)에 `onTouchEnd`를 함께 연결. 터치 시 좌표가 없으면
    선택 영역 BoundingRect로 팝업 위치 계산.
  - 인라인 번호 배지에 `user-select:none` + `contentEditable={false}` 적용해 드래그 선택에서 제외.
  - `WebkitUserSelect:text` 명시로 모바일 텍스트 선택 보장. 최소 선택 길이 3→2자로 완화.
  - 결과: 변환텍스트에서 단어를 드래그하면 원문과 동일하게 크리틱 번호가 생성되고 패널과 연동됨.

---

## 검증

- `tsc --noEmit` 타입체크 통과(에러 0).
- `next build` 프로덕션 빌드 성공(21/21 페이지, 경고/에러 없음). 랜딩 `/`는 정적 프리렌더.
- 런타임 스모크 테스트(`/` 200):
  - #1 DesignMe 요소 렌더 확인(SEL·NYC 클럭, 소문자 모노 라벨, `live demo`, `ai-research-os /`).
  - #2 PaperAnalysisFlow 삭제 확인(데모 섹션 부재).
  - #3 삭제 문구 0건 확인.
  - #4 신규 제목 렌더 확인, 구 제목 부재.
  - `/login`·`/features`·`/pricing` 200, `/critique` 인증 가드(307 → /login) 정상.
