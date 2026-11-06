##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Unit tests for the --database value of server and globals backups.

pg_dumpall expands a --database value containing "=" into a connection
string, which could select a service (or servicefile), so the maintenance
database name must be passed through database_conninfo(). These call
_get_args_params_values() with a mocked manager rather than going through
the API, so no server or utility binary is needed.
"""

from unittest.mock import MagicMock, patch

from pgadmin.tools.backup import _get_args_params_values
from pgadmin.utils import database_conninfo
from pgadmin.utils.route import BaseTestGenerator

HOSTILE = ['service=probesvc', 'servicefile=/etc/x service=probesvc']


class BackupMaintenanceDbConninfoTestCase(BaseTestGenerator):
    """The maintenance database name must never be passed as it is."""

    scenarios = [
        ('Plain maintenance database, {0} backup'.format(obj_type), dict(
            obj_type=obj_type, maintenance_db='postgres'))
        for obj_type in ('server', 'globals')
    ] + [
        ('Maintenance database {0!r}, {1} backup'.format(db, obj_type), dict(
            obj_type=obj_type, maintenance_db=db, hostile=True))
        for obj_type in ('server', 'globals') for db in HOSTILE
    ] + [
        ('A service name is the value of dbname, server backup',
         dict(obj_type='server', maintenance_db='service=probesvc',
              hostile=True, literal='dbname=service=probesvc')),
        ('A service name and servicefile are a quoted dbname value',
         dict(obj_type='globals',
              maintenance_db='servicefile=/etc/x service=probesvc',
              hostile=True,
              literal="dbname='servicefile=/etc/x service=probesvc'")),
    ]

    hostile = False
    literal = None

    def setUp(self):
        # A pure argument-marshalling test: no server connection needed.
        pass

    def runTest(self):
        manager = MagicMock(version=170000, user='postgres',
                            use_ssh_tunnel=0)
        server = MagicMock(host='localhost', port=5432,
                           maintenance_db=self.maintenance_db)
        data = dict(format='plain')

        # An application context is needed to tell whether the client
        # credential files are isolated (server mode).
        with self.app.app_context(), \
                patch('pgadmin.utils.driver.get_driver',
                      return_value=MagicMock()):
            args = _get_args_params_values(
                data, MagicMock(), self.obj_type, 'test_backup_file',
                server, manager)

        self.assertIn('--database', args)
        value = args[args.index('--database') + 1]
        self.assertEqual(value, database_conninfo(self.maintenance_db))
        if self.hostile:
            self.assertNotIn(self.maintenance_db, args)
        if self.literal:
            self.assertEqual(value, self.literal)
