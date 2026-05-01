##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""
Unit tests for the FileBackedSessionManager file format.

These tests validate the HMAC-first file format introduced to close
CVE-pending pickle deserialization RCE. They run as plain unittest
TestCases without needing a Postgres server connection — the file format
logic is pure I/O.
"""

import hashlib
import hmac
import logging
import os
import pickle
import shutil
import tempfile
import unittest
from unittest.mock import patch

from pgadmin.utils.route import BaseTestGenerator
from pgadmin.utils.session import FileBackedSessionManager


SECRET = "test-secret-key-do-not-use-in-prod"
HMAC_HEX_LEN = hashlib.sha256().digest_size * 2  # 64


def compute_test_hmac(body: bytes, secret: str = SECRET) -> bytes:
    """Compute the file-HMAC the way session.py is expected to compute it.

    Mirrors _compute_file_hmac in session.py so tests can construct valid
    and invalid file payloads.
    """
    key = secret.encode() if isinstance(secret, str) else secret
    return hmac.new(key, body, hashlib.sha256).hexdigest().encode()


def write_session_file(path: str, sid: str, body: bytes,
                       header: bytes = None) -> str:
    """Write a session file in the new (header + body) format.

    If `header` is None, computes the correct HMAC over `body`. Pass an
    explicit `header` to construct tampered files.
    Returns the absolute file path.
    """
    fname = os.path.join(path, sid)
    if header is None:
        header = compute_test_hmac(body)
    with open(fname, 'wb') as f:
        f.write(header)
        f.write(body)
    return fname


def write_legacy_session_file(path: str, sid: str,
                              payload: tuple) -> str:
    """Write a session file in the old (header-less, pure pickle) format.

    Used to test migration: old files must be silently rejected by the
    new read path.
    """
    fname = os.path.join(path, sid)
    with open(fname, 'wb') as f:
        pickle.dump(payload, f)
    return fname


def make_pickle_body(randval: str, hmac_digest: str, data: dict) -> bytes:
    """Produce the unencrypted pickle plaintext the file format wraps."""
    return pickle.dumps((randval, hmac_digest, dict(data)), -1)


def make_encrypted_body(randval: str, hmac_digest: str, data: dict,
                        secret: str = SECRET) -> bytes:
    """Produce a Fernet-encrypted body matching the on-disk file shape.

    Mirrors session.py's encrypt-then-MAC build: pickle.dumps -> Fernet
    encrypt -> the result is the body bytes whose HMAC the file format
    stores in the header.
    """
    from pgadmin.utils.session import _derive_session_fernet
    plaintext = make_pickle_body(randval, hmac_digest, data)
    return _derive_session_fernet(secret).encrypt(plaintext)


class _MaliciousPayload:
    """A pickle payload whose __reduce__ creates a sentinel directory.

    Used to prove that pickle.loads is NOT called on attacker-controlled
    bytes when the file-HMAC does not match.
    """

    sentinel_path = None  # set per-test before pickling

    def __reduce__(self):
        return (os.makedirs, (self.sentinel_path, True))


class _SessionTestSetupMixin:
    """Mixin providing common setup for session-format tests.

    Used in MRO with BaseTestGenerator on concrete test classes only —
    the mixin itself is not a TestCase, so it does NOT get auto-registered
    by TestsGeneratorRegistry as a runnable test.

    setUp here calls unittest.TestCase.setUp directly, skipping
    BaseTestGenerator.setUp's Postgres connection (these are pure
    file-format unit tests that don't need a database).
    """

    def setUp(self):
        unittest.TestCase.setUp(self)
        self.tmpdir = tempfile.mkdtemp(prefix="pga_session_test_")
        self.manager = FileBackedSessionManager(
            path=self.tmpdir,
            secret=SECRET,
            disk_write_delay=0,
        )
        # Capture warnings emitted by session.py's logger.
        self._log_records = []
        self._log_handler = self._make_capturing_handler()
        self._session_logger = logging.getLogger(
            "pgadmin.utils.session")
        self._session_logger.addHandler(self._log_handler)
        self._prev_level = self._session_logger.level
        self._session_logger.setLevel(logging.DEBUG)

    def tearDown(self):
        self._session_logger.removeHandler(self._log_handler)
        self._session_logger.setLevel(self._prev_level)
        shutil.rmtree(self.tmpdir, ignore_errors=True)

    def _make_capturing_handler(self):
        outer = self

        class _H(logging.Handler):
            def emit(self, record):
                outer._log_records.append(record)
        return _H()

    def assert_warning_logged(self, substring):
        for r in self._log_records:
            if r.levelno >= logging.WARNING and substring in r.getMessage():
                return
        self.fail(
            "Expected WARNING log containing %r, got: %r" % (
                substring,
                [r.getMessage() for r in self._log_records],
            )
        )

    def assert_no_warning_logged(self, substring):
        for r in self._log_records:
            if r.levelno >= logging.WARNING and substring in r.getMessage():
                self.fail(
                    "Unexpected WARNING containing %r: %r" % (
                        substring, r.getMessage()))


# ---------------------------------------------------------------------------
# Positive tests — legitimate flows must continue to work.
# ---------------------------------------------------------------------------

class TestSessionRoundTrip(_SessionTestSetupMixin, BaseTestGenerator):
    """A session written via put() must be readable via get()."""

    scenarios = [('default', dict())]

    def runTest(self):
        sess = self.manager.new_session()
        sess.sid = "11111111-1111-1111-1111-111111111111"
        sess['user_id'] = 42
        sess['_csrf_token'] = "abc123"
        # Pre-sign so put() has hmac_digest populated and stable across reads.
        sess.sign(SECRET)
        self.manager.put(sess)

        loaded = self.manager.get(sess.sid, sess.hmac_digest)

        self.assertEqual(loaded.sid, sess.sid)
        self.assertEqual(loaded['user_id'], 42)
        self.assertEqual(loaded['_csrf_token'], "abc123")
        self.assertEqual(loaded.randval, sess.randval)
        self.assertEqual(loaded.hmac_digest, sess.hmac_digest)


class TestMultipleSessionsAreIndependent(_SessionTestSetupMixin, BaseTestGenerator):
    """Two sessions must not bleed data into each other."""

    scenarios = [('default', dict())]

    def runTest(self):
        sess_a = self.manager.new_session()
        sess_a.sid = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
        sess_a['name'] = 'alice'
        sess_a.sign(SECRET)
        self.manager.put(sess_a)

        sess_b = self.manager.new_session()
        sess_b.sid = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
        sess_b['name'] = 'bob'
        sess_b.sign(SECRET)
        self.manager.put(sess_b)

        loaded_a = self.manager.get(sess_a.sid, sess_a.hmac_digest)
        loaded_b = self.manager.get(sess_b.sid, sess_b.hmac_digest)

        self.assertEqual(loaded_a['name'], 'alice')
        self.assertEqual(loaded_b['name'], 'bob')


class TestSessionUpdatePersists(_SessionTestSetupMixin, BaseTestGenerator):
    """A modified session, re-put, must round-trip the updated data."""

    scenarios = [('default', dict())]

    def runTest(self):
        sess = self.manager.new_session()
        sess.sid = "cccccccc-cccc-cccc-cccc-cccccccccccc"
        sess['count'] = 1
        sess.sign(SECRET)
        self.manager.put(sess)

        sess['count'] = 2
        # disk_write_delay=0 so put() writes immediately
        self.manager.put(sess)

        loaded = self.manager.get(sess.sid, sess.hmac_digest)
        self.assertEqual(loaded['count'], 2)


# ---------------------------------------------------------------------------
# Negative tests — malicious / corrupted / unexpected files must be rejected
# without executing any unverified bytes.
# ---------------------------------------------------------------------------

class TestMaliciousPickleNoHeader(_SessionTestSetupMixin, BaseTestGenerator):
    """Spec T1: pre-fix-format pickle file in sessions dir is NOT executed.

    A legacy session file is pure pickle bytes (no HMAC header). The new
    read path must not invoke pickle.loads on the file body before HMAC
    verification.
    """

    scenarios = [('default', dict())]

    def runTest(self):
        sentinel = os.path.join(self.tmpdir, "RCE_SENTINEL_DIR")
        _MaliciousPayload.sentinel_path = sentinel
        # Construct legacy-format file: just pickle.dumps of a malicious tuple
        # (the location pre-fix code reads via pickle.load).
        sid = "dddddddd-dddd-dddd-dddd-dddddddddddd"
        legacy_payload = (
            "fake_randval", "fake_hmac",
            {"evil": _MaliciousPayload()},
        )
        write_legacy_session_file(self.tmpdir, sid, legacy_payload)

        result = self.manager.get(sid, "fake_hmac")

        self.assertFalse(
            os.path.exists(sentinel),
            "RCE primitive fired — pickle was deserialized before HMAC check"
        )
        # Got a fresh session, not the malicious one.
        self.assertIsNone(result.get("evil"))
        self.assert_warning_logged("session file rejected")


class TestCorruptedHmacHeader(_SessionTestSetupMixin, BaseTestGenerator):
    """Spec T2: a tampered header is rejected with a warning."""

    scenarios = [('default', dict())]

    def runTest(self):
        sid = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee"
        body = make_encrypted_body("rv", "digest", {"k": "v"})
        good_header = compute_test_hmac(body)
        # Flip the first byte of the header.
        bad_header = bytes(
            [(good_header[0] ^ 0x01)]) + good_header[1:]
        write_session_file(self.tmpdir, sid, body, header=bad_header)

        result = self.manager.get(sid, "digest")

        # HMAC mismatch returns new_session before Fernet decrypt is even
        # attempted — same observable result, the warning is the
        # discriminator.
        self.assertNotEqual(result.hmac_digest, "digest")
        self.assert_warning_logged("session file rejected")


class TestEmptyFilePassthrough(_SessionTestSetupMixin, BaseTestGenerator):
    """Spec T3: a 0-byte placeholder (from new_session) must NOT warn."""

    scenarios = [('default', dict())]

    def runTest(self):
        sid = "ffffffff-ffff-ffff-ffff-ffffffffffff"
        # Empty file — what new_session() leaves on disk before the first put.
        with open(os.path.join(self.tmpdir, sid), 'wb'):
            pass

        result = self.manager.get(sid, "anything")

        self.assertIsNone(result.hmac_digest)
        self.assert_no_warning_logged("session file rejected")


class TestTruncatedHeader(_SessionTestSetupMixin, BaseTestGenerator):
    """A file shorter than the header length is silently discarded."""

    scenarios = [('default', dict())]

    def runTest(self):
        sid = "10101010-1010-1010-1010-101010101010"
        with open(os.path.join(self.tmpdir, sid), 'wb') as f:
            f.write(b"a" * (HMAC_HEX_LEN - 1))  # 1 byte short

        result = self.manager.get(sid, "anything")

        self.assertIsNone(result.hmac_digest)
        # Truncation is indistinguishable from "old format" for our purposes;
        # no warning to avoid noise during upgrade rollout.
        self.assert_no_warning_logged("session file rejected")


class TestValidHeaderEmptyBody(_SessionTestSetupMixin, BaseTestGenerator):
    """A file with header bytes but empty body is silently discarded."""

    scenarios = [('default', dict())]

    def runTest(self):
        sid = "20202020-2020-2020-2020-202020202020"
        # Exactly HMAC_HEX_LEN bytes of header, zero bytes of body.
        with open(os.path.join(self.tmpdir, sid), 'wb') as f:
            f.write(b"a" * HMAC_HEX_LEN)

        result = self.manager.get(sid, "anything")

        self.assertIsNone(result.hmac_digest)
        self.assert_no_warning_logged("session file rejected")


class TestCookieHmacMismatchWithValidFile(_SessionTestSetupMixin, BaseTestGenerator):
    """Spec T8: a legitimate file but a cookie that doesn't bind to it.

    The file-HMAC verifies the file is server-written; the cookie-HMAC
    verifies the cookie matches THIS session. Both checks remain.
    """

    scenarios = [('default', dict())]

    def runTest(self):
        sid = "30303030-3030-3030-3030-303030303030"
        body = make_encrypted_body("rv", "real_digest", {"k": "v"})
        write_session_file(self.tmpdir, sid, body)  # valid file-HMAC

        # Caller presents the wrong cookie digest.
        result = self.manager.get(sid, "wrong_digest")

        # New session returned — but no file-HMAC warning, because the file
        # itself was fine (HMAC verified, Fernet decrypted successfully,
        # the cookie/file binding check is what failed).
        self.assertNotEqual(result.hmac_digest, "real_digest")
        self.assert_no_warning_logged("session file rejected")


class TestUnsafeSidReturnsNewSession(_SessionTestSetupMixin, BaseTestGenerator):
    """A sid containing path-traversal characters yields safe_join None."""

    scenarios = [('default', dict())]

    def runTest(self):
        # safe_join refuses these — get() must return new_session, not crash.
        for unsafe_sid in ("../../etc/passwd", "/absolute/path", ""):
            with self.subTest(sid=unsafe_sid):
                result = self.manager.get(unsafe_sid, "anything")
                self.assertIsNone(result.hmac_digest)


class TestEmptySecretRaises(BaseTestGenerator):
    """Constructing a manager with empty SECRET_KEY must fail loudly."""

    scenarios = [('default', dict())]

    def setUp(self):
        unittest.TestCase.setUp(self)
        self.tmpdir = tempfile.mkdtemp(prefix="pga_session_test_")

    def tearDown(self):
        shutil.rmtree(self.tmpdir, ignore_errors=True)

    def runTest(self):
        for empty in ("", None):
            with self.subTest(secret=empty):
                with self.assertRaises(RuntimeError):
                    FileBackedSessionManager(
                        path=self.tmpdir,
                        secret=empty,
                        disk_write_delay=0,
                    )


class TestRealisticSessionShapeRoundTrip(_SessionTestSetupMixin, BaseTestGenerator):
    """Round-trip a session with realistic pgAdmin contents (MFA, OAuth2, etc.).

    Spec test 7: MFA fields are JSON-safe but exercise them through put/get
    to confirm the format change preserves the data structures pgAdmin
    actually stashes in flask.session. Full MFA login flow is covered by
    §4.3.3 manual verification (separate from this unit test).
    """

    scenarios = [('default', dict())]

    def runTest(self):
        sess = self.manager.new_session()
        sess.sid = "50505050-5050-5050-5050-505050505050"
        # Mirror the shape of fields seen across pgadmin/authenticate/mfa/*,
        # pgadmin/authenticate/oauth2.py, pgadmin/__init__.py, etc.
        sess.update({
            '_user_id': '1',
            '_csrf_token': 'a' * 40,
            'mfa_authenticated': True,
            'mfa_email_id': 'user@example.com',
            'mfa_email_code': '123456',
            'mfa_authenticator_opt': 'totp',
            'oauth2_token': {
                'access_token': 'a' * 60,
                'token_type': 'Bearer',
                'expires_in': 3600,
                'id_token': 'b' * 200,
            },
            'auth_source_manager': {
                'current_source': 'internal',
                'sources': ['internal'],
            },
            'allow_save_password': True,
            'pass_enc_key': 'c' * 32,
            'fileManagerData': {
                'last_path': '/var/lib/pgadmin/storage/alice/',
            },
        })
        sess.sign(SECRET)
        self.manager.put(sess)

        loaded = self.manager.get(sess.sid, sess.hmac_digest)

        self.assertEqual(loaded['_user_id'], '1')
        self.assertTrue(loaded['mfa_authenticated'])
        self.assertEqual(loaded['mfa_email_id'], 'user@example.com')
        self.assertEqual(
            loaded['oauth2_token']['access_token'], 'a' * 60)
        self.assertEqual(
            loaded['auth_source_manager']['current_source'], 'internal')
        self.assertEqual(
            loaded['fileManagerData']['last_path'],
            '/var/lib/pgadmin/storage/alice/')


class TestSessionFileMode0o600(_SessionTestSetupMixin, BaseTestGenerator):
    """Session files must be created with mode 0o600 (owner-only).

    Session contents include OAuth access/refresh tokens, cloud
    credentials (AWS/Google/Azure/BigAnimal), the Kerberos cache path,
    MFA OTP material, and `pass_enc_key` (which decrypts the user's
    saved Postgres server passwords). The default open(path, 'wb') uses
    the process umask, which on most systems leaves files 0o644
    (world-readable). Verify both put() and new_session() create files
    with mode 0o600.
    """

    scenarios = [('default', dict())]

    def runTest(self):
        if os.name == 'nt':
            self.skipTest("POSIX mode bits not meaningful on Windows")

        # put() path
        sess = self.manager.new_session()
        sess.sid = "60606060-6060-6060-6060-606060606060"
        sess['k'] = 'v'
        sess.sign(SECRET)
        self.manager.put(sess)
        put_path = os.path.join(self.tmpdir, sess.sid)
        put_mode = os.stat(put_path).st_mode & 0o777
        self.assertEqual(
            put_mode, 0o600,
            "put() must create session file mode 0o600, got 0o%o" % put_mode)

        # new_session() touch path. Force a worktree where new_session
        # actually writes the placeholder (default skip_paths is empty).
        new_sess = self.manager.new_session()
        new_path = os.path.join(self.tmpdir, new_sess.sid)
        if os.path.exists(new_path):
            new_mode = os.stat(new_path).st_mode & 0o777
            self.assertEqual(
                new_mode, 0o600,
                "new_session() touch must create file mode 0o600, "
                "got 0o%o" % new_mode)


class TestServerModeFalseDirectUpload(_SessionTestSetupMixin, BaseTestGenerator):
    """Spec T10: Scenario A chain closed at the session-read layer.

    Even if SERVER_MODE=False permits an upload directly into the sessions
    directory, the file-HMAC check rejects the resulting file and pickle is
    never deserialized.
    """

    scenarios = [('default', dict())]

    def runTest(self):
        sentinel = os.path.join(self.tmpdir, "SCENARIO_A_SENTINEL")
        _MaliciousPayload.sentinel_path = sentinel
        # Simulate the file the attacker would have written via Scenario A:
        # legacy-format pickle (no HMAC header).
        sid = "40404040-4040-4040-4040-404040404040"
        write_legacy_session_file(
            self.tmpdir, sid,
            ("rv", "fake", {"x": _MaliciousPayload()}),
        )

        result = self.manager.get(sid, "fake")

        self.assertFalse(os.path.exists(sentinel))
        self.assertIsNone(result.get("x"))
        self.assert_warning_logged("session file rejected")


# ---------------------------------------------------------------------------
# Layer-1 confidentiality — bytes on disk are encrypted, not plaintext.
# ---------------------------------------------------------------------------

class TestSessionBodyIsEncryptedOnDisk(
        _SessionTestSetupMixin, BaseTestGenerator):
    """A sentinel value placed in the session must NOT appear in the
    on-disk file as plaintext.

    Confidentiality assertion: the file contains the HMAC header (ASCII
    hex) followed by Fernet ciphertext. A leak of the file alone (without
    SECRET_KEY) does not expose the user's secrets.
    """

    scenarios = [('default', dict())]

    def runTest(self):
        sentinel = b'AKIA_VERY_SPECIFIC_SECRET_TOKEN_XYZ_12345'
        sess = self.manager.new_session()
        sess.sid = "70707070-7070-7070-7070-707070707070"
        sess['fake_aws_key'] = sentinel.decode()
        sess.sign(SECRET)
        self.manager.put(sess)

        with open(os.path.join(self.tmpdir, sess.sid), 'rb') as f:
            on_disk = f.read()

        self.assertNotIn(
            sentinel, on_disk,
            "Session value appeared in plaintext on disk; the body is "
            "not encrypted.")
        # Round-trip still works.
        loaded = self.manager.get(sess.sid, sess.hmac_digest)
        self.assertEqual(loaded['fake_aws_key'], sentinel.decode())


class TestSessionBodyRejectedWithDifferentSecret(
        _SessionTestSetupMixin, BaseTestGenerator):
    """A session written under SECRET_KEY=A is unreadable under SECRET_KEY=B.

    Confidentiality assertion: the encryption key actually depends on
    SECRET_KEY (this rules out trivial bugs like a hard-coded key).
    """

    scenarios = [('default', dict())]

    def runTest(self):
        sess = self.manager.new_session()
        sess.sid = "80808080-8080-8080-8080-808080808080"
        sess['x'] = 'y'
        sess.sign(SECRET)
        self.manager.put(sess)

        # Manager bound to a *different* secret reading the same file.
        other_manager = FileBackedSessionManager(
            path=self.tmpdir,
            secret='COMPLETELY_DIFFERENT_KEY',
            disk_write_delay=0,
        )
        result = other_manager.get(sess.sid, sess.hmac_digest)

        # The HMAC check uses SECRET_KEY too, so this is rejected at the
        # HMAC layer (not Fernet) — but the property under test
        # (different SECRET_KEY = no access) holds either way.
        self.assertIsNone(result.hmac_digest)


class TestLegacyHmacOnlyFileRejected(
        _SessionTestSetupMixin, BaseTestGenerator):
    """A pre-Layer-1 session file (HMAC over plain pickle, no Fernet) is
    rejected with a clear log message.

    Layer-1 backwards-compat: existing session files written before this
    layer was added are gracefully invalidated; users see a one-time
    re-login on upgrade.
    """

    scenarios = [('default', dict())]

    def runTest(self):
        sid = "90909090-9090-9090-9090-909090909090"
        # Build a pre-Layer-1 file: plain pickle body, valid HMAC over it.
        plain = make_pickle_body("rv", "digest", {"x": "y"})
        write_session_file(self.tmpdir, sid, plain)

        result = self.manager.get(sid, "digest")
        self.assertIsNone(result.hmac_digest)
        self.assert_warning_logged("legacy unencrypted body")
