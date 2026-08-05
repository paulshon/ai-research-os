# CHANGELOG — RDOS v10

연구준비자 플랜(RDOS) 학습 콘텐츠·셸 정비. v9 대비 3개 과제를 반영했다.

## 과제 1 — 학습내용에서 두 문구 삭제
RDOS 전체 메뉴의 각 페이지·각 학습모듈의 "학습 내용"에서 다음을 제거했다.
- `쉽게 말하면` 라벨 — 라벨(`<strong>쉽게 말하면</strong>`)과 구분자만 제거하고, 그 아래의 실제 설명 본문은 보존했다.
- `흔한 오해` 블록 전체 — `용어를 '암기'하려 하면 금방 잊습니다 …` 문단(`<h3>흔한 오해</h3><p>…</p>`)을 통째로 삭제했다.

적용 파일: `apps/web/lib/rdos/lesson-content.ts`, `knowledge-lessons.ts`, `knowledge-core.ts`.
- 제거 결과: 세 파일 모두 `쉽게 말하면` 0건 / `흔한 오해` 0건 / `'암기'하려 하면 금방 잊습니다` 0건.
- `흔한 오해` 블록 제거: lesson-content 47개 + knowledge-lessons 48개 = 95개.

## 과제 2 — 예시 정책 (생성형 AI art 유지 + 실제 논문 3편 반영)
- 기존 **생성형 AI art** 러닝 예시는 **그대로 유지**했다(v9 중간 작업에서 시도했던 "웹툰" 치환은 전량 원복 — 현재 산출물에 "웹툰" 0건).
- 첨부된 **실제 게재 논문 3편**(손경덕·김현석, 홍익대)을 분석해 학습내용·퀴즈에 **사례 레슨**으로 추가했다.
  1. **무인 자율 자동차(AV) 유튜브 댓글 시청자 인식 유형** — 양적·텍스트마이닝·군집분석·연구질문 위계(RQ1→2→3)·연구공백.
  2. **식재료 관리를 위한 냉장고 스마트 카메라 앱 서비스** — 혼합방법·더블 다이아몬드·심층 인터뷰·퍼소나·페인포인트.
  3. **움직이는 이모티콘의 감정유형 분석** — 내용분석·코딩 신뢰도·이론적 틀(플러칙 감정의 휠)·빈도분석.
- 신규 파일 `apps/web/lib/rdos/case-papers.ts`: 3편의 구조화 메타데이터(`RDOS_CASE_PAPERS`)와 모듈별 사례 레슨(`CASE_PAPER_LESSONS`).
- `lesson-content.ts` 하단에서 사례 레슨을 관련 모듈(`basics`·`design`·`method`·`reading`)의 `lessons`에 병합(중복 id 방지). 각 사례 레슨은 학습내용 + 퀴즈(4~5문항)를 포함한다.
- 웹툰 등 임의 주제는 사용하지 않았다.

## 과제 3 — 사이드바 사용자 영역(정보·로그아웃·서버 저장)
- 신규 컴포넌트 `apps/web/components/rdos/rdos-sidebar-user.tsx`:
  - 사용자 정보(아바타·이름·이메일, Clerk `useUser`/`UserButton`).
  - **서버 저장** 버튼 — `POST /api/rdos/state` 호출로 학습 진행을 서버(`rdos_progress`)에 영속화, 마지막 저장 시각 표시(`GET /api/rdos/state`).
  - **로그아웃** 버튼 — Clerk `signOut({ redirectUrl: "/" })`.
  - Clerk 미설정(데모) 시 graceful 처리.
- 신규 API `apps/web/app/api/rdos/state/route.ts` (GET 조회 / POST 저장).
- `apps/web/lib/rdos/state-server.ts`에 `getRdosSaveMeta`·`saveRdosSnapshot` 추가(기존 스키마만 사용, 스키마 변경 없음).
- `apps/web/components/rdos/rdos-shell.tsx`의 사이드바 본문(`SidebarBody`) 하단에 사용자 영역을 삽입(데스크탑·태블릿·모바일 오버레이 공용).

## 검증
- 변경/신규 파일 전체 esbuild 트랜스파일 검증 통과(구문 오류 0).
- 연결점 정적 검증: 모듈 키(basics/design/method/reading) 존재, `Icon` className·아이콘명(cloud/check/warn/refresh) 존재, Clerk `signOut` 시그니처가 기존 코드(`pending-approval`)와 동일.
- 주: 모노레포 전체 의존성 설치가 샌드박스 시간 제한을 초과하여 `next build` 전 과정 실행은 환경상 불가했다. 설치 가능한 환경에서는 `npm install && npm run build:web`로 최종 빌드를 확인할 수 있다.

## 버전
- 루트 `package.json` 및 `apps/web/package.json` 버전: `9.0.0` → `10.0.0`.
