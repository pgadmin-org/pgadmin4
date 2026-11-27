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

A recreated constraint must also keep its drop when the target has another
constraint of the same kind that the source lacks.

PostgreSQL 18 likewise cannot change whether an existing check constraint is
enforced, so a check constraint whose enforced state differs is recreated.

Nor can it add or remove WITHOUT OVERLAPS on an existing primary key or
unique constraint, so one whose conperiod differs is recreated.
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


def _check_constraint(**overrides):
    """A check constraint as returned by the check constraint properties
    query."""
    constraint = dict(
        oid=16450, name='orders_key', consrc='id > 0', comment=None,
        connoinherit=False, convalidated=False, conislocal=True,
        conenforced=True,
    )
    constraint.update(overrides)
    return constraint


class TestSchemaDiffConstraintDeferredUnit(BaseTestGenerator):
    """Unit tests for SchemaDiffTableCompare.table_constraint_comp()."""

    scenarios = [
        ('A primary key whose deferred state differs is recreated',
         dict(constraint_type='primary_key', source_value=True,
              target_value=False, recreated=True)),
        ('A unique constraint whose deferred state differs is recreated',
         dict(constraint_type='unique_constraint', source_value=False,
              target_value=True, recreated=True)),
        ('A primary key with the same deferred state is not recreated',
         dict(constraint_type='primary_key', source_value=True,
              target_value=True, recreated=False)),
        ('A recreated unique constraint keeps its drop alongside a '
         'target-only unique constraint',
         dict(constraint_type='unique_constraint', source_value=True,
              target_value=False, recreated=True,
              target_only=_constraint(oid=17460, name='orders_code_key',
                                      columns=[{'column': 'code'}]))),
        ('A primary key whose WITHOUT OVERLAPS state differs is recreated',
         dict(constraint_type='primary_key', key='conperiod',
              source_value=True, target_value=False, recreated=True)),
        ('A unique constraint whose WITHOUT OVERLAPS state differs is '
         'recreated',
         dict(constraint_type='unique_constraint', key='conperiod',
              source_value=False, target_value=True, recreated=True)),
        ('A check constraint whose enforced state differs is recreated',
         dict(constraint_type='check_constraint', key='conenforced',
              source_value=False, target_value=True, recreated=True)),
        ('A check constraint with the same enforced state is not recreated',
         dict(constraint_type='check_constraint', key='conenforced',
              source_value=False, target_value=False, recreated=False)),
    ]

    def runTest(self):
        key = getattr(self, 'key', 'condeferred')
        make = _check_constraint if \
            self.constraint_type == 'check_constraint' else _constraint
        source = {self.constraint_type: [
            make(oid=16450, **{key: self.source_value})]}
        target = {self.constraint_type: [
            make(oid=17450, **{key: self.target_value})]}
        target_only = getattr(self, 'target_only', None)
        if target_only:
            target[self.constraint_type].append(target_only)

        diff = SchemaDiffTableCompare.table_constraint_comp(
            copy.deepcopy(source), copy.deepcopy(target))[
            self.constraint_type]

        if self.recreated:
            self.assertEqual([c['name'] for c in diff['added']],
                             ['orders_key'])
            expected_deleted = ['orders_key']
            if target_only:
                expected_deleted.append(target_only['name'])
            self.assertEqual([c['name'] for c in diff['deleted']],
                             expected_deleted)
            self.assertEqual(diff['changed'], [])
        else:
            self.assertEqual(diff['added'], [])
            self.assertEqual(diff['deleted'], [])
