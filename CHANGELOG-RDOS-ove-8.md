# CHANGELOG — RDOS ove-8

## Summary
GitHub/Vercel 배포 실패를 해결하고, 저장소에 포함되던 중첩 아카이브·임시 파일을 제거한 배포용 패키지.

## Fixes (Vercel build)
- `research-assistant.tsx`: `enterVoiceMode` 뒤에 끊긴 `openChatOnly` 콜백 복구 (구문 오류)
- `orbSingleTapTimerRef`: 브라우저 `window.setTimeout` 반환값에 맞게 `number | null` 타입

## Cleanup (GitHub / repo size)
- 루트에 중첩되어 있던 `AI-Research-OS_RDOS_-s-renew-ove-3` … `ove-6` 디렉터리 제거
- `tmp-ko-sentences.txt`, `_gen_demos.py`, `_inspect_demos.py` 제거
- `.gitignore`에 중첩 아카이브 폴더 패턴 추가

## Verify
- `npm run build -w @ai-research-os/web` (Vercel `buildCommand` 와 동일)
- `node scripts/verify-ove7.mjs`
- `node scripts/verify-ove8.mjs`
