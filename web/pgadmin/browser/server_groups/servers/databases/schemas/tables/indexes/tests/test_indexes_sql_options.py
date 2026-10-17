##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Reverse engineered index SQL must preserve opclass options (e.g.
gist_trgm_ops(siglen=32)) and every storage parameter found in the
catalog, including ones pgAdmin does not know about.

https://github.com/pgadmin-org/pgadmin4/issues/9625
"""

import re
import uuid

from pgadmin.browser.server_groups.servers.databases.schemas.tables.columns. \
    tests import utils as columns_utils
from pgadmin.browser.server_groups.servers.databases.schemas.tables.tests \
    import utils as tables_utils
from pgadmin.browser.server_groups.servers.databases.schemas.tests import \
    utils as schema_utils
from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils


class IndexSqlOptionsTestCase(BaseTestGenerator):
    """This class tests sql generated for indexes having opclass options
    or storage parameters unknown to pgAdmin."""

    url = "/browser/index/sql/"
    scenarios = utils.generate_scenarios("index_sql_options", {
        "index_sql_options": [{
            "name": "Index SQL keeps opclass options and all reloptions",
            "is_positive_test": True,
            "inventory_data": {},
            "test_data": {},
            "mocking_required": False,
            "mock_data": {},
            "expected_data": {
                "status_code": 200,
                "error_msg": None,
                "test_result_data": {}
            },
            "is_list": False
        }]
    })

    def setUp(self):
        super().setUp()
        self.db_name = parent_node_dict["database"][-1]["db_name"]
        schema_info = parent_node_dict["schema"][-1]
        self.server_id = schema_info["server_id"]
        self.db_id = schema_info["db_id"]
        db_con = database_utils.connect_database(self, utils.SERVER_GROUP,
                                                 self.server_id, self.db_id)
        if not db_con['data']["connected"]:
            raise Exception("Could not connect to database to add a table.")
        self.schema_id = schema_info["schema_id"]
        self.schema_name = schema_info["schema_name"]
        schema_response = schema_utils.verify_schemas(self.server,
                                                      self.db_name,
                                                      self.schema_name)
        if not schema_response:
            raise Exception("Could not find the schema to add a table.")
        self.table_name = "table_index_options_%s" % (str(uuid.uuid4())[1:8])
        self.table_id = tables_utils.create_table(self.server, self.db_name,
                                                  self.schema_name,
                                                  self.table_name)
        self.column_name = "content"
        columns_utils.create_column(self.server, self.db_name,
                                    self.schema_name, self.table_name,
                                    self.column_name, 'text')

        # Create the indexes with plain SQL: the index dialog supports
        # neither opclass options nor arbitrary storage parameters, which
        # is exactly what this test is about.
        self.opclass_index_name = "idx_opclass_options_%s" % (
            str(uuid.uuid4())[1:8])
        self.relopts_index_name = "idx_all_reloptions_%s" % (
            str(uuid.uuid4())[1:8])
        connection = utils.get_db_connection(self.db_name,
                                             self.server['username'],
                                             self.server['db_password'],
                                             self.server['host'],
                                             self.server['port'])
        old_isolation_level = connection.isolation_level
        utils.set_isolation_level(connection, 0)
        pg_cursor = connection.cursor()
        pg_cursor.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
        pg_cursor.execute(
            'CREATE INDEX {0} ON {1}.{2} USING GIST '
            '({3} gist_trgm_ops(siglen=32))'.format(
                self.opclass_index_name, self.schema_name, self.table_name,
                self.column_name))
        pg_cursor.execute(
            'CREATE INDEX {0} ON {1}.{2} USING btree ({3}) '
            'WITH (fillfactor=70, '
            'vacuum_cleanup_index_scale_factor=0.5)'.format(
                self.relopts_index_name, self.schema_name, self.table_name,
                self.column_name))
        pg_cursor.execute(
            "SELECT cls.oid FROM pg_catalog.pg_class cls "
            "JOIN pg_catalog.pg_namespace nsp ON nsp.oid = cls.relnamespace "
            "WHERE cls.relkind = 'i' AND nsp.nspname = %s "
            "AND cls.relname = ANY(%s)",
            (self.schema_name,
             [self.opclass_index_name, self.relopts_index_name]))
        self.index_ids = [row[0] for row in pg_cursor.fetchall()]
        utils.set_isolation_level(connection, old_isolation_level)
        connection.close()
        if len(self.index_ids) != 2:
            raise Exception("Could not create the test indexes.")

    def get_index_sql(self, index_id):
        response = self.tester.get(
            "{0}{1}/{2}/{3}/{4}/{5}/{6}".format(self.url, utils.SERVER_GROUP,
                                                self.server_id, self.db_id,
                                                self.schema_id, self.table_id,
                                                index_id),
            follow_redirects=True)
        self.assertEqual(response.status_code, 200)
        resp_sql = response.data.decode('unicode_escape')
        if resp_sql.startswith('"') and resp_sql.endswith('"'):
            resp_sql = resp_sql[1:-1]
        # Collapse whitespace so assertions do not depend on template
        # line breaks.
        return re.sub(r'\s+', ' ', resp_sql)

    def runTest(self):
        if self.is_positive_test:
            sql_by_index = dict(
                (idx, self.get_index_sql(idx)) for idx in self.index_ids)
            opclass_sql = None
            relopts_sql = None
            for idx, sql in sql_by_index.items():
                if self.opclass_index_name in sql:
                    opclass_sql = sql
                if self.relopts_index_name in sql:
                    relopts_sql = sql
            self.assertIsNotNone(opclass_sql)
            self.assertIsNotNone(relopts_sql)
            self.assertIn('gist_trgm_ops(siglen=32)', opclass_sql)
            self.assertIn('fillfactor=70', relopts_sql)
            self.assertIn('vacuum_cleanup_index_scale_factor=0.5',
                          relopts_sql)

    def tearDown(self):
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)
