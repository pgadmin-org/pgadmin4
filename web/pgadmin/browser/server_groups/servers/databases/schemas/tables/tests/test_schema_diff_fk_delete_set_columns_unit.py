##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Unit tests for Schema Diff comparing the column list of a foreign key's
ON DELETE SET NULL or SET DEFAULT action (#10815).

The foreign key update template cannot change the action, so a foreign key
whose column list differs must be dropped and recreated.
"""

import copy

from pgadmin.browser.server_groups.servers.databases.schemas.tables.\
    schema_diff_table_utils import SchemaDiffTableCompare
from pgadmin.utils.route import BaseTestGenerator


def _foreign_key(**overrides):
    """A foreign key as returned by get_foreign_keys() on PostgreSQL 15+."""
    foreign_key = dict(
        oid=16420, name='posts_tenant_author_fkey', condeferrable=False,
        condeferred=False, confupdtype='a', confdeltype='n',
        confdelsetcols=['author_id'], confmatchtype=False, conkey=[1, 2],
        confkey=[1, 2], confrelid=16390, fknsp='app', fktab='posts',
        refnspoid=16385, refnsp='app', reftab='tenants', comment=None,
        convalidated=True, conislocal=True,
        columns=[{'local_column': 'tenant_id', 'references': 16390,
                  'referenced': 'id'},
                 {'local_column': 'author_id', 'references': 16390,
                  'referenced': 'pid'}],
        remote_schema='app', remote_table='tenants',
    )
    foreign_key.update(overrides)
    return foreign_key


class TestSchemaDiffFkDeleteSetColumnsUnit(BaseTestGenerator):
    """Unit tests for SchemaDiffTableCompare.table_constraint_comp()."""

    scenarios = [
        ('A foreign key whose SET NULL column list differs is recreated',
         dict(target_cols=None, recreated=True)),
        ('A foreign key whose SET NULL column list changes is recreated',
         dict(target_cols=['tenant_id'], recreated=True)),
        ('A foreign key with the same SET NULL column list is unchanged',
         dict(target_cols=['author_id'], recreated=False)),
    ]

    def runTest(self):
        source = {'schema': 'app', 'foreign_key': [_foreign_key()]}
        target = {'schema': 'app', 'foreign_key': [
            _foreign_key(oid=17420, confrelid=17390,
                         confdelsetcols=self.target_cols)]}

        diff = SchemaDiffTableCompare.table_constraint_comp(
            copy.deepcopy(source), copy.deepcopy(target))['foreign_key']

        if self.recreated:
            self.assertEqual([fk['confdelsetcols'] for fk in diff['added']],
                             [['author_id']])
            self.assertEqual([fk['name'] for fk in diff['deleted']],
                             ['posts_tenant_author_fkey'])
            self.assertEqual(diff['changed'], [])
        else:
            self.assertEqual(diff['added'], [])
            self.assertEqual(diff['deleted'], [])
