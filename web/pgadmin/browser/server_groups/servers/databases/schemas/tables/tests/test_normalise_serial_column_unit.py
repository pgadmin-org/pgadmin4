##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Unit tests for BaseTableView._normalise_serial_column(), covering both
directions of converting a column between a plain integer type and
SERIAL/BIGSERIAL/SMALLSERIAL (#10292), and guarding against the ordinary
(non Schema Diff) column PUT being mistaken for one.
"""

from pgadmin.browser.server_groups.servers.databases.schemas.tables.utils \
    import BaseTableView
from pgadmin.utils.route import BaseTestGenerator


class TestNormaliseSerialColumn(BaseTestGenerator):
    """Unit tests for BaseTableView._normalise_serial_column()."""

    scenarios = [
        ('Converting a plain column to SERIAL creates the sequence and '
         'restores the default',
         dict(test_method='test_becoming_serial')),
        ('Converting a SERIAL column to plain queues the sequence for '
         'dropping',
         dict(test_method='test_leaving_serial')),
        ('A genuine difference on a column that is SERIAL on both sides '
         'is unaffected',
         dict(test_method='test_both_sides_already_serial')),
        ('A partial update that never mentions cltype leaves an '
         'already-SERIAL column alone',
         dict(test_method='test_partial_update_without_cltype_is_ignored')),
    ]

    def runTest(self):
        getattr(self, self.test_method)()

    def test_becoming_serial(self):
        # Schema Diff's source column, reprojected as BIGSERIAL, with the
        # real nextval() default preserved under 'serial_defval'.
        data = {
            'cltype': 'bigserial', 'typname': 'bigserial',
            'serial_defval': "nextval('public.t_id_seq'::regclass)",
            'seqincrement': 1, 'seqstart': 1, 'seqmin': 1,
            'seqmax': 9223372036854775807, 'seqcache': 1, 'seqcycle': False,
        }
        # The target's current (plain, unreprojected) column.
        old_col_data = {
            'cltype': 'integer', 'typname': 'integer', 'defval': None,
            'seqrelid': None, 'defseqrelid': None, 'attidentity': '',
        }

        BaseTableView._normalise_serial_column(data, old_col_data)

        self.assertEqual(data['cltype'], 'bigint')
        self.assertEqual(data['typname'], 'bigint')
        self.assertEqual(data['defval'],
                         "nextval('public.t_id_seq'::regclass)")
        self.assertEqual(data['serial_seq_create']['name'], 'public.t_id_seq')
        self.assertEqual(data['serial_seq_create']['increment'], 1)
        self.assertNotIn('serial_defval', data)
        self.assertNotIn('seqincrement', data)

    def test_leaving_serial(self):
        # Schema Diff's source column: a plain integer, never reprojected.
        data = {'cltype': 'integer', 'typname': 'integer', 'defval': None}
        # The target's current column genuinely is SERIAL.
        old_col_data = {
            'cltype': 'integer', 'typname': 'integer',
            'defval': "nextval('public.t_id_seq'::regclass)",
            'seqrelid': 100, 'defseqrelid': 100, 'attidentity': '',
        }

        BaseTableView._normalise_serial_column(data, old_col_data)

        self.assertEqual(data['serial_seq_drop'], 'public.t_id_seq')
        # The type didn't really change; the default is still queued to
        # be dropped by the generic template logic (data['defval'] stays
        # None/empty and differs from o_data['defval']).
        self.assertEqual(data['cltype'], 'integer')

    def test_both_sides_already_serial(self):
        # Both sides are BIGSERIAL; only some other property (a comment,
        # say) differs. The reprojection emptied 'defval' on the source
        # side; that must not be read as a request to drop the real one,
        # and no sequence should be created or dropped.
        data = {
            'cltype': 'bigserial', 'typname': 'bigserial',
            'serial_defval': "nextval('public.t_id_seq'::regclass)",
            'seqincrement': 1,
        }
        old_col_data = {
            'cltype': 'integer', 'typname': 'integer',
            'defval': "nextval('public.t_id_seq'::regclass)",
            'seqrelid': 100, 'defseqrelid': 100, 'attidentity': '',
        }

        BaseTableView._normalise_serial_column(data, old_col_data)

        self.assertNotIn('defval', data)
        self.assertNotIn('serial_seq_create', data)
        self.assertNotIn('serial_seq_drop', data)
        self.assertNotIn('seqincrement', data)

    def test_partial_update_without_cltype_is_ignored(self):
        # The ordinary column PUT (not Schema Diff) submits only the
        # fields the user actually changed - e.g. a privilege - and omits
        # 'cltype' entirely when the type itself wasn't touched, even if
        # the column already is SERIAL. This must be a complete no-op.
        data = {'attacl': {'added': []}}
        old_col_data = {
            'cltype': 'integer', 'typname': 'integer',
            'defval': "nextval('public.t_id_seq'::regclass)",
            'seqrelid': 100, 'defseqrelid': 100, 'attidentity': '',
        }

        BaseTableView._normalise_serial_column(data, old_col_data)

        self.assertEqual(data, {'attacl': {'added': []}})
