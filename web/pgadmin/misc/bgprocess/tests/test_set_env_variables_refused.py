##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Tests that a job whose environment cannot be resolved (a refused
connection file path, or a service that is not allowed) leaves no
never-started row behind."""

import os
import shutil
import tempfile
import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from pgadmin.misc.bgprocess.processes import BatchProcess, IProcessDesc
from pgadmin.model import Process, User, db
from pgadmin.utils import ServiceNotAllowed
from pgadmin.utils.route import BaseTestGenerator


class _Desc(IProcessDesc):
    @property
    def message(self):
        return 'refused job'

    def details(self, cmd, args):
        return {'message': 'refused job', 'cmd': cmd, 'query': None,
                'info': ''}


class TestSetEnvVariablesRefusedDiscardsJob(BaseTestGenerator):
    """set_env_variables() removes the job's row and log directory when it
    raises, and keeps them when it succeeds."""

    scenarios = [
        ('A refused passfile discards the job',
         dict(passfile='../bob/.pgpass', refused=True)),
        ('A passfile in storage keeps the job',
         dict(passfile='/.pgpass', refused=False)),
        ('A service that is not allowed discards the job',
         dict(passfile='/.pgpass', refused=True, service='forbidden',
              exception=ServiceNotAllowed)),
    ]

    service = None
    exception = PermissionError

    def setUp(self):
        # No test server is needed.
        unittest.TestCase.setUp(self)
        self.outer = os.path.realpath(
            tempfile.mkdtemp(prefix='pga_set_env_'))
        self.alice = os.path.join(self.outer, 'alice')
        for d in ('alice', 'bob'):
            os.makedirs(os.path.join(self.outer, d))
            with open(os.path.join(self.outer, d, '.pgpass'), 'w') as f:
                f.write('*:*:*:*:secret\n')
        self.pid = None
        self.user_id = None

    def tearDown(self):
        if self.pid is not None:
            with self.app.app_context():
                p = Process.query.filter_by(pid=self.pid).first()
                if p is not None:
                    db.session.delete(p)
                    db.session.commit()
        if getattr(self, 'log_dir', None):
            shutil.rmtree(self.log_dir, True)
        shutil.rmtree(self.outer, ignore_errors=True)

    def runTest(self):
        params = {'passfile': self.passfile}
        manager = MagicMock(connection_params=params, use_ssh_tunnel=False,
                            service=self.service, kerberos_conn=False)
        with self.app.test_request_context(), \
                patch.dict(self.app.config, {
                    'SERVER_MODE': True,
                    'SERVER_MODE_ALLOWED_SERVICES': []}), \
                patch.object(self.app, 'PGADMIN_RUNTIME', False), \
                patch('pgadmin.utils.get_storage_directory',
                      return_value=self.alice), \
                patch('pgadmin.misc.bgprocess.processes.current_user',
                      SimpleNamespace(id=User.query.first().id)):
            p = BatchProcess(desc=_Desc(), cmd='/bin/true', args=[],
                             manager_obj=manager)
            # The stored pid, as a string: Process.pid is a string column.
            self.pid = p._unstarted_pid
            self.assertIsInstance(self.pid, str)
            self.log_dir = p.log_dir
            self.assertTrue(os.path.isdir(p.log_dir))

            if self.refused:
                with self.assertRaises(self.exception) as cm:
                    p.set_env_variables(None)
                if self.service:
                    self.assertIn('SERVER_MODE_ALLOWED_SERVICES',
                                  str(cm.exception))
                self.assertIsNone(
                    Process.query.filter_by(pid=self.pid).first())
                self.assertFalse(os.path.exists(p.log_dir))
            else:
                p.set_env_variables(None)
                self.assertIsNotNone(
                    Process.query.filter_by(pid=self.pid).first())
                self.assertTrue(os.path.isdir(p.log_dir))
                # Once the environment is resolved the job is no longer
                # "unstarted": a later failing call must leave its row.
                self.assertIsNone(p._unstarted_pid)
                p._discard_unstarted()
                self.assertIsNotNone(
                    Process.query.filter_by(pid=self.pid).first())
