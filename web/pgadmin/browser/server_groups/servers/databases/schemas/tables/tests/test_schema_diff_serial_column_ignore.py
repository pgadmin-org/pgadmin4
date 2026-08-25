##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Unit tests for SchemaDiffTableCompare's column comparison, verifying
that a SERIAL/BIGSERIAL column's raw sequence OID ('defseqrelid') does not
cause Schema Diff to report a false-positive difference (#10236).
"""

from pgadmin.browser.server_groups.servers.databases.schemas.tables.\
    schema_diff_table_utils import SchemaDiffTableCompare
from pgadmin.utils.route import BaseTestGenerator


def _make_bigserial_column(defseqrelid, **overrides):
    """A column dict as returned by get_formatted_columns() for a
    genuine, already-reprojected BIGSERIAL column."""
    defaults = dict(
        name='adl_id', cltype='bigserial', typname='bigserial',
        atttypid=20, attlen=8, attnum=1, elemoid=20, seqtypid=20,
        indkey=None, seqrelid=defseqrelid, defseqrelid=defseqrelid,
        defval='', attnotnull=True, attacl=[],
    )
    defaults.update(overrides)
    return defaults


class TestSchemaDiffSerialColumnIgnore(BaseTestGenerator):
    """Unit tests for SchemaDiffTableCompare.compare_target_cols()."""

    scenarios = [
        ('Identical BIGSERIAL columns with differing sequence OIDs are '
         'not flagged as different',
         dict(test_method='test_differing_defseqrelid_not_flagged')),
        ('A genuinely different column is still flagged as different',
         dict(test_method='test_genuine_difference_still_flagged')),
    ]

    def runTest(self):
        getattr(self, self.test_method)()

    def test_differing_defseqrelid_not_flagged(self):
        # Two independently-created databases will assign different raw
        # OIDs to each table's owned sequence, even for structurally
        # identical BIGSERIAL columns. That OID difference alone must not
        # cause the column (and thus the table) to be reported as
        # different, and must not trigger an invalid
        # `ALTER COLUMN ... TYPE bigserial` in the generated diff SQL.
        source = _make_bigserial_column(defseqrelid=16482)
        target_cols = [_make_bigserial_column(defseqrelid=98213)]

        added = []
        updated = []
        SchemaDiffTableCompare.compare_target_cols(
            source, target_cols, added, updated)

        self.assertEqual(added, [])
        self.assertEqual(updated, [])
        # The matching target column must have been consumed.
        self.assertEqual(target_cols, [])

    def test_genuine_difference_still_flagged(self):
        # A real difference (here, NOT NULL toggled) on an otherwise
        # identical BIGSERIAL column must still be detected, proving the
        # fix only suppresses the OID noise and doesn't mask real diffs.
        source = _make_bigserial_column(defseqrelid=16482, attnotnull=True)
        target_cols = [
            _make_bigserial_column(defseqrelid=98213, attnotnull=False)
        ]

        added = []
        updated = []
        SchemaDiffTableCompare.compare_target_cols(
            source, target_cols, added, updated)

        self.assertEqual(len(updated), 1)
        self.assertEqual(updated[0]['name'], 'adl_id')
        self.assertEqual(added, [])
