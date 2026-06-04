# Visual regression smoke for SchemaView dialogs

`audit-visual-regression.spec.js` snapshots 5 high-impact dialogs and diffs
against committed baselines on subsequent runs. The walker canary catches
**logic** divergences; this catches **rendering** divergences the canary
can't see (CSS regressions, layout shifts, missing visual states).

## How Playwright snapshot diffing works

`expect(...).toHaveScreenshot('name.png', ...)`:

- **First run** (no baseline): captures the PNG into
  `audit-visual-regression.spec.js-snapshots/` (only with `--update-snapshots`).
- **Subsequent runs**: pixel-diffs against the baseline; fails on drift
  beyond the configured `threshold` + `maxDiffPixels`.

Sensitivity knobs live in `SCREENSHOT_OPTS` at the top of the spec.

## Important environment caveats

Baselines are **not portable across environments**. Re-capture whenever
any of these change:

| Variable | Why it matters |
|---|---|
| **OS** (darwin / linux / windows) | Sub-pixel font hinting + anti-aliasing differ. macOS baselines guaranteed-fail on Linux. |
| **Browser version** | Chrome rendering shifts sub-pixel positions between major versions. Pin the Playwright `chromium` install. |
| **PG server version** | Some dialogs (Type, Tablespace) show different fields by server version. |

The committed baselines were captured on **darwin**. A `test.beforeEach`
hook in the spec auto-skips the visual specs on non-darwin so a fresh
checkout doesn't unconditionally fail in CI. Remove the skip after
capturing platform-specific baselines.

## Workflow: capture baselines on the PR branch

Capture baselines **on the PR branch you're validating**, not on master.
The spec file itself is new, so it doesn't exist on master — there's no
baseline-on-master workflow that doesn't require porting the spec first
(which loses the point).

```bash
# 1. Start pgAdmin with a canary build (so the walker canary runs).
cd web
CANARY_BUILD=true NODE_ENV=production \
  ./node_modules/.bin/webpack --config webpack.config.js
python pgAdmin4.py &
sleep 6

# 2. Capture baselines (writes PNGs).
cd regression/perf-bench
PGADMIN_URL=http://127.0.0.1:5050/browser/ \
  ./node_modules/.bin/playwright test audit-visual-regression \
  --update-snapshots --workers=1

# 3. Commit the snapshot dir.
git add audit-visual-regression.spec.js-snapshots/
git commit -m "test(perf-bench): visual regression baselines"
```

## Workflow: diff against baselines

Run without `--update-snapshots`. Any pixel diff beyond
`threshold`/`maxDiffPixels` fails the test.

```bash
# Restart pgAdmin with current branch's code.
pkill -f pgAdmin4.py 2>/dev/null || true
cd web && CANARY_BUILD=true NODE_ENV=production \
  ./node_modules/.bin/webpack --config webpack.config.js
python pgAdmin4.py &
sleep 6

# Run the diff.
cd regression/perf-bench
PGADMIN_URL=http://127.0.0.1:5050/browser/ \
  ./node_modules/.bin/playwright test audit-visual-regression --workers=1
```

On failure, Playwright writes three PNGs under `test-results/<test-name>/`:

- `<name>-expected.png` (committed baseline)
- `<name>-actual.png` (current run)
- `<name>-diff.png` (pixel-overlay of the difference)

## Validating a PR doesn't regress vs. master visually

The robust pattern:

1. Capture baselines on the **merge-base** (master at the time of branch).
2. Re-run on the PR branch's HEAD.
3. Any diff = the PR introduced a visual change.

Concretely, with a one-time port of the spec to a temp branch off master:

```bash
# Set up a temp branch off master that has the spec file but pre-PR code.
git fetch origin master
git checkout -b _vr-baseline origin/master
git checkout dev/your-PR -- web/regression/perf-bench/audit-visual-regression.spec.js \
                           web/regression/perf-bench/audit-helpers.js
# Capture baselines on master's code with the PR's spec.
# ... (build + capture per above)
git add web/regression/perf-bench/audit-visual-regression.spec.js-snapshots/
git commit -m "baseline capture on master"

# Port the captured baselines onto the PR branch.
git checkout dev/your-PR
git checkout _vr-baseline -- web/regression/perf-bench/audit-visual-regression.spec.js-snapshots/

# Now run the diff on the PR's code.
# ... (rebuild + run per above)
```

This is fiddly because the spec is new to the PR. Once the spec lives
on master, future PRs use the simple capture-on-master → diff-on-PR
pattern with a plain `git cherry-pick` of the snapshot commit.

## When a diff is intentional

If a PR is supposed to change rendering (MUI bump, restyling), update
baselines:

```bash
./node_modules/.bin/playwright test audit-visual-regression --update-snapshots
git add audit-visual-regression.spec.js-snapshots/
git commit -m "test(perf-bench): update visual baselines for <reason>"
```

Reviewers can inspect the new baseline PNGs in the diff.

## Dialog coverage

| Spec | Why this dialog |
|---|---|
| Edit Table | Heaviest SchemaView dialog. Vacuum settings, columns, constraints, partition tabs all on one screen. Walker stress + cross-tab data flow. |
| Create Function | Function/Arguments collection + restricted return types via deps. |
| Create Type | Composite/Enum/Range/Shell sub-schema routing — default composite shape. |
| Edit Role | Server-level node (different parent path). Privileges + Membership grids. |
| Create Index (under table) | Sub-catalog node + `amname` deferredDepChange (one of this PR's protocol-aligned schemas) + with-clause nested-fieldset. |

These five span: schema-level / sub-catalog / server-level node parents,
deferred-dep schemas, multi-tab + multi-collection layouts, and the
heaviest single dialog in pgAdmin.

## Things that AREN'T covered (intentional)

- **SQL preview tab**: CodeMirror cursor + content vary subtly; masking
  is brittle. Use the cross-tab specs in `dev/table-dialog-tests` to
  verify SQL generation textually, not via visual diff.
- **Animation states**: dialogs animate in. Snapshots wait for settle.
- **Hover / focus / tooltip states**: state-dependent, not visual-baseline
  worthy.
- **Every dialog × every tab**: would balloon baselines to 100+. Five
  carefully-chosen dialogs catch the rendering paths that matter.

## Limitations to migrate away from

1. **Single-platform baselines**: see the `test.beforeEach` skip in the
   spec. Long-term fix is `snapshotPathTemplate` in `playwright.config.js`
   keyed by `{platform}` so each OS has its own directory.
2. **Capture is manual**: ideally CI does the capture-on-master step and
   commits the baselines back. Today it's developer-driven.
