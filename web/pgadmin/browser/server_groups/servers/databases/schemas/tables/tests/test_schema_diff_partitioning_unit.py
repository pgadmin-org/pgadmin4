##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Unit tests for Schema Diff deciding whether a partitioned table has to
be rebuilt (#10816).

The rebuild loses everything LIKE ... INCLUDING ALL does not copy, so it
must only happen when the partition scheme or the partitions differ, and
never because of an unrelated difference such as a column comment.
"""

from pgadmin.browser.server_groups.servers.databases.schemas.tables.\
    schema_diff_table_utils import SchemaDiffTableCompare
from pgadmin.utils.route import BaseTestGenerator


def _partition(**overrides):
    """A range partition as listed in a partitioned table's properties."""
    partition = dict(
        oid=16500, partition_name='orders_2025',
        values_from="'2025-01-01'", values_to="'2026-01-01'",
        is_default=False, is_sub_partitioned=False,
        sub_partition_scheme='', amname='',
    )
    partition.update(overrides)
    return partition


def _table(partitions, partition_scheme='RANGE (created)'):
    return dict(is_partitioned=True, partition_scheme=partition_scheme,
                partitions=partitions)


class TestSchemaDiffPartitioningUnit(BaseTestGenerator):
    """Unit tests for SchemaDiffTableCompare._partitioning_differs()."""

    scenarios = [
        ('Same partitions with different OIDs do not differ',
         dict(source=_table([_partition()]),
              target=_table([_partition(oid=17500)]),
              differs=False)),
        ('Same partitions listed in a different order do not differ',
         dict(source=_table([_partition(),
                             _partition(partition_name='orders_2026')]),
              target=_table([_partition(partition_name='orders_2026'),
                             _partition()]),
              differs=False)),
        ('A different partition scheme differs',
         dict(source=_table([_partition()], 'RANGE (id)'),
              target=_table([_partition()]),
              differs=True)),
        ('A changed partition bound differs',
         dict(source=_table([_partition(values_to="'2025-07-01'")]),
              target=_table([_partition()]),
              differs=True)),
        ('An added partition differs',
         dict(source=_table([_partition(),
                             _partition(partition_name='orders_2026')]),
              target=_table([_partition()]),
              differs=True)),
    ]

    def runTest(self):
        self.assertEqual(
            SchemaDiffTableCompare._partitioning_differs(self.source,
                                                         self.target),
            self.differs)
