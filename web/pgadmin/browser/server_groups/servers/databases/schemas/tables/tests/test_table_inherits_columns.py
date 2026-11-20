##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Changing 'Inherited from' on an existing table (#10657).

Removing a parent keeps its columns on the table as ordinary columns, as
NO INHERIT does, both in the table dialog's Columns tab and in the database.
The parent's CHECK constraints and NOT NULL markings, which NO INHERIT also
keeps, are dropped, except the ones that a remaining parent still provides.

Adding a parent must first give the table the parent's columns (including
generated ones, and with their defaults so existing rows get a value),
NOT NULL markings and CHECK constraints that it does not have yet, as
INHERIT fails without them.

Either way, the tree icon returned by the save must show the table's
inheritance after the change, not before it.
"""

import json
import uuid

from pgadmin.browser.server_groups.servers.databases.schemas.tests import \
    utils as schema_utils
from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from . import utils as tables_utils


class InheritsColumnsTestMixin:
    """Create the parents and the child table, and query the database."""

    def setUp(self):
        min_version = getattr(self, 'min_version', None)
        if min_version and \
                self.server_information['server_version'] < min_version:
            self.skipTest('Requires PostgreSQL {0} or later.'.format(
                min_version // 10000))

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
        if not schema_utils.verify_schemas(self.server, self.db_name,
                                           self.schema_name):
            raise Exception("Could not find the schema to add a table.")

        suffix = str(uuid.uuid4())[1:8]
        self.parent_names = []
        for idx, definition in enumerate(self.parents):
            parent_name = "test_inh_parent_%s_%s" % (idx, suffix)
            self._query("CREATE TABLE {0}.{1} ({2})".format(
                self.schema_name, parent_name, definition))
            self.parent_names.append(parent_name)

        self.table_name = "test_inh_child_%s" % suffix
        self._query("CREATE TABLE {0}.{1} ({2}){3}".format(
            self.schema_name, self.table_name, self.child,
            self._inherits_clause()))
        self.table_id = self._query(
            "SELECT '{0}.{1}'::regclass::oid".format(
                self.schema_name, self.table_name))[0][0]
        if getattr(self, 'child_rows', None):
            self._query("INSERT INTO {0}.{1} VALUES {2}".format(
                self.schema_name, self.table_name, self.child_rows))

    def _inherits_clause(self):
        return ''

    def _query(self, sql):
        connection = utils.get_db_connection(self.db_name,
                                             self.server['username'],
                                             self.server['db_password'],
                                             self.server['host'],
                                             self.server['port'],
                                             self.server['sslmode'])
        try:
            pg_cursor = connection.cursor()
            pg_cursor.execute(sql)
            result = pg_cursor.fetchall() if pg_cursor.description else None
            connection.commit()
            return result
        finally:
            connection.close()

    def _child_columns(self):
        return [row[0] for row in self._query(
            "SELECT attname FROM pg_catalog.pg_attribute "
            "WHERE attrelid = {0}::oid AND attnum > 0 "
            "AND NOT attisdropped ORDER BY attname".format(self.table_id))]

    def _child_checks(self):
        return [row[0] for row in self._query(
            "SELECT conname FROM pg_catalog.pg_constraint "
            "WHERE conrelid = {0}::oid AND contype = 'c' "
            "ORDER BY conname".format(self.table_id))]

    def _child_not_nulls(self):
        return [row[0] for row in self._query(
            "SELECT attname FROM pg_catalog.pg_attribute "
            "WHERE attrelid = {0}::oid AND attnum > 0 AND attnotnull "
            "AND NOT attisdropped ORDER BY attname".format(self.table_id))]

    def _child_inherited_columns(self):
        return [row[0] for row in self._query(
            "SELECT attname FROM pg_catalog.pg_attribute "
            "WHERE attrelid = {0}::oid AND attnum > 0 AND attinhcount > 0 "
            "AND NOT attisdropped ORDER BY attname".format(self.table_id))]

    def _qualified(self, name):
        return '{0}.{1}'.format(self.schema_name, name)

    def _get_msql(self, data):
        self.url = '/browser/table/msql/'
        response = tables_utils.api_get_msql(
            self, {k: json.dumps(v) for k, v in data.items()})
        self.assertEqual(response.status_code, 200)
        return json.loads(response.data.decode('utf-8'))['data']

    def _put(self, data):
        self.url = '/browser/table/obj/'
        self.data = dict(data, oid=self.table_id)
        response = tables_utils.api_put(self)
        self.assertEqual(response.status_code, 200)
        return json.loads(response.data.decode('utf-8'))['node']

    def tearDown(self):
        database_utils.disconnect_database(self, self.server_id, self.db_id)


class TableRemoveInheritsColumnsTestCase(InheritsColumnsTestMixin,
                                         BaseTestGenerator):
    """Remove the first parent of a table, sending the changes the table
    dialog makes to its Columns tab: the parent's columns are kept as
    ordinary columns, and only the ones the user then deletes are deleted."""

    scenarios = [
        ('Columns of the only parent are kept as ordinary columns',
         dict(parents=['id integer, a_name text'],
              child='own_col text',
              expected_sql=['NO INHERIT'],
              unexpected_sql=['DROP COLUMN', 'ALTER COLUMN', 'own_col'],
              expected_columns=['a_name', 'id', 'own_col'],
              expected_inherited=[],
              expected_checks=[],
              expected_icon='icon-table')),
        ('A column the table also declared is kept',
         dict(parents=['id integer, CONSTRAINT id_pos CHECK (id > 0)'],
              child='id integer, own_col text, '
                    'CONSTRAINT id_pos CHECK (id > 0)',
              expected_sql=['NO INHERIT',
                            'DROP CONSTRAINT IF EXISTS id_pos;'],
              unexpected_sql=['DROP COLUMN', 'own_col'],
              expected_columns=['id', 'own_col'],
              expected_inherited=[],
              expected_checks=[],
              expected_icon='icon-table')),
        ('Removing one of two parents keeps the other one\'s CHECK',
         dict(parents=['id integer, a_name text, '
                       'CONSTRAINT id_pos CHECK (id > 0), '
                       'CONSTRAINT id_set CHECK (id <> 0)',
                       'id integer, b_name text, '
                       'CONSTRAINT id_set CHECK (id <> 0)'],
              child='own_col text',
              expected_sql=['NO INHERIT',
                            'DROP CONSTRAINT IF EXISTS id_pos;'],
              unexpected_sql=['DROP COLUMN', 'b_name', 'own_col', 'id_set'],
              expected_columns=['a_name', 'b_name', 'id', 'own_col'],
              expected_inherited=['b_name', 'id'],
              expected_checks=['id_set'],
              expected_icon='icon-table-inherits')),
        ('NOT NULL only required by the removed parent is dropped',
         dict(parents=['id integer NOT NULL, code text NOT NULL',
                       'id integer, code text NOT NULL'],
              child='own_col text',
              expected_sql=['NO INHERIT', 'ALTER COLUMN id DROP NOT NULL;'],
              unexpected_sql=['DROP COLUMN', 'ALTER COLUMN code'],
              expected_columns=['code', 'id', 'own_col'],
              expected_inherited=['code', 'id'],
              expected_not_nulls=['code'],
              expected_checks=[],
              expected_icon='icon-table-inherits')),
        ('A NOT NULL NO INHERIT parent leaves the table\'s NOT NULL',
         dict(min_version=180000,
              parents=['x integer NOT NULL NO INHERIT', 'x integer'],
              child='x integer NOT NULL, own_col text',
              expected_sql=['NO INHERIT'],
              unexpected_sql=['DROP NOT NULL', 'DROP COLUMN'],
              expected_columns=['own_col', 'x'],
              expected_inherited=['x'],
              expected_not_nulls=['x'],
              expected_checks=[],
              expected_icon='icon-table-inherits')),
        ('A kept column the user deletes is dropped',
         dict(parents=['id integer, a_name text'],
              child='own_col text',
              user_deleted=['a_name'],
              expected_sql=['NO INHERIT', 'DROP COLUMN IF EXISTS a_name;'],
              unexpected_sql=['DROP COLUMN IF EXISTS id', 'own_col'],
              expected_columns=['id', 'own_col'],
              expected_inherited=[],
              expected_checks=[],
              expected_icon='icon-table')),
    ]

    def _inherits_clause(self):
        return ' INHERITS ({0})'.format(
            ', '.join(self._qualified(p) for p in self.parent_names))

    def runTest(self):
        removed_parent_id = self._query(
            "SELECT '{0}'::regclass::oid".format(
                self._qualified(self.parent_names[0])))[0][0]

        self.url = '/browser/table/obj/'
        response = tables_utils.api_get(self)
        self.assertEqual(response.status_code, 200)
        properties = json.loads(response.data.decode('utf-8'))

        # What the table dialog sends after the first parent is removed
        # from 'Inherited from': its columns lose their inheritance and are
        # kept, and the ones the user deletes are sent from the original
        # data, as the dialog does for every deleted row.
        removed = [c for c in properties['columns']
                   if c.get('inheritedid') == removed_parent_id]
        self.assertTrue(removed)
        user_deleted = getattr(self, 'user_deleted', [])
        columns = {'changed': [
            {'attnum': c['attnum'], 'inheritedfrom': None,
             'inheritedfromtable': None, 'inheritedid': None}
            for c in removed if c['name'] not in user_deleted]}
        if user_deleted:
            columns['deleted'] = [c for c in removed
                                  if c['name'] in user_deleted]
        data = {
            'coll_inherits': properties['coll_inherits'][1:],
            'columns': columns
        }

        sql = self._get_msql(data)
        for text in self.expected_sql:
            self.assertIn(text, sql)
        for text in self.unexpected_sql:
            self.assertNotIn(text, sql)

        node = self._put(data)
        self.assertEqual(self._child_columns(),
                         sorted(self.expected_columns))
        self.assertEqual(self._child_inherited_columns(),
                         self.expected_inherited)
        self.assertEqual(self._child_checks(), self.expected_checks)
        if hasattr(self, 'expected_not_nulls'):
            self.assertEqual(self._child_not_nulls(),
                             self.expected_not_nulls)
        # The tree icon follows the inheritance after the save.
        self.assertEqual(node['icon'], self.expected_icon)


class TableAddInheritsColumnsTestCase(InheritsColumnsTestMixin,
                                      BaseTestGenerator):
    """Add a parent to an existing table, sending the parent's columns as
    the table dialog adds them to its Columns tab."""

    scenarios = [
        ('Missing columns and CHECK constraints are added before INHERIT',
         dict(parents=['id varchar(10) NOT NULL, code text COLLATE "C", '
                       'g integer GENERATED ALWAYS AS (n * 2) STORED, '
                       'n integer, '
                       'CONSTRAINT id_not_empty CHECK (id <> \'\')'],
              child='cid bigint',
              expected_sql=['ADD COLUMN id character varying(10) NOT NULL;',
                            'ADD COLUMN code text COLLATE pg_catalog."C";',
                            'ADD COLUMN n integer;',
                            'ADD COLUMN g integer '
                            'GENERATED ALWAYS AS ((n * 2)) STORED;',
                            "ADD CONSTRAINT id_not_empty "
                            "CHECK (id::text <> ''::text);"],
              unexpected_sql=['cid'],
              expected_columns=['cid', 'code', 'g', 'id', 'n'],
              expected_checks=['id_not_empty'])),
        ('Columns the table already has are not added again',
         dict(parents=['id bigint NOT NULL, name text'],
              child='id bigint, cid bigint',
              expected_sql=['ALTER COLUMN id SET NOT NULL;',
                            'ADD COLUMN name text;'],
              unexpected_sql=['ADD COLUMN id', 'cid', 'ADD CONSTRAINT'],
              expected_columns=['cid', 'id', 'name'],
              expected_checks=[])),
        ('A NOT NULL column gets its default for the existing rows',
         dict(parents=['id integer NOT NULL DEFAULT 5, name text'],
              child='cid bigint',
              child_rows='(1), (2)',
              expected_sql=['ADD COLUMN id integer NOT NULL DEFAULT 5;',
                            'ADD COLUMN name text;'],
              unexpected_sql=['cid', 'ADD CONSTRAINT'],
              expected_columns=['cid', 'id', 'name'],
              expected_checks=[])),
        ('A shared column gets the default of the parent that has one',
         dict(parents=['id integer NOT NULL, name text',
                       'id integer DEFAULT 7'],
              child='cid bigint',
              child_rows='(1), (2)',
              expected_sql=['ADD COLUMN id integer NOT NULL DEFAULT 7;',
                            'ADD COLUMN name text;'],
              unexpected_sql=['cid', 'ADD CONSTRAINT'],
              expected_columns=['cid', 'id', 'name'],
              expected_checks=[])),
        ('A virtual generated column is added as virtual',
         dict(min_version=180000,
              parents=['g integer GENERATED ALWAYS AS (n * 2) VIRTUAL, '
                       'n integer'],
              child='cid bigint',
              expected_sql=['ADD COLUMN n integer;',
                            'ADD COLUMN g integer '
                            'GENERATED ALWAYS AS ((n * 2)) VIRTUAL;'],
              unexpected_sql=['cid', 'STORED'],
              expected_columns=['cid', 'g', 'n'],
              expected_checks=[])),
        ('A NOT NULL NO INHERIT is not required of the table',
         dict(min_version=180000,
              parents=['id integer NOT NULL NO INHERIT, '
                       'code text NOT NULL NO INHERIT'],
              child='id integer, cid bigint',
              expected_sql=['ADD COLUMN code text;'],
              unexpected_sql=['ALTER COLUMN id', 'NOT NULL', 'cid'],
              expected_columns=['cid', 'code', 'id'],
              expected_not_nulls=[],
              expected_checks=[])),
    ]

    def runTest(self):
        parents = [self._qualified(p) for p in self.parent_names]
        parent_ids = [self._query(
            "SELECT '{0}'::regclass::oid".format(p))[0][0] for p in parents]
        existing = self._child_columns()

        # What the table dialog sends after the parents are added to
        # 'Inherited from': each parent's columns that are not in the
        # Columns tab yet.
        added = []
        for parent, parent_id in zip(parents, parent_ids):
            for name, cltype in self._query(
                    "SELECT attname, pg_catalog.format_type(atttypid, NULL) "
                    "FROM pg_catalog.pg_attribute WHERE attrelid = {0}::oid "
                    "AND attnum > 0 AND NOT attisdropped "
                    "ORDER BY attnum".format(parent_id)):
                if name not in existing:
                    existing.append(name)
                    added.append({'name': name, 'cltype': cltype,
                                  'inheritedfrom': parent,
                                  'inheritedid': parent_id})
        data = {'coll_inherits': parents, 'columns': {'added': added}}
        parent = parents[0]

        sql = self._get_msql(data)
        for text in self.expected_sql:
            self.assertIn(text, sql)
            self.assertLess(sql.index(text), sql.index('INHERIT ' + parent))
        for text in self.unexpected_sql:
            self.assertNotIn(text, sql)
        # A generated column comes after the columns its expression uses.
        if 'ADD COLUMN g ' in sql:
            self.assertLess(sql.index('ADD COLUMN n '),
                            sql.index('ADD COLUMN g '))

        node = self._put(data)
        self.assertEqual(self._child_columns(),
                         sorted(self.expected_columns))
        self.assertEqual(self._child_checks(), self.expected_checks)
        if hasattr(self, 'expected_not_nulls'):
            self.assertEqual(self._child_not_nulls(),
                             self.expected_not_nulls)
        self.assertEqual(node['icon'], 'icon-table-inherits')
        self.assertEqual(self._query(
            "SELECT inhparent FROM pg_catalog.pg_inherits "
            "WHERE inhrelid = {0}::oid ORDER BY inhseqno".format(
                self.table_id)),
            [(parent_id,) for parent_id in parent_ids])
