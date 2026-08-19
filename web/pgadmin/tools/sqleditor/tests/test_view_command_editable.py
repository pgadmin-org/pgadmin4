##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""
Tests for ViewCommand.can_edit()/get_primary_keys()/save() - the
"View/Edit Data" grid support for simple auto-updatable views
(issue #2363 / RM #3997).
"""

import json
import secrets

from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from pgadmin.tools.sqleditor.tests.execute_query_test_utils import \
    async_poll

# cmd_type value for "All Rows", same as VIEW_ALL_ROWS in
# pgadmin.tools.sqleditor.command.
VIEW_ALL_ROWS = 3


class TestViewCommandEditable(BaseTestGenerator):
    """ This class tests whether ViewCommand.can_edit() correctly
    classifies simple auto-updatable views as editable, and that an
    actual save() through an editable view lands in the base table. """

    scenarios = [
        ('Simple 1:1 view is editable', dict(
            setup_sql="""
                CREATE TABLE {base1} (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(50)
                );
                INSERT INTO {base1} (id, name) VALUES (1, 'foo');
                CREATE VIEW {view} AS SELECT id, name FROM {base1};
            """,
            teardown_sql="""
                DROP VIEW IF EXISTS {view};
                DROP TABLE IF EXISTS {base1};
            """,
            view_key='view',
            obj_type='view',
            expected_can_edit=True,
            expected_primary_keys={'id': 'int4'},
            do_save=True,
        )),
        ('View omitting the primary key column is not editable', dict(
            setup_sql="""
                CREATE TABLE {base1} (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(50)
                );
                INSERT INTO {base1} (id, name) VALUES (1, 'foo');
                CREATE VIEW {view} AS SELECT name FROM {base1};
            """,
            teardown_sql="""
                DROP VIEW IF EXISTS {view};
                DROP TABLE IF EXISTS {base1};
            """,
            view_key='view',
            obj_type='view',
            expected_can_edit=False,
            expected_primary_keys=None,
            do_save=False,
        )),
        ('View with a WHERE clause is still editable', dict(
            setup_sql="""
                CREATE TABLE {base1} (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(50)
                );
                INSERT INTO {base1} (id, name) VALUES (1, 'foo');
                CREATE VIEW {view} AS
                    SELECT id, name FROM {base1} WHERE id > 0;
            """,
            teardown_sql="""
                DROP VIEW IF EXISTS {view};
                DROP TABLE IF EXISTS {base1};
            """,
            view_key='view',
            obj_type='view',
            expected_can_edit=True,
            expected_primary_keys={'id': 'int4'},
            do_save=False,
        )),
        ('Join-based view is not editable', dict(
            setup_sql="""
                CREATE TABLE {base1} (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(50)
                );
                CREATE TABLE {base2} (
                    id SERIAL PRIMARY KEY,
                    base1_id INTEGER
                );
                INSERT INTO {base1} (id, name) VALUES (1, 'foo');
                INSERT INTO {base2} (id, base1_id) VALUES (1, 1);
                CREATE VIEW {view} AS
                    SELECT a.id, a.name, b.base1_id
                    FROM {base1} a JOIN {base2} b ON a.id = b.base1_id;
            """,
            teardown_sql="""
                DROP VIEW IF EXISTS {view};
                DROP TABLE IF EXISTS {base2};
                DROP TABLE IF EXISTS {base1};
            """,
            view_key='view',
            obj_type='view',
            expected_can_edit=False,
            expected_primary_keys=None,
            do_save=False,
        )),
        ('View with an INSTEAD OF UPDATE trigger is not editable', dict(
            setup_sql="""
                CREATE TABLE {base1} (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(50)
                );
                INSERT INTO {base1} (id, name) VALUES (1, 'foo');
                CREATE VIEW {view} AS SELECT id, name FROM {base1};
                CREATE FUNCTION {trig_func}() RETURNS trigger AS $$
                BEGIN
                    RETURN NULL;
                END;
                $$ LANGUAGE plpgsql;
                CREATE TRIGGER {trig_name}
                    INSTEAD OF UPDATE ON {view}
                    FOR EACH ROW EXECUTE FUNCTION {trig_func}();
            """,
            teardown_sql="""
                DROP TRIGGER IF EXISTS {trig_name} ON {view};
                DROP VIEW IF EXISTS {view};
                DROP FUNCTION IF EXISTS {trig_func}();
                DROP TABLE IF EXISTS {base1};
            """,
            view_key='view',
            obj_type='view',
            expected_can_edit=False,
            expected_primary_keys=None,
            do_save=False,
        )),
        ('Materialized view is not editable', dict(
            setup_sql="""
                CREATE TABLE {base1} (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(50)
                );
                INSERT INTO {base1} (id, name) VALUES (1, 'foo');
                CREATE MATERIALIZED VIEW {mview} AS
                    SELECT id, name FROM {base1};
            """,
            teardown_sql="""
                DROP MATERIALIZED VIEW IF EXISTS {mview};
                DROP TABLE IF EXISTS {base1};
            """,
            view_key='mview',
            obj_type='mview',
            expected_can_edit=False,
            expected_primary_keys=None,
            do_save=False,
        )),
    ]

    def setUp(self):
        self._initialize_database_connection()

    def runTest(self):
        self._build_names()
        self._create_test_objects()
        try:
            self._initialize_view_data()
            start_data, poll_data = self._start_view_data()
            self.assertEqual(
                start_data['data']['can_edit'], self.expected_can_edit)

            if self.expected_can_edit:
                self.assertEqual(
                    poll_data['data']['primary_keys'],
                    self.expected_primary_keys)

            if self.do_save:
                self._save_through_view()
                self._check_base_table_updated()
        finally:
            self._close_query_tool()

    def tearDown(self):
        self._drop_test_objects()
        database_utils.disconnect_database(self, self.server_id, self.db_id)

    # -- setup helpers -----------------------------------------------

    def _initialize_database_connection(self):
        database_info = parent_node_dict["database"][-1]
        self.db_name = database_info["db_name"]
        self.server_id = database_info["server_id"]
        self.db_id = database_info["db_id"]

        db_con = database_utils.connect_database(
            self, utils.SERVER_GROUP, self.server_id, self.db_id)

        if not db_con["info"] == "Database connected.":
            raise Exception("Could not connect to the database.")

        self.connection = utils.get_db_connection(
            self.db_name,
            self.server['username'],
            self.server['db_password'],
            self.server['host'],
            self.server['port']
        )

    def _build_names(self):
        suffix = str(secrets.choice(range(100000, 999999)))
        self.base1 = 'test_editview_base1_' + suffix
        self.base2 = 'test_editview_base2_' + suffix
        self.view = 'test_editview_v_' + suffix
        self.mview = 'test_editview_mv_' + suffix
        self.trig_func = 'test_editview_trig_func_' + suffix
        self.trig_name = 'test_editview_trig_' + suffix

        self._names = dict(
            base1=self.base1, base2=self.base2, view=self.view,
            mview=self.mview, trig_func=self.trig_func,
            trig_name=self.trig_name,
        )

        # The actual relation name (view or materialized view) driving
        # this scenario.
        self.relname = self._names[self.view_key]
        self.relkind = 'm' if self.obj_type == 'mview' else 'v'

    def _create_test_objects(self):
        sql = self.setup_sql.format(**self._names)
        utils.create_table_with_query(self.server, self.db_name, sql)

    def _drop_test_objects(self):
        try:
            sql = self.teardown_sql.format(**self._names)
            utils.create_table_with_query(self.server, self.db_name, sql)
        except Exception:
            pass

    # -- View/Edit Data flow (mirrors test_view_data.py) --------------

    def _get_relation_oid(self):
        pg_cursor = self.connection.cursor()
        pg_cursor.execute(
            "SELECT oid FROM pg_catalog.pg_class WHERE relname = %s "
            "AND relkind = %s", (self.relname, self.relkind))
        result = pg_cursor.fetchall()
        self.connection.commit()
        return result[0][0]

    def _initialize_view_data(self):
        obj_id = self._get_relation_oid()
        self.trans_id = str(secrets.choice(range(1, 9999999)))
        url = '/sqleditor/initialize/viewdata/{0}/{1}/{2}/{3}/{4}/{5}/{6}' \
            .format(self.trans_id, VIEW_ALL_ROWS, self.obj_type,
                    utils.SERVER_GROUP, self.server_id, self.db_id, obj_id)
        response = self.tester.post(url)
        self.assertEqual(response.status_code, 200)

    def _start_view_data(self):
        """Kick off the view/edit data query and poll it to completion.

        Returns (start_data, poll_data): the JSON response from
        `view_data/start` (which carries `can_edit`) and the final `poll`
        response (which carries `primary_keys`, resolved from
        `get_primary_keys()`).
        """
        url = "/sqleditor/view_data/start/{0}".format(self.trans_id)
        response = self.tester.get(url)
        self.assertEqual(response.status_code, 200)
        start_data = json.loads(response.data.decode('utf-8'))

        poll_response = async_poll(
            tester=self.tester,
            poll_url='/sqleditor/poll/{0}'.format(self.trans_id))
        self.assertEqual(poll_response.status_code, 200)
        poll_data = json.loads(poll_response.data.decode('utf-8'))

        return start_data, poll_data

    def _save_through_view(self):
        save_payload = {
            "updated": {
                "1": {
                    "err": False,
                    "data": {"name": "bar"},
                    "primary_keys": {"id": 1}
                }
            },
            "added": {},
            "deleted": {},
        }
        url = '/sqleditor/save/{0}'.format(self.trans_id)
        response = self.tester.post(
            url, data=json.dumps(save_payload), content_type='html/json')
        self.assertEqual(response.status_code, 200)
        response_data = json.loads(response.data.decode('utf-8'))
        self.assertEqual(response_data['data']['status'], True)

    def _check_base_table_updated(self):
        pg_cursor = self.connection.cursor()
        pg_cursor.execute(
            "SELECT name FROM {0} WHERE id = 1".format(self.base1))
        result = pg_cursor.fetchall()
        self.connection.commit()
        self.assertEqual(result[0][0], 'bar')

    def _close_query_tool(self):
        url = '/sqleditor/close/{0}'.format(self.trans_id)
        self.tester.delete(url)
