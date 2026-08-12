# CHANGELOG — RDOS ove-9

## Summary
모바일 대기 화면에서 오브와 「클릭하면 대화창으로 이동」 캡션이 겹치던 레이아웃을 고친다.

## Cause
캡션이 128px 오브 래퍼 안에서 줄바꿈되고, `bottom: -30px`로 높이가 오브 안쪽으로 파고들었다.

## Changes
- `.ra-cap`: `top: calc(100% + 14px)` · `width: max-content` · `white-space: nowrap` — 항상 오브 아래 한 줄
- 대기 화면 슬롯 아래 여백을 캡션+탭바 높이만큼 확보 (`+48px`)
- 슬롯 중심 오프셋(`-14px`) 제거 — 캡션을 오브에 끌어올리지 않음

## Verify
- `node scripts/verify-ove9.mjs`
- `npm run build -w @ai-research-os/web`
