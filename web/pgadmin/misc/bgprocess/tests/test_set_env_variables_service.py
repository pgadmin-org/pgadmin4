##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
from types import SimpleNamespace
from unittest.mock import MagicMock

from pgadmin.misc.bgprocess.processes import BatchProcess
from pgadmin.utils.route import BaseTestGenerator


class TestSetEnvVariablesService(BaseTestGenerator):
    """Check that PGSERVICE is taken from the connection manager, which
    carries the current user's value for a shared server, and from the
    server row only when there is no manager.
    """

    scenarios = [
        ('A shared server uses the per-user service name',
         dict(
             manager_service='user_service',
             server_service='owner_service',
             expected='user_service'
         )),
        ('A per-user service name that is cleared is not replaced by '
         'the owner\'s',
         dict(
             manager_service=None,
             server_service='owner_service',
             expected=None
         )),
        ('A server that is not shared keeps its service name',
         dict(
             manager_service='my_service',
             server_service='my_service',
             expected='my_service'
         )),
        ('Without a manager the server\'s service name is used',
         dict(
             no_manager=True,
             server_service='my_service',
             expected='my_service'
         )),
        ('Without a server or a manager no service name is set',
         dict(
             no_manager=True,
             no_server=True,
             expected=None
         )),
    ]

    def runTest(self):
        # Skip __init__, which would create a Process row.
        p = BatchProcess.__new__(BatchProcess)
        p.id = 'test'
        p.env = dict()
        p.manager_obj = None

        if not getattr(self, 'no_manager', False):
            p.manager_obj = MagicMock(
                connection_params={}, use_ssh_tunnel=False,
                service=self.manager_service
            )

        server = None
        if not getattr(self, 'no_server', False):
            server = SimpleNamespace(service=self.server_service,
                                     connection_params={})

        p.set_env_variables(server)

        self.assertEqual(p.env.get('PGSERVICE'), self.expected)
