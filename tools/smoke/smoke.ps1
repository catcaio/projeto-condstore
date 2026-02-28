[CmdletBinding()]
param(
  [string]$ConfigPath = (Join-Path $PSScriptRoot "config.ps1")
)

$ErrorActionPreference = "Stop"

$script:Failures = 0

function Write-Section {
  param([string]$Message)
  Write-Host ""
  Write-Host ("== {0} ==" -f $Message)
}

function Write-Ok {
  param([string]$Message)
  Write-Host ("[PASS] {0}" -f $Message) -ForegroundColor Green
}

function Write-Fail {
  param([string]$Message)
  Write-Host ("[FAIL] {0}" -f $Message) -ForegroundColor Red
  $script:Failures++
}

function Write-Warn {
  param([string]$Message)
  Write-Host ("[WARN] {0}" -f $Message) -ForegroundColor Yellow
}

function Write-Info {
  param([string]$Message)
  Write-Host ("[INFO] {0}" -f $Message) -ForegroundColor Cyan
}

function Mask-Secret {
  param([string]$Value)
  if ([string]::IsNullOrEmpty($Value)) {
    return "<empty>"
  }

  $len = $Value.Length
  if ($len -le 8) {
    return ("*" * $len)
  }

  $prefix = $Value.Substring(0, 4)
  $suffix = $Value.Substring($len - 4)
  return ("{0}****{1} (len={2})" -f $prefix, $suffix, $len)
}

function Get-ConfigValue {
  param(
    [string]$Name,
    [string]$Default = $null
  )

  $envValue = (Get-Item -Path "Env:$Name" -ErrorAction SilentlyContinue).Value
  if (-not [string]::IsNullOrEmpty($envValue)) {
    return $envValue
  }

  $var = Get-Variable -Name $Name -ErrorAction SilentlyContinue
  if ($null -ne $var -and -not [string]::IsNullOrEmpty($var.Value)) {
    return $var.Value
  }

  return $Default
}

function Invoke-Request {
  param(
    [string]$Method,
    [string]$Url,
    [hashtable]$Headers = @{},
    [string]$Body = $null,
    [string]$ContentType = $null,
    [int]$TimeoutSec = 15
  )

  $params = @{
    Method = $Method
    Uri = $Url
    Headers = $Headers
    TimeoutSec = $TimeoutSec
    ErrorAction = "Stop"
  }

  if ($null -ne $Body) {
    $params.Body = $Body
  }

  if (-not [string]::IsNullOrEmpty($ContentType)) {
    $params.ContentType = $ContentType
  }

  if ($PSVersionTable.PSVersion.Major -ge 7) {
    $params.SkipHttpErrorCheck = $true
  }

  try {
    $resp = Invoke-WebRequest @params
    return @{
      Status = [int]$resp.StatusCode
      Body = $resp.Content
      Headers = $resp.Headers
    }
  } catch {
    $resp = $_.Exception.Response
    if ($null -ne $resp) {
      $status = 0
      try { $status = [int]$resp.StatusCode } catch { $status = 0 }

      $body = ""
      try {
        $stream = $resp.GetResponseStream()
        if ($null -ne $stream) {
          $reader = New-Object System.IO.StreamReader($stream)
          $body = $reader.ReadToEnd()
          $reader.Close()
        }
      } catch {
        $body = ""
      }

      return @{
        Status = $status
        Body = $body
        Headers = $resp.Headers
        Error = $_.Exception
      }
    }

    throw
  }
}

function Assert-StatusIn {
  param(
    [string]$Name,
    [int]$Actual,
    [int[]]$Expected
  )

  if ($Expected -contains $Actual) {
    Write-Ok ("{0} -> {1}" -f $Name, $Actual)
  } else {
    $expectedText = ($Expected -join ", ")
    Write-Fail ("{0} -> {1} (expected: {2})" -f $Name, $Actual, $expectedText)
  }
}

function Test-SecretLeak {
  param(
    [string]$Name,
    [string]$Body
  )

  if ([string]::IsNullOrEmpty($Body)) {
    return
  }

  $markers = @(
    "TWILIO_AUTH_TOKEN",
    "TWILIO_ACCOUNT_SID",
    "TWILIO_WHATSAPP_NUMBER",
    "INTERNAL_TOKEN",
    "x-internal-token"
  )

  foreach ($marker in $markers) {
    if ($Body -match [regex]::Escape($marker)) {
      Write-Fail ("{0} response contains secret marker: {1}" -f $Name, $marker)
      return
    }
  }
}

function Test-RateLimiterFallback {
  param(
    [string]$Url,
    [int]$Count = 5
  )

  $detected = $false

  for ($i = 1; $i -le $Count; $i++) {
    $resp = Invoke-Request -Method "GET" -Url $Url
    $headers = $resp.Headers

    if ($null -ne $headers) {
      foreach ($key in $headers.Keys) {
        $keyLower = $key.ToString().ToLowerInvariant()
        if ($keyLower -eq "x-rate-limit-fallback" -or $keyLower -eq "x-ratelimit-fallback") {
          $detected = $true
        }

        if ($keyLower -eq "x-rate-limit-mode" -or $keyLower -eq "x-ratelimit-mode") {
          $value = $headers[$key].ToString().ToLowerInvariant()
          if ($value.Contains("fallback")) {
            $detected = $true
          }
        }
      }
    }

    if (-not $detected -and -not [string]::IsNullOrEmpty($resp.Body)) {
      if ($resp.Body -match "rate[_-]?limit" -and $resp.Body -match "fallback") {
        $detected = $true
      }
    }
  }

  if ($detected) {
    Write-Warn "Rate limiter fallback detected (verify logs)."
  } else {
    Write-Info "Rate limiter fallback not detected in recent requests."
  }
}

Write-Section "Load config"

if (Test-Path -Path $ConfigPath) {
  . $ConfigPath
  Write-Info ("Loaded config: {0}" -f $ConfigPath)
} else {
  Write-Info ("Config not found: {0} (using env only)" -f $ConfigPath)
}

$BaseUrl = Get-ConfigValue -Name "BASE_URL" -Default "http://localhost:3000"
$InternalToken = Get-ConfigValue -Name "INTERNAL_TOKEN"
$SeedToken = Get-ConfigValue -Name "SEED_TOKEN"
$TwilioWebhookUrl = Get-ConfigValue -Name "TWILIO_WEBHOOK_URL"
$TenantId = Get-ConfigValue -Name "TENANT_ID"

if ([string]::IsNullOrEmpty($BaseUrl)) {
  Write-Fail "BASE_URL is empty"
  exit 1
}

$BaseUrl = $BaseUrl.TrimEnd("/")

Write-Info ("BASE_URL={0}" -f $BaseUrl)

if ([string]::IsNullOrEmpty($InternalToken)) {
  Write-Warn "INTERNAL_TOKEN is not set"
} else {
  Write-Info ("INTERNAL_TOKEN={0}" -f (Mask-Secret $InternalToken))
}

if (-not [string]::IsNullOrEmpty($SeedToken)) {
  Write-Info ("SEED_TOKEN={0}" -f (Mask-Secret $SeedToken))
}

if (-not [string]::IsNullOrEmpty($TwilioWebhookUrl)) {
  Write-Info ("TWILIO_WEBHOOK_URL={0}" -f $TwilioWebhookUrl)
}

if (-not [string]::IsNullOrEmpty($TenantId)) {
  Write-Info ("TENANT_ID={0}" -f $TenantId)
}

Write-Section "Internal health protection"

$internalDbUrl = "{0}/api/internal/health/db" -f $BaseUrl
$internalQdrantUrl = "{0}/api/internal/health/qdrant" -f $BaseUrl

$resp = Invoke-Request -Method "GET" -Url $internalDbUrl
Assert-StatusIn -Name "A) /api/internal/health/db without token" -Actual $resp.Status -Expected @(401)

if ([string]::IsNullOrEmpty($InternalToken)) {
  Write-Fail "B) INTERNAL_TOKEN missing; cannot validate authorized /api/internal/health/db"
} else {
  $headers = @{ "x-internal-token" = $InternalToken }
  $resp = Invoke-Request -Method "GET" -Url $internalDbUrl -Headers $headers
  Assert-StatusIn -Name "B) /api/internal/health/db with token" -Actual $resp.Status -Expected @(200, 204)
}

$resp = Invoke-Request -Method "GET" -Url $internalQdrantUrl
Assert-StatusIn -Name "C1) /api/internal/health/qdrant without token" -Actual $resp.Status -Expected @(401)

if ([string]::IsNullOrEmpty($InternalToken)) {
  Write-Fail "C2) INTERNAL_TOKEN missing; cannot validate authorized /api/internal/health/qdrant"
} else {
  $headers = @{ "x-internal-token" = $InternalToken }
  $resp = Invoke-Request -Method "GET" -Url $internalQdrantUrl -Headers $headers
  Assert-StatusIn -Name "C2) /api/internal/health/qdrant with token" -Actual $resp.Status -Expected @(200, 204)
}

Write-Section "Seed endpoints blocked outside dev"

$seedAdminUrl = "{0}/api/auth/seed-admin" -f $BaseUrl
$seedReportsUrl = "{0}/api/reports/seed" -f $BaseUrl

$seedPayload = "{}"
if (-not [string]::IsNullOrEmpty($SeedToken)) {
  $seedPayload = @{ seedToken = $SeedToken } | ConvertTo-Json -Compress
}

$resp = Invoke-Request -Method "POST" -Url $seedAdminUrl -Body $seedPayload -ContentType "application/json"
Assert-StatusIn -Name "D) /api/auth/seed-admin blocked" -Actual $resp.Status -Expected @(403, 404)

$resp = Invoke-Request -Method "POST" -Url $seedReportsUrl -Body "{}" -ContentType "application/json"
Assert-StatusIn -Name "E) /api/reports/seed blocked" -Actual $resp.Status -Expected @(403, 404)

Write-Section "Public health"

$healthUrl = "{0}/api/health" -f $BaseUrl
$resp = Invoke-Request -Method "GET" -Url $healthUrl
Assert-StatusIn -Name "F) /api/health" -Actual $resp.Status -Expected @(200)
Test-SecretLeak -Name "/api/health" -Body $resp.Body

Write-Section "Twilio webhook (optional)"

if (-not [string]::IsNullOrEmpty($TwilioWebhookUrl)) {
  $twilioBody = "Body=smoke&From=whatsapp%3A%2B000000000&To=whatsapp%3A%2B000000000&SmsSid=SM00000000000000000000000000000000"
  $resp = Invoke-Request -Method "POST" -Url $TwilioWebhookUrl -Body $twilioBody -ContentType "application/x-www-form-urlencoded"

  if ($resp.Status -ge 500 -or $resp.Status -le 0) {
    Write-Fail ("Twilio webhook returned {0}" -f $resp.Status)
  } else {
    Write-Ok ("Twilio webhook returned {0} (non-5xx)" -f $resp.Status)
  }

  Test-SecretLeak -Name "Twilio webhook" -Body $resp.Body
} else {
  Write-Info "TWILIO_WEBHOOK_URL not set; skipping Twilio webhook check"
}

Write-Section "Rate limiter fallback (informational)"
Test-RateLimiterFallback -Url $healthUrl -Count 5

Write-Section "Summary"

if ($script:Failures -eq 0) {
  Write-Ok "Smoke tests passed"
  exit 0
}

Write-Fail ("Smoke tests failed with {0} failure(s)" -f $script:Failures)
exit 1
