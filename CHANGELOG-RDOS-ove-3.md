# CHANGELOG — AI-Research-OS_RDOS_-s-renew-ove-3

## 수정1 · 오브 대화창 CRT(SCHOLAR-DOS) 원형 복원
- 외형: ove-1 / s-renew-17 CRT 모니터(SCHOLAR-DOS 배지, 스캔라인, 포스포르 텍스트, 마이크·웰·전송 덱, SCHOLAR-84 친)
- 기능: ove-2 그대로 유지(플로팅 드래그·리사이즈·글자배율·핀, 모바일 바텀시트, 의도 분류, 음성 파이프라인)

## 수정2 · 사운드/녹음장치 연동 · 음성인식 강화
- `listMicrophones({ prime })` — 라벨 없으면 getUserMedia로 권한 프라이밍 후 Windows/Android 장치명 확보
- `ensureDefaultMicrophone()` — 사라진 deviceId 정리, OS 기본 녹음장치 사용
- `devicechange` 리스너(훅·설정 패널)로 장치 핫플러그 반영
- Electron `setupMediaPermissions` 유지, `/api/stt` 서버 전사 폴백 유지
- `scripts/verify-voice-ove3.mjs`로 시스템 장치·소스 무결성 검증

## 수정3 · 오브 사이즈 조절
- 대기(center): 200 → **176px** (조금 작게), 모바일 128px
- 연구(dock): 112 → **132px** (조금 더 크게·선명), 모바일 108px
- 캔버스 광원·선 굵기·점 대비 강화로 dock 존재감 향상
- `[data-orb-slot]` 슬롯 크기도 동일 비율로 맞춤

## 플랫폼
- 데스크탑(Electron + web)과 안드로이드(반응형 max-width:767px 바텀시트)에 동일 적용
