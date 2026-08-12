# CHANGELOG — RDOS ove-7

## Summary
오브 제스처를 보완하고, 모바일에서 전체메뉴·오브·캡션이 한 화면에 들어가도록 레이아웃을 조정한다.

## Changes
- **오브**: 더블클릭/더블탭 → 음성 인식 시작 유지 · **단일 클릭/탭 → 음성 인식 중지** (본 세션·웨이크 청취)
- **모바ile 대기 화면**: `MenuGrid` `standbyMobile` — 8메뉴 카드 축소, 오브 크기(128px) 유지
- **모바ile 오브 위치**: 하단 탭바 위로 올림, 캡션「클릭하면 대화창으로 이동」가 탭바에 가리지 않도록 여백·CSS

## Verify
- `node scripts/verify-ove7.mjs`
