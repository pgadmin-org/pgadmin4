#!/usr/bin/env bash
# Verify canary code is dead-code-eliminated from the production bundle.
#
# When webpack builds with CANARY_BUILD unset/false, the DefinePlugin
# substitutes process.env.__CANARY_BUILD__ → literal `false`. The
# canary branch in registry.js's schemaOptionsEvalulator wrapper is
# then dead-code-eliminated, and the `import { runOptionsCanary }
# from './canary'` becomes an unused import that webpack tree-shakes
# out. The production bundle should contain ZERO strings from canary.js.
#
# Usage:
#   ./verify-canary-tree-shake.sh
#
# Exits 0 if production bundle is clean; non-zero otherwise.
#
# Not a jest test because building the production bundle takes ~70s —
# too slow for the JS test suite. CI can invoke it as a separate
# post-bundle step.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
BUNDLE_PATH="${WEB_DIR}/pgadmin/static/js/generated/app.bundle.js"

# Strings unique to the canary modules. If any appears in the
# production bundle, DCE didn't fire.
#
# Two canary modules: options/canary.js (incremental options walker)
# and SchemaState/validation_canary.js (incremental validator walker).
# Both must tree-shake. Shared sentinels catch either; module-unique
# sentinels (e.g. "_resetValidationCanaryFireCount") catch one.
SENTINELS=(
  "canary:incremental-divergence"
  "Incremental walker divergence in"
  "Incremental validator divergence in"
  "__incremental_canary_max_per_session__"
  "__throw_on_canary_divergence__"
  "__incremental_canary_endpoint__"
  "_resetCanaryFireCount"
  "_resetValidationCanaryFireCount"
)

echo "Building production bundle (CANARY_BUILD unset)..."
echo "  WEB_DIR=${WEB_DIR}"

cd "${WEB_DIR}"
unset CANARY_BUILD
NODE_ENV=production NODE_OPTIONS=--max-old-space-size=6144 \
  ./node_modules/.bin/webpack --config webpack.config.js > /tmp/canary-verify-build.log 2>&1 || {
  echo "FAIL: webpack build failed"
  echo "  See /tmp/canary-verify-build.log for details"
  tail -20 /tmp/canary-verify-build.log
  exit 2
}

if [ ! -f "${BUNDLE_PATH}" ]; then
  echo "FAIL: bundle not found at ${BUNDLE_PATH}"
  exit 3
fi

echo "Scanning ${BUNDLE_PATH} for canary sentinels..."
FAILED=0
for sentinel in "${SENTINELS[@]}"; do
  if grep -q -F "${sentinel}" "${BUNDLE_PATH}"; then
    echo "  FAIL: found '${sentinel}' in production bundle"
    FAILED=1
  else
    echo "  OK:   '${sentinel}' not present"
  fi
done

if [ $FAILED -ne 0 ]; then
  echo ""
  echo "FAIL: production bundle contains canary code. DefinePlugin or DCE"
  echo "      isn't working. Check webpack.config.js's canaryDefinePlugin"
  echo "      substitution (must be a literal boolean, not JSON.stringify'd)."
  exit 1
fi

echo ""
echo "PASS: production bundle is canary-free."
exit 0
