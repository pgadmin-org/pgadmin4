##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from unittest.mock import patch, MagicMock

from pgadmin.model import Server
from pgadmin.utils.ajax import make_json_response
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict


class TestConnectServerUser(BaseTestGenerator):
    """
    The Query Tool's connection bar asks sqleditor.connect_server to connect
    the server only when the selected connection uses the server's own user
    and role; for any other user or role it must leave the server alone, so
    that nobody is prompted for a password they may not know (issue #8144).
    """
    scenarios = [
        ('No user supplied connects the server, as before',
         dict(form_data=None, expect_connect=True)),
        ('Server user without a role connects the server',
         dict(form_data={'user': '{server_user}', 'role': ''},
              expect_connect=True)),
        ('Server user with the server role connects the server',
         dict(form_data={'user': '{server_user}', 'role': '{server_role}'},
              expect_connect=True)),
        ('Server user with a different role skips the server connect',
         dict(form_data={'user': '{server_user}',
                         'role': 'pga_test_other_role'},
              expect_connect=False)),
        ('A different user skips the server connect',
         dict(form_data={'user': 'pga_test_other_user', 'role': ''},
              expect_connect=False)),
    ]

    def setUp(self):
        self.sid = parent_node_dict["server"][-1]["server_id"]
        with self.app.app_context():
            server = Server.query.filter_by(id=self.sid).first()
            self.server_user = server.username or ''
            self.server_role = server.role or ''

    def runTest(self):
        data = {}
        if self.form_data is not None:
            data = {
                key: value.format(server_user=self.server_user,
                                  server_role=self.server_role)
                for key, value in self.form_data.items()
            }

        # Report the server as disconnected, and stand in for the server
        # node's connect view, so the test can see whether a connect was
        # attempted without needing the server's password.
        manager = MagicMock()
        manager.connection.return_value.connected.return_value = False
        driver = MagicMock()
        driver.connection_manager.return_value = manager
        view = MagicMock()
        view.connect.side_effect = lambda *args, **kwargs: \
            make_json_response(success=1, info='connected', data={})

        with patch('pgadmin.tools.sqleditor.get_driver',
                   return_value=driver), \
            patch('pgadmin.tools.sqleditor.SchemaDiffRegistry.get_node_view',
                  return_value=view):
            response = self.tester.post(
                '/sqleditor/connect_server/{0}'.format(self.sid),
                data=data,
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(view.connect.called, self.expect_connect)
