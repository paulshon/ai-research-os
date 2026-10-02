# LLB 외부 접속 시작: 1) lit-ch 컨테이너  2) 게이트웨이  3) Cloudflare 터널  4) 새 터널 주소를 Supabase 에 기록
# 사용자가 직접 실행:  powershell -ExecutionPolicy Bypass -File scripts\llb-start.ps1
# 전제: scripts\llb-expose-setup.ps1 실행 완료, cloudflared 설치, supabase/migrations/0015_llb_endpoint.sql 적용,
#       E:\CH_lit\llb-access.env 에 아래 두 줄 추가 (Supabase 대시보드 > Project Settings > API):
#         SUPABASE_URL=https://xxxx.supabase.co
#         SUPABASE_SERVICE_ROLE_KEY=eyJ...   (service_role 키. 비밀번호와 같으니 어디에도 올리지 말 것)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$envFile = 'E:\CH_lit\llb-access.env'

docker start lit-ch | Out-Null
for ($i = 0; $i -lt 30; $i++) { try { if ((Invoke-RestMethod http://127.0.0.1:8123/ping -TimeoutSec 3) -match 'Ok') { break } } catch {}; Start-Sleep 5 }
Get-Content $envFile | ForEach-Object { if ($_ -match '^(\w+)=(.*)$') { Set-Item "env:$($Matches[1])" $Matches[2] } }

# 게이트웨이: 이미 떠 있으면 다시 띄우지 않는다
$gwUp = $false
try { Invoke-WebRequest http://127.0.0.1:8124/ping -TimeoutSec 3 -UseBasicParsing | Out-Null; $gwUp = $true } catch { if ($_.Exception.Response) { $gwUp = $true } }
if (-not $gwUp) { Start-Process node -ArgumentList "`"$root\scripts\llb-gateway.mjs`"" -WindowStyle Minimized; Start-Sleep 2 }

# 터널: 로그를 파일로 받아 주소를 읽는다
$log = Join-Path $env:TEMP 'llb-cloudflared.log'
Remove-Item $log -ErrorAction SilentlyContinue
$cf = Start-Process cloudflared -ArgumentList 'tunnel','--url','http://127.0.0.1:8124' -RedirectStandardError $log -PassThru -WindowStyle Minimized
$url = $null
for ($i = 0; $i -lt 40 -and -not $url; $i++) {
  Start-Sleep 2
  if (Test-Path $log) { $m = Select-String -Path $log -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' | Select-Object -First 1; if ($m) { $url = $m.Matches[0].Value } }
}
if (-not $url) { Write-Host '터널 주소를 얻지 못했습니다. 로그: ' $log; exit 1 }
Write-Host "터널 주소: $url"

# 새 주소를 Supabase 에 기록 (앱이 30초 안에 새 주소를 읽는다)
if ($env:SUPABASE_URL -and $env:SUPABASE_SERVICE_ROLE_KEY) {
  $h = @{ apikey = $env:SUPABASE_SERVICE_ROLE_KEY; Authorization = "Bearer $($env:SUPABASE_SERVICE_ROLE_KEY)"; Prefer = 'resolution=merge-duplicates' }
  $body = @{ id = 'current'; url = $url; updated_at = (Get-Date).ToUniversalTime().ToString('o') } | ConvertTo-Json
  try {
    Invoke-RestMethod "$($env:SUPABASE_URL)/rest/v1/llb_endpoint?on_conflict=id" -Method Post -Headers $h -ContentType 'application/json' -Body $body | Out-Null
    Write-Host 'Supabase 에 새 주소를 기록했습니다. Vercel 설정은 건드릴 필요가 없습니다.'
  } catch { Write-Host "Supabase 기록 실패: $($_.Exception.Message)  (Vercel 의 CLICKHOUSE_URL 을 위 주소로 직접 바꾸세요)" }
} else {
  Write-Host 'llb-access.env 에 SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 가 없어 주소를 기록하지 못했습니다.'
}
Write-Host '이 창을 닫으면 터널이 끊깁니다. 종료하려면 Ctrl+C.'
try { Wait-Process -Id $cf.Id } finally { if (-not $cf.HasExited) { Stop-Process -Id $cf.Id -Force } }
