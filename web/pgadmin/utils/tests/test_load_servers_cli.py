##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL License
#
##########################################################################

"""setup.py load-servers must work for a servers.json that contains a
Service, although the CLI does not set app.PGADMIN_RUNTIME."""

import io
import json
import os
import shutil
import tempfile
from contextlib import redirect_stdout
from unittest.mock import patch

from pgadmin.utils.route import BaseTestGenerator

GROUP = 'Load servers without runtime test group'
SERVER_NAME = 'service-server'
ATTR_ERROR = "has no attribute 'PGADMIN_RUNTIME'"


class LoadServersWithoutRuntimeTestCase(BaseTestGenerator):

    scenarios = [
        ('Desktop mode loads a server with a service',
         dict(server_mode=False, allowed=[], refused=False)),
        ('Server mode loads a server with a listed service',
         dict(server_mode=True, allowed=['probesvc'], refused=False)),
        ('Server mode refuses a server with an unlisted service',
         dict(server_mode=True, allowed=[], refused=True)),
    ]

    def setUp(self):
        # gettext needs a request context to pick a locale.
        self.ctx = self.app.test_request_context()
        self.ctx.push()
        from pgadmin.model import User
        self.user = User.query.first()
        self.tmp = tempfile.mkdtemp()
        self.path = os.path.join(self.tmp, 'servers.json')
        self._cleanup()

    def tearDown(self):
        from pgadmin.model import db
        db.session.rollback()
        self._cleanup()
        shutil.rmtree(self.tmp, ignore_errors=True)
        self.ctx.pop()

    def _cleanup(self):
        from pgadmin.model import db, Server, ServerGroup
        group = ServerGroup.query.filter_by(
            user_id=self.user.id, name=GROUP).first()
        if group:
            Server.query.filter_by(servergroup_id=group.id).delete()
            db.session.delete(group)
        db.session.commit()

    def _loaded(self):
        from pgadmin.model import Server, ServerGroup
        group = ServerGroup.query.filter_by(
            user_id=self.user.id, name=GROUP).first()
        if group is None:
            return None
        return Server.query.filter_by(
            servergroup_id=group.id, name=SERVER_NAME).first()

    def runTest(self):
        from pgadmin.utils import load_database_servers

        servers = {'1': {'Group': GROUP, 'Name': SERVER_NAME,
                         'Service': 'probesvc', 'Username': 'test_user',
                         'MaintenanceDB': 'postgres'}}
        with open(self.path, 'w') as f:
            json.dump({'Servers': servers}, f)

        missing = object()
        saved = getattr(self.app, 'PGADMIN_RUNTIME', missing)
        try:
            delattr(self.app, 'PGADMIN_RUNTIME')
        except AttributeError:
            pass

        out = io.StringIO()
        try:
            with patch.dict(self.app.config, {
                    'SERVER_MODE': self.server_mode,
                    'SERVER_MODE_ALLOWED_SERVICES': self.allowed}):
                with redirect_stdout(out):
                    if self.refused:
                        # from_setup makes the error handler exit.
                        with self.assertRaises(SystemExit):
                            load_database_servers(
                                self.path, None, self.user, from_setup=True)
                    else:
                        ok, _ = load_database_servers(
                            self.path, None, self.user, from_setup=True)
                        self.assertTrue(ok)
        finally:
            if saved is not missing:
                self.app.PGADMIN_RUNTIME = saved

        output = out.getvalue()
        self.assertNotIn(ATTR_ERROR, output)
        server = self._loaded()
        if self.refused:
            self.assertIn('SERVER_MODE_ALLOWED_SERVICES', output)
            self.assertIsNone(server)
        else:
            self.assertIsNotNone(server)
            self.assertEqual(server.service, 'probesvc')
