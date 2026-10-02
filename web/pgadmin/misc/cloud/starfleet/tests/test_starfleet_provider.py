##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Tests for the pgacloud Starfleet provider."""

import argparse
import contextlib
import io
import json
import os
import sys
import unittest
from unittest.mock import patch

from pgadmin.utils.route import BaseTestGenerator

PGACLOUD_DIR = os.path.realpath(os.path.join(
    os.path.dirname(__file__), '..', '..', '..', '..', '..', 'pgacloud'))

SECRET_PW = 'very-secret-generated-pw'


class _SkipServerSetUpMixin:
    def setUp(self):
        unittest.TestCase.setUp(self)


def _load_provider():
    if PGACLOUD_DIR not in sys.path:
        sys.path.insert(0, PGACLOUD_DIR)
    from providers import starfleet
    return starfleet


class FakeClient:
    def __init__(self, statuses, connection=None):
        self.statuses = list(statuses)
        self.posts = []
        self.gets = []
        self.connection = connection or {
            'host': 'db.example.com', 'port': 5432, 'database': 'appdb',
            'username': 'admin', 'password': SECRET_PW}

    def post(self, path, body):
        self.posts.append((path, body))
        return {'id': 'db-1', 'status': 'creating'}

    def get(self, path, params=None):
        self.gets.append((path, params))
        status = self.statuses.pop(0)
        db = {'id': 'db-1', 'status': status, 'domain': 'dom.example.com'}
        if status == 'available':
            db['connection'] = self.connection
        return db


def _parse(starfleet, argv):
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest='provider')
    prov = starfleet.StarfleetProvider()
    prov.init_args(subparsers)
    args = parser.parse_args(['starfleet'] + argv)
    return prov, args


def _run(prov, args, client):
    out, err = io.StringIO(), io.StringIO()
    code = 0
    with patch.object(prov, '_client', return_value=client), \
            patch('time.sleep'), \
            contextlib.redirect_stdout(out), \
            contextlib.redirect_stderr(err):
        try:
            prov.cmd_create_instance(args)
        except SystemExit as e:
            code = e.code
    return code, out.getvalue(), err.getvalue()


MANAGED_ARGS = ['create-instance', '--kind', 'managed', '--name', 'mydb',
                '--display-name', 'My DB', '--pg-version', '18',
                '--region', 'us-east-2', '--size', 'small',
                '--allowlist', '198.51.100.7, 203.0.113.0/24',
                '--role', 'admin']


class TestStarfleetProvider(_SkipServerSetUpMixin, BaseTestGenerator):
    scenarios = [('default', dict())]

    def runTest(self):
        starfleet = _load_provider()
        self._test_managed_success(starfleet)
        self._test_byoc_success(starfleet)
        self._test_failed_status(starfleet)
        self._test_timeout(starfleet)
        self._test_available_without_connection(starfleet)
        self._test_api_error(starfleet)

    def _test_managed_success(self, starfleet):
        prov, args = _parse(starfleet, MANAGED_ARGS)
        client = FakeClient(['creating', 'creating', 'available'])
        code, out, err = _run(prov, args, client)
        self.assertEqual(code, 0)
        path, body = client.posts[0]
        self.assertEqual(path, '/managed/v1/databases')
        self.assertEqual(body, {
            'name': 'mydb', 'display_name': 'My DB', 'pg_version': '18',
            'region': 'us-east-2', 'size': 'small',
            'ip_allowlist': {'rules': [
                {'cidr': '198.51.100.7', 'label': 'pgAdmin'},
                {'cidr': '203.0.113.0/24', 'label': 'pgAdmin'}]}})
        self.assertEqual(client.gets[0],
                         ('/managed/v1/databases/db-1',
                          {'user_type': 'admin'}))
        last = json.loads(out.strip().splitlines()[-1])
        self.assertEqual(last, {'instance': {
            'Provider': 'starfleet', 'Kind': 'managed', 'Id': 'db-1',
            'Role': 'admin', 'Hostname': 'db.example.com', 'Port': 5432,
            'Database': 'appdb', 'Username': 'admin'}})
        self.assertNotIn(SECRET_PW, out + err)

    def _test_byoc_success(self, starfleet):
        prov, args = _parse(starfleet, [
            'create-instance', '--kind', 'byoc', '--name', 'mydb',
            '--pg-version', '17', '--cluster-id', 'cl-1'])
        client = FakeClient(['available'], connection={
            'port': 5432, 'database': 'mydb', 'username': 'admin',
            'password': SECRET_PW})
        code, out, err = _run(prov, args, client)
        self.assertEqual(code, 0)
        self.assertEqual(client.posts[0], ('/byoc/v1/databases', {
            'name': 'mydb', 'pg_version': '17', 'cluster_id': 'cl-1'}))
        self.assertEqual(client.gets[0], ('/byoc/v1/databases/db-1', None))
        last = json.loads(out.strip().splitlines()[-1])
        # No connection.host, so fall back to the database domain.
        self.assertEqual(last['instance']['Hostname'], 'dom.example.com')
        self.assertEqual(last['instance']['Role'], 'admin')
        self.assertNotIn(SECRET_PW, out + err)

    def _test_failed_status(self, starfleet):
        for status in ('failed', 'degraded'):
            prov, args = _parse(starfleet, MANAGED_ARGS)
            code, out, err = _run(prov, args,
                                  FakeClient(['creating', status]))
            self.assertEqual(code, 1)
            self.assertIn(status, err)

    def _test_timeout(self, starfleet):
        prov, args = _parse(starfleet, MANAGED_ARGS)
        ticks = iter([0, 0, starfleet.POLL_TIMEOUT + 1])
        with patch('time.monotonic', side_effect=lambda: next(ticks)):
            code, out, err = _run(prov, args,
                                  FakeClient(['creating', 'creating']))
        self.assertEqual(code, 1)
        self.assertIn('Timed out', err)

    def _test_available_without_connection(self, starfleet):
        class Late(FakeClient):
            def get(self, path, params=None):
                db = super().get(path, params)
                if len(self.gets) < 3:
                    db['connection'] = {'database': 'appdb'}
                    db.pop('domain')
                return db

        # Available but without host/port at first: keep polling.
        prov, args = _parse(starfleet, MANAGED_ARGS)
        client = Late(['available'] * 3)
        code, out, err = _run(prov, args, client)
        self.assertEqual(code, 0)
        self.assertEqual(len(client.gets), 3)
        last = json.loads(out.strip().splitlines()[-1])
        self.assertEqual(last['instance']['Hostname'], 'db.example.com')
        self.assertEqual(last['instance']['Port'], 5432)

        # Never reported: fail rather than emit a null host and port.
        prov, args = _parse(starfleet, MANAGED_ARGS)
        ticks = iter([0, 0, starfleet.POLL_TIMEOUT + 1])
        client = FakeClient(['available'] * 2, connection={
            'database': 'appdb'})
        with patch('time.monotonic', side_effect=lambda: next(ticks)):
            code, out, err = _run(prov, args, client)
        self.assertEqual(code, 1)
        self.assertIn('did not report its host and port', err)
        self.assertNotIn('"instance"', out)

    def _test_api_error(self, starfleet):
        from utils.starfleet_api import StarfleetError

        class Boom(FakeClient):
            def post(self, path, body):
                raise StarfleetError('name already in use', 409)

        prov, args = _parse(starfleet, MANAGED_ARGS)
        code, out, err = _run(prov, args, Boom([]))
        self.assertEqual(code, 1)
        self.assertIn('name already in use', err)
