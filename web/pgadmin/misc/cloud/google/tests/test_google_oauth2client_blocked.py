##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""
Regression test for issue #10110.

On packaged installs the venv inherits the system site-packages
(--system-site-packages, see issue #7173). When a stale ``oauth2client``
and an incompatible ``pyOpenSSL`` live there, googleapiclient's optional
``import oauth2client`` drags in the broken pyOpenSSL and aborts pgAdmin
startup with "module 'lib' has no attribute 'GEN_EMAIL'".

The cloud.google module guards against this by parking a ``None`` sentinel
under ``sys.modules['oauth2client']`` before importing googleapiclient, so
the optional import fails cleanly and google-auth is used instead.
"""

import sys
import unittest

from pgadmin.utils.route import BaseTestGenerator


class _SkipServerSetUpMixin:
    """Skip BaseTestGenerator's Postgres connection — pure logic tests."""

    def setUp(self):
        unittest.TestCase.setUp(self)


class TestOauth2ClientBlockedOnGoogleImport(
        _SkipServerSetUpMixin, BaseTestGenerator):
    """Importing cloud.google must keep googleapiclient off oauth2client."""

    scenarios = (('default', {}),)

    def runTest(self):
        # Importing the module installs the sentinel as a side effect.
        import pgadmin.misc.cloud.google  # noqa: F401

        # The sentinel must be in place so googleapiclient never imports
        # the deprecated oauth2client (and the pyOpenSSL it would pull in).
        self.assertIsNone(
            sys.modules.get('oauth2client', 'missing'),
            "cloud.google must park a None sentinel under "
            "sys.modules['oauth2client'] to block the optional import")

        # googleapiclient must consequently report no oauth2client support.
        import googleapiclient._auth as _auth
        self.assertFalse(
            _auth.HAS_OAUTH2CLIENT,
            "googleapiclient must fall back to google-auth, not oauth2client")
