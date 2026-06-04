# Visual regression smoke for SchemaView dialogs

`audit-visual-regression.spec.js` snapshots 5 high-impact dialogs and diffs
against committed baselines on subsequent runs. The canary catches
**walker** divergences; this catches **rendering** divergences the canary
can't see (CSS regressions, layout shifts, missing visual states).

## How it works

Playwright's `expect(...).toHaveScreenshot('name.png', ...)`:

- **First run** (no baseline): auto-captures the PNG into
  `audit-visual-regression.spec.js-snapshots/`.
- **Subsequent runs**: diff against the baseline; fail on visual drift.

Threshold settings inside the spec (0.01 pixel-diff allowance, animations
disabled) are tuned for cross-machine reproducibility (CI Linux vs dev
macOS).

## Workflow: validate a PR against master

The goal is to verify a PR's SchemaView changes don't break rendering vs
the pre-PR state on master.

### Step 1 — capture baselines on master

```bash
git checkout master
cd web && CANARY_BUILD=true NODE_ENV=production \
  ./node_modules/.bin/webpack --config webpack.config.js
python pgAdmin4.py &
sleep 6
cd regression/perf-bench
PGADMIN_URL=http://127.0.0.1:5050/browser/ \
  ./node_modules/.bin/playwright test audit-visual-regression \
  --update-snapshots --workers=1
```

Auto-captured PNGs land in
`web/regression/perf-bench/audit-visual-regression.spec.js-snapshots/`.

```bash
git add web/regression/perf-bench/audit-visual-regression.spec.js-snapshots/
git commit -m "test(perf-bench): visual regression baselines (captured on master)"
```

### Step 2 — apply to PR

```bash
# Cherry-pick the snapshot commit onto the PR branch
git checkout dev/your-PR-branch
git cherry-pick <SHA-of-snapshot-commit>
```

Or stash the directory and apply it on the PR branch via copy:

```bash
cp -r web/regression/perf-bench/audit-visual-regression.spec.js-snapshots \
   /tmp/visual-baselines
git checkout dev/your-PR-branch
cp -r /tmp/visual-baselines \
   web/regression/perf-bench/audit-visual-regression.spec.js-snapshots
git add ... && git commit ...
```

### Step 3 — run on PR

```bash
# Rebuild with the PR's code in place
cd web && CANARY_BUILD=true NODE_ENV=production \
  ./node_modules/.bin/webpack --config webpack.config.js
kill $(lsof -ti :5050)
python pgAdmin4.py &
sleep 6
cd regression/perf-bench
PGADMIN_URL=http://127.0.0.1:5050/browser/ \
  ./node_modules/.bin/playwright test audit-visual-regression \
  --workers=1
```

**Any visual change fails the test** with a side-by-side image diff at
`test-results/.../`. Open `test-results/<test-name>/test-failed-1.png`
(actual), `expected.png` (baseline), and `diff.png` to investigate.

## Workflow: ongoing regression prevention

Once a baseline is committed (on master or any long-lived branch), future
PRs run the same spec against it. Any visual change to the 5 dialogs
fails CI.

To intentionally update baselines (e.g., after a planned visual change):

```bash
./node_modules/.bin/playwright test audit-visual-regression --update-snapshots
git add web/regression/perf-bench/audit-visual-regression.spec.js-snapshots/
git commit -m "test(perf-bench): update visual baselines for <reason>"
```

## Dialog coverage

| Spec | Why this dialog |
|---|---|
| Edit Table | Heaviest SchemaView dialog. Vacuum settings, columns, constraints, partition tabs all on one screen. Walker stress + cross-tab data flow. |
| Create Function | Different node + Arguments collection + restricted return types via deps. |
| Create Type | Composite/Enum/Range/Shell sub-schema routing. Default composite shape rendered. |
| Edit Role | Server-level node (different parent path). Privileges + Membership grids. |
| Create Index (under table) | Sub-catalog node + `amname` deferredDepChange (one of this PR's protocol-aligned schemas) + with-clause nested-fieldset. |

These five span: schema-level / sub-catalog / server-level node parents,
deferred-dep schemas, multi-tab + multi-collection layouts, and the
heaviest single dialog in pgAdmin.

## Things that AREN'T covered (intentional)

- **SQL preview tab**: CodeMirror cursor + content vary subtly; masking
  is brittle. Use the cross-tab specs in `dev/table-dialog-tests` to
  verify SQL generation, not visual diff.
- **Animation states**: dialogs animate in. Snapshots wait for settle.
- **Hover / focus / tooltip states**: state-dependent, not visual-baseline
  worthy.
- **Every dialog × every tab**: would balloon baselines to 100+. Five
  carefully-chosen dialogs catch the rendering paths that matter.

## When a diff is intentional

If a PR is supposed to change rendering (e.g. updating MUI version,
restyling), update baselines + describe the change in the commit
message. Reviewers can inspect the new baseline PNGs in the diff.

## Limitations

1. **Cross-OS rendering differences**: fonts, sub-pixel positioning,
   anti-aliasing all differ between macOS, Linux, Windows. Baselines
   captured on one OS may not match another exactly. Capture on the
   same OS you run CI on (Linux for pgAdmin's CI).
2. **PG version differences**: some dialogs (Type composite/enum,
   Tablespace options) vary their visible fields by PG server version.
   Baselines captured on PG 16 may diff against PG 14 or 17.
3. **Browser version**: Chrome rendering changes between major versions
   can shift sub-pixel positions. Pin the Playwright `chromium` version
   in CI.

Mitigation: capture baselines in CI itself, not on a dev laptop, and
make CI bump the baselines via `--update-snapshots` only as an
explicit, reviewed step.
