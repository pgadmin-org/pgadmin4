##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import json
import secrets
import uuid

from psycopg import sql

from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils


class TestAutocompleteAfterConnectionChange(BaseTestGenerator):
    """
    Autocomplete must keep working, as the newly selected user, after the
    Query Tool connection is changed to a different user (issue #7619).
    """
    scenarios = [
        ('Autocomplete after changing the connection user', dict(
            reconnect=False)),
        # The supplied password is not kept, so give the role the server's
        # password, which the reconnect can still use; without the stored
        # login it would reconnect as the server's own user instead.
        ('Autocomplete reconnects as the changed user', dict(
            reconnect=True)),
    ]

    def setUp(self):
        database_info = parent_node_dict["database"][-1]
        self.db_name = database_info["db_name"]
        self.server_id = database_info["server_id"]
        self.db_id = database_info["db_id"]
        db_con = database_utils.connect_database(self,
                                                 utils.SERVER_GROUP,
                                                 self.server_id,
                                                 self.db_id)
        if not db_con["info"] == "Database connected.":
            raise Exception("Could not connect to the database.")

        self.role_name = 'test_ac_role_%s' % str(uuid.uuid4())[1:8]
        self.role_password = self.server['db_password'] \
            if self.reconnect else 'test_ac_%s' % str(uuid.uuid4())[1:8]
        self.marker_table = 'ac_marker_%s' % str(uuid.uuid4())[1:8]

        connection = self._get_admin_connection()
        utils.set_isolation_level(connection, 0)
        cursor = connection.cursor()
        role = sql.Identifier(self.role_name)
        cursor.execute(sql.SQL('CREATE ROLE {} LOGIN PASSWORD {}').format(
            role, sql.Literal(self.role_password)))
        # A table only the new role can see, so we can tell which user the
        # autocomplete connection is logged in as.
        cursor.execute(sql.SQL('CREATE SCHEMA {} AUTHORIZATION {}').format(
            role, role))
        table = sql.Identifier(self.role_name, self.marker_table)
        cursor.execute(sql.SQL('CREATE TABLE {} (id int)').format(table))
        cursor.execute(sql.SQL('ALTER TABLE {} OWNER TO {}').format(
            table, role))
        connection.close()

        self.trans_id = str(secrets.choice(range(1, 9999999)))
        url = '/sqleditor/initialize/sqleditor/{0}/{1}/{2}/{3}'.format(
            self.trans_id, utils.SERVER_GROUP, self.server_id, self.db_id)
        response = self.tester.post(url, data=json.dumps({
            "dbname": self.db_name
        }))
        self.assertEqual(response.status_code, 200)

    def runTest(self):
        url = ('/sqleditor/initialize/sqleditor/update_connection/'
               '{0}/{1}/{2}/{3}').format(self.trans_id, utils.SERVER_GROUP,
                                         self.server_id, self.db_id)
        response = self.tester.post(url, data=json.dumps({
            'user': self.role_name,
            'role': None,
            'password': self.role_password,
            'database_name': self.db_name,
        }), content_type='html/json')
        self.assertEqual(response.status_code, 200)
        self.trans_id = json.loads(
            response.data.decode('utf-8'))['data']['trans_id']

        data = self._autocomplete()

        if self.reconnect:
            # Drop the role's connections behind pgAdmin's back. The first
            # request notices the loss, the next one reconnects.
            self._terminate_role_backends()
            self.assertEqual(self._post_autocomplete().status_code, 503)
            data = self._autocomplete()
            # Only the autocomplete connection has been reopened, and it
            # must be logged in as the changed user, not the server's own.
            self.assertEqual(self._count_role_backends(), 1)

        self.assertTrue(data['status'], data['result'])
        # The new role's own schema is first in its search_path ("$user"),
        # so its table is only offered unqualified when autocomplete is
        # connected as that role.
        self.assertIn(self.marker_table, data['result'])

    def tearDown(self):
        self.tester.delete('/sqleditor/close/{0}'.format(self.trans_id))
        database_utils.disconnect_database(self, self.server_id, self.db_id)

        connection = self._get_admin_connection()
        utils.set_isolation_level(connection, 0)
        cursor = connection.cursor()
        cursor.execute(
            'SELECT pg_terminate_backend(pid) FROM pg_stat_activity '
            'WHERE usename = %s', (self.role_name,))
        role = sql.Identifier(self.role_name)
        cursor.execute(
            sql.SQL('DROP SCHEMA IF EXISTS {} CASCADE').format(role))
        cursor.execute(sql.SQL('DROP ROLE IF EXISTS {}').format(role))
        connection.close()

    def _post_autocomplete(self):
        sql = 'SELECT * FROM '
        return self.tester.post(
            '/sqleditor/autocomplete/{0}'.format(self.trans_id),
            data=json.dumps([sql, sql]), content_type='html/json')

    def _autocomplete(self):
        response = self._post_autocomplete()
        self.assertEqual(response.status_code, 200)
        return json.loads(response.data.decode('utf-8'))['data']

    def _terminate_role_backends(self):
        connection = self._get_admin_connection()
        utils.set_isolation_level(connection, 0)
        connection.cursor().execute(
            'SELECT pg_terminate_backend(pid) FROM pg_stat_activity '
            'WHERE usename = %s', (self.role_name,))
        connection.close()

    def _count_role_backends(self):
        connection = self._get_admin_connection()
        cursor = connection.cursor()
        cursor.execute(
            'SELECT count(*) FROM pg_stat_activity WHERE usename = %s',
            (self.role_name,))
        count = int(cursor.fetchone()[0])
        connection.close()
        return count

    def _get_admin_connection(self):
        return utils.get_db_connection(
            self.db_name,
            self.server['username'],
            self.server['db_password'],
            self.server['host'],
            self.server['port'],
            self.server['sslmode']
        )


class TestHasCustomCredentials(BaseTestGenerator):
    """
    Decide when the autocomplete connection must be opened eagerly because
    the lazy path could not reproduce the supplied credentials.
    """
    scenarios = [
        ('Server defaults', dict(
            kwargs={'user': 'postgres', 'role': None, 'password': None},
            expected=False)),
        ('No user supplied', dict(
            kwargs={'user': None, 'role': '', 'password': None},
            expected=False)),
        ('Different user', dict(
            kwargs={'user': 'alice', 'role': None, 'password': None},
            expected=True)),
        ('Different role', dict(
            kwargs={'user': 'postgres', 'role': 'reader', 'password': None},
            expected=True)),
        ('Same role as the server', dict(
            kwargs={'user': 'postgres', 'role': 'admin', 'password': None},
            expected=False)),
        ('Password supplied', dict(
            kwargs={'user': 'postgres', 'role': None, 'password': 'secret'},
            expected=True)),
    ]

    def setUp(self):
        pass

    def runTest(self):
        from unittest.mock import MagicMock
        from pgadmin.tools.sqleditor import _has_custom_credentials

        manager = MagicMock(user='postgres', role='admin')
        self.assertEqual(
            _has_custom_credentials(manager, **self.kwargs), self.expected)
