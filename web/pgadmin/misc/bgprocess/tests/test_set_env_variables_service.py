##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from pgadmin.misc.bgprocess.processes import BatchProcess
from pgadmin.utils import ServiceNotAllowed
from pgadmin.utils.route import BaseTestGenerator


class TestSetEnvVariablesService(BaseTestGenerator):
    """Check that PGSERVICE is taken from the connection manager, which
    carries the current user's value for a shared server, and from the
    server row only when there is no manager, and that in server mode a
    service not listed in SERVER_MODE_ALLOWED_SERVICES is refused.
    """

    ALLOWED = ['user_service', 'my_service']

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
        ('Server mode refuses a service that is not allowed',
         dict(
             manager_service='other_service',
             server_service='other_service',
             expected_error=True
         )),
        ('Server mode refuses a service when none are allowed',
         dict(
             manager_service='my_service',
             server_service='my_service',
             allowed=[],
             expected_error=True
         )),
        ('Desktop mode allows any service',
         dict(
             manager_service='other_service',
             server_service='other_service',
             allowed=[],
             server_mode=False,
             expected='other_service'
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

        config = {
            'SERVER_MODE': getattr(self, 'server_mode', True),
            'SERVER_MODE_ALLOWED_SERVICES': getattr(
                self, 'allowed', self.ALLOWED),
        }

        # Connection parameters are resolved against the app's mode.
        with self.app.test_request_context(), \
                patch.dict(self.app.config, config), \
                patch.object(self.app, 'PGADMIN_RUNTIME', False):
            if getattr(self, 'expected_error', False):
                with self.assertRaises(ServiceNotAllowed) as cm:
                    p.set_env_variables(server)
                self.assertIn('SERVER_MODE_ALLOWED_SERVICES',
                              str(cm.exception))
                self.assertNotIn('PGSERVICE', p.env)
                return
            p.set_env_variables(server)

        self.assertEqual(p.env.get('PGSERVICE'), self.expected)
