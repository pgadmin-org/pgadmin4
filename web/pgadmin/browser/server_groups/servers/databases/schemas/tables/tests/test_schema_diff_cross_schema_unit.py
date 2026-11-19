##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Unit tests for comparing tables in schemas with different names (#10762).

A table's own schema name shows up in the nextval() default of a SERIAL
column and in the referenced schema of a foreign key to a table in the
same schema. When two schemas with different names are compared, neither
may make otherwise identical tables compare as different, or make Schema
Diff drop and recreate an identical foreign key.
"""

import copy

from pgadmin.browser.server_groups.servers.databases.schemas.tables.\
    schema_diff_table_utils import SchemaDiffTableCompare
from pgadmin.tools.schema_diff.directory_compare import \
    are_dictionaries_identical
from pgadmin.utils.route import BaseTestGenerator


def _serial_column(schema, **overrides):
    """An 'id' column as returned by get_formatted_columns() for a SERIAL
    column of a table in the given schema."""
    column = dict(
        name='id', cltype='serial', typname='serial',
        displaytypname='serial', atttypid=23, attnum=1, elemoid=23,
        seqtypid=23, seqrelid=16400, defseqrelid=16400, indkey=None,
        defval='', attnotnull=True, attacl=[],
        serial_defval="nextval('{0}.admin_user_emails_id_seq'"
                      "::regclass)".format(schema),
    )
    column.update(overrides)
    return column


def _foreign_key(schema, refnsp=None, **overrides):
    """A foreign key as returned by get_foreign_keys() for a table in the
    given schema, referencing admin_users in refnsp (by default the same
    schema)."""
    refnsp = refnsp or schema
    foreign_key = dict(
        oid=16420, name='fk_admin_user_emails_admin',
        condeferrable=False, condeferred=False, confupdtype='a',
        confdeltype='a', confmatchtype=False, conkey=[2], confkey=[1],
        confrelid=16390, fknsp=schema, fktab='admin_user_emails',
        refnspoid=16385, refnsp=refnsp, reftab='admin_users', comment=None,
        convalidated=False, conislocal=True,
        columns=[{'local_column': 'admin', 'references': 16390,
                  'referenced': 'id',
                  'references_table_name': refnsp + '.admin_users'}],
        remote_schema=refnsp, remote_table='admin_users',
        coveringindex=None, autoindex=True, hasindex=False,
    )
    foreign_key.update(overrides)
    return foreign_key


def _table(schema, columns, foreign_keys):
    return dict(name='admin_user_emails', schema=schema, columns=columns,
                foreign_key=foreign_keys)


class TestSchemaDiffCrossSchemaUnit(BaseTestGenerator):
    """Unit tests for SchemaDiffTableCompare across schema names."""

    scenarios = [
        ('Tables differing only in their schema name are identical',
         dict(test_method='test_tables_identical')),
        ('A SERIAL column whose default names another schema is not '
         'reported as changed',
         dict(test_method='test_serial_column_not_changed')),
        ('A column becoming SERIAL is still reported as changed',
         dict(test_method='test_column_becoming_serial_changed')),
        ('A foreign key to its own schema is not recreated',
         dict(test_method='test_fk_to_own_schema_not_recreated')),
        ('A foreign key to the same other schema is not recreated',
         dict(test_method='test_fk_to_other_schema_not_recreated')),
        ('A foreign key referencing a different schema is recreated',
         dict(test_method='test_fk_to_different_schema_recreated')),
        ('A foreign key with a different referenced table is recreated',
         dict(test_method='test_fk_to_different_table_recreated')),
    ]

    def runTest(self):
        getattr(self, self.test_method)()

    def test_tables_identical(self):
        # The case from #10762: identical tables in schemas named
        # novinator and novinator_prod.
        source = _table('novinator', [_serial_column('novinator')],
                        [_foreign_key('novinator', oid=16420)])
        target = _table('novinator_prod', [_serial_column('novinator_prod')],
                        [_foreign_key('novinator_prod', oid=17420)])

        self.assertTrue(are_dictionaries_identical(
            source, target, SchemaDiffTableCompare.keys_to_ignore, False))

    def test_serial_column_not_changed(self):
        source = _serial_column('novinator')
        target_cols = [_serial_column('novinator_prod')]

        added = []
        updated = []
        SchemaDiffTableCompare.compare_target_cols(
            source, target_cols, added, updated)

        self.assertEqual(added, [])
        self.assertEqual(updated, [])
        self.assertEqual(target_cols, [])

    def test_column_becoming_serial_changed(self):
        # The default the source column was reprojected from must still
        # reach the SQL that converts the target column to SERIAL (#10292).
        source = _serial_column('novinator')
        target = _serial_column(
            'novinator_prod', cltype='integer', typname='integer',
            displaytypname='integer', seqrelid=None, defseqrelid=None,
            defval=None)
        del target['serial_defval']
        target_cols = [target]

        added = []
        updated = []
        SchemaDiffTableCompare.compare_target_cols(
            source, target_cols, added, updated)

        self.assertEqual(len(updated), 1)
        self.assertEqual(updated[0]['serial_defval'],
                         "nextval('novinator.admin_user_emails_id_seq'"
                         "::regclass)")

    def _compare_foreign_keys(self, source_fk, target_fk):
        source = _table(source_fk['fknsp'], [], [source_fk])
        target = _table(target_fk['fknsp'], [], [target_fk])
        return SchemaDiffTableCompare.table_constraint_comp(
            copy.deepcopy(source), copy.deepcopy(target))['foreign_key']

    def test_fk_to_own_schema_not_recreated(self):
        diff = self._compare_foreign_keys(
            _foreign_key('novinator', oid=16420, confrelid=16390),
            _foreign_key('novinator_prod', oid=17420, confrelid=17390))

        self.assertEqual(diff['added'], [])
        self.assertEqual(diff['deleted'], [])

    def test_fk_to_other_schema_not_recreated(self):
        diff = self._compare_foreign_keys(
            _foreign_key('novinator', refnsp='common'),
            _foreign_key('novinator_prod', refnsp='common'))

        self.assertEqual(diff['added'], [])
        self.assertEqual(diff['deleted'], [])

    def test_fk_to_different_schema_recreated(self):
        # The target references a table in another schema, so it is not
        # the same foreign key, even though the table names match.
        diff = self._compare_foreign_keys(
            _foreign_key('novinator'),
            _foreign_key('novinator_prod', refnsp='novinator'))

        self.assertEqual(len(diff['added']), 1)
        self.assertEqual(len(diff['deleted']), 1)

    def test_fk_to_different_table_recreated(self):
        diff = self._compare_foreign_keys(
            _foreign_key('novinator'),
            _foreign_key('novinator_prod', reftab='other_users'))

        self.assertEqual(len(diff['added']), 1)
        self.assertEqual(len(diff['deleted']), 1)
