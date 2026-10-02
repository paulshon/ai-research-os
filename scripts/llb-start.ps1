# LLB 외부 접속 시작: ① lit-ch 컨테이너 ② 게이트웨이 ③ Cloudflare 터널
# 사용자가 직접 실행:  powershell -ExecutionPolicy Bypass -File scripts\llb-start.ps1
# 전제: scripts\llb-expose-setup.ps1 를 한 번 실행했고, cloudflared 가 설치되어 있음(winget install Cloudflare.cloudflared).
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
docker start lit-ch | Out-Null
for ($i = 0; $i -lt 30; $i++) { try { if ((Invoke-RestMethod http://127.0.0.1:8123/ping -TimeoutSec 3) -match 'Ok') { break } } catch {}; Start-Sleep 5 }
Get-Content 'E:\CH_lit\llb-access.env' | ForEach-Object { if ($_ -match '^(\w+)=(.*)$') { Set-Item "env:$($Matches[1])" $Matches[2] } }
Start-Process node -ArgumentList "`"$root\scripts\llb-gateway.mjs`"" -WindowStyle Minimized
Start-Sleep 2
Write-Host '아래에 나오는 https://....trycloudflare.com 주소가 CLICKHOUSE_URL 입니다 (Vercel 환경변수에 넣기).'
Write-Host "CLICKHOUSE_USER=$env:GATEWAY_USER / CLICKHOUSE_PASSWORD 는 llb-access.env 의 GATEWAY_PASSWORD 값"
cloudflared tunnel --url http://127.0.0.1:8124
