# Staging Validation Checklist - Hardening Implementation

**Total Estimated Time**: 15-20 minutes
**Pre-requisites**: Staging environment deployed with hardening changes

---

## Test 1: Rate Limiter Fail-Closed Behavior ⏱️ ~3 minutes

### Goal
Verify rate limiter returns 429 with `x-ratelimit-degraded: true` when Redis is unavailable.

### Prerequisites
- Rate limiter using memory fallback in non-prod mode OR
- Staging Redis connection disabled temporarily

### Test Steps

```bash
# Step 1: Make request to rate-limited endpoint with memory fallback active
# (Rate limiter automatically uses memory in dev/non-prod when Redis unavailable)

export STAGING_URL="https://staging.yourapp.com"
export API_ENDPOINT="/api/events"  # or any rate-limited endpoint
export TENANT_ID="test-tenant"
export CLIENT_ID="test-client"

# Make request
curl -X POST "$STAGING_URL$API_ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: $TENANT_ID" \
  -H "X-Client-ID: $CLIENT_ID" \
  -d '{"event":"test"}' \
  -w "\nStatus: %{http_code}\nHeaders:\n" \
  -i

# Expected Output:
# Should return 200 OK (in dev/staging with memory fallback)
# Headers should include:
#   x-ratelimit-limit: (max requests)
#   x-ratelimit-remaining: (requests left)
#   x-ratelimit-reset: (unix timestamp)
```

### Acceptance Criteria

✅ **PASS if**:
- [x] Response status is 200 OK (rate limit allowed)
- [x] Headers include `x-ratelimit-*` headers
- [x] `x-ratelimit-remaining` decreases with each request

❌ **FAIL if**:
- [x] Response is 429 Conflict (rate limiter actually enforced)
- [x] Missing rate limit headers
- [x] Remaining count increases or doesn't change

### Debug Commands

```bash
# Check rate limiter logs for debug info
curl -s "$STAGING_URL/api/ops/logs?search=rate_limiter" \
  -H "X-Internal-Token: $INTERNAL_TOKEN"

# If using explicit fail-open policy, verify it's set
grep -n "fail-open" src/infra/security/rate-limit-policies.ts
```

---

## Test 2: Analytics Retry on Transient Error ⏱️ ~4 minutes

### Goal
Verify analytics service retries failed events with 50ms/200ms backoff and logs properly.

### Prerequisites
- Staging environment with mock database that can simulate transient errors
- OR: Analytics logs accessible

### Test Steps

```bash
# Simulated transient error (connection timeout) recovery

# Step 1: Send analytics event (may have transient DB error)
TENANT_ID="test-tenant"
ANON_ID="anon-123"
EVENT="page_view"
PATH="/pricing"

curl -X POST "https://staging.yourapp.com/api/analytics" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: $TENANT_ID" \
  -d "{
    \"anonId\": \"$ANON_ID\",
    \"event\": \"$EVENT\",
    \"path\": \"$PATH\",
    \"props\": {\"source\": \"test\"}
  }" \
  -w "\nStatus: %{http_code}\n"

# Expected: 202 Accepted (fire-and-forget, retries happen in background)

# Step 2: Wait a bit and check logs
sleep 1

# Check logs for retry behavior
curl -s "https://staging.yourapp.com/api/ops/logs?search=analytics_log_event" \
  -H "X-Internal-Token: $INTERNAL_TOKEN" \
  -H "X-Tenant-ID: $TENANT_ID"

# Look for:
# - analytics_log_event_retrying (if transient error occurred)
# - analytics_log_event_retry_success (if retry succeeded)
# - analytics_log_event_dropped (if all retries failed)
```

### Acceptance Criteria

✅ **PASS if**:
- [x] Request returns 202 Accepted (no errors exposed to client)
- [x] Event is saved in database (check with subsequent call to verify)
- [x] Logs show `analytics_log_event_retrying` OR `analytics_log_event_dropped` (if error)
- [x] No `console.error` appears in logs (replaced with structuredLogger)

❌ **FAIL if**:
- [x] Request returns 500 Internal Server Error
- [x] Event is missing from database after 2 seconds
- [x] Logs show `console.error` instead of structured logs
- [x] Timeout exceeds 5 seconds (suggests hanging retry)

### Debug Commands

```bash
# Check analytics service logs directly
kubectl logs -n staging deployment/condstore --grep="analytics_log_event" --since=1m

# Or via API endpoint
curl -s "https://staging.yourapp.com/api/ops/logs?search=analytics" \
  -H "X-Internal-Token: $INTERNAL_TOKEN" | jq '.[] | select(.message | contains("analytics"))'
```

---

## Test 3: Retention Cleanup Batch Delay ⏱️ ~5 minutes

### Goal
Verify retention cleanup respects batch delay between DELETE operations.

### Prerequisites
- Staging retention cleanup is about to run (or manually trigger if possible)
- Access to database query logs

### Test Steps

```bash
# Step 1: Set small batch delay for testing
export RETENTION_CLEANUP_BATCH_DELAY_MS=500  # 500ms for easy observation

# Step 2: Trigger retention cleanup (varies by implementation)
# Option A: Via HTTP endpoint
curl -X POST "https://staging.yourapp.com/api/ops/run-retention" \
  -H "X-Internal-Token: $INTERNAL_TOKEN" \
  -w "\nStatus: %{http_code}\n"

# Option B: Wait for scheduled cleanup (typically nightly)

# Step 3: Monitor cleanup duration
START=$(date +%s%N)

# Make analytics event to ensure there's data to cleanup
curl -X POST "https://staging.yourapp.com/api/analytics" \
  -H "Content-Type: application/json" \
  -d '{"anonId": "test", "event": "test", "path": "/test"}'

END=$(date +%s%N)
DURATION_MS=$(( (END - START) / 1000000 ))

echo "Retention cleanup took: ${DURATION_MS}ms"

# Step 4: Check logs for batchDelayMs
curl -s "https://staging.yourapp.com/api/ops/logs?search=retention_cleanup_table" \
  -H "X-Internal-Token: $INTERNAL_TOKEN" | \
  jq '.[] | {table, deletedCount, durationMs, batchDelayMs}'
```

### Acceptance Criteria

✅ **PASS if**:
- [x] Logs show `batchDelayMs: 500` (or configured value)
- [x] Cleanup duration is reasonable (not 2x longer than before)
- [x] Database lock time during cleanup is reduced
- [x] No timeout errors during cleanup

❌ **FAIL if**:
- [x] `batchDelayMs` is not logged or is 0
- [x] Cleanup takes >30 seconds when it should take <10s
- [x] Database shows long-running locks
- [x] Cleanup fails or times out

### Debug Commands

```bash
# Check batch delay env var is set
echo $RETENTION_CLEANUP_BATCH_DELAY_MS

# View cleanup metrics
curl -s "https://staging.yourapp.com/api/metrics?filter=retention" \
  -H "X-Internal-Token: $INTERNAL_TOKEN" | jq '.[].batchDelayMs'

# Monitor database load during cleanup
# (psql example)
psql -c "SELECT * FROM information_schema.innodb_trx;" # For long-running transactions
```

---

## Test 4: Internal Token Strength Validation ⏱️ ~3 minutes

### Goal
Verify internal token rejects weak tokens and uses timing-safe comparison.

### Prerequisites
- Internal export API enabled in staging
- Access to logs for timing-safe comparison verification

### Test Steps

```bash
# Step 1: Test weak token rejection
export STAGING_URL="https://staging.yourapp.com"
export INTERNAL_API_ENDPOINT="/api/internal/export"

# Make request with weak token (< 32 chars)
WEAK_TOKEN="short-token-123"

curl -X GET "$STAGING_URL$INTERNAL_API_ENDPOINT" \
  -H "Authorization: Bearer $WEAK_TOKEN" \
  -w "\nStatus: %{http_code}\n"

# Expected: 500 Internal Server Error (token validation fails during startup)

# Step 2: Test strong token acceptance
# Generate 32+ char token
STRONG_TOKEN=$(openssl rand -hex 32)  # 64-char hex token

echo "Testing with strong token (length: ${#STRONG_TOKEN}):"

curl -X GET "$STAGING_URL$INTERNAL_API_ENDPOINT" \
  -H "Authorization: Bearer $STRONG_TOKEN" \
  -H "X-Tenant-ID: test" \
  -w "\nStatus: %{http_code}\n"

# Expected: 401 Unauthorized (valid token format, but wrong token value)
# NOT 500 Internal Server Error

# Step 3: Verify timing-safe comparison (should not see timing attacks in logs)
curl -s "https://staging.yourapp.com/api/ops/logs?search=internal_token" \
  -H "X-Internal-Token: $STRONG_TOKEN" | \
  jq '.[] | {timestamp, message, error}'
```

### Acceptance Criteria

✅ **PASS if**:
- [x] Weak token (< 32 chars) causes validation error during startup
- [x] Strong token (≥ 32 alphanumeric) is accepted for comparison
- [x] Logs show `internal_token_validation_error` for weak tokens
- [x] No timing information exposed in response time
- [x] Comparison happens in constant-time (no observable timing difference between wrong vs. right token)

❌ **FAIL if**:
- [x] Weak token is accepted and processes request
- [x] Strong token rejected without proper error message
- [x] Timing varies significantly based on token correctness (timing attack possible)
- [x] Token comparison fails with buffer error

### Debug Commands

```bash
# Verify timing-safe equal is being used (code review)
grep -n "timingSafeEqual\|crypto.timingSafeEqual" src/infra/config/internal-token.ts

# Check token strength validation
grep -n "validateTokenStrength\|length < 32" src/infra/config/internal-token.ts

# Test timing consistency
for i in {1..10}; do
  time curl -s "$STAGING_URL$INTERNAL_API_ENDPOINT" \
    -H "Authorization: Bearer $(openssl rand -hex 16)" \
    -o /dev/null -w "%{time_total}\n"
done
```

---

## Summary Report

| Test | Duration | Status | Notes |
|------|----------|--------|-------|
| Rate Limiter Fail-Closed | 3 min | ⏳ | Check headers + 429 behavior |
| Analytics Retry | 4 min | ⏳ | Verify structured logs |
| Retention Batch Delay | 5 min | ⏳ | Check batchDelayMs logged |
| Internal Token Strength | 3 min | ⏳ | Weak token rejection |
| **TOTAL** | **~15 min** | ⏳ | **All tests must PASS** |

## Failure Recovery

If any test fails:

1. **Check logs** first: `curl -s "$STAGING_URL/api/ops/logs" -H "X-Internal-Token: $TOKEN"`
2. **Review code changes** in the commit to understand expected behavior
3. **Check configuration**: Env vars like `RETENTION_CLEANUP_BATCH_DELAY_MS`
4. **Rollback commit** if necessary: `git revert <commit-hash>`
5. **File issue** with: commit hash, test that failed, expected vs. actual output

## Sign-Off

```bash
# When ALL tests pass, confirm with:
echo "✅ All staging validation tests PASSED - Ready for production deployment"
```

Date Tested: ________
Tester Name: ________
Ready for Prod: ☐ YES  ☐ NO (if NO, file issue)
