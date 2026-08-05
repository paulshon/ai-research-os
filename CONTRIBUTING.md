# Contributing

## 디자인 시스템

새 색상·폰트 크기를 추가하려면 **디자인 시스템 변경 PR 이 먼저**입니다.
- 정본: `apps/web/app/globals.css` 의 `:root`
- 문서: `docs/design-system.md` · `docs/ia.md`
- 컴포넌트에 `#rrggbb` / `text-[Npx]` / `text-white/20` 를 쓰지 마십시오.

## 두 트랙

연구자 트랙과 연구준비자(RDOS) 트랙은 **끝까지 분리**합니다.
공유하는 것은 토큰·컴포넌트뿐이고, 강조색은 `data-track` 이 스왑합니다.
RDOS 트랙에 AI 대필 기능을 넣지 마십시오.

## 검증

```
cd apps/web && npx tsc --noEmit
cd apps/web && npm run build
npx tsx scripts/verify-design.ts
```
