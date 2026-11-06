##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""A servers.json import is refused in server mode if a server in it uses
a service not listed in SERVER_MODE_ALLOWED_SERVICES, or a service file."""

from unittest.mock import patch

from pgadmin.utils import client_files_isolated, service_allowed, \
    validate_json_data
from pgadmin.utils.route import BaseTestGenerator


def server(**kwargs):
    obj = {"Group": "Servers", "Name": "Test server",
           "MaintenanceDB": "postgres", "Username": "postgres"}
    obj.update(kwargs)
    return obj


class ImportServiceAllowlistTestCase(BaseTestGenerator):

    scenarios = [
        ('A server without a service is imported',
         dict(obj=server(Host='127.0.0.1', Port=5432))),
        ('A service that is not listed is refused',
         dict(obj=server(Service='reporting'), refused=True)),
        ('A service connection parameter that is not listed is refused',
         dict(obj=server(Host='127.0.0.1', Port=5432,
                         ConnectionParameters={'service': 'reporting'}),
              refused=True)),
        ('A service file connection parameter is refused',
         dict(obj=server(Service='reporting', ConnectionParameters={
             'servicefile': '/etc/pg_service.conf'}),
             allowed=['reporting'], refused=True)),
        ('A listed service is imported',
         dict(obj=server(Service='reporting'), allowed=['reporting'])),
        ('Desktop mode imports any service',
         dict(obj=server(Service='reporting'), server_mode=False)),
    ]

    allowed = []
    refused = False
    server_mode = True

    def setUp(self):
        pass

    def runTest(self):
        data = {"Servers": {"1": self.obj}}
        with self.app.test_request_context(), \
                patch.dict(self.app.config, {
                    'SERVER_MODE': self.server_mode,
                    'SERVER_MODE_ALLOWED_SERVICES': self.allowed}), \
                patch.object(self.app, 'PGADMIN_RUNTIME', False):
            errmsg = validate_json_data(data, True)

        if self.refused:
            self.assertIsNotNone(errmsg)
            self.assertIn("Server '1'", errmsg)
        else:
            self.assertIsNone(errmsg)

    def tearDown(self):
        pass


class ClientFilesIsolatedWithoutRuntimeTestCase(BaseTestGenerator):
    """PGADMIN_RUNTIME is not set by every entry point, such as the
    setup.py CLI commands. A missing attribute means this is not the
    desktop runtime, so server mode must still isolate client files."""

    scenarios = [
        ('Server mode isolates and applies the allowlist',
         dict(server_mode=True, isolated=True, allowed=False)),
        ('Desktop mode does not isolate and allows any service',
         dict(server_mode=False, isolated=False, allowed=True)),
    ]

    def setUp(self):
        pass

    def runTest(self):
        missing = object()
        saved = getattr(self.app, 'PGADMIN_RUNTIME', missing)
        try:
            delattr(self.app, 'PGADMIN_RUNTIME')
        except AttributeError:
            pass
        try:
            with self.app.test_request_context(), \
                    patch.dict(self.app.config, {
                        'SERVER_MODE': self.server_mode,
                        'SERVER_MODE_ALLOWED_SERVICES': []}):
                self.assertIs(client_files_isolated(), self.isolated)
                self.assertIs(service_allowed('x'), self.allowed)
        finally:
            if saved is not missing:
                self.app.PGADMIN_RUNTIME = saved
