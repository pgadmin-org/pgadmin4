#!/usr/bin/env bash
#
# Verify the incremental-walker canary tree-shakes out of the
# non-canary production bundle. Required gate before flipping the
# walker on globally — if the canary leaks into prod, every user pays
# the 2x walk cost AND the bundle ships ~7 KiB of dead audit code.
#
# Run from web/:
#   ./scripts/verify-canary-treeshake.sh
#
# Exits 0 on clean tree-shake, non-zero on any canary symbol detected
# in the prod bundle.

set -euo pipefail

cd "$(dirname "$0")/.."

BUNDLE_DIR="pgadmin/static/js/generated"
BUNDLE="$BUNDLE_DIR/app.bundle.js"

if [ ! -f "$BUNDLE" ]; then
  echo "ERROR: $BUNDLE not found. Run a production build first:" >&2
  echo "  NODE_ENV=production yarn run webpacker" >&2
  echo "Note: CANARY_BUILD must be UNSET for this check." >&2
  exit 2
fi

# Symbols that ONLY exist in the canary module. If any of these appear
# in the non-canary bundle, the build-time gate (DefinePlugin substituting
# process.env.__CANARY_BUILD__ to literal `false`) failed and webpack
# kept the dead branch.
SYMBOLS=(
  "runOptionsCanary"
  "runValidationCanary"
  "formatDivergence"
  "applyAllowlist"
  "__throw_on_canary_divergence__"
)

fail=0
for sym in "${SYMBOLS[@]}"; do
  if grep -q "$sym" "$BUNDLE"; then
    echo "FAIL: canary symbol '$sym' found in $BUNDLE" >&2
    fail=1
  fi
done

if [ $fail -ne 0 ]; then
  echo >&2
  echo "Canary code leaked into production bundle. Check:" >&2
  echo "  1. CANARY_BUILD env var is UNSET for this build." >&2
  echo "  2. webpack DefinePlugin still substitutes a LITERAL boolean," >&2
  echo "     not JSON.stringify(false) — the latter yields the string" >&2
  echo "     'false' which is truthy and defeats DCE." >&2
  exit 1
fi

size=$(stat -f %z "$BUNDLE" 2>/dev/null || stat -c %s "$BUNDLE")
echo "OK: canary tree-shaken cleanly. app.bundle.js size: $size bytes."
