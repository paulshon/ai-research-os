# CHANGELOG v23

## 1. 빌드 에러 수정 (Build failure fix)
배포 빌드(`npm run build -w @ai-research-os/web`)를 실패시키던 구문 오류 3건을 수정했습니다.

- `apps/web/app/(dashboard)/settings/page.tsx`
  - `useEffect` 내부의 `try {` 블록이 `catch` 없이 닫히지 않음 → `} catch {}` 추가
  - `save` 함수 내부의 `try {` 블록이 `catch` 없이 닫히지 않음 → `} catch {}` 추가
- `apps/web/app/(dashboard)/critique/page.tsx`
  - 좌측 패널 `<div className={...}>` 태그가 `>` 없이 닫힘 (497행) → 수정
  - 우측 패널 `<div className={...}>` 태그가 `>` 없이 닫힘 (784행) → 수정

검증: `next build` → 20개 라우트 정상 생성, `tsc --noEmit` 타입 에러 0건.

## 2. 안드로이드(모바일) 메뉴 동작 수정
데스크탑에서는 보이던 **문헌연구(`/literature-review`)** 와 **문장 라이브러리(`/library`)** 의 좌측 패널이
모바일에서 `hidden md:flex`로 완전히 숨겨져, 안드로이드에서는 검색·DB 선택·챕터 선택 기능 자체에
접근할 수 없었습니다.

- 데스크탑과 **동일한 패널 UI**를 모바일에서는 **슬라이드 드로어(drawer)** 로 열도록 변경
- 상단에 패널 토글 바 추가(`md` 미만에서만 표시), 백드롭/닫기 버튼 제공
- 검색 실행 시(문헌연구) / 챕터 선택 시(라이브러리) 드로어 자동 닫힘
- 문헌연구 플로팅 분석 버튼을 모바일에서는 하단(바텀 네비 위)으로 재배치하여 콘텐츠와 겹침 방지

이제 안드로이드에서도 데스크탑과 동일한 기능을 사용할 수 있습니다.

## 3. 구조 단순화 (Structure simplification)
- 패키지 매니저를 **npm으로 단일화**: 중복되던 `pnpm-lock.yaml`, `pnpm-workspace.yaml` 제거
  (`vercel.json`의 `npm install` 및 `package-lock.json`과 일관)
- 루트의 레거시 잔여 폴더 `AI Research OS v9-...`(Aspose 변환 산출물) 제거
- 루트의 참고 문서 폴더 `논문구조엔진파일/` → `docs/논문구조엔진파일/` 로 이동하여 루트 정리
- `apps/web/next.config.ts`에 `outputFileTracingRoot` 명시 → "inferred workspace root" 빌드 경고 제거

## 4. 버전
- 루트 `package.json`: 0.22.0 → 0.23.0
- `apps/web/package.json`: 0.21.0 → 0.23.0
