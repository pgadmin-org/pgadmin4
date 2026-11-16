##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Unit tests for Schema Diff comparing the deferred state of primary key
and unique constraints.

The index constraint update template has no way to change whether a
constraint is INITIALLY DEFERRED, so a constraint whose deferred state
differs must be dropped and recreated. The key was misspelled as
'condeffered' in the list of keys that force this, so it never matched the
'condeferred' key the properties query returns, and the difference was
silently left in place.
"""

import copy

from pgadmin.browser.server_groups.servers.databases.schemas.tables.\
    schema_diff_table_utils import SchemaDiffTableCompare
from pgadmin.utils.route import BaseTestGenerator


def _constraint(**overrides):
    """A primary key or unique constraint as returned by the index
    constraint properties query."""
    constraint = dict(
        oid=16450, name='orders_key', col_count=1, condeferrable=True,
        condeferred=False, columns=[{'column': 'id'}], comment=None,
        spcname='pg_default', fillfactor=None, indnullsnotdistinct=False,
    )
    constraint.update(overrides)
    return constraint


class TestSchemaDiffConstraintDeferredUnit(BaseTestGenerator):
    """Unit tests for SchemaDiffTableCompare.table_constraint_comp()."""

    scenarios = [
        ('A primary key whose deferred state differs is recreated',
         dict(constraint_type='primary_key', source_deferred=True,
              target_deferred=False, recreated=True)),
        ('A unique constraint whose deferred state differs is recreated',
         dict(constraint_type='unique_constraint', source_deferred=False,
              target_deferred=True, recreated=True)),
        ('A primary key with the same deferred state is not recreated',
         dict(constraint_type='primary_key', source_deferred=True,
              target_deferred=True, recreated=False)),
    ]

    def runTest(self):
        source = {self.constraint_type: [
            _constraint(oid=16450, condeferred=self.source_deferred)]}
        target = {self.constraint_type: [
            _constraint(oid=17450, condeferred=self.target_deferred)]}

        diff = SchemaDiffTableCompare.table_constraint_comp(
            copy.deepcopy(source), copy.deepcopy(target))[
            self.constraint_type]

        if self.recreated:
            self.assertEqual(len(diff['added']), 1)
            self.assertEqual(len(diff['deleted']), 1)
            self.assertEqual(diff['changed'], [])
        else:
            self.assertEqual(diff['added'], [])
            self.assertEqual(diff['deleted'], [])
