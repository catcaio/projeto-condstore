#!/bin/bash
# CONDSTORE OS — Local Quality Gates (Bash)
# Run this before pushing to verify all guardrails pass.
# Usage: bash tools/gates/gates.sh

set -euo pipefail

echo "========================================"
echo " CONDSTORE OS — Quality Gates"
echo "========================================"

run_gate() {
    local name="$1"
    local cmd="$2"
    echo ""
    echo ">> Gate: $name"
    if eval "$cmd"; then
        echo "PASSED: $name"
    else
        echo "FAILED: $name"
        exit 1
    fi
}

run_gate "TypeCheck" "npm run typecheck"
run_gate "Lint" "npm run lint"
run_gate "Test:CI" "npm run test:ci"
run_gate "Build" "npm run build"

# Optional gates (run only if scripts exist)
if [ -f "scripts/routes-verify.ts" ]; then
    run_gate "Routes Verify" "npm run routes:verify"
fi
if [ -f "scripts/check-env-leak.mjs" ]; then
    run_gate "Env Leak Check" "node scripts/check-env-leak.mjs"
fi

echo ""
echo "========================================"
echo " ALL GATES PASSED"
echo "========================================"
