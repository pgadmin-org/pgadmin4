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
from pgadmin.utils import passexec
from pgadmin.utils.passexec import convert_legacy_server_passexec

VAULT_CMD = '/bin/get-pass --ttl 300'
SECRET_CMD = 'echo SECRET-TOKEN-123'


class TestConvertLegacyServerPassexec(BaseTestGenerator):
    """Free-text commands become names where they match the allowlist
    and are cleared otherwise, without logging command text."""

    def setUp(self):
        self.ctx = self.app.app_context()
        self.ctx.push()
        from pgadmin.model import db, User, ServerGroup, Server, \
            SharedServer
        user = User.query.first()
        self.group = ServerGroup(user_id=user.id,
                                 name='Passexec convert test group')
        db.session.add(self.group)
        db.session.flush()
        self.group_id = self.group.id

        def make(cmd):
            s = Server(user_id=user.id, servergroup_id=self.group_id,
                       name='passexec-test', host='db.example.com',
                       port=5432, username='test_user',
                       maintenance_db='postgres', passexec_cmd=cmd)
            db.session.add(s)
            db.session.flush()
            return s

        self.a = make(VAULT_CMD).id
        self.b = make(SECRET_CMD).id
        self.c = make(None).id
        self.d = make('').id
        shared = SharedServer(
            osid=self.a, user_id=user.id, server_owner=user.username,
            servergroup_id=self.group_id, name='passexec-test-shared',
            host='db.example.com', port=5432, username='test_user',
            maintenance_db='postgres', shared=True,
            passexec_cmd=VAULT_CMD)
        db.session.add(shared)
        db.session.flush()
        self.shared = shared.id
        db.session.commit()

    def runTest(self):
        from pgadmin.model import db, Server, SharedServer
        logger = MagicMock()
        with patch.object(passexec.config, 'SERVER_PASSEXEC_COMMANDS',
                          {'vault': ['/bin/get-pass', '--ttl', '300']},
                          create=True):
            # Other rows in the shared test DB may also be converted, so
            # only require that ours were counted.
            changed = convert_legacy_server_passexec(logger)
            self.assertGreaterEqual(changed, 3)
            db.session.expire_all()

            a = db.session.get(Server, self.a)
            self.assertEqual((a.passexec_name, a.passexec_cmd),
                             ('vault', None))
            b = db.session.get(Server, self.b)
            self.assertEqual((b.passexec_name, b.passexec_cmd),
                             (None, None))
            c = db.session.get(Server, self.c)
            self.assertEqual((c.passexec_name, c.passexec_cmd),
                             (None, None))
            d = db.session.get(Server, self.d)
            self.assertIsNone(d.passexec_cmd)
            self.assertIsNone(d.passexec_name)
            s = db.session.get(SharedServer, self.shared)
            self.assertEqual((s.passexec_name, s.passexec_cmd),
                             ('vault', None))

            # One warning for b (none for the empty-string row).
            self.assertEqual(logger.warning.call_count, 1)
            for call in logger.method_calls:
                self.assertNotIn('SECRET-TOKEN-123', repr(call))
                self.assertNotIn('get-pass', repr(call))

            # Idempotent.
            self.assertEqual(convert_legacy_server_passexec(logger), 0)

    def tearDown(self):
        from pgadmin.model import db, Server, SharedServer, ServerGroup
        db.session.rollback()
        SharedServer.query.filter_by(id=self.shared).delete()
        for sid in (self.a, self.b, self.c, self.d):
            Server.query.filter_by(id=sid).delete()
        ServerGroup.query.filter_by(id=self.group_id).delete()
        db.session.commit()
        self.ctx.pop()
