# CHANGELOG — RDOS s-renew-16

## 1. AI API 연결 실패 해결 (가장 중요)

**원인.** 어시스턴트가 Gemini 를 직접 부르지 않고 **반드시 외부 FastAPI 프록시
(`https://sarangred-ai-research-os-api.hf.space/ai/generate`)를 경유**하도록 되어 있었다.
Hugging Face Space 는 유휴 상태가 되면 잠들고(cold start) 응답하지 않는다.
그 순간 라우트는 `catch` 로 떨어져 `"AI 응답을 받지 못했습니다"` 한 줄만 돌려줬고,
화면에는 `?ERROR AI 응답을 받지 못했습니다.` 만 찍혔다. 설정에 Gemini 키가 정상
등록돼 있어도 결과는 같았다 — 키 문제가 아니라 **경유지 문제**였다.

**수정.** `app/api/assistant/route.ts` 를 다음 순서로 재작성했다.

1. **Gemini 직접 호출** — `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`,
   `x-goog-api-key` 헤더, 45초 타임아웃(AbortController).
2. 실패했을 때만 **기존 프록시로 폴백** (`API_URL` 이 설정된 경우에만, 30초 타임아웃).
3. 둘 다 실패하면 **각 단계의 실제 오류 메시지를 그대로** 반환한다
   (`direct: … | proxy: …`). 원인 없이 "받지 못했습니다"로 끝나지 않는다.

- 키 해석 순서는 그대로 **① 설정에 저장된 사용자 키 → ② 서버 `GEMINI_API_KEY`**.
- 응답에 `via: "gemini" | "proxy"` 를 실어 어느 경로로 답했는지 확인할 수 있다.
- 빈 응답도 오류로 처리하고 `finishReason` / `blockReason` 을 표시한다.
- `API_URL` 기본값을 빈 문자열로 바꿔, 미설정 시 죽은 주소로 헛되이 재시도하지 않는다.

## 2. 어시스턴트 오브 확대
- 데스크탑 **116px → 140px**, 모바일 **88px → 104px**. 캔버스 기준 크기도 함께 조정.
- 360px 화면에서도 좌측 여백 242px 이 남아 본문을 가리지 않는다.

## 3. 데스크탑 — 메뉴 페이지 좌우 폭 축소
- `components/dashboard/dashboard-shell.tsx`
- 연구자 플랜 본문이 `max-w-full` 이라 초광폭 모니터에서 화면 끝까지 늘어났다.
  (RDOS 셸은 이미 `max-w-[1080px]` 을 쓰고 있어 두 플랜의 인상이 달랐다.)
- 히어로가 있는 **일반 메뉴 페이지만** `max-w-[1180px] mx-auto` 로 중앙 정렬한다.
  EXPERT 작업공간(`hero:false` 8개 화면)은 작업 면적이 중요하므로 폭을 제한하지 않는다.

  | 모니터 | 가용폭 | 본문 | 양옆 여백 |
  |---|---|---|---|
  | 1280px | 1012px | 1012px | 0 |
  | 1600px | 1332px | 1180px | 76px |
  | 1920px | 1652px | 1180px | 236px |
  | 2560px | 2292px | 1180px | 556px |

## 4. 모바일 UI/UX 정리
- **사이드바 드로어 폭 축소** : `min(84vw,290px)` → `min(78vw,264px)`
  (연구자 플랜·RDOS 양쪽). 360px 화면 기준 배경이 96px 남아 바깥 탭으로 닫기 쉬워진다.
  연구자 플랜 드로어에 `overflow-y-auto` 를 추가해 메뉴가 길어져도
  하단 프로젝트 카드에 가려 잘리지 않는다.
- **히어로 타이포·여백 축소** (`components/immersive/page-hero.tsx`, <640px 구간)

  | 항목 | 이전 | 이후 |
  |---|---|---|
  | 제목 | 26px | 21px |
  | 리드 | 15px | 13.5px |
  | 수치 | 19px | 17px |
  | 수치 라벨 | 12px | 11px |
  | 상하 패딩 | 28px | 20px |
  | 좌우 패딩 | 20px | 16px |

  sm(640px) 이상에서는 기존 크기를 그대로 유지하므로 데스크탑 인상은 바뀌지 않는다.

## 5. 검증
- `tsc --noEmit` : 오류 0
- `next build` : 성공 (42s)
- `next start` 스모크 : `/` 200 · `/favicon.ico` 200 · `/manifest.webmanifest` 200
- Gemini 직접 호출 페이로드 스키마(systemInstruction / contents / generationConfig) 구조 검증 통과
