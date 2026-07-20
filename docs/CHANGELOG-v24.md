# CHANGELOG v24 — 아이콘 시스템 전면 교체 (Emoji → Outline Icons)

## 개요
프로그램 전체의 UI 아이콘을 이모지(🔬 📚 ✍ …)에서 **lucide-react 기반 Outline Icon**으로
모두 교체했습니다. 첨부 요구사항(ChatGPT·Notion·Linear·Vercel 스타일)에 맞춘 특징:

- 선(line)만으로 구성된 외곽선 아이콘
- 단색(`currentColor`) — 텍스트 색을 그대로 상속
- Rounded Stroke (둥근 선 끝/모서리), `strokeWidth = 1.75`
- 불필요한 디테일이 없는 Minimal / Modern UI

데스크탑과 안드로이드(모바일) 모두에 적용 — 사이드바, 상단 탭바, 모바일 하단 네비게이션,
마케팅 내비바, 랜딩 페이지, 모든 대시보드 페이지, 인증 페이지, 공용 컴포넌트 전부 포함.

## 핵심 변경

### 1. 통합 아이콘 컴포넌트 신설 — `apps/web/components/ui/icon.tsx`
- `<Icon name="..." size={n} strokeWidth={1.75} />` 단일 컴포넌트로 일원화
- **의미 키 매핑**(예: `research → Microscope`, `literature → BookOpen`,
  `writing → PenLine`, `review → Search`, `workflow → ClipboardList`,
  `structure → Hexagon`, `chat → MessageSquare`, `analyzer → FlaskConical`,
  `advisor → GraduationCap`, `library → Library`, `critique → SquarePen`,
  `settings → Settings`, `admin → Crown`, `engine → Bot`, `logo → Sparkles` 등)
- **이모지 키 매핑**: 기존 데이터가 `icon: "🔬"` 형태의 이모지 문자열을 들고 있어도
  `<Icon name={x.icon} />` 로 렌더하면 자동으로 대응 아웃라인 아이콘이 표시됨
  (데이터 구조를 바꾸지 않고 렌더러만 교체할 수 있도록 설계)
- 상태 색점(🔴🟡🟢…)·체크/사각형·셰브론 등 기호도 아웃라인 형태로 매핑

### 2. 내비게이션/구조 (데스크탑 + 안드로이드)
- `components/dashboard/sidebar.tsx`: 연구 흐름·엔진 메뉴 아이콘, 로고, 설정/대시보드/관리자 아이콘
- `components/dashboard/dashboard-shell.tsx`: 데스크탑 상단 탭바, 모바일 하단 네비, 햄버거(☰)
- `components/marketing/navbar.tsx`: 로고, 모바일 햄버거/닫기

### 3. 랜딩 & 마케팅 페이지
- `app/page.tsx`: 피처 카드 9종 아이콘, 헤더/푸터 로고, 모바일 메뉴 토글
- `app/(marketing)/features|pricing|contact/page.tsx`

### 4. 대시보드 페이지 전체
research, literature, literature-review, writing, validation, analyzer, structure,
dashboard, critique, advisor, chat, editor, workflow, submission, library,
notifications, admin, billing, workspace 등 — 헤더·버튼·카드·체크박스·상태표시 아이콘 교체

### 5. 인증 페이지
verify-email(🔑/✉️), pending-approval(★/⏳) 등 상태 아이콘 교체

### 6. 텍스트 라벨 정리
- 토스트/상태 메시지 문자열의 선행 이모지 제거(컴포넌트 삽입 불가한 위치) → 깔끔한 텍스트
- i18n 번역 라벨(ko/en/zh)에서 아이콘성 선행 이모지 제거 → 미니멀 텍스트 라벨로 통일
  (중복 아이콘 방지)

## 검증
- `npm run build -w @ai-research-os/web` → **성공(EXIT 0)**, 정적 페이지 20/20 생성
- `tsc --noEmit` → **타입 에러 0건**
- UI에 텍스트로 렌더되는 이모지 **0개** (전수 스캐너로 확인)
- 총 164개 `<Icon>` 사용처 / 35개 파일에 적용
- 클린 패키지에서 fresh `npm install` + build 재검증 통과

## 비고
- 학술 가이드 본문(논문 작성 안내문 등)에 포함된 이모지나 AI 프롬프트 내부의 이모지는
  화면 아이콘(UI chrome)이 아니라 콘텐츠/프롬프트의 일부이므로 그대로 두었습니다.
- 본문 흐름 표기의 화살표("거시→중시→미시" 등)는 타이포그래피 연결자로 유지했습니다.

## 버전
- 루트 `package.json`: 0.23.0 → 0.24.0
- `apps/web/package.json`: 0.23.0 → 0.24.0
