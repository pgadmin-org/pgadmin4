# Proposal: Eliminate Insecure Deserialization RCE and Symlink-based Path Traversal

**Status:** Draft (v5 — addresses review findings of 2026-04-30, including end-to-end coherence pass)

> **Note on line numbers:** Citations in this proposal are accurate as of `HEAD` of
> `fix/pickle-rce` at v5 publication time. If upstream changes land in `session.py` or
> `file_manager/__init__.py` before PR 1 merges, the implementing PR will recompute line
> references against the rebase base.
**Date:** 2026-04-30
**Author:** Ashesh Vashi
**Tracking branch:** `fix/pickle-rce`
**Related:** Independent security report dated 2026-04-29; CVE-2024-2044 (prior RCE in
SERVER_MODE=False)

---

## 1. Problem Statement

A security report dated 2026-04-29 identified two complementary vulnerabilities in pgAdmin 4
(confirmed on v9.14) that, when combined, allow an authenticated user to achieve OS-level Remote
Code Execution on the pgAdmin host or container.

### 1.1 Vulnerability 1 — Insecure Deserialization Before HMAC Verification (CWE-502)

**Location:** `web/pgadmin/utils/session.py:240-267` — `FileBackedSessionManager.get()`

The session manager deserializes the session file with `pickle.load()` **before** verifying the
HMAC integrity signature stored alongside it. Any file an attacker can place in the sessions
directory is therefore executed unconditionally — `pickle.load()` fires arbitrary
`__reduce__` hooks during reads, before any of the integrity checks run.

The vulnerable sequence:

1. `open(fname, 'rb')` and read all bytes.
2. `pickle.load(f)` — RCE here.
3. Compare the in-body HMAC against the cookie HMAC — too late.

### 1.2 Vulnerability 2 — Symlink Escape in the File Manager (CWE-61 / CWE-22)

**Location:** `web/pgadmin/misc/file_manager/__init__.py` — `check_access_permission()` at
line 894 and the upload handler `add()` at line 1062.

Both code paths use `os.path.abspath()`, which resolves `.` and `..` but does **not** resolve
symbolic links. The subsequent `open(path, 'wb')` is performed by the OS kernel, which **does**
follow symlinks. If a symlink exists inside the user's storage directory pointing outside the
sandbox, the access check (path-string semantics) passes while the kernel write
(filesystem semantics) follows the symlink.

The same path-string-vs-kernel mismatch applies to `rename()` (line 990), `delete()` (line
1037), and `download()` (line 1263), which all call `check_access_permission()` and then
operate on the literal path via syscall.

A separate timing bug in `add()`: the inline access check runs *before* `open()` (good) but
`Filemanager.check_access_permission()` is *also* called *after* the file write at line 1104 —
pointless, because the file is already on disk by then.

### 1.3 Threat Model

- Attacker has a valid pgAdmin login (any role suffices — no admin required).
- Attacker can reach the file manager and session cookie surfaces.
- Goal: OS-level command execution as the user running gunicorn/pgAdmin (root in the official
  Docker image).
- Out of scope: attackers who already have host shell or Docker volume write access; supply-chain
  compromise.

### 1.4 Severity

CVSS v3.1 base score (per the report): **8.8 (High)**.

| Attribute | Value |
|---|---|
| Attack vector | Network |
| Privileges required | Low (any authenticated user) |
| User interaction | None |
| Confidentiality / Integrity / Availability | High / High / High |

### 1.5 Attack chain feasibility — what the report does and does not prove

The report demonstrates two scenarios. Both rely on a primitive the report **does not prove
exists inside pgAdmin**:

- **Scenario A (SERVER_MODE=False):** in this mode `check_access_permission()` returns
  immediately without any check (see line 895). An authenticated user can directly upload a
  payload to the sessions directory via the file manager. No symlink needed. **This is a
  complete in-pgAdmin attack chain when `SERVER_MODE=False`** — and it's the likely vector for
  the prior CVE-2024-2044.
- **Scenario B (SERVER_MODE=True):** requires a symlink to be planted inside the user's
  storage directory. The report says "create a symlink" but does not describe how to do this
  through pgAdmin alone.

A grep over the **entire `web/pgadmin/` tree** (not just file_manager) for symlink-creating
primitives returns zero matches across all of:

| Audit pattern | Matches in `web/pgadmin/` |
|---|---|
| `os.symlink` / `os.link(` / `symbolic_link` / `symlink_to` / `Path.symlink` / `.symlink(` | 0 |
| `tarfile` / `zipfile` / `unpack_archive` / `extractall` / `extract_archive` / `shutil.copytree` (archive extraction can preserve symlinks from a malicious archive) | 0 |
| `subprocess` / `os.popen` / shell-invocation primitives in `file_manager/` | 0 |

The download endpoint serves files; the upload endpoint writes file *bodies*; no
rename/move/extract handler creates links. **Therefore Scenario B is only exploitable when the
attacker has an out-of-band way to plant a symlink** — host shell, Docker volume mount with
shared storage, container escape, or a future pgAdmin feature that introduces a symlink
primitive (e.g., archive extraction). This audit excludes the bundled
`docker-entrypoint.sh`/runtime startup scripts, which run before user authentication and are
not part of the user-facing attack surface.

We close Vulnerability 2 anyway, as defense in depth: (a) prevents future regressions if such a
primitive is introduced, (b) closes the path for deployments where the storage directory is
shared with another writer, (c) the change is small and low-risk. But the spec does **not**
claim Vulnerability 2 alone is a current authenticated-user RCE primitive in
`SERVER_MODE=True`.

### 1.6 Known residual issues not introduced or fixed by this proposal

- **Session-file replay after logout.** A user who saves a copy of their valid, HMAC'd session
  file and the matching cookie can `cp` the file back into the sessions directory after
  logout-driven deletion, regaining their session. The current code has this property; the
  Phase 1 design preserves it. Closing it requires a per-session-revision nonce that's
  invalidated server-side on logout — out of scope for this proposal, tracked as a follow-up.
- **Read-side information disclosure via symlink.** `download()` at line 1263 calls
  `check_access_permission()` and `send_from_directory()`. Once `check_access_permission()`
  uses `realpath()`, symlink-based reads are also blocked at the access-check layer. The
  underlying TOCTOU caveat (§4.2.3) applies symmetrically to read.
- **CSRF-token theft via session-file read (Scenario B step 3 of the report).** The report's
  Scenario B requires the attacker to read the victim's session file from disk to extract the
  raw `csrf_token`. This requires file-read access to the sessions directory — either via the
  same out-of-band primitive needed to plant a symlink (host shell, Docker volume mount), or
  via the file manager's `download()` endpoint pointed at the sessions directory through a
  symlink. The realpath fix in §4.2.1 closes the symlink-based read path. Out-of-band
  file-read access remains out of scope (§1.3 threat model). After this proposal lands, the
  attacker's only remaining path to a session file's contents is host-level access, which
  also yields easier RCE primitives directly.
- **Residual `pickle.loads` callsites that operate on session-stored bytes (Phase 2 scope).**
  After PR 1's HMAC-header gate on the session file, no attacker-controlled bytes can reach
  `pickle.loads` via the session-on-disk path. However, several modules unpickle values that
  were themselves placed inside `flask.session` by pgAdmin's own write paths. These are safe
  *as long as the write paths cannot be influenced by attackers*, but they remain
  insecure-deserialization vectors that should be eliminated in Phase 2 / PR 7. Enumerated
  here so future reviewers see the surface:
    - `web/pgadmin/tools/sqleditor/__init__.py`: `import pickle` at line 12; `pickle.loads`
      at lines 320, 795, 854, 1857, 1935; `pickle.dumps` at lines 334, 628, 962, 1178, 1235,
      1348, 1642, 1698, 1739, 1783, 1992 (the `command_obj` round-trip).
    - `web/pgadmin/tools/sqleditor/utils/start_running_query.py`: lines 12, 53, 207.
    - `web/pgadmin/tools/sqleditor/utils/query_tool_connection_check.py`: lines 11, 33.
    - `web/pgadmin/tools/sqleditor/utils/filter_dialog.py`: lines 11, 97.
    - `web/pgadmin/tools/schema_diff/__init__.py`: `import pickle` at line 12; `pickle.loads`
      at line 184; `pickle.dumps` at lines 197, 225 (the `diff_model_obj` round-trip).
    - `web/pgadmin/misc/bgprocess/processes.py`: `from pickle import dumps, loads` at line 20;
      used at lines 162, 164, 251, 704, 706 to round-trip the BatchProcess descriptor stored
      in the SQLite `process` table. This one is interesting because it deserializes from the
      database, not the session — same risk class but a different threat surface (host-local
      DB write access).

---

## 2. Goals

1. **Close both vulnerabilities** in shippable, independently reviewable units of work.
2. **Eliminate `pickle` from the pgAdmin web codebase entirely** as a long-term defence-in-depth
   measure, not just from `session.py`. The same module is also used inside the cloud provider
   handlers and the SQL editor's grid state.
3. **No regressions** in: login (internal, OAuth2, LDAP, Kerberos, Webserver, MFA), cloud
   deployment wizards (RDS, Azure, Google, BigAnimal), Query Tool, Schema Diff, Debugger.
4. **No silent data loss** for active sessions on upgrade where avoidable. Sessions written by
   pre-fix code will be invalidated (one-time re-login). Operators are alerted via a single
   warning log line per rejected sid (see §4.3).

## 3. Non-goals

- Changing the cookie format or HMAC algorithm of the cookie.
- Changing the session storage backend (still file-backed with HMAC).
- Refactoring the `Filemanager` class beyond what's needed for the symlink fix.
- Deprecating `SERVER_MODE=False` (orthogonal concern).
- Closing session-file replay-after-logout (§1.6).

---

## 4. Design

### 4.1 Vulnerability 1 — Two-phase fix

#### Phase 1 (urgent): HMAC-first verification with a plaintext header

`pickle` stays as the on-disk format **temporarily**, but is gated behind an HMAC verified from
a plaintext header that lives outside the serialized blob.

**File format (new):**

```
+----------------------------------------------------+
| H bytes : hex HMAC over the body, ASCII-encoded   |
+----------------------------------------------------+
| N bytes : pickle body — (randval, digest, data)   |
+----------------------------------------------------+
```

`H` is determined by the chosen digest algorithm: `len(hmac.new(...).hexdigest()) ==
2 * digest_size`. For SHA-256, `H = 64`. We use **SHA-256** for the file HMAC regardless of
`config.SESSION_DIGEST_METHOD` (which defaults to SHA-1 — see §8 Open Question 1). The HMAC is
computed with `app.config['SECRET_KEY']` over the body bytes.

**Read path (new):**

```python
import hmac
import hashlib
import pickle
import logging

_FILE_HMAC = hashlib.sha256
_HMAC_HEX_LEN = _FILE_HMAC().digest_size * 2  # 64 for SHA-256

logger = logging.getLogger(__name__)

def _compute_file_hmac(secret, body: bytes) -> bytes:
    # Flask's SECRET_KEY may be str or bytes; normalize before HMAC.
    key = secret.encode() if isinstance(secret, str) else secret
    return hmac.new(key, body, _FILE_HMAC).hexdigest().encode()

def get(self, sid, digest):
    fname = safe_join(self.path, sid)
    if fname is None or not os.path.exists(fname):
        return self.new_session()
    try:
        with open(fname, 'rb') as f:
            header = f.read(_HMAC_HEX_LEN)
            body = f.read()
        if len(header) != _HMAC_HEX_LEN or len(body) == 0:
            # 0-byte file from new_session(), or pre-fix session file. Silently
            # discard; Phase 1 deployment expects one-time re-login churn.
            return self.new_session()
        expected = _compute_file_hmac(self.secret, body)
        if not hmac.compare_digest(header, expected):
            logger.warning(
                "session file rejected: bad file-HMAC for sid=%s", sid[:8]
            )
            return self.new_session()
        randval, hmac_digest, data = pickle.loads(body)  # safe: body is verified
    except (pickle.UnpicklingError, EOFError, OSError, MemoryError, ValueError, TypeError):
        # Narrow catch: silently invalidate corrupted/unreadable session files.
        # Programming errors (AttributeError, NameError, etc.) propagate intentionally
        # so they show up in tests and logs rather than being masked as new_session().
        return self.new_session()
    if hmac_digest != digest:
        return self.new_session()
    return ManagedSession(data, sid=sid, randval=randval, hmac_digest=hmac_digest)
```

**Write path (new):**

```python
def put(self, session):
    ...
    # The existing disk_write_delay and skip_paths skip logic at lines 271-285
    # is preserved verbatim — only the format step below changes.
    body = pickle.dumps(
        (session.randval, session.hmac_digest, dict(session)), -1
    )
    header = _compute_file_hmac(self.secret, body)
    fname = safe_join(self.path, session.sid)
    with open(fname, 'wb') as f:
        f.write(header)
        f.write(body)
```

**Defensive precondition (`__init__`):** raise on empty `SECRET_KEY`:

```python
if not self.secret:
    raise RuntimeError("SECRET_KEY must be non-empty")
```

`assert` is **not** acceptable here — Python's `-O` flag strips assertions, which would silently
disable the security-critical check in optimized production builds. Pre-fix code shares the
implicit non-empty assumption, but an empty `SECRET_KEY` reduces the file-HMAC to a known-key
MAC, and a security-driven redesign is the right time to fail fast.

**Performance.** HMAC-SHA256 over typical session bodies (<10 KB) costs <100 µs per request on
modern x86-64. Sessions exceeding 1 MB (rare; large `gridData` with cloud-handler bytes blobs)
will see sub-millisecond overhead. No measurable production impact expected. Confirmed by
inspection — the read path was already `f.read()`-bound on full file bytes, so the additional
work is one `hmac.new(...).hexdigest()` per request.

**Important note on the report's Fix 1.** The report's suggested "HMAC-first" code calls
`pickle.loads(raw)` once just to read the stored HMAC — which is the exact line that fires
the RCE. The plaintext-header design above avoids that: the HMAC is verified against raw bytes
before any deserialization.

**Migration:** files written by the old code (no header) fail the header check and are silently
discarded — affected sessions get a fresh `new_session()`. One-time re-login on upgrade.
Operators see a transient burst of `session file rejected` warnings during rollout, then they
quiesce.

**Empty-file behavior.** `new_session()` at line 218-238 creates a 0-byte placeholder. The next
`get()` reads short (< 64 bytes) header + empty body, falls through to `new_session()`.
Subsequent `put()` writes the full header + body. This matches the existing behavior of the old
code (where `pickle.load` on 0 bytes raised, was caught, and fell through to `new_session()`).
No regression.

**Concurrent `put()` from multiple workers.** Two workers writing the same sid race on the
file. `open(fname, 'wb')` truncates atomically; the worst case is interleaved writes producing
a header/body mismatch. The next `get()` recomputes the file-HMAC, fails verification, logs
the warning, and returns `new_session()`. **Race-tolerant by design** — partial writes can
never produce an executable payload because they cannot satisfy the HMAC. The pre-fix code
shared the same race shape but with `pickle.load` instead of HMAC validation; not a
regression.

**Caching layer.** `CachingSessionManager` (session.py:104-196) wraps
`FileBackedSessionManager`. Cache hits use the cached `ManagedSession.hmac_digest` for the
cookie compare; cache misses go through `parent.get()`, which performs the new file-HMAC
check. The cache is only populated from a verified disk read (or from `new_session()`), so the
file-HMAC check is enforced **at every cache miss** — including LRU evictions (`_normalize`
trims to 80% capacity once size exceeds `num_to_store=1000`) and writes (`put()` invalidates
the cached entry). No additional change needed here.

#### Phase 2 (defence in depth): switch to plain JSON

After Phase 1 ships, refactor every site that stashes a Python object or `pickle.dumps(...)`
bytes inside `flask.session` so that the session contains only data primitives. Once the
session contents are pure JSON-safe types, the on-disk format switches from pickle to plain
JSON, and `pickle` is removed from the web codebase entirely.

The session's purpose is to hold **identity and state pointers**, not live SDK clients. The
existing `__pgsql_server_managers` pattern (`web/pgadmin/utils/driver/psycopg3/server_manager.py:519-530` —
stores `as_dict()` in session, keeps live `ServerManager` instances in module-global state) is
the template.

**Per-site refactor (verified by grep):**

| Site (file:line) | Current | Replacement |
|---|---|---|
| `web/pgadmin/authenticate/__init__.py:113` | `session['auth_obj'] = AuthSourceManager(...)` (live object) | Store source name; reconstruct `AuthSourceManager` in OAuth2 callback (`oauth2.py:55`) |
| `web/pgadmin/misc/cloud/azure/__init__.py:89` | `session['azure']['azure_obj'] = Azure(...)` (live object) | Store `authentication_record_json` + tenant/auth_type/cache_name; rebuild `Azure` per request via process-local cache keyed by sid. **See §5.4 for an unverified-claims caveat.** |
| `web/pgadmin/misc/cloud/rds/__init__.py:73` | `session['aws']['aws_rds_obj'] = pickle.dumps(_rds, -1)` | Store credentials dict; rebuild `RDS` from process-local cache. 1 write, 2 reads (lines 73, 100, 129). |
| `web/pgadmin/misc/cloud/google/__init__.py:110` | `session['google']['google_obj'] = pickle.dumps(...)` (4 write sites: 110, 129, 145, 181) | Store credentials/state dict; rebuild `Google` from process-local cache. |
| `web/pgadmin/misc/cloud/biganimal/__init__.py:73` | `session['biganimal']['provider_obj'] = pickle.dumps(...)` (4 write sites: 60, 73, 95, 106) | Same pattern. |
| `web/pgadmin/tools/sqleditor/__init__.py` (lines 338, 632, 699, 740 write `session['gridData']`; the per-trans `command_obj` field holds `pickle.dumps(transaction, -1)` produced in `tools/sqleditor/utils/start_running_query.py:204-208`, where the local `session` parameter is later persisted via `update_session_grid_transaction`) | serialized `Command` bytes inside a session-resident dict | Store command kind + identifying inputs; rebuild `Command` via `from_state()`; cache PG metadata in process-local TTL cache. **High risk — see §5.4.** |

**Process-local cache pattern (illustrative):**

```python
# Module-level
_azure_cache: dict[str, tuple[float, Azure]] = {}
_AZURE_CACHE_TTL = 600  # seconds

def get_azure_for_session(sid: str) -> Azure:
    now = time.monotonic()
    cached = _azure_cache.get(sid)
    if cached and (now - cached[0]) < _AZURE_CACHE_TTL:
        return cached[1]
    state = session['azure']                 # JSON-safe dict only
    obj = Azure.from_state(state)            # new constructor
    _azure_cache[sid] = (now, obj)
    return obj
```

Eviction: lazy on read (TTL check) and on logout (`_azure_cache.pop(sid, None)`).

**Worker-restart UX trade-off (Azure).** Today's behavior pickles the live `Azure` (with its
populated SDK client cache) into the session file, so a worker restart preserves Azure auth
state. After Phase 2, the in-memory client cache is gone on restart. Whether the user is
re-prompted for device-code on the next request depends on whether
`authentication_record_json` is sufficient to silently rebuild the credential. **This is
unverified** (see §5.4) and must be confirmed during the Azure refactor PR before merge. If
re-prompting is unavoidable, that is a UX regression — Phase 1 ships independently and is not
gated on resolving this.

#### Final state

- `web/pgadmin/utils/session.py`: `from json import dumps, loads` replaces `from pickle import
  dump, load`. HMAC header retained.
- All `import pickle` and `from pickle import ...` lines in the web tree removed (except in
  test fixtures, by deliberate exception).
- CI guard (proposed): `grep -rEn '^\s*(import pickle\b|from pickle\b)' web/pgadmin/ | grep -v
  '/tests/'` must return empty.

### 4.2 Vulnerability 2 — `realpath`, syscall hardening, and ordering fix

#### 4.2.1 `check_access_permission` — realpath both sides

At `web/pgadmin/misc/file_manager/__init__.py:913-940` (definition starts at line 913 in the
implemented branch), replace `os.path.abspath()` with `os.path.realpath()` for both
`orig_path` and `in_dir`. The `in_dir` argument must also be
resolved through `realpath()` — otherwise a symlinked storage root would compare unequal to a
resolved target path, breaking legitimate access.

Python 3.9+ semantics (pgAdmin's documented floor — see `web/pgAdmin4.wsgi:14` and
`README.md:23`): `os.path.realpath(path)` resolves symlinks for components that exist and
leaves not-yet-existing tail components as literal text. This is the correct semantics for
upload paths.

**Windows behavior is believed correct in Python 3.9+ but unverified by this proposal.**
CPython release notes indicate `ntpath.realpath` resolves NTFS junctions and symbolic links via
`GetFinalPathNameByHandle`, with several bug fixes landed across 3.10/3.11. Verification on
Windows is a **PR-1 merge gate**: a smoke test creates a junction, calls `realpath`, and asserts
the resolved path matches the target. This test must pass on the lowest supported Python
(3.9.x) before PR 1 merges.

#### 4.2.2 Upload handler `add()` — realpath, ordering, and `O_NOFOLLOW`

Three changes at `web/pgadmin/misc/file_manager/__init__.py:1087-1132` (definition at line
1087 in the implemented branch):

1. Replace `os.path.abspath` with `os.path.realpath` in the inline check (line 1112), and
   resolve `the_dir` through `realpath` too (line 1114).
2. Delete the dead post-write `Filemanager.check_access_permission(the_dir, path)` call.
   The inline check above already covers it, the file is on disk by the time it
   runs, and replicating the same check at two granularities is bug-prone.
3. **Replace `open(new_name, 'wb')` with `os.open(...)` + `O_NOFOLLOW`** (now extracted to
   the module-level helper `_open_upload_target` at line 52) to close the leaf-component
   TOCTOU gap between the access check and the syscall:

```python
fd = os.open(
    new_name,
    os.O_WRONLY | os.O_CREAT | os.O_TRUNC
        | getattr(os, 'O_NOFOLLOW', 0),
    0o600,
)
with os.fdopen(fd, 'wb') as f:
    while True:
        data = file_obj.read(4194304)
        if not data:
            break
        f.write(data)
```

`O_NOFOLLOW` causes the kernel to refuse to open the path if its **final** component is a
symlink. Combined with `realpath`-based directory resolution at check time, this closes the
**leaf-component race** where another worker plants a symlink at the leaf between check and
open. **Intermediate-component races remain unmitigated** and rely on §1.5 reasoning (no
in-pgAdmin primitive can plant the directory symlinks needed to exploit them).

Windows: `os.O_NOFOLLOW` is not defined on Windows. The `getattr(..., 0)` fallback above makes
the flag a no-op on Windows. This leaves a small residual leaf-component TOCTOU on Windows,
mitigated by the absence of the symlink-creation primitive.

**Intentional mode change (0o644 → 0o600).** The pseudocode passes mode `0o600` to `os.open`,
restricting uploaded files to owner-only. The current code uses `open(name, 'wb')` which
applies the umask-default (typically `0o644`, world-readable). The change is intentional
hardening — uploaded files are user-private session artifacts and have no need for
world-read access — but it **is** a behavioral change. Release notes must call this out so
operators relying on cross-user readability of uploaded files (uncommon) can adjust.

#### 4.2.3 Cover `rename`, `delete`, `download`

These all call `check_access_permission()` and then operate on the literal path via
`os.rename`, `os.rmdir`/`os.remove`, and `send_from_directory` respectively. Once
`check_access_permission()` is realpath-based:

- **`rename` (definition at line 1015 in the implemented branch):** `os.rename` does not follow symlinks at the leaf for either source
  or destination — it renames the link itself, not the target. Intermediate-component symlinks
  in the destination path *would* route through the link at the kernel level (same shape as
  upload TOCTOU). Python's stdlib does not expose `renameat2` flags, so there is no clean
  `O_NOFOLLOW` analog for rename. **Residual TOCTOU on intermediate components is accepted**
  under §1.5 reasoning (no in-pgAdmin symlink primitive). Realpath-based access check at T1 is
  the only layer of defense.
- **`delete` (definition at line 1062):** `os.rmdir` and `os.remove` operate on the leaf,
  not the target. No additional change required.
- **`download` (definition at line 1287):** Werkzeug 3.1.* (`requirements.txt:65`) provides
  `send_from_directory`, which uses `werkzeug.security.safe_join` for `..`-traversal
  protection. `safe_join` does NOT call `realpath` and does NOT protect against symlinks —
  verified by reading the werkzeug 3.x source. Our `check_access_permission()` (post-§4.2.1)
  is therefore the **sole** symlink defense for downloads. TOCTOU between check and
  `send_from_directory`'s file open is symmetric to upload (§4.2.2) and not closeable from
  Python without bypassing `send_from_directory`. Residual TOCTOU accepted under §1.5.

A separate latent bug — `Filemanager.check_access_permission(the_dir,
"{}{}".format(path, path))` in `download` — concatenates `path` with itself. This is
unrelated to the security fix and is tracked as a separate cleanup ticket.

#### 4.2.4 `addfolder` (mkdir endpoint)

`addfolder` (definition at line 1256 in the implemented branch) calls
`Filemanager.check_access_permission(user_dir, path+name)` before `os.mkdir(create_path)`. Once §4.2.1 fixes `check_access_permission`, intermediate-
symlink resolution is caught at the access-check layer. `os.mkdir` itself does not create
symlinks — it creates a real directory at the literal path — so even a TOCTOU race cannot
escalate to symlink creation. No additional change required for this endpoint.

#### 4.2.5 Audit — sites covered by the Vulnerability 2 fix

This table enumerates the sites involved in the symlink-escape fix, not every path-handling
site in `file_manager/__init__.py`. Other `open()` / `os.path.*` calls in the file (e.g., file
encoding detection at line 438, `read_file_generator` at line 108) are not security-relevant
to Vuln 2 and are out of scope.

Line numbers below are as of the implemented branch (`fix/pickle-rce`).

| Line | Function / Site | Resolution |
|---|---|---|
| 924 | `check_access_permission` — was `os.path.abspath`, now `os.path.realpath` | §4.2.1 |
| 936 | `check_access_permission` — `in_dir` realpath | §4.2.1 |
| 1112 | `add` (inline upload check) — was `os.path.abspath`, now `os.path.realpath` | §4.2.2 |
| 1119 | `add` — was `open(new_name, 'wb')`, now `_open_upload_target(new_name)` | §4.2.2 |
| 52 | new module-level `_open_upload_target` helper — `os.open` + `O_NOFOLLOW` + 0o600 | §4.2.2 |
| (in `rename`, line 1015) | `os.rename(oldpath_sys, newpath_sys)` | Covered by §4.2.1 realpath; intermediate-component TOCTOU accepted (§4.2.3) |
| (in `delete`, line 1062) | `os.rmdir` / `os.remove` | Leaf-only operation, no additional change (§4.2.3) |
| (in `download`, line 1287) | `send_from_directory` | Covered by §4.2.1 realpath at access check (§4.2.3) |
| (in `addfolder`, line 1256) | `os.mkdir` | Covered by §4.2.1 realpath (§4.2.4) |

All identified sites are covered. **Out-of-scope for this proposal:** `os.path.abspath`
callsites elsewhere in `web/pgadmin/` have not been exhaustively audited. A follow-up
security review is in scope for tracking, but is not gated on this proposal.

### 4.3 Tests

#### 4.3.1 New regression tests

1. **Unsafe-payload session rejection (Vuln 1):** drop a hand-crafted file in the sessions
   directory containing a `pickle` payload whose `__reduce__` writes a sentinel file. Issue a
   request with that sid in the cookie. Assert (a) the sentinel is **not** created, (b) the
   request gets a fresh session, (c) a single `session file rejected: bad file-HMAC`
   warning is logged.
2. **Header-tampered session rejection:** write a session with a corrupted HMAC header (flip
   one byte). Assert `get()` returns a fresh session, no exception leaks, warning logged.
3. **Empty-file passthrough:** create a 0-byte file at `sessions/<sid>` (the post-`new_session()`
   state). Assert `get()` returns a fresh session, **no warning** (this case is expected).
4. **Symlink escape rejection (Vuln 2, SERVER_MODE=True):** create a symlink inside the user's
   storage dir pointing to `/tmp` (or another out-of-sandbox path). Attempt an upload. Assert
   the upload is denied **and** no file is created at the symlink target.
5. **`O_NOFOLLOW` leaf-symlink rejection (Linux/macOS):** pre-plant a symlink at the upload
   target leaf path (no race needed — test the *property*, not the timing). Attempt upload.
   Assert `OSError` is raised with `errno.ELOOP` (Linux) or `errno.EMLINK` (macOS) and no file
   exists at the symlink target afterward. *Skip on Windows* (no `O_NOFOLLOW`).
6. **Upload happy path:** confirm legitimate uploads still succeed in both `SERVER_MODE=False`
   and `SERVER_MODE=True`.
7. **MFA login flow regression:** cover at least one full MFA email and authenticator login
   round-trip. The MFA fields are JSON-safe but the test suite should exercise them.
8. **Cookie-HMAC mismatch with valid file-HMAC:** write a session file with a valid file-HMAC
   header but a `hmac_digest` inside the body that does NOT match the cookie-supplied digest.
   Assert `get()` returns a fresh session, **and** assert the `session file rejected:
   bad file-HMAC` warning is **not** logged (this is a cookie-binding mismatch, not a
   file-tamper event; current proposal does not log cookie mismatches to avoid noise from
   normal cookie-tampering attempts).
9. **Round-trip:** construct a `ManagedSession`, call `session.sign(secret)` to populate
   `randval` and `hmac_digest` (a `put()` precondition; `put()` itself calls `sign()` on
   first write but a deterministic test should pre-sign), call `put()`, then `get()` with the
   matching cookie. Assert the returned `ManagedSession` has the same `data`, `randval`,
   `hmac_digest` as the input. Without this, a `put()` regression silently breaks every
   session save.
10. **SERVER_MODE=False direct upload to sessions dir:** unit test against
    `FileBackedSessionManager.get()` directly (preferred over a full integration test to
    avoid Flask/CSRF setup). Write a malicious pickle file to the sessions path that
    `safe_join(self.path, sid)` would resolve to. Call `get(sid, fake_digest)`. Assert
    (a) `pickle.loads` does not execute the payload (sentinel not created), (b) `get()`
    returns a fresh session, (c) the file-HMAC warning is logged. This validates the
    Scenario A chain from §1.5 is closed at the session-read layer regardless of whether
    `SERVER_MODE` permits the upload.

#### 4.3.2 Existing tests to update

- `web/pgadmin/browser/tests/test_oauth2_with_mocking.py` — uses `session['oauth2_token']`
  (already a dict); verify it continues to pass.
- Cloud-wizard tests using legacy serialized fixtures — update to dict fixtures during the
  per-provider PR.

#### 4.3.3 Manual verification

- All four cloud deployment wizards end-to-end (RDS, Azure, Google, BigAnimal).
- OAuth2 login round-trip with a real provider.
- Query Tool: execute, page, edit cell, transactions, savepoint, BYTEA result.
- Debugger: at least one direct-debug session.

---

## 5. Blast Radius

### 5.1 Phase 1 (PR 1)

| Aspect | Estimate |
|---|---|
| Source files modified | 2 (`web/pgadmin/utils/session.py`, `web/pgadmin/misc/file_manager/__init__.py`) |
| Test files added/modified | ~2 |
| LOC changed | Source: ~80–110 (session HMAC logic ~50–80, file_manager realpath/O_NOFOLLOW/coverage ~30). Tests: ~250–400 (10 regression tests in §4.3.1, ~25–40 LOC each plus shared fixtures). **Total ~350–500.** |
| Behavioural change | Sessions written by old code become unreadable → users re-login once on upgrade. One transient warning logged per rejected sid. |
| Risk | **Low.** Self-contained, well-bounded, easy to review. |

### 5.2 Phase 2 — verified site counts

Per-feature breakdown (all numbers verified by grep):

| Feature | Files | `pickle.dumps` writes | `pickle.loads` reads | Risk | Rationale |
|---|---|---|---|---|---|
| `auth_obj` (OAuth2 login) | `authenticate/__init__.py`, `authenticate/oauth2.py` | 0 (live object stored directly) | 0 (live object read directly) | Medium | Login path — regression locks users out. Test against a real OAuth2 provider before merge. |
| Azure cloud | `misc/cloud/azure/__init__.py` | 0 (live object stored directly at line 89) | 0 (read directly at lines 117, 138, 152, 164, 175, 189, 202, 216, 228, 692, …) | **High (verification gated)** | See §5.4. |
| AWS RDS cloud | `misc/cloud/rds/__init__.py` | 1 (line 73) | 2 (lines 100, 129) | Medium | Few sites; boto3 client recreation should be cheap (assumed — verify per §5.4). |
| Google cloud | `misc/cloud/google/__init__.py` | 4 (lines 110, 129, 145, 181) | 10 (lines 95, 127, 143, 161, 179, 199, 220, 241, 307, …) | Medium | Refactor: 1 `from_state()` constructor + ~10 callsites converted from `pickle.loads(...)` to `get_google_for_session(sid)`. |
| BigAnimal cloud | `misc/cloud/biganimal/__init__.py` | 4 (lines 60, 73, 95, 106) | 11 (lines 57, 83, 93, 104, 115, 125, 137, 150, 162, 528, …) | Medium | Same shape as Google. |
| SQL editor — `command_obj` producer | `tools/sqleditor/utils/start_running_query.py:204-208` | 1 (`pickle.dumps` at line 207, into a per-trans dict later persisted via `update_session_grid_transaction`) | 0 | **High (verification gated)** | See §5.4 item 4. |
| SQL editor — Flask-session reads/writes | `tools/sqleditor/__init__.py` | gridData writes at lines 338, 632, 699, 740 | 1 (`pickle.loads` at line 1935) | **High (verification gated)** | The per-trans dict containing `command_obj` lives inside `session['gridData']`. Refactor: store command kind + identifying inputs; rebuild `Command` via `from_state()`; cache PG metadata in process-local TTL cache. |
| Final swap (`session.py` to JSON) | `utils/session.py` | n/a | n/a | Low | Trivial once Phase 2 lands. |

**Total source files touched (Phase 1 + Phase 2):** 8 (files), 2 of which are big files
(`misc/cloud/google/__init__.py`, `misc/cloud/biganimal/__init__.py`).
**Total LOC changed (rough):** 600–900 across Phase 2.
**PR count target:** 6–7 (one per feature plus the final swap).

> **Note on the two SQL-editor rows above:** they describe the same logical refactor but split
> by file. The producer row covers where `pickle.dumps` is called; the Flask-session row
> covers how that pickled blob enters and exits the `flask.session['gridData']` dict. Both
> rows are addressed by a single PR (PR 7).

### 5.3 Failure modes considered

- **Existing session files lost on upgrade:** users re-login once. Expected; called out in
  release notes.
- **Process restart drops in-memory caches (cloud SDKs):** users may need to re-authenticate
  against the cloud provider on the next request after a worker recycle. **Differs from
  today's behavior for Azure** (see §5.4 and §4.1 Phase 2).
- **`session['azure']` grows because state replaces object:** dict holds ~5 primitive fields,
  far below the file-write size threshold.

### 5.4 Unverified claims that gate merge of specific PRs

These claims appear in the spec or its rationale and are **not yet evidence-backed**. They must
be verified during the relevant PR before merge:

1. **Azure: `authentication_record_json` is sufficient to silently rebuild the credential
   without re-prompting the user for device code.** The class clearly persists the auth record
   and supports rebuilding the credential from it (`misc/cloud/azure/__init__.py:298-322`),
   *but* whether **all** ~12 Azure endpoints work after a per-request rebuild has not been
   end-to-end tested. Verification: run the Azure cloud wizard end-to-end after Phase 2 with
   the in-memory cache disabled; confirm no re-prompt.
2. **boto3 RDS clients are cheap to recreate from credentials dict.** Generally true; SSO/STS
   token-cache state may complicate it. Verification: run the RDS wizard end-to-end across a
   simulated worker restart.
3. **Google Cloud SDK clients are reconstructable from refresh-token credentials.**
   Refresh-token flows typically work; OAuth-installed-app flows with one-time auth codes do
   not. Verification: run the Google wizard end-to-end across a simulated worker restart.
4. **The `Command` subclass tree in sqleditor is amenable to a `from_state()` constructor.**
   The proposal author has not yet read the Command hierarchy. The refactor PR (PR 7) starts
   with an audit that may reveal additional design work; the spec marks this PR as **High
   risk, scope-revisit on audit**.

   **Fallback if PR 7 is intractable:** If the audit concludes the refactor is more than ~2
   weeks of work (e.g., the `Command` tree has deep coupling to live cursor state),
   the spec resolves the conflict as follows:
   - **Option A (preferred):** ship Phase 2 without sqleditor. The CI guard at PR 8 carves
     out `web/pgadmin/tools/sqleditor/` as a documented exception, with a TODO and tracking
     issue. Concrete encoding: sqleditor stores the pickled `Command` bytes
     **base64-encoded into a JSON string field** inside `session['gridData'][trans_id]`.
     The outer JSON session body is HMAC-protected by Phase 1's file-HMAC, so the encoded
     bytes cannot be tampered with from the disk side. **Caveat:** `pickle.loads` still runs
     on those bytes inside sqleditor on every read. If any other code path can write to
     `gridData` with attacker-controlled content (an unrelated bug), the RCE primitive
     returns. This is a strictly weaker guarantee than full pickle removal — Option A is a
     scope-management choice, not a security equivalence.
   - **Option B (rejected unless A is infeasible):** keep pickle in `session.py` itself, do
     not migrate to JSON, accept the ongoing footgun across the entire session surface.

   PR 7 author chooses A or B based on the audit; spec is amended in the PR description with
   the rationale.

---

## 6. Implementation Plan

### 6.1 PR sequencing

1. **PR 1 — Close the CVEs.** HMAC-header redesign in `session.py`; in `file_manager`:
   `realpath` (§4.2.1), `O_NOFOLLOW` and dead-check removal in upload (§4.2.2),
   access-check coverage for `rename`/`delete`/`download` (§4.2.3) and `addfolder` (§4.2.4).
   Tests: **all 10 items** in §4.3.1. *Ships first, separately, with a security advisory.*
2. **PR 2 — `auth_obj` data-only refactor.** Removes the live `AuthSourceManager` from the
   session.
3. **PR 3 — Azure cloud refactor.** Includes verification step §5.4 item 1.
4. **PR 4 — AWS RDS cloud refactor.** Includes verification §5.4 item 2.
5. **PR 5 — Google cloud refactor.** Includes verification §5.4 item 3.
6. **PR 6 — BigAnimal cloud refactor.**
7. **PR 7 — SQL editor `command_obj` refactor.** Begins with a Command-tree audit
   (verification §5.4 item 4); scope may grow.
8. **PR 8 — Final swap: `session.py` to plain JSON, delete `pickle` imports, add CI guard.**

PRs 2–7 are independent and can land in any order. **PR 8 has a hard dependency on PRs 2–7
all having merged** — until every `pickle` site is removed, the JSON swap will fail to
serialize live objects or pickled-bytes blobs.

### 6.2 Rollback strategy

Each PR is reverted independently if a regression is discovered post-merge. PR 1 has no
in-codebase compatibility shim — a revert of PR 1 restores the pre-fix vulnerable behavior,
which is unacceptable. **The team commits to fix-forward only for PR 1: any post-merge
regression is resolved by a same-day hotfix, never by a revert.** This commitment requires
on-call availability during the release window; the security advisory cannot publish without
this commitment in place.

PRs 2–7 each remove a `pickle` site without changing the on-disk format; reverting any of them
is safe and does not re-open RCE (since PR 1 already gates the on-disk read).

PR 8 (the JSON swap) carries upgrade risk for sessions written by PRs 1-7's pickle-with-header
format. Format-detection on read after PR 8: the file-HMAC header is still validated first
(same algorithm), then `json.loads(body)` is attempted. A pre-PR-8 pickle body fails JSON parse
with `JSONDecodeError`, falls through to `new_session()`, and a warning is logged. **No
execution path through `pickle.loads` remains in `session.py` post-PR-8** — a malicious or
legitimate pickle file is rejected at JSON parse, never deserialized. One-time re-login at PR 8
release; warning logged per dropped sid.

### 6.3 Multi-instance / HA note

pgAdmin is typically deployed single-instance. If two replicas share a sessions directory, both
must upgrade together: in **both directions**, the receiver fails to parse the format and
silently invalidates the session (old code reading a header'd file fails on `pickle.load` of
ASCII hex; new code reading a header-less file fails the HMAC length check). No data loss
beyond a one-time re-login per affected user, but operators must coordinate the upgrade window.
Document in release notes.

**Mixed-version Python workers (rare):** `pickle.dumps(..., -1)` selects `HIGHEST_PROTOCOL`
which varies by Python version (3.9 → protocol 5; 3.13 → protocol 5; 3.14 → 5). A protocol
written by a newer worker and read by an older worker may fail to deserialize. Pre-existing
assumption that all workers in a deployment run the same Python; not introduced by this
proposal. After PR 8 (JSON swap), this concern disappears entirely.

### 6.4 Acceptance criteria

**PR 1 (security fix):**
- [ ] All 10 regression tests in §4.3.1 added and passing.
- [ ] Defensive non-empty-`SECRET_KEY` check added in `FileBackedSessionManager.__init__`
      (raise, not assert).
- [ ] `_compute_file_hmac` accepts both `str` and `bytes` for `secret`.
- [ ] Round-trip test (§4.3.1 test 9) passes — confirms `put()` produces a file readable by
      `get()`.
- [ ] Windows realpath smoke test (§4.2.1) passes on Python 3.9.x.
- [ ] CVE assigned and security advisory drafted; advisory publishes on the PR-1 release.
- [ ] On-call coverage confirmed for PR-1 release window (per §6.2 fix-forward commitment).

**Each of PR 2-7 (per-feature refactor):**
- [ ] Corresponding §5.4 verification item passes (where applicable: Azure → item 1, RDS →
      item 2, Google → item 3, sqleditor → item 4; auth_obj and BigAnimal have no §5.4 entry).
- [ ] No regression in the relevant feature's existing test suite.
- [ ] Manual verification per §4.3.3 for the affected feature (cloud wizard end-to-end,
      OAuth2 round-trip, or Query Tool sweep).
- [ ] No new `pickle` site introduced in any other file (regression check).

**PR 8 (final pickle removal):**
- [ ] `grep -rEn '^\s*(import pickle\b|from pickle\b)' web/pgadmin/ | grep -v '/tests/'`
      returns empty (or returns only the documented sqleditor exception per §5.4 item 4
      Option A).
- [ ] All four cloud wizards verified end-to-end in `SERVER_MODE=True` and `SERVER_MODE=False`.
- [ ] OAuth2 round-trip verified against a real provider.
- [ ] Query Tool regression sweep passed (pagination, edit, transactions, BYTEA).
- [ ] Audit table in §9 re-run on the merge commit and the result recorded in the PR
      description; any drift from the table in this proposal explained.

---

## 7. Alternatives Considered

### 7.1 Big-bang refactor in one PR

Rejected. Combines an urgent security fix with a multi-feature refactor; a regression in any
cloud wizard would block the security fix from shipping. Review surface is too large for
adequate scrutiny.

### 7.2 Keep pickle, only fix HMAC ordering

Rejected as the long-term answer. Closes the immediate CVE but leaves `pickle` as the de-facto
session format and inside cloud handlers. Any future bug that lets an attacker influence
session contents re-opens RCE. Adopted as **Phase 1** only — buys time for Phase 2.

### 7.3 Use `flask.json.tag.TaggedJSONSerializer`

Rejected for the on-disk session format. `TaggedJSONSerializer` handles `bytes`, `datetime`,
`UUID`, `tuple`, `set` — which would let the in-session serialized blobs (the cloud-handler
`pickle.dumps` outputs) silently survive the JSON switch. We want those *gone*, not preserved.
Plain JSON forces the refactor.

### 7.4 Switch to `itsdangerous.URLSafeTimedSerializer` only (no file backend)

Rejected. Cookie size limits make this impractical for pgAdmin's session contents (especially
`gridData` and server manager state). File-backed sessions stay.

### 7.5 chroot or seccomp-style sandboxing of the worker process

Out of scope. Requires deployment-level changes that vary by environment
(Docker, Kubernetes, Snap, AppImage, systemd, native pip, conda, etc.) and that operators
must opt into per-deployment. Worth tracking separately as a defense-in-depth follow-up.

---

## 8. Open Questions (resolved before approval)

1. **HMAC algorithm for the file header: SHA-256 vs `config.SESSION_DIGEST_METHOD` (default
   SHA-1)?**
   *Resolution:* hard-code SHA-256 in the file header. The primary rationale is **header-length
   predictability**: the file format needs a fixed prefix length decoupled from operator config,
   so that file parsing is deterministic. Secondary rationale: SHA-256 is the modern default
   and avoids a future deprecation step. The cookie HMAC remains tied to
   `SESSION_DIGEST_METHOD` for backward compatibility — that's an unrelated mechanism.
2. **TTL for the process-local SDK client cache?**
   *Resolution:* match `permanent_session_lifetime` (Flask config), with passive eviction on
   each access.
3. **Migration strategy for in-flight sessions:** silent drop vs. warning per dropped sid.
   *Resolution:* warning logged per rejected sid (sid prefix only, to avoid log-leaking
   active sids). Provides operator visibility without information disclosure.
4. **CI guard for `pickle`:** add a lint check that fails CI if `import pickle` reappears
   outside `web/pgadmin/tests/`?
   *Resolution:* yes. Implementation: a single grep-based check in the existing test
   makefile, gated on PR 8.

## 9. Audit summary (referenced from §1.5 and §4.2)

This proposal relies on the following grep audits run against the v9.14 branch
(commit-of-record: head of `fix/pickle-rce` at proposal time). Patterns are listed as
ripgrep-compatible regex.

**Reproducer:** `rg --type py 'PATTERN' PATH` (or equivalently
`grep -rEn --include='*.py' 'PATTERN' PATH`). Re-running these audits on the merge commit is
a PR-8 acceptance criterion (§6.4).

**Audit 1 — symlink-creating primitives:**

```regex
os\.symlink|os\.link\(|symbolic_link|symlink_to|Path\.symlink|\.symlink\(
```

Path: `web/pgadmin/`. Result: **0 matches.**

**Audit 2 — archive extraction (could preserve symlinks from a malicious archive):**

```regex
tarfile\.|zipfile\.|shutil\.unpack_archive|shutil\.copytree|extractall|extract_archive
```

Path: `web/pgadmin/`. Result: **0 matches.**

**Audit 3 — shell-invocation primitives in file_manager:**

```regex
subprocess|os\.popen|os\.system|shell=True
```

Path: `web/pgadmin/misc/file_manager/`. Result: **0 matches.**

**Audit 4 — `os.path.abspath` callers in file_manager:**

```regex
os\.path\.abspath
```

Path: `web/pgadmin/misc/file_manager/__init__.py`. Result: **2 matches** at lines 903 and 1086.

**Audit 5 — directory-creation handlers in file_manager:**

```regex
def (addfolder|add_folder|new_folder|mkdir|create_directory|createfolder)
```

Path: `web/pgadmin/misc/file_manager/`. Result: **1 match** — `addfolder` at line 1232.

**Audit 6 — `os.mkdir` / `os.makedirs` in file_manager:**

```regex
os\.mkdir|os\.makedirs
```

Path: `web/pgadmin/misc/file_manager/`. Result: **1 match** at line 1250 (inside `addfolder`).

These results justify the §1.5 conclusion (no in-pgAdmin symlink primitive) and the §4.2.5
conclusion (exhaustive audit of file_manager path-handling sites).

## 10. References

- Security report: 2026-04-29 (private)
- CVE-2024-2044 — pgAdmin RCE in `SERVER_MODE=False`, earlier versions
- CWE-502 — Deserialization of Untrusted Data
- CWE-61 — UNIX Symbolic Link (Symlink) Following
- CWE-22 — Improper Limitation of a Pathname to a Restricted Directory
- OWASP Top 10 — A08:2021 Software and Data Integrity Failures
- Existing pattern: `web/pgadmin/utils/driver/psycopg3/server_manager.py:519-530` —
  `as_dict()` + module-global live state
- Linux `open(2)` — `O_NOFOLLOW`: refuse to follow symbolic links at the leaf component
