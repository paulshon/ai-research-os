# hwp-convert — 한컴 문서(HWP/HWPX) → PDF 변환 서비스 (RDOS v11)

논문분석·논문크리틱 메뉴에서 `.hwp` / `.hwpx` 를 불러올 때, 원문 레이아웃을
**PDF 로 변환해 그대로 재현**하기 위한 변환 계층입니다.

## 구성

```
services/hwp-convert/
├─ server.mjs                     # 독립 실행형 HTTP 변환 서비스(데스크탑/자체호스팅)
├─ package.json
└─ vendor/
   ├─ hwpjs/                      # hwp.js (브라우저 파서 참조 구현, 레코드 규칙 근거)
   ├─ openhwp-core/              # openhwp (Rust HWP 파서, 참조)
   └─ libreoffice/               # ← LibreOffice 런타임을 여기에 드롭(PLACE_RUNTIME_HERE.md 참고)
```

웹앱 측 진입점은 두 가지입니다.

| 경로 | 위치 | 용도 |
|------|------|------|
| `POST /api/convert/hwp` | `apps/web/app/api/convert/hwp/route.ts` | Next.js 서버(Node 런타임)에서 직접 변환 |
| 독립 서비스 `POST /convert` | `services/hwp-convert/server.mjs` | 서버리스 등 LibreOffice를 둘 수 없는 배포에서 분리 실행 |

## 변환 엔진

LibreOffice **headless** (`soffice --headless --convert-to pdf:writer_pdf_Export`)
를 사용합니다. 한/글 문서 필터가 포함된 LibreOffice 가 HWP→PDF 를 처리합니다.

### LibreOffice 바이너리 탐색 우선순위
1. 환경변수 `LIBREOFFICE_BIN`
2. 동봉 런타임 `services/hwp-convert/vendor/libreoffice/program/soffice(.exe)`
3. 시스템 PATH 의 `soffice` / `libreoffice`

셋 다 없으면 변환 API 는 **501 (converter_unavailable)** 을 반환하고,
클라이언트(`apps/web/lib/hwp-convert.ts`)는 **브라우저 내장 HWP 파서**로 폴백합니다.

## 실행 (독립 서비스)

```bash
cd services/hwp-convert
# (선택) 시스템 LibreOffice 경로 지정
export LIBREOFFICE_BIN=/usr/bin/soffice          # Windows: set LIBREOFFICE_BIN=C:\LO\program\soffice.exe
npm start                                         # → http://localhost:7330
```

상태 확인:
```bash
curl http://localhost:7330/health
# { "ok": true, "bin": "/usr/bin/soffice" }
```

변환:
```bash
curl -F "file=@paper.hwp" http://localhost:7330/convert -o paper.pdf
```

웹앱이 독립 서비스를 쓰도록 하려면 라우트에서 이 서비스로 프록시하거나,
`/api/convert/hwp` 대신 `HWP_CONVERT_URL` 로 연결하도록 배선하세요.

## 런타임 없이 동작하는 경로(항상 활성)

LibreOffice 가 없어도, HWP 5.x 문서는 브라우저에서 **본문 텍스트가 직접 파싱**됩니다:
`apps/web/lib/uode/extractors.ts` → CFB(OLE2) 컨테이너 + zlib(deflate) 해제 +
`HWPTAG_PARA_TEXT` 레코드 워크. HWPX 는 ZIP+XML 로 파싱됩니다.
따라서 **분석/크리틱은 변환 런타임 없이도 정상 동작**하며, 변환기는 원문 PDF
레이아웃 재현이 필요한 경우의 선택적 고급 경로입니다.

## 라이선스 주의
- LibreOffice 는 MPL-2.0. 재배포 시 해당 라이선스를 따르세요.
- `vendor/hwpjs`, `vendor/openhwp-core` 는 각 프로젝트의 원 라이선스를 따릅니다(참조용 포함).
