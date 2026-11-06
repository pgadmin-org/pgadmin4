##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""A non-administrator cannot create a shared server through the
servers.json import route, as through the server API and dialog."""

import json
import os
import shutil
import tempfile
from unittest.mock import patch

import config
from pgadmin.model import db, Role, Server, ServerGroup, User
from pgadmin.utils.route import BaseTestGenerator
from regression.test_setup import config_data
from regression.python_test_utils.test_utils import \
    create_user_wise_test_client

test_user_details = None
if config.SERVER_MODE:
    test_user_details = \
        config_data['pgAdmin4_test_non_admin_credentials']

GROUP = 'Import shared server non-admin test group'
HOST = 'evil.example'


def _grant_user_role(test_case, email):
    """Give the test user the stock 'User' role, which carries the import
    and export permission; the test user is created without any role."""
    app = test_case.app
    with app.app_context():
        user = User.query.filter_by(email=email).first()
        role = Role.query.filter_by(name='User').first()
        if role in user.roles:
            return
        user.roles.append(role)
        db.session.commit()

    def revoke():
        with app.app_context():
            user = User.query.filter_by(email=email).first()
            role = Role.query.filter_by(name='User').first()
            if role in user.roles:
                user.roles.remove(role)
                db.session.commit()

    test_case.addCleanup(revoke)


def _evil_count(app):
    with app.app_context():
        return Server.query.filter_by(host=HOST).count()


class NonAdminImportSharedServerTestCase(BaseTestGenerator):
    """The import route refuses a mixed file, and imports nothing from a
    valid file whose only selected server is shared."""

    scenarios = [
        ('Shared server next to an invalid one is refused',
         dict(invalid_entry=True, expected_status=500)),
        ('Selected shared server is skipped from a valid file',
         dict(invalid_entry=False, expected_status=200)),
    ]

    def setUp(self):
        if not config.SERVER_MODE:
            self.skipTest('Sharing only applies to server mode.')
        self.tmp = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.tmp, ignore_errors=True)
        self.addCleanup(self._cleanup)

    def _cleanup(self):
        with self.app.app_context():
            Server.query.filter_by(host=HOST).delete()
            for group in ServerGroup.query.filter_by(name=GROUP).all():
                Server.query.filter_by(servergroup_id=group.id).delete()
                db.session.delete(group)
            db.session.commit()

    @create_user_wise_test_client(test_user_details)
    def runTest(self):
        _grant_user_role(self, test_user_details['login_username'])
        servers = {
            '1': {'Group': GROUP, 'Name': 'evil', 'Shared': True,
                  'Host': HOST, 'Port': 5432, 'SharedUsername': 'postgres',
                  'MaintenanceDB': 'postgres'},
        }
        if self.invalid_entry:
            servers['2'] = {'Group': GROUP, 'Name': 'no host',
                            'Port': 5432, 'Username': 'postgres',
                            'MaintenanceDB': 'postgres'}
        else:
            servers['2'] = {'Group': GROUP, 'Name': 'fine',
                            'Host': 'fine.example', 'Port': 5432,
                            'Username': 'postgres',
                            'MaintenanceDB': 'postgres'}
        path = os.path.join(self.tmp, 'servers.json')
        with open(path, 'w') as f:
            json.dump({'Servers': servers}, f)

        # The import opens the file beneath the storage directory, so make
        # the scratch directory the storage directory.
        with patch('pgadmin.utils.filename_with_file_manager_path',
                   return_value=path), \
                patch('pgadmin.utils.get_file_manager_storage_dir',
                      return_value=self.tmp):
            response = self.tester.post(
                '/import_export_servers/save',
                data=json.dumps({'type': 'import',
                                 'filename': 'servers.json',
                                 'selected_sever_ids': ['1']}),
                content_type='html/json')

        self.assertEqual(response.status_code, self.expected_status,
                         response.data)
        self.assertEqual(_evil_count(self.app), 0)
        with self.app.app_context():
            self.assertEqual(
                ServerGroup.query.filter_by(name=GROUP).count(), 0)
