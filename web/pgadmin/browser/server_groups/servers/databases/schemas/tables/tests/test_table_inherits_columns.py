##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Changing 'Inherited from' on an existing table (#10657).

Removing a parent removes its columns from the table dialog's Columns tab,
but NO INHERIT keeps them, and the parent's CHECK constraints, on the child
as local ones, so saving must drop them too, except the ones that a
remaining parent still provides.

Adding a parent must first give the table the parent's columns (including
generated ones), NOT NULL markings and CHECK constraints that it does not
have yet, as INHERIT fails without them.

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
    """Remove the first parent of a table, sending the columns that the
    table dialog removes from its Columns tab as deleted."""

    scenarios = [
        ('Columns of the only parent are dropped',
         dict(parents=['id integer, a_name text'],
              child='own_col text',
              expected_sql=['NO INHERIT', 'DROP COLUMN IF EXISTS id;',
                            'DROP COLUMN IF EXISTS a_name;'],
              unexpected_sql=['own_col'],
              expected_columns=['own_col'],
              expected_checks=[],
              expected_icon='icon-table')),
        ('A column still provided by another parent is kept',
         dict(parents=['id integer, a_name text, '
                       'CONSTRAINT id_pos CHECK (id > 0), '
                       'CONSTRAINT id_set CHECK (id <> 0)',
                       'id integer, b_name text, '
                       'CONSTRAINT id_set CHECK (id <> 0)'],
              child='own_col text',
              expected_sql=['NO INHERIT', 'DROP COLUMN IF EXISTS a_name;',
                            'DROP CONSTRAINT IF EXISTS id_pos;'],
              unexpected_sql=['DROP COLUMN IF EXISTS id;', 'b_name',
                              'own_col', 'id_set'],
              expected_columns=['id', 'b_name', 'own_col'],
              expected_checks=['id_set'],
              expected_icon='icon-table-inherits')),
        ('A CHECK constraint also defined on the table is dropped',
         dict(parents=['id integer, CONSTRAINT id_pos CHECK (id > 0)'],
              child='id integer, own_col text, '
                    'CONSTRAINT id_pos CHECK (id > 0)',
              expected_sql=['NO INHERIT', 'DROP COLUMN IF EXISTS id;',
                            'DROP CONSTRAINT IF EXISTS id_pos;'],
              unexpected_sql=['own_col'],
              expected_columns=['own_col'],
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
        # from 'Inherited from'.
        deleted = [c for c in properties['columns']
                   if c.get('inheritedid') == removed_parent_id]
        self.assertTrue(deleted)
        data = {
            'coll_inherits': properties['coll_inherits'][1:],
            'columns': {'deleted': deleted}
        }

        sql = self._get_msql(data)
        for text in self.expected_sql:
            self.assertIn(text, sql)
        for text in self.unexpected_sql:
            self.assertNotIn(text, sql)

        node = self._put(data)
        self.assertEqual(self._child_columns(),
                         sorted(self.expected_columns))
        self.assertEqual(self._child_checks(), self.expected_checks)
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
    ]

    def runTest(self):
        parent = self._qualified(self.parent_names[0])
        parent_id = self._query(
            "SELECT '{0}'::regclass::oid".format(parent))[0][0]
        parent_columns = self._query(
            "SELECT attname, pg_catalog.format_type(atttypid, NULL) "
            "FROM pg_catalog.pg_attribute WHERE attrelid = {0}::oid "
            "AND attnum > 0 AND NOT attisdropped ORDER BY attnum".format(
                parent_id))
        existing = self._child_columns()

        # What the table dialog sends after the parent is added to
        # 'Inherited from'.
        data = {
            'coll_inherits': [parent],
            'columns': {'added': [
                {'name': name, 'cltype': cltype, 'inheritedfrom': parent,
                 'inheritedid': parent_id}
                for name, cltype in parent_columns if name not in existing
            ]}
        }

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
        self.assertEqual(node['icon'], 'icon-table-inherits')
        self.assertEqual(self._query(
            "SELECT inhparent FROM pg_catalog.pg_inherits "
            "WHERE inhrelid = {0}::oid".format(self.table_id)),
            [(parent_id,)])
