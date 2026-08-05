# LibreOffice 런타임을 여기에 넣으세요 (HWP/HWPX → PDF 변환용)

이 폴더(`services/hwp-convert/vendor/libreoffice/`)는 **LibreOffice 포터블 런타임**이
들어갈 자리입니다. 용량이 매우 크고(약 285 MB 압축 / 715 MB 해제) **Windows 전용**이라
배포 패키지에는 바이너리를 포함하지 않았습니다. 아래 절차로 직접 넣어 주세요.

## 설치 방법

1. 제공받은 `mcp-libreoffice-runtime.zip` 을 풉니다.
2. 압축 안의 `mcp-libreoffice-runtime/` 내용(폴더 `program/`, `presets/` 등)을
   **이 폴더에 그대로 복사**합니다. 최종 경로가 다음과 같아야 합니다:

   ```
   services/hwp-convert/vendor/libreoffice/program/soffice.exe   ← Windows
   services/hwp-convert/vendor/libreoffice/program/soffice       ← macOS/Linux 빌드 사용 시
   ```

3. 끝입니다. 웹앱의 `/api/convert/hwp` 라우트와 독립 서비스(`server.mjs`)가
   이 경로를 **자동 탐지**합니다.

## 동작 우선순위 (바이너리 탐색)

1. 환경변수 `LIBREOFFICE_BIN` (예: `LIBREOFFICE_BIN=C:\LO\program\soffice.exe`)
2. 위의 동봉 런타임 경로
3. 시스템 PATH 의 `soffice` / `libreoffice`

위 셋 중 어느 것도 없으면 변환 라우트는 **501**을 반환하고,
앱은 **브라우저 내장 HWP 파서**로 자동 폴백합니다(아래 참고).

## 런타임 없이도 동작합니다

LibreOffice가 없어도 RDOS v11 은 브라우저에서 **HWP 5.x 본문 텍스트를 직접 파싱**합니다
(`apps/web/lib/uode/extractors.ts` 의 CFB+zlib 레코드 파서, HWPX 는 XML 파싱).
즉, 변환 런타임은 "원문 PDF 레이아웃 그대로 재현"이 필요할 때 켜는 **선택적 고급 경로**이며,
없을 때도 분석·크리틱 기능은 정상 동작합니다.
