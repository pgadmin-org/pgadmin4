##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Tests for ServerGroup data isolation between users in server mode."""

import json
import config
from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils as utils
from regression.test_setup import config_data
from regression.python_test_utils.test_utils import \
    create_user_wise_test_client
from pgadmin.model import db, ServerGroup

test_user_details = None
if config.SERVER_MODE:
    test_user_details = \
        config_data['pgAdmin4_test_non_admin_credentials']


class ServerGroupIsolationTestCase(BaseTestGenerator):
    """Verify that a non-admin user cannot fetch another user's
    server group properties by ID."""

    scenarios = [
        ('User B cannot fetch User A server group properties',
         dict(is_positive_test=False)),
    ]

    def setUp(self):
        self.sg_id = None
        if not config.SERVER_MODE:
            self.skipTest(
                'Data isolation tests only apply to server mode.'
            )

        # Create a server group as the admin user
        url = '/browser/server_group/obj/'
        response = self.tester.post(
            url,
            data=json.dumps({'name': 'isolation_test_group'}),
            content_type='html/json'
        )
        self.assertEqual(response.status_code, 200)
        response_data = json.loads(response.data.decode('utf-8'))
        self.assertIn('node', response_data)
        self.sg_id = response_data['node']['_id']

    @create_user_wise_test_client(test_user_details)
    def runTest(self):
        """Non-admin user should NOT see another user's server
        group properties."""
        if not self.sg_id:
            raise Exception("Server group not created")

        url = '/browser/server_group/obj/{0}'.format(self.sg_id)
        response = self.tester.get(url, content_type='html/json')
        self.assertEqual(
            response.status_code, 410,
            'Non-admin user should not access another user\'s '
            'server group. Got status {0}'.format(
                response.status_code)
        )

    def tearDown(self):
        # Clean up with admin
        if self.sg_id is None:
            return
        sg = ServerGroup.query.filter_by(id=self.sg_id).first()
        if sg:
            db.session.delete(sg)
            db.session.commit()
