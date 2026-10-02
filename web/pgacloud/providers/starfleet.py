##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

""" pgEdge Starfleet provider """

import os
import time

from providers._abstract import AbsProvider
from utils.io import debug, error, output
from utils.starfleet_api import StarfleetClient, StarfleetError, \
    DEFAULT_API_URL

POLL_INTERVAL = 5
POLL_TIMEOUT = 1800
READY = 'available'
FAILED = ('failed', 'degraded')
# pgAdmin's role names mapped to the Managed API's user_type values.
USER_TYPES = {'admin': 'admin', 'app': 'application'}


class StarfleetProvider(AbsProvider):
    def __init__(self):
        self._client_id = os.environ.get('STARFLEET_CLIENT_ID')
        self._client_secret = os.environ.get('STARFLEET_CLIENT_SECRET')
        self._api_url = os.environ.get('STARFLEET_API_URL',
                                       DEFAULT_API_URL)

    def init_args(self, parsers):
        """ Create the command line parser for this provider """
        self.parser = parsers.add_parser(
            'starfleet', help='pgEdge Starfleet',
            epilog='Credentials are read from the STARFLEET_CLIENT_ID and '
                   'STARFLEET_CLIENT_SECRET environment variables.')
        parsers = self.parser.add_subparsers(help='Starfleet commands',
                                             dest='command')
        p = parsers.add_parser('create-instance',
                               help='create a new database')
        p.add_argument('--kind', choices=['managed', 'byoc'],
                       required=True, help='Managed or BYOC')
        p.add_argument('--name', required=True, help='database name')
        p.add_argument('--display-name', help='display name')
        p.add_argument('--pg-version', help='PostgreSQL major version')
        p.add_argument('--region', help='region (Managed)')
        p.add_argument('--size', help='size (Managed)')
        p.add_argument('--allowlist', default='',
                       help='comma-separated IPv4 addresses/CIDRs (Managed)')
        p.add_argument('--role', choices=list(USER_TYPES), default='admin',
                       help='role to connect as (Managed)')
        p.add_argument('--cluster-id', help='cluster ID (BYOC)')

    def _client(self):
        return StarfleetClient(self._api_url, self._client_id,
                               self._client_secret)

    @staticmethod
    def _create_body(args):
        body = {'name': args.name}
        if args.display_name:
            body['display_name'] = args.display_name
        if args.pg_version:
            body['pg_version'] = args.pg_version
        if args.kind == 'managed':
            body['region'] = args.region
            body['size'] = args.size
            cidrs = [c.strip() for c in args.allowlist.split(',')
                     if c.strip()]
            body['ip_allowlist'] = {'rules': [
                {'cidr': c, 'label': 'pgAdmin'} for c in cidrs]}
        else:
            body['cluster_id'] = args.cluster_id
        return body

    def _wait(self, client, path, params):
        deadline = time.monotonic() + POLL_TIMEOUT
        while True:
            db = client.get(path, params)
            status = db.get('status')
            if status == READY:
                return db
            if status in FAILED:
                error('pgEdge Starfleet reported the database as '
                      '"{}".'.format(status))
            if time.monotonic() > deadline:
                error('Timed out waiting for the database to become '
                      'available (last status: "{}").'.format(status))
            debug('Database status: {}...'.format(status))
            time.sleep(POLL_INTERVAL)

    def cmd_create_instance(self, args):
        """ Create a database and wait for it to become available """
        prefix = '/{}/v1/databases'.format(args.kind)
        params = {'user_type': USER_TYPES[args.role]} \
            if args.kind == 'managed' else None
        role = args.role if args.kind == 'managed' else 'admin'

        try:
            client = self._client()
            debug('Creating pgEdge Starfleet database {}...'.format(
                args.name))
            created = client.post(prefix, self._create_body(args))
            db = self._wait(client, '{}/{}'.format(prefix, created['id']),
                            params)
        except StarfleetError as e:
            error(str(e))

        conn = db.get('connection') or {}
        # Never output conn['password']: stdout is persisted to disk.
        output({'instance': {
            'Provider': 'starfleet',
            'Kind': args.kind,
            'Id': db['id'],
            'Role': role,
            'Hostname': conn.get('host') or db.get('domain'),
            'Port': conn.get('port'),
            'Database': conn.get('database'),
            'Username': conn.get('username'),
        }})


def load():
    """ Loads the current provider """
    return StarfleetProvider()
