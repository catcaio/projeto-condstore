#!/usr/bin/env bash

set -u

FAILURES=0

section() {
  echo
  echo "== $1 =="
}

ok() {
  echo "[PASS] $1"
}

fail() {
  echo "[FAIL] $1"
  FAILURES=$((FAILURES + 1))
}

warn() {
  echo "[WARN] $1"
}

info() {
  echo "[INFO] $1"
}

mask_secret() {
  local value="$1"
  if [ -z "$value" ]; then
    echo "<empty>"
    return
  fi

  local len=${#value}
  if [ "$len" -le 8 ]; then
    printf '%*s' "$len" '' | tr ' ' '*'
    return
  fi

  local prefix=${value:0:4}
  local suffix=${value: -4}
  echo "${prefix}****${suffix} (len=${len})"
}

require_curl() {
  if ! command -v curl >/dev/null 2>&1; then
    fail "curl not found"
    summary_and_exit
  fi
}

RESPONSE_BODY=""
RESPONSE_HEADERS=""

curl_request() {
  local method="$1"
  local url="$2"
  local data="${3:-}"
  local content_type="${4:-}"
  shift 4 || true
  local headers=("$@")

  local body_file
  body_file=$(mktemp)
  local headers_file
  headers_file=$(mktemp)

  local args=(-sS -D "$headers_file" -o "$body_file" -w "%{http_code}" -X "$method")
  if [ -n "$content_type" ]; then
    args+=( -H "Content-Type: $content_type" )
  fi

  for header in "${headers[@]}"; do
    if [ -n "$header" ]; then
      args+=( -H "$header" )
    fi
  done

  if [ -n "$data" ]; then
    args+=( --data "$data" )
  fi

  local status
  status=$(curl "${args[@]}" "$url" 2>/dev/null || echo "000")

  RESPONSE_BODY=$(cat "$body_file" 2>/dev/null || true)
  RESPONSE_HEADERS=$(cat "$headers_file" 2>/dev/null || true)

  rm -f "$body_file" "$headers_file"
  echo "$status"
}

assert_status_in() {
  local name="$1"
  local actual="$2"
  shift 2
  local expected=("$@")

  for code in "${expected[@]}"; do
    if [ "$actual" = "$code" ]; then
      ok "$name -> $actual"
      return
    fi
  done

  local expected_text
  expected_text=$(IFS=","; echo "${expected[*]}")
  fail "$name -> $actual (expected: $expected_text)"
}

test_secret_leak() {
  local name="$1"
  local body="$2"

  if [ -z "$body" ]; then
    return
  fi

  local markers=(
    "TWILIO_AUTH_TOKEN"
    "TWILIO_ACCOUNT_SID"
    "TWILIO_WHATSAPP_NUMBER"
    "INTERNAL_TOKEN"
    "x-internal-token"
  )

  for marker in "${markers[@]}"; do
    if echo "$body" | grep -q "$marker"; then
      fail "$name response contains secret marker: $marker"
      return
    fi
  done
}

test_rate_limiter_fallback() {
  local url="$1"
  local count="${2:-5}"
  local detected=0

  local i=1
  while [ "$i" -le "$count" ]; do
    local status
    status=$(curl_request "GET" "$url" "" "")
    if echo "$RESPONSE_HEADERS" | grep -i -q "x-rate-limit-fallback"; then
      detected=1
    fi
    if echo "$RESPONSE_HEADERS" | grep -i -q "x-rate-limit-mode:.*fallback"; then
      detected=1
    fi
    if [ "$detected" -eq 0 ] && echo "$RESPONSE_BODY" | grep -i -q "rate" && echo "$RESPONSE_BODY" | grep -i -q "fallback"; then
      detected=1
    fi
    i=$((i + 1))
  done

  if [ "$detected" -eq 1 ]; then
    warn "Rate limiter fallback detected (verify logs)."
  else
    info "Rate limiter fallback not detected in recent requests."
  fi
}

summary_and_exit() {
  section "Summary"
  if [ "$FAILURES" -eq 0 ]; then
    ok "Smoke tests passed"
    exit 0
  fi

  fail "Smoke tests failed with $FAILURES failure(s)"
  exit 1
}

require_curl

section "Load config"

BASE_URL=${BASE_URL:-"http://localhost:3000"}
INTERNAL_TOKEN=${INTERNAL_TOKEN:-""}
SEED_TOKEN=${SEED_TOKEN:-""}
TWILIO_WEBHOOK_URL=${TWILIO_WEBHOOK_URL:-""}
TENANT_ID=${TENANT_ID:-""}

BASE_URL=${BASE_URL%/}

info "BASE_URL=$BASE_URL"

if [ -z "$INTERNAL_TOKEN" ]; then
  warn "INTERNAL_TOKEN is not set"
else
  info "INTERNAL_TOKEN=$(mask_secret "$INTERNAL_TOKEN")"
fi

if [ -n "$SEED_TOKEN" ]; then
  info "SEED_TOKEN=$(mask_secret "$SEED_TOKEN")"
fi

if [ -n "$TWILIO_WEBHOOK_URL" ]; then
  info "TWILIO_WEBHOOK_URL=$TWILIO_WEBHOOK_URL"
fi

if [ -n "$TENANT_ID" ]; then
  info "TENANT_ID=$TENANT_ID"
fi

section "Internal health protection"

internal_db_url="$BASE_URL/api/internal/health/db"
internal_qdrant_url="$BASE_URL/api/internal/health/qdrant"

status=$(curl_request "GET" "$internal_db_url" "" "")
assert_status_in "A) /api/internal/health/db without token" "$status" "401"

if [ -z "$INTERNAL_TOKEN" ]; then
  fail "B) INTERNAL_TOKEN missing; cannot validate authorized /api/internal/health/db"
else
  status=$(curl_request "GET" "$internal_db_url" "" "" "x-internal-token: $INTERNAL_TOKEN")
  assert_status_in "B) /api/internal/health/db with token" "$status" "200" "204"
fi

status=$(curl_request "GET" "$internal_qdrant_url" "" "")
assert_status_in "C1) /api/internal/health/qdrant without token" "$status" "401"

if [ -z "$INTERNAL_TOKEN" ]; then
  fail "C2) INTERNAL_TOKEN missing; cannot validate authorized /api/internal/health/qdrant"
else
  status=$(curl_request "GET" "$internal_qdrant_url" "" "" "x-internal-token: $INTERNAL_TOKEN")
  assert_status_in "C2) /api/internal/health/qdrant with token" "$status" "200" "204"
fi

section "Seed endpoints blocked outside dev"

seed_admin_url="$BASE_URL/api/auth/seed-admin"
seed_reports_url="$BASE_URL/api/reports/seed"

seed_payload="{}"
if [ -n "$SEED_TOKEN" ]; then
  seed_payload="{\"seedToken\":\"$SEED_TOKEN\"}"
fi

status=$(curl_request "POST" "$seed_admin_url" "$seed_payload" "application/json")
assert_status_in "D) /api/auth/seed-admin blocked" "$status" "403" "404"

status=$(curl_request "POST" "$seed_reports_url" "{}" "application/json")
assert_status_in "E) /api/reports/seed blocked" "$status" "403" "404"

section "Public health"

health_url="$BASE_URL/api/health"
status=$(curl_request "GET" "$health_url" "" "")
assert_status_in "F) /api/health" "$status" "200"

test_secret_leak "/api/health" "$RESPONSE_BODY"

section "Twilio webhook (optional)"

if [ -n "$TWILIO_WEBHOOK_URL" ]; then
  twilio_body="Body=smoke&From=whatsapp%3A%2B000000000&To=whatsapp%3A%2B000000000&SmsSid=SM00000000000000000000000000000000"
  status=$(curl_request "POST" "$TWILIO_WEBHOOK_URL" "$twilio_body" "application/x-www-form-urlencoded")
  if [ "$status" -ge 500 ] || [ "$status" -le 0 ]; then
    fail "Twilio webhook returned $status"
  else
    ok "Twilio webhook returned $status (non-5xx)"
  fi
  test_secret_leak "Twilio webhook" "$RESPONSE_BODY"
else
  info "TWILIO_WEBHOOK_URL not set; skipping Twilio webhook check"
fi

section "Rate limiter fallback (informational)"

test_rate_limiter_fallback "$health_url" 5

summary_and_exit
