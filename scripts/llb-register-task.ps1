# Register (or remove) the Windows scheduled task that starts the LLB supervisor at logon. ASCII only.
#   register: powershell -ExecutionPolicy Bypass -File scripts\llb-register-task.ps1
#   remove  : powershell -ExecutionPolicy Bypass -File scripts\llb-register-task.ps1 -Remove
param([switch]$Remove)
$name = 'LLB-Supervisor'
if ($Remove) { Unregister-ScheduledTask -TaskName $name -Confirm:$false -ErrorAction SilentlyContinue; Write-Host "removed $name"; exit 0 }

$script = Join-Path $PSScriptRoot 'llb-supervisor.ps1'
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$script`""
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$trigger.Delay = 'PT30S'
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable `
  -ExecutionTimeLimit ([TimeSpan]::Zero) -MultipleInstances IgnoreNew -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1)
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited
Register-ScheduledTask -TaskName $name -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null
Get-ScheduledTask -TaskName $name | Select-Object TaskName, State | Format-Table -AutoSize
Write-Host 'registered. Starts at next logon (30 s delay). To start now: Start-ScheduledTask -TaskName LLB-Supervisor'
