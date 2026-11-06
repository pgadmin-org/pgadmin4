##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
import ssl
import sys
import tempfile
import unittest
from unittest.mock import patch

import certifi
import config
from pgadmin.utils.route import BaseTestGenerator
from pgadmin.utils.tls import ca_file_env, create_ssl_context, get_ca_file


class TestGetCaFile(BaseTestGenerator):
    """Check which CA bundle pgAdmin's outbound HTTPS requests verify
    against. The Python in the macOS app has no usable default CA store, so
    the default must never fall through to it."""

    scenarios = [
        ('An existing CA_FILE is used', dict(ca_file='existing',
                                             expected='existing')),
        ('A missing CA_FILE falls back to certifi',
         dict(ca_file='/nonexistent/cacert.pem', expected='certifi')),
        ('CA_FILE of None selects Python\'s defaults',
         dict(ca_file=None, expected=None)),
        ('An empty CA_FILE selects Python\'s defaults',
         dict(ca_file='', expected=None)),
    ]

    def setUp(self):
        unittest.TestCase.setUp(self)

    def runTest(self):
        with tempfile.NamedTemporaryFile(suffix='.pem') as tmp:
            ca_file = tmp.name if self.ca_file == 'existing' \
                else self.ca_file
            expected = {'existing': tmp.name,
                        'certifi': certifi.where()}.get(self.expected,
                                                        self.expected)
            with patch.object(config, 'CA_FILE', ca_file):
                self.assertEqual(get_ca_file(), expected)
                self.assertEqual(
                    ca_file_env(),
                    {'SSL_CERT_FILE': expected} if expected else {})


class TestCertifiMissing(BaseTestGenerator):
    """Without certifi, a missing CA_FILE leaves Python's defaults."""

    def setUp(self):
        unittest.TestCase.setUp(self)

    def runTest(self):
        with patch.object(config, 'CA_FILE', '/nonexistent/cacert.pem'), \
                patch.dict(sys.modules, {'certifi': None}):
            self.assertIsNone(get_ca_file())


class TestCreateSslContext(BaseTestGenerator):
    """The shared context verifies against get_ca_file() and refuses
    anything older than TLS 1.2."""

    def setUp(self):
        unittest.TestCase.setUp(self)

    def runTest(self):
        with patch.object(config, 'CA_FILE', '/nonexistent/cacert.pem'), \
                patch('pgadmin.utils.tls.ssl.create_default_context',
                      wraps=ssl.create_default_context) as mock_ctx:
            context = create_ssl_context()
        mock_ctx.assert_called_once_with(cafile=certifi.where())
        self.assertEqual(context.verify_mode, ssl.CERT_REQUIRED)
        self.assertTrue(context.check_hostname)
        self.assertEqual(context.minimum_version, ssl.TLSVersion.TLSv1_2)
