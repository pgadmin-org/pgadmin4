##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""
Check that starting a new Azure authentication discards the device code
from an earlier attempt (#9921), so the wizard does not poll it back and
show the user a code that is no longer valid.
"""

import json
import unittest
from unittest.mock import MagicMock, patch

from flask import Flask, session

from pgadmin.utils.route import BaseTestGenerator


class TestAzureVerifyCredentialsDropsStaleAuthCode(BaseTestGenerator):
    """A new authentication attempt removes the previous device code."""

    scenarios = [('default', dict())]

    def setUp(self):
        # Pure logic test; skip BaseTestGenerator's server connection.
        unittest.TestCase.setUp(self)

    def runTest(self):
        import pgadmin.misc.cloud.azure as azure_mod

        seen_codes = []
        instance = MagicMock()
        instance.to_state.return_value = {'tenant_id': 'new-tenant'}

        def _validate():
            # Record what get_azure_verification_codes() would return
            # whilst this attempt is waiting for the user.
            seen_codes.append(session['azure'].get('azure_auth_code'))
            return True, ''

        instance.validate_azure_credentials.side_effect = _validate
        azure_cls = MagicMock(return_value=instance)

        app = Flask(__name__)
        app.secret_key = 'test'
        data = {'secret': {'auth_type': 'interactive_browser_credential',
                           'azure_tenant_id': 'new-tenant'}}
        with app.test_request_context(
                '/azure/verify_credentials/', method='POST',
                data=json.dumps(data), content_type='application/json'), \
                patch.object(azure_mod, 'Azure', azure_cls):
            session['azure'] = {
                'auth_type': 'interactive_browser_credential',
                'azure_tenant_id': 'old-tenant',
                'state': {'tenant_id': 'old-tenant'},
                'azure_auth_code': {'user_code': 'OLDCODE1'},
            }

            azure_mod.verify_credentials.__wrapped__()

            self.assertEqual(seen_codes, [None])
            self.assertEqual(session['azure']['azure_tenant_id'],
                             'new-tenant')
