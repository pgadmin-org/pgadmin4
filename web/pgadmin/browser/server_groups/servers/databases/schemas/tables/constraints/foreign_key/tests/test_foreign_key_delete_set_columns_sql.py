##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""The SQL of a foreign key with ON DELETE SET NULL (col, ...) or SET
DEFAULT (col, ...) keeps its column list (#10815).

PostgreSQL 15 added the column list, stored in pg_constraint.confdelsetcols.
Without it the reverse engineered SQL widens the action to every column of
the key.
"""

import uuid

from pgadmin.browser.server_groups.servers.databases.schemas.tests import \
    utils as schema_utils
from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils


class ForeignKeyDeleteSetColumnsSqlTestCase(BaseTestGenerator):
    """Fetch the foreign key and table SQL of a foreign key whose ON DELETE
    action names a subset of its columns."""

    scenarios = [
        ('Foreign key SQL keeps the ON DELETE SET NULL column list',
         dict(action='SET NULL')),
        ('Foreign key SQL keeps the ON DELETE SET DEFAULT column list',
         dict(action='SET DEFAULT')),
    ]

    def setUp(self):
        super().setUp()
        if self.server_information['server_version'] < 150000:
            self.skipTest('Requires PostgreSQL 15 or later.')

        self.db_name = parent_node_dict["database"][-1]["db_name"]
        schema_info = parent_node_dict["schema"][-1]
        self.server_id = schema_info["server_id"]
        self.db_id = schema_info["db_id"]
        db_con = database_utils.connect_database(self, utils.SERVER_GROUP,
                                                 self.server_id, self.db_id)
        if not db_con['data']["connected"]:
            raise Exception("Could not connect to database.")

        self.schema_id = schema_info["schema_id"]
        self.schema_name = schema_info["schema_name"]
        if not schema_utils.verify_schemas(self.server, self.db_name,
                                           self.schema_name):
            raise Exception("Could not find the schema.")

        suffix = str(uuid.uuid4())[1:8]
        self.ref_table = "fk_setcols_ref_%s" % suffix
        self.local_table = "fk_setcols_local_%s" % suffix
        self.fk_name = "fk_setcols_%s" % suffix

        connection = utils.get_db_connection(
            self.db_name, self.server['username'], self.server['db_password'],
            self.server['host'], self.server['port'], self.server['sslmode'])
        try:
            cursor = connection.cursor()
            cursor.execute(
                "CREATE TABLE {0}.{1} (id int, pid int, "
                "PRIMARY KEY (id, pid))".format(self.schema_name,
                                                self.ref_table))
            cursor.execute(
                "CREATE TABLE {0}.{1} (tenant_id int, "
                "author_id int DEFAULT 0, "
                "CONSTRAINT {2} FOREIGN KEY (tenant_id, author_id) "
                "REFERENCES {0}.{3} ON DELETE {4} (author_id))".format(
                    self.schema_name, self.local_table, self.fk_name,
                    self.ref_table, self.action))
            cursor.execute(
                "SELECT c.oid, c.conrelid FROM pg_catalog.pg_constraint c "
                "WHERE c.conname = %s", (self.fk_name,))
            self.fk_id, self.table_id = cursor.fetchone()
            connection.commit()
        finally:
            connection.close()

    def _get_sql(self, url):
        response = self.tester.get(url, follow_redirects=True)
        self.assertEqual(response.status_code, 200)
        return response.json

    def runTest(self):
        expected = 'ON DELETE {0} (author_id)'.format(self.action)
        base = '{0}/{1}/{2}/{3}/{4}'.format(
            utils.SERVER_GROUP, self.server_id, self.db_id, self.schema_id,
            self.table_id)

        self.assertIn(expected, self._get_sql(
            '/browser/foreign_key/sql/{0}/{1}'.format(base, self.fk_id)))
        self.assertIn(expected, self._get_sql(
            '/browser/table/sql/{0}'.format(base)))

    def tearDown(self):
        connection = utils.get_db_connection(
            self.db_name, self.server['username'], self.server['db_password'],
            self.server['host'], self.server['port'], self.server['sslmode'])
        try:
            cursor = connection.cursor()
            cursor.execute("DROP TABLE IF EXISTS {0}.{1}, {0}.{2}".format(
                self.schema_name, self.local_table, self.ref_table))
            connection.commit()
        finally:
            connection.close()
        database_utils.disconnect_database(self, self.server_id, self.db_id)
