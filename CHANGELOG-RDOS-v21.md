# CHANGELOG — RDOS / AI-Research-OS v21 (s21)

## Summary
성장 로드맵을 L0~L9(10단계)에서 **L1~L5(5단계)** 로 축소하고 명칭·XP 임계값을 재구성.

## Growth levels (new)
| Code | KO | EN | minXp |
|------|----|----|-------|
| L1 | 연구 입문자 | Research Novice | 0 |
| L2 | 연구 탐색자 | Research Explorer | 100 |
| L3 | 연구 설계자 | Research Designer | 300 |
| L4 | 연구 작성자 | Research Writer | 500 |
| L5 | 연구 준비자 | Research-Ready Scholar | 700 |

## Files
- `packages/rdos-core/src/growth/levels.ts`
- `apps/web/lib/rdos/growth.ts`
- `apps/web/lib/rdos/rdos-display-i18n.ts`
- i18n: `ko-rdos` / `en-rdos` / `zh-rdos`, marketing copy L1→L5
- `docs/RDOS-menu-design-reference.html`
- `apps/web/package.json` → 21.0.0

## Also included from s20 work
- Microsoft Clarity 삽입 (`NEXT_PUBLIC_CLARITY_PROJECT_ID`)
