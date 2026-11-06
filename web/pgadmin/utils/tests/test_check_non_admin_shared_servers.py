##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL License
#
##########################################################################
from unittest.mock import patch, MagicMock

from pgadmin.utils.route import BaseTestGenerator
from pgadmin.utils import check_non_admin_shared_servers

GROUP = 'Shared server audit test group'


class TestCheckNonAdminSharedServers(BaseTestGenerator):
    """Servers shared by non-administrators are reported at startup, in
    server mode only, and never raise."""

    scenarios = [
        ('Server mode', dict(server_mode=True, cli_mode=False)),
        ('Server mode, CLI', dict(server_mode=True, cli_mode=True)),
        ('Desktop mode', dict(server_mode=False, cli_mode=False)),
    ]

    def setUp(self):
        self.ctx = self.app.test_request_context()
        self.ctx.push()
        # Cleanups run last in, first out: the context pops last.
        self.addCleanup(self.ctx.pop)
        from pgadmin.model import User
        self.user = User.query.first()
        self.addCleanup(self._cleanup)

    def _cleanup(self):
        from pgadmin.model import db, Server, ServerGroup
        db.session.rollback()
        group = ServerGroup.query.filter_by(
            user_id=self.user.id, name=GROUP).first()
        if group:
            Server.query.filter_by(servergroup_id=group.id).delete()
            db.session.delete(group)
        db.session.commit()

    def _add(self, group, name, shared):
        from pgadmin.model import db, Server
        server = Server(user_id=self.user.id, servergroup_id=group.id,
                        name=name, host='db.example.com', port=5432,
                        username='test_user', maintenance_db='postgres',
                        shared=shared)
        db.session.add(server)
        db.session.commit()
        return server

    def runTest(self):
        from pgadmin.model import db, ServerGroup
        group = ServerGroup(user_id=self.user.id, name=GROUP)
        db.session.add(group)
        db.session.flush()
        shared = self._add(group, 'shared one', True)
        self._add(group, 'private one', False)

        logger = MagicMock()
        for is_admin in (False, True):
            logger.reset_mock()
            with patch('pgadmin.utils.config.SERVER_MODE',
                       self.server_mode), \
                    patch.object(type(self.user), 'has_role',
                                 return_value=is_admin):
                found = check_non_admin_shared_servers(
                    logger, self.cli_mode)

            if self.server_mode and not self.cli_mode and not is_admin:
                # Other shared servers of non-admins may exist in the
                # test database, so look at ours.
                self.assertGreaterEqual(found, 1)
                texts = [c.args[0] % c.args[1:]
                         for c in logger.warning.call_args_list]
                mine = [t for t in texts
                        if t.startswith('Server %s (' % shared.id)]
                self.assertEqual(len(mine), 1)
                self.assertIn("'shared one'", mine[0])
                self.assertIn('user %s' % self.user.id, mine[0])
                self.assertNotIn('private one', ' '.join(texts))
                self.assertNotIn('db.example.com', ' '.join(texts))
            else:
                self.assertEqual(found, 0)
                logger.warning.assert_not_called()

        # Failures never propagate.
        logger.reset_mock()
        with patch('pgadmin.utils.config.SERVER_MODE', True), \
                patch('pgadmin.utils.db.session.query',
                      side_effect=RuntimeError('boom')):
            self.assertEqual(check_non_admin_shared_servers(logger), 0)
