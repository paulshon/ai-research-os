# LLB supervisor (ASCII only). Keeps the whole chain alive without human help:
#   E: drive -> Docker Desktop -> lit-ch (ClickHouse) -> gateway (node) -> cloudflared tunnel -> new URL written to Supabase
# - waits for each stage to be ready (external disk / Docker may come up late after boot)
# - checks every 20 s, restarts whatever died, re-publishes the tunnel URL when it changes (and every 10 min)
# - blocks idle sleep while running (no power-plan change needed)
# - single instance (mutex). Log: E:\CH_lit\llb-supervisor.log
# Normally started by the scheduled task (scripts\llb-register-task.ps1). Manual: powershell -ExecutionPolicy Bypass -File scripts\llb-supervisor.ps1
$ErrorActionPreference = 'Continue'
$root    = Split-Path $PSScriptRoot -Parent
$envFile = 'E:\CH_lit\llb-access.env'
$logFile = 'E:\CH_lit\llb-supervisor.log'
$tunnelLog = Join-Path $env:TEMP 'llb-cloudflared.log'
$script:url = $null
$script:cf = $null
$script:lastPublish = [datetime]::MinValue
$script:tunnelFails = 0

function Log($m) {
  $line = "{0}  {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $m
  try {
    if ((Test-Path $logFile) -and (Get-Item $logFile).Length -gt 2MB) { Move-Item $logFile "$logFile.old" -Force }
    Add-Content -Path $logFile -Value $line -Encoding UTF8
  } catch {}
  Write-Host $line
}

# single instance
$created = $false
$mutex = New-Object System.Threading.Mutex($true, 'Global\LLBSupervisor', [ref]$created)
if (-not $created) { Write-Host 'already running'; exit 0 }

# block idle sleep while this script runs
Add-Type -Namespace Win32 -Name Power -MemberDefinition '[DllImport("kernel32.dll")] public static extern uint SetThreadExecutionState(uint f);'
[void][Win32.Power]::SetThreadExecutionState(0x80000001)   # ES_CONTINUOUS | ES_SYSTEM_REQUIRED

function Refresh-Path { $env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User') }

function Load-Env {
  Get-Content $envFile -Encoding UTF8 | ForEach-Object {
    $l = $_.TrimStart([char]0xFEFF).Trim()
    if ($l -match '^(\w+)\s*=\s*(.*)$') { Set-Item "env:$($Matches[1])" ($Matches[2].Trim().Trim('"', "'", '<', '>').Trim()) }
  }
}

function Http-Status($uri, $timeout = 8) {
  try { $r = Invoke-WebRequest $uri -TimeoutSec $timeout -UseBasicParsing; return [int]$r.StatusCode }
  catch { if ($_.Exception.Response) { return [int]$_.Exception.Response.StatusCode.value__ } else { return 0 } }
}

function Wait-Until($what, [scriptblock]$test, $maxSec) {
  $t0 = Get-Date
  while (-not (& $test)) {
    if (((Get-Date) - $t0).TotalSeconds -gt $maxSec) { Log "timeout waiting for: $what"; return $false }
    Start-Sleep 5
  }
  return $true
}

function Docker-Ready { docker info *> $null; return ($LASTEXITCODE -eq 0) }
function Ch-Ready     { return ((Http-Status 'http://127.0.0.1:8123/ping' 5) -eq 200) }
function Gw-Ready     { $s = Http-Status 'http://127.0.0.1:8124/ping' 5; return ($s -eq 200 -or $s -eq 401) }

function Ensure-Disk {
  if (-not (Wait-Until 'E:\CH_lit' { Test-Path 'E:\CH_lit\llb-access.env' } 600)) { return $false }
  return $true
}

function Ensure-Docker {
  if (Docker-Ready) { return $true }
  $dd = 'C:\Program Files\Docker\Docker\Docker Desktop.exe'
  if (-not (Wait-Until 'docker daemon' { Docker-Ready } 60)) {
    if (Test-Path $dd) { Log 'starting Docker Desktop'; Start-Process $dd -WindowStyle Hidden }
    return (Wait-Until 'docker daemon (after start)' { Docker-Ready } 300)
  }
  return $true
}

function Ensure-Clickhouse {
  if (Ch-Ready) { return $true }
  Log 'starting lit-ch'
  docker start lit-ch *> $null
  return (Wait-Until 'clickhouse ping' { Ch-Ready } 300)
}

function Ensure-Gateway {
  if (Gw-Ready) { return $true }
  Log 'starting gateway'
  Load-Env
  $node = (Get-Command node -ErrorAction SilentlyContinue).Source
  if (-not $node) { Log 'node not found'; return $false }
  Start-Process $node -ArgumentList "`"$root\scripts\llb-gateway.mjs`"" -WindowStyle Hidden
  return (Wait-Until 'gateway ping' { Gw-Ready } 30)
}

function Publish-Url {
  if (-not $script:url) { return }
  if (-not ($env:SUPABASE_URL -and $env:SUPABASE_SERVICE_ROLE_KEY)) { Log 'SUPABASE_URL / key missing in env file; URL not published'; return }
  $h = @{ apikey = $env:SUPABASE_SERVICE_ROLE_KEY; Prefer = 'resolution=merge-duplicates' }
  if ($env:SUPABASE_SERVICE_ROLE_KEY -like 'eyJ*') { $h['Authorization'] = "Bearer $($env:SUPABASE_SERVICE_ROLE_KEY)" }
  $body = @{ id = 'current'; url = $script:url; updated_at = (Get-Date).ToUniversalTime().ToString('o') } | ConvertTo-Json
  try {
    Invoke-RestMethod "$($env:SUPABASE_URL)/rest/v1/llb_endpoint?on_conflict=id" -Method Post -Headers $h -ContentType 'application/json' -Body $body -TimeoutSec 20 | Out-Null
    $script:lastPublish = Get-Date
    Log "published tunnel URL: $($script:url)"
  } catch { Log "publish failed: $($_.Exception.Message)" }
}

function Stop-Tunnel {
  if ($script:cf -and -not $script:cf.HasExited) { try { Stop-Process -Id $script:cf.Id -Force } catch {} }
  Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
  $script:cf = $null; $script:url = $null; $script:tunnelFails = 0
}

function Start-Tunnel {
  Stop-Tunnel
  Refresh-Path
  Remove-Item $tunnelLog -ErrorAction SilentlyContinue
  Log 'starting cloudflared'
  $script:cf = Start-Process cloudflared -ArgumentList 'tunnel','--url','http://127.0.0.1:8124' -RedirectStandardError $tunnelLog -PassThru -WindowStyle Hidden
  for ($i = 0; $i -lt 30 -and -not $script:url; $i++) {
    Start-Sleep 2
    if (Test-Path $tunnelLog) {
      $m = Select-String -Path $tunnelLog -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' -ErrorAction SilentlyContinue | Select-Object -First 1
      if ($m) { $script:url = $m.Matches[0].Value }
    }
  }
  if (-not $script:url) { Log 'tunnel URL not obtained'; return $false }
  Log "tunnel up: $($script:url)"
  Publish-Url
  return $true
}

Refresh-Path
Log '=== supervisor start ==='
while ($true) {
  try {
    if (-not (Ensure-Disk))       { continue }
    if (-not (Ensure-Docker))     { Start-Sleep 30; continue }
    if (-not (Ensure-Clickhouse)) { Start-Sleep 30; continue }
    Load-Env
    if (-not (Ensure-Gateway))    { Start-Sleep 30; continue }

    # tunnel: process alive + reachable from outside (401 from the gateway = reachable)
    if (-not $script:cf -or $script:cf.HasExited -or -not $script:url) {
      [void](Start-Tunnel)
    } else {
      $s = Http-Status "$($script:url)/ping" 15
      if ($s -eq 401 -or $s -eq 200) { $script:tunnelFails = 0 } else { $script:tunnelFails++ }
      if ($script:tunnelFails -ge 3) { Log "tunnel unreachable (status $s) - restarting"; [void](Start-Tunnel) }
      elseif (((Get-Date) - $script:lastPublish).TotalMinutes -gt 10) { Publish-Url }
    }
  } catch { Log "loop error: $($_.Exception.Message)" }
  Start-Sleep 20
}
