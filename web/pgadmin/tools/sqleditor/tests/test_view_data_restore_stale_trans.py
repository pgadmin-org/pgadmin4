##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import uuid
import pickle
import secrets
from pgadmin.utils.route import BaseTestGenerator
from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from regression import parent_node_dict
from regression.python_test_utils import test_utils
from pgadmin.tools.sqleditor.command import QueryToolCommand


class TestViewDataRestoreStaleTransObj(BaseTestGenerator):
    """
    Regression test for issue #9744.

    When View/Edit Data initialises a transaction it tries to restore the
    filter/sorting from any command object previously stored in the session
    under the same trans_id. That stored object is not always a filter-capable
    (View/Edit Data) command - the same trans_id may have been used by the
    Query Tool, or the session may contain an incompatible object persisted by
    an older version after an upgrade. In those cases the object has no
    _row_filter/_data_sorting attributes, and blindly accessing them raised an
    AttributeError that returned a 500 and, in desktop mode, prevented the
    application from loading.

    This test seeds the session with a pickled QueryToolCommand (which is what
    a restored Query Tool transaction leaves in session['gridData']) under the
    trans_id used to initialise View/Edit Data, and asserts the request
    succeeds instead of crashing.
    """
    scenarios = [
        ('Initialize View/Edit Data over a stale non-filter trans object',
         dict())
    ]

    def setUp(self):
        self.server_id = self.server_information['server_id']
        self.database_info = parent_node_dict["database"][-1]
        self.db_name = self.database_info["db_name"]
        self.db_id = self.database_info["db_id"]

        self.connection = test_utils.get_db_connection(
            self.db_name,
            self.server['username'],
            self.server['db_password'],
            self.server['host'],
            self.server['port']
        )

        db_con = database_utils.connect_database(self, test_utils.SERVER_GROUP,
                                                 self.server_id, self.db_id)
        if not db_con["info"] == "Database connected.":
            raise Exception("Could not connect to the database.")

    def runTest(self):
        self.table = "test_table_%s" % (str(uuid.uuid4())[1:8])
        table_sql = """Create Table %s(
            id integer Not Null,
            Constraint table_pk Primary Key(id)
            );""" % self.table
        test_utils.create_table_with_query(self.server, self.db_name,
                                           table_sql)

        # Fetch the table OID
        pg_cursor = self.connection.cursor()
        pg_cursor.execute("""Select oid FROM pg_catalog.pg_class WHERE
         relname = '%s' AND relkind IN ('r','s','t')""" % self.table)
        table_id = pg_cursor.fetchall()[0][0]

        trans_id = str(secrets.choice(range(1, 9999999)))

        # Build a QueryToolCommand - the kind of object the Query Tool stores
        # in session['gridData'] - and give it the same did/obj_id as the
        # table so the restore guard in initialize_viewdata is reached. A
        # QueryToolCommand has no _row_filter attribute, which is what
        # previously triggered the AttributeError.
        stale_obj = QueryToolCommand(
            sgid=test_utils.SERVER_GROUP, sid=self.server_id, did=self.db_id)
        stale_obj.obj_id = table_id

        with self.tester.session_transaction() as sess:
            grid_data = sess.get('gridData', {})
            grid_data[trans_id] = {
                'command_obj': pickle.dumps(stale_obj, -1)
            }
            sess['gridData'] = grid_data

        url = '/sqleditor/initialize/viewdata/{0}/3/table/{1}/{2}/{3}/{4}' \
            .format(trans_id, test_utils.SERVER_GROUP, self.server_id,
                    self.db_id, table_id)
        response = self.tester.post(url)

        # Before the fix this returned 500 with:
        #   'QueryToolCommand' object has no attribute '_row_filter'
        self.assertEqual(response.status_code, 200)

    def tearDown(self):
        self.connection.cursor().execute(
            "DROP TABLE IF EXISTS %s" % self.table)
        self.connection.commit()
        self.connection.close()
        database_utils.disconnect_database(self, self.server_id,
                                           self.db_id)
