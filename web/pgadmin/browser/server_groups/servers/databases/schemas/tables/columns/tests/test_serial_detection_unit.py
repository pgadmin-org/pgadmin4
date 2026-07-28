##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Unit tests for get_formatted_columns()'s SERIAL-column detection using
mocks.

These verify the ownership-vs-default-sequence comparison (#10100,
#10101) without requiring a running PostgreSQL server.
"""

from unittest.mock import MagicMock, patch
from pgadmin.utils.route import BaseTestGenerator

UTILS_MODULE = ('pgadmin.browser.server_groups.servers.databases.schemas.'
                'tables.columns.utils')


def _make_column(**overrides):
    """A properties.sql result row, as returned for a single column."""
    defaults = dict(
        name='id', atttypid=23, attlen=4, attnum=1, attndims=0,
        atttypmod=-1, attacl=None, attnotnull=False, attoptions=None,
        attfdwoptions=None, attstattarget=-1, attstorage='p',
        attidentity='', defval=None, typname='integer',
        displaytypname='integer', cltype='integer',
        inheritedfrom=None, inheritedid=None, elemoid=23,
        typnspname='pg_catalog',
        defaultstorage='p', description=None, indkey=None, isdup=False,
        collspcname='', is_fk=False, seclabels=None, is_sys_column=False,
        colconstype='n', genexpr=None, relname='t', is_view_only=False,
        attcompression=None, seqrelid=None, defseqrelid=None,
    )
    defaults.update(overrides)
    return defaults


class TestSerialColumnDetection(BaseTestGenerator):
    """Unit tests for ServerModule.get_formatted_columns() SERIAL
    detection using mock rows."""

    scenarios = [
        ('Split ownership/default keeps explicit nextval default',
         dict(test_method='test_split_ownership_default_not_serial')),
        ('Genuine SERIAL column is reprojected',
         dict(test_method='test_genuine_serial_is_detected')),
        ('Identity column is never reprojected',
         dict(test_method='test_identity_column_not_serial')),
    ]

    @patch(UTILS_MODULE + '.render_template', return_value='SELECT 1;')
    def runTest(self, mock_render):
        getattr(self, self.test_method)()

    def _run(self, column_row):
        from pgadmin.browser.server_groups.servers.databases.schemas.\
            tables.columns.utils import get_formatted_columns

        conn = MagicMock()
        conn.execute_dict.return_value = (True, {'rows': [column_row]})
        conn.execute_2darray.return_value = (True, {'rows': []})

        with patch(UTILS_MODULE + '.column_formatter'):
            data = get_formatted_columns(
                conn, tid=1, data={}, other_columns=[],
                table_or_type='table', template_path='columns/sql/default')

        return data['columns'][0]

    def test_split_ownership_default_not_serial(self):
        # Column owns sequence 100 (pg_depend deptype='a'), but its
        # DEFAULT's nextval() call references a different sequence, 200
        # (pg_depend deptype='n' from the pg_attrdef entry). SERIAL must
        # not be applied - ownership and default disagree.
        col = _make_column(
            defval="nextval('seq_used'::regclass)",
            seqrelid=100, defseqrelid=200,
        )
        result = self._run(col)
        self.assertEqual(result['typname'], 'integer')
        self.assertEqual(result['cltype'], 'integer')
        self.assertEqual(result['defval'], "nextval('seq_used'::regclass)")

    def test_genuine_serial_is_detected(self):
        # Ownership and default both point at the same sequence (100) -
        # this is what a real SERIAL column looks like.
        col = _make_column(
            defval="nextval('t_id_seq'::regclass)",
            seqrelid=100, defseqrelid=100,
        )
        result = self._run(col)
        self.assertEqual(result['typname'], 'serial')
        self.assertEqual(result['cltype'], 'serial')
        self.assertEqual(result['defval'], '')

    def test_identity_column_not_serial(self):
        # Identity columns can carry an internal sequence dependency on
        # both sides, but must never be reprojected as SERIAL.
        col = _make_column(
            defval=None, seqrelid=100, defseqrelid=100, attidentity='a',
        )
        result = self._run(col)
        self.assertEqual(result['typname'], 'integer')
        self.assertEqual(result['defval'], None)
