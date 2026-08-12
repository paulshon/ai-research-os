# CHANGELOG — RDOS ove-5

## Summary
대기 화면에서 **「오브」웨이크워드만** 상시 청취하고, 웨이크 전에는 본 음성인식(Space 포함)을 금지한다. 음성 레벨에 따라 오브 중심 펄스가 점선 경계까지 팽창·수축하며, 기본 감도를 최고 수준으로 올리고 Chrome/Edge·로컬 마이크를 **원클릭**으로 설정한다.

## Changes
- `speech.ts`: `threshold: 0.004`, `HIGH_SENSITIVITY_PRESET`, 엄격한 `matchesWakeWord`, 웨이크 STT `maxAlternatives=3`, 레벨 미터 증폭, `quickSetupVoice()` (권한 + 고감도 저장 + Windows 마이크 개인정보 설정)
- `use-voice-input.ts` / `research-assistant.tsx`: 닫힌 대기 화면 = 웨이크만, Space PTT는 대화창 열림 후에만
- `orb-canvas.ts`: 점선 `boundR`까지 레벨 연동 펄스
- `voice-settings.tsx` + i18n(ko/en/zh): 원클릭 음성 설정 버튼

## Verify
- `node scripts/verify-ove5.mjs`
