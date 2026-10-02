# Supabase key check (ASCII only). Prints the HTTP result, never the key.
$envFile = 'E:\CH_lit\llb-access.env'
$map = @{}
Get-Content $envFile -Encoding UTF8 | ForEach-Object {
  $l = $_.TrimStart([char]0xFEFF).Trim()
  if ($l -match '^(\w+)\s*=\s*(.*)$') { $map[$Matches[1]] = $Matches[2].Trim() }
}
$url = $map['SUPABASE_URL']; $key = $map['SUPABASE_SERVICE_ROLE_KEY']
"url      : $url"
"key shape: starts with sb_secret_ = $($key.StartsWith('sb_secret_')) ; starts with sb_publishable_ = $($key.StartsWith('sb_publishable_')) ; starts with eyJ = $($key.StartsWith('eyJ')) ; length = $($key.Length)"
$h = @{ apikey = $key }
if ($key.StartsWith('eyJ')) { $h['Authorization'] = "Bearer $key" }
try {
  $r = Invoke-WebRequest "$url/rest/v1/llb_endpoint?select=*" -Headers $h -UseBasicParsing
  "RESULT   : HTTP $($r.StatusCode)  body=$($r.Content)"
} catch {
  $code = $_.Exception.Response.StatusCode.value__
  $body = ''
  try { $body = (New-Object IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd() } catch {}
  "RESULT   : HTTP $code  body=$body"
}
