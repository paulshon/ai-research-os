# E: 드라이브 ClickHouse(lit-ch)용 읽기 전용 계정(llb_ro) 만들기 + 게이트웨이 비밀번호 생성.
# 사용자가 직접 실행:  powershell -ExecutionPolicy Bypass -File scripts\llb-expose-setup.ps1
# 결과: E:\CH_lit\users.d\llb_ro.xml (ClickHouse 가 자동 재적재), E:\CH_lit\llb-access.env (비밀번호 모음, 공유 금지)
$ErrorActionPreference = 'Stop'
function Rnd { -join ((1..24) | ForEach-Object { '{0:x2}' -f (Get-Random -Maximum 256) }) }
$chPw = Rnd; $gwPw = Rnd
$sha = [Security.Cryptography.SHA256]::Create()
$h = -join ($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($chPw)) | ForEach-Object { $_.ToString('x2') })
$xml = @"
<clickhouse>
  <!-- LLB(문헌 연구 검색) 전용 읽기 전용 계정. 외부 접속은 게이트웨이를 거쳐 이 계정만 쓴다. -->
  <profiles>
    <llb_ro>
      <readonly>2</readonly>
      <max_execution_time>120</max_execution_time>
      <max_memory_usage>6000000000</max_memory_usage>
      <max_result_rows>100000</max_result_rows>
      <max_threads>8</max_threads>
      <constraints>
        <readonly><const/></readonly>
        <max_execution_time><max>120</max></max_execution_time>
        <max_memory_usage><max>6000000000</max></max_memory_usage>
        <max_result_rows><max>100000</max></max_result_rows>
        <max_threads><max>8</max></max_threads>
      </constraints>
    </llb_ro>
  </profiles>
  <quotas>
    <llb_ro><interval><duration>60</duration><queries>120</queries><errors>60</errors></interval></llb_ro>
  </quotas>
  <users>
    <llb_ro>
      <password_sha256_hex>$h</password_sha256_hex>
      <networks><ip>::/0</ip></networks>
      <profile>llb_ro</profile>
      <quota>llb_ro</quota>
      <grants><query>GRANT SELECT ON openalex.*</query><query>GRANT SELECT ON system.parts</query><query>GRANT SELECT ON system.tables</query></grants>
    </llb_ro>
  </users>
</clickhouse>
"@
[IO.File]::WriteAllText('E:\CH_lit\users.d\llb_ro.xml', $xml)
# 기존 파일의 다른 줄(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 등)은 그대로 보존하고, 아래 네 값만 새로 쓴다
$managed = 'CH_USER','CH_PASSWORD','GATEWAY_USER','GATEWAY_PASSWORD'
$keep = @()
if (Test-Path 'E:\CH_lit\llb-access.env') {
  $keep = @(Get-Content 'E:\CH_lit\llb-access.env' -Encoding UTF8 | ForEach-Object { $_.TrimStart([char]0xFEFF) } |
    Where-Object { $_.Trim() -ne '' } |
    Where-Object { $l = $_; -not ($managed | Where-Object { $l -match ('^\s*' + $_ + '\s*=') }) })
}
$lines = @("CH_USER=llb_ro", "CH_PASSWORD=$chPw", "GATEWAY_USER=llb", "GATEWAY_PASSWORD=$gwPw") + $keep
[IO.File]::WriteAllText('E:\CH_lit\llb-access.env', (($lines -join "`r`n") + "`r`n"), (New-Object Text.UTF8Encoding $false))
Write-Host '완료. E:\CH_lit\llb-access.env 에 비밀번호가 저장되었습니다(이 파일은 어디에도 올리지 마세요).'
Write-Host '다음: scripts\llb-start.ps1 로 게이트웨이와 터널을 시작합니다.'
