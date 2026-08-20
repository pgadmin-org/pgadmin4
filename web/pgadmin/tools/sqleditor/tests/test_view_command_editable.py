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
        # information_schema.views.is_trigger_updatable only reflects
        # INSTEAD OF UPDATE triggers - a view with *only* an INSTEAD OF
        # DELETE trigger reports is_updatable='YES' AND
        # is_trigger_updatable='NO', so this must be caught by the
        # is_trigger_deletable check instead.
        ('View with only an INSTEAD OF DELETE trigger is not editable', dict(
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
                    INSTEAD OF DELETE ON {view}
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
        self.trans_id = None
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
            if self.trans_id is not None:
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


class _ViewSaveTestMixin:
    """ Shared plumbing for the ad-hoc single-scenario tests below: a
    fresh connection, a helper to fetch a relation's oid, and the
    initialize/start/poll/save/close HTTP calls used by
    TestViewCommandEditable, without the scenario-table machinery (each
    of these tests needs its own bespoke setup/assertions). """

    def _connect(self):
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

    def _get_relation_oid(self, relname, relkind='v'):
        pg_cursor = self.connection.cursor()
        pg_cursor.execute(
            "SELECT oid FROM pg_catalog.pg_class WHERE relname = %s "
            "AND relkind = %s", (relname, relkind))
        result = pg_cursor.fetchall()
        self.connection.commit()
        return result[0][0]

    def _initialize_view_data(self, obj_id, obj_type='view', body=None):
        trans_id = str(secrets.choice(range(1, 9999999)))
        url = '/sqleditor/initialize/viewdata/{0}/{1}/{2}/{3}/{4}/{5}/{6}' \
            .format(trans_id, VIEW_ALL_ROWS, obj_type,
                    utils.SERVER_GROUP, self.server_id, self.db_id, obj_id)
        if body is not None:
            response = self.tester.post(
                url, data=json.dumps(body), content_type='html/json')
        else:
            response = self.tester.post(url)
        self.assertEqual(response.status_code, 200)
        return trans_id

    def _start_and_poll(self, trans_id):
        url = "/sqleditor/view_data/start/{0}".format(trans_id)
        response = self.tester.get(url)
        self.assertEqual(response.status_code, 200)
        start_data = json.loads(response.data.decode('utf-8'))

        poll_response = async_poll(
            tester=self.tester,
            poll_url='/sqleditor/poll/{0}'.format(trans_id))
        self.assertEqual(poll_response.status_code, 200)

        return start_data

    def _save(self, trans_id, save_payload):
        url = '/sqleditor/save/{0}'.format(trans_id)
        response = self.tester.post(
            url, data=json.dumps(save_payload), content_type='html/json')
        self.assertEqual(response.status_code, 200)
        return json.loads(response.data.decode('utf-8'))

    def _close_query_tool(self, trans_id):
        url = '/sqleditor/close/{0}'.format(trans_id)
        self.tester.delete(url)


class TestViewSaveRejectsAmbiguousPrimaryKey(
        _ViewSaveTestMixin, BaseTestGenerator):
    """ Regression test for the aliasing gap can_edit() can't close.

    can_edit()'s primary-key check is name-only (deliberately - see the
    design spec's pg_depend note on why per-column alias resolution
    isn't reliable): it only confirms the base table's real PK column
    name is *also* present, under the same name, in the view's own
    output. It has no way to tell that a differently-derived column
    happens to share that name.

    `CREATE VIEW v AS SELECT legacy AS id, id AS realid, name FROM t`
    passes that check (t's real PK is `id`, and the view exposes an
    output column literally called `id`), but the view's `id` is
    actually `t.legacy`, not `t.id`. An UPDATE through the view with
    `WHERE id = <value>` would then rewrite every base row sharing that
    `legacy` value, not just one - so the save path's rows-affected
    safety net must catch and reject this rather than silently
    corrupting more rows than intended. """

    scenarios = [('default', dict())]

    def setUp(self):
        self._connect()
        suffix = str(secrets.choice(range(100000, 999999)))
        self.base1 = 'test_editview_alias_base_' + suffix
        self.view = 'test_editview_alias_v_' + suffix

    def runTest(self):
        setup_sql = """
            CREATE TABLE {base1} (
                id SERIAL PRIMARY KEY,
                legacy INTEGER,
                name VARCHAR(50)
            );
            INSERT INTO {base1} (id, legacy, name) VALUES
                (1, 5, 'foo'),
                (2, 5, 'bar');
            CREATE VIEW {view} AS
                SELECT legacy AS id, id AS realid, name FROM {base1};
        """.format(base1=self.base1, view=self.view)
        utils.create_table_with_query(self.server, self.db_name, setup_sql)

        try:
            obj_id = self._get_relation_oid(self.view)
            trans_id = self._initialize_view_data(obj_id)

            # Confirm the exploit precondition: can_edit() is fooled by
            # the name-only match.
            start_data = self._start_and_poll(trans_id)
            self.assertTrue(start_data['data']['can_edit'])

            save_payload = {
                "updated": {
                    "1": {
                        "err": False,
                        "data": {"name": "CHANGED"},
                        "primary_keys": {"id": 5}
                    }
                },
                "added": {},
                "deleted": {},
            }
            response_data = self._save(trans_id, save_payload)

            # Rejected, not silently applied to both rows.
            self.assertEqual(response_data['data']['status'], False)

            self._close_query_tool(trans_id)

            pg_cursor = self.connection.cursor()
            pg_cursor.execute(
                "SELECT name FROM {0} ORDER BY id".format(self.base1))
            result = pg_cursor.fetchall()
            self.connection.commit()
            # Neither base row was changed.
            self.assertEqual([r[0] for r in result], ['foo', 'bar'])
        finally:
            self._drop_test_objects()

    def _drop_test_objects(self):
        try:
            utils.create_table_with_query(
                self.server, self.db_name,
                "DROP VIEW IF EXISTS {view}; "
                "DROP TABLE IF EXISTS {base1};".format(
                    view=self.view, base1=self.base1))
        except Exception:
            pass

    def tearDown(self):
        database_utils.disconnect_database(self, self.server_id, self.db_id)


class TestViewSaveRejectsInsertedRow(_ViewSaveTestMixin, BaseTestGenerator):
    """ Regression test: the frontend's "Add row" is gated only on the
    backend's can_edit flag (shared, unchanged behaviour also used for
    tables), so once can_edit() can return True for a view, a user can
    reach the INSERT path through the existing UI even though row
    insertion into a view was never designed for or tested (out of
    scope per the design spec). save() must reject any row marked as
    newly-inserted when the target is a view. """

    scenarios = [('default', dict())]

    def setUp(self):
        self._connect()
        suffix = str(secrets.choice(range(100000, 999999)))
        self.base1 = 'test_editview_insert_base_' + suffix
        self.view = 'test_editview_insert_v_' + suffix

    def runTest(self):
        setup_sql = """
            CREATE TABLE {base1} (
                id SERIAL PRIMARY KEY,
                name VARCHAR(50)
            );
            INSERT INTO {base1} (id, name) VALUES (1, 'foo');
            CREATE VIEW {view} AS SELECT id, name FROM {base1};
        """.format(base1=self.base1, view=self.view)
        utils.create_table_with_query(self.server, self.db_name, setup_sql)

        try:
            obj_id = self._get_relation_oid(self.view)
            trans_id = self._initialize_view_data(obj_id)

            start_data = self._start_and_poll(trans_id)
            self.assertTrue(start_data['data']['can_edit'])

            save_payload = {
                "updated": {},
                "added": {
                    "2": {
                        "err": False,
                        "data": {
                            "id": "99",
                            "__temp_PK": "2",
                            "name": "new row"
                        }
                    }
                },
                "deleted": {},
                "added_index": {"2": "2"},
            }
            response_data = self._save(trans_id, save_payload)

            self.assertEqual(response_data['data']['status'], False)

            self._close_query_tool(trans_id)

            pg_cursor = self.connection.cursor()
            pg_cursor.execute(
                "SELECT count(*) FROM {0}".format(self.base1))
            result = pg_cursor.fetchall()
            self.connection.commit()
            # No row was actually inserted into the base table.
            self.assertEqual(int(result[0][0]), 1)
        finally:
            self._drop_test_objects()

    def _drop_test_objects(self):
        try:
            utils.create_table_with_query(
                self.server, self.db_name,
                "DROP VIEW IF EXISTS {view}; "
                "DROP TABLE IF EXISTS {base1};".format(
                    view=self.view, base1=self.base1))
        except Exception:
            pass

    def tearDown(self):
        database_utils.disconnect_database(self, self.server_id, self.db_id)


class TestViewCommandEditableForNonOwnerRole(
        _ViewSaveTestMixin, BaseTestGenerator):
    """ Regression test: information_schema.view_table_usage (previously
    used to resolve a view's base table) is filtered by
    pg_has_role(owner, 'USAGE'), so it returns nothing for a role that
    has direct GRANTs on the view/table but isn't a member of the
    owning role - which is the normal case in most real server-mode
    deployments (the connecting role is rarely the table owner). The
    base-table lookup is now resolved via pg_depend/pg_rewrite instead,
    which carries no such role filter. This test authenticates as a
    fresh, non-superuser LOGIN role with only direct grants (no
    ownership, no role membership) and confirms can_edit() is still
    True. """

    scenarios = [('default', dict())]

    ROLE_PASSWORD = 'Editview_probe_pw1!'

    def setUp(self):
        self._connect()
        suffix = str(secrets.choice(range(100000, 999999)))
        self.base1 = 'test_editview_role_base_' + suffix
        self.view = 'test_editview_role_v_' + suffix
        self.role_name = 'test_editview_role_' + suffix

    def runTest(self):
        setup_sql = """
            CREATE TABLE {base1} (
                id SERIAL PRIMARY KEY,
                name VARCHAR(50)
            );
            INSERT INTO {base1} (id, name) VALUES (1, 'foo');
            CREATE VIEW {view} AS SELECT id, name FROM {base1};
            CREATE ROLE {role} LOGIN PASSWORD '{password}';
            GRANT SELECT, UPDATE ON {base1} TO {role};
            GRANT SELECT, UPDATE ON {view} TO {role};
        """.format(base1=self.base1, view=self.view, role=self.role_name,
                   password=self.ROLE_PASSWORD)
        utils.create_table_with_query(self.server, self.db_name, setup_sql)

        try:
            obj_id = self._get_relation_oid(self.view)
            # Log the async connection in as the restricted role - a
            # fresh, password-authenticated connection (see
            # Connection.connect()), not a superuser SET ROLE - so this
            # genuinely exercises a non-owner, non-superuser session.
            trans_id = self._initialize_view_data(
                obj_id,
                body={
                    "user": self.role_name,
                    "password": self.ROLE_PASSWORD,
                }
            )

            start_data = self._start_and_poll(trans_id)
            self.assertTrue(start_data['data']['can_edit'])

            self._close_query_tool(trans_id)
        finally:
            self._drop_test_objects()

    def _drop_test_objects(self):
        try:
            utils.create_table_with_query(
                self.server, self.db_name,
                "DROP VIEW IF EXISTS {view}; "
                "DROP TABLE IF EXISTS {base1}; "
                "DROP ROLE IF EXISTS {role};".format(
                    view=self.view, base1=self.base1, role=self.role_name))
        except Exception:
            pass

    def tearDown(self):
        database_utils.disconnect_database(self, self.server_id, self.db_id)


class TestViewSaveGuardsNonEditable(_ViewSaveTestMixin, BaseTestGenerator):
    """ Regression test: before ViewCommand/MViewCommand implemented
    their own save(), every view fell through to GridCommand.save(),
    which always refuses. Now that they implement save() themselves, a
    non-editable instance (can_edit() False - a view missing its PK
    column, a materialized view, a join-based view, etc.) must still be
    refused up front, not attempted: without this guard, save() would
    reach save_changed_data() with an incomplete columns_info (built for
    a non-editable object, missing keys like not_null) and fail with a
    KeyError - after a BEGIN had already been issued, leaving a dangling
    transaction and a 500 instead of a clean refusal. """

    scenarios = [
        ('View missing its primary key column', dict(
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
            relname_key='view',
            obj_type='view',
        )),
        ('Materialized view', dict(
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
            relname_key='mview',
            obj_type='mview',
        )),
    ]

    def setUp(self):
        self._connect()
        suffix = str(secrets.choice(range(100000, 999999)))
        self.base1 = 'test_editview_guard_base_' + suffix
        self.view = 'test_editview_guard_v_' + suffix
        self.mview = 'test_editview_guard_mv_' + suffix
        self._names = dict(
            base1=self.base1, view=self.view, mview=self.mview)
        self.relname = self._names[self.relname_key]

    def runTest(self):
        sql = self.setup_sql.format(**self._names)
        utils.create_table_with_query(self.server, self.db_name, sql)

        try:
            relkind = 'm' if self.obj_type == 'mview' else 'v'
            obj_id = self._get_relation_oid(self.relname, relkind)
            trans_id = self._initialize_view_data(obj_id, self.obj_type)

            start_data = self._start_and_poll(trans_id)
            # Precondition: this instance really is non-editable.
            self.assertFalse(start_data['data']['can_edit'])

            save_payload = {
                "updated": {
                    "1": {
                        "err": False,
                        "data": {"name": "should-not-apply"},
                        "primary_keys": {"id": 1}
                    }
                },
                "added": {},
                "deleted": {},
            }
            response_data = self._save(trans_id, save_payload)

            # A clean refusal, not a 500 from an unhandled KeyError.
            self.assertEqual(response_data['data']['status'], False)
            self.assertIn(
                'cannot be saved',
                response_data['data']['result'].lower())
            # No transaction was left dangling by the refused save.
            self.assertEqual(response_data['data']['transaction_status'], 0)

            self._close_query_tool(trans_id)

            pg_cursor = self.connection.cursor()
            pg_cursor.execute(
                "SELECT name FROM {0} WHERE id = 1".format(self.base1))
            result = pg_cursor.fetchall()
            self.connection.commit()
            # Nothing was actually changed in the base table either.
            self.assertEqual(result[0][0], 'foo')
        finally:
            try:
                teardown_sql = self.teardown_sql.format(**self._names)
                utils.create_table_with_query(
                    self.server, self.db_name, teardown_sql)
            except Exception:
                pass

    def tearDown(self):
        database_utils.disconnect_database(self, self.server_id, self.db_id)
