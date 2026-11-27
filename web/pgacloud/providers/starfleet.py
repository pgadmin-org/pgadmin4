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
    Auth0Client, DEFAULT_API_URL

POLL_INTERVAL = 5
POLL_TIMEOUT = 1800
DATABASES = '/managed/v1/databases'
READY = 'available'
FAILED = ('failed', 'degraded')
# Once created, the database exists (and is billed) even if we give up on it.
MAY_EXIST = ('The database may still exist in pgEdge Starfleet; check the '
             'pgEdge Starfleet console and delete it if it is not needed.')
# pgAdmin's role names mapped to the API's user_type values.
USER_TYPES = {'admin': 'admin', 'app': 'application'}


class StarfleetProvider(AbsProvider):
    def __init__(self):
        self._client_id = os.environ.get('STARFLEET_CLIENT_ID')
        self._client_secret = os.environ.get('STARFLEET_CLIENT_SECRET')
        self._api_url = os.environ.get('STARFLEET_API_URL',
                                       DEFAULT_API_URL)
        # A user sign-in, used when no API client credentials are given.
        self._token = os.environ.get('STARFLEET_ACCESS_TOKEN')
        try:
            self._expires_at = float(
                os.environ.get('STARFLEET_TOKEN_EXPIRES_AT'))
        except (TypeError, ValueError):
            self._expires_at = None
        self._tenant_id = os.environ.get('STARFLEET_TENANT_ID') or None
        self._refresh_token = os.environ.get('STARFLEET_REFRESH_TOKEN')
        self._auth0_domain = os.environ.get('STARFLEET_AUTH0_DOMAIN')
        self._auth0_client_id = os.environ.get('STARFLEET_AUTH0_CLIENT_ID')

    def init_args(self, parsers):
        """ Create the command line parser for this provider """
        self.parser = parsers.add_parser(
            'starfleet', help='pgEdge Starfleet',
            epilog='Credentials are read from the STARFLEET_CLIENT_ID and '
                   'STARFLEET_CLIENT_SECRET environment variables or, for a '
                   'user sign-in, from STARFLEET_ACCESS_TOKEN, '
                   'STARFLEET_TOKEN_EXPIRES_AT, STARFLEET_TENANT_ID and '
                   'optionally STARFLEET_REFRESH_TOKEN, '
                   'STARFLEET_AUTH0_DOMAIN and STARFLEET_AUTH0_CLIENT_ID.')
        parsers = self.parser.add_subparsers(help='Starfleet commands',
                                             dest='command')
        p = parsers.add_parser('create-instance',
                               help='create a new database')
        p.add_argument('--name', required=True, help='database name')
        p.add_argument('--display-name', help='display name')
        p.add_argument('--pg-version', help='PostgreSQL major version')
        p.add_argument('--region', required=True, help='region')
        p.add_argument('--size', required=True, help='size')
        p.add_argument('--allowlist', default='',
                       help='comma-separated IPv4 addresses/CIDRs')
        p.add_argument('--role', choices=list(USER_TYPES), default='admin',
                       help='role to connect as')

    def _auth0(self):
        if self._refresh_token and self._auth0_domain and \
                self._auth0_client_id:
            return Auth0Client(self._auth0_domain, self._auth0_client_id)
        return None

    def _refresh(self):
        """Renew a user sign-in's token, keeping the rotated refresh
        token for the next renewal and for revoking at the end."""
        tokens = self._auth0().refresh(self._refresh_token)
        if tokens['refresh_token']:
            self._refresh_token = tokens['refresh_token']
        return tokens['access_token'], tokens['expires_in']

    def _client(self):
        if self._client_id and self._client_secret:
            return StarfleetClient(self._api_url, self._client_id,
                                   self._client_secret)
        return StarfleetClient(
            self._api_url, token=self._token, expires_at=self._expires_at,
            tenant_id=self._tenant_id,
            refresh=self._refresh if self._auth0() else None)

    def _revoke_refresh_token(self):
        """Nothing else holds this refresh token, so end it with the
        job rather than leave it live."""
        auth0 = self._auth0()
        if auth0 is None:
            return
        try:
            auth0.revoke(self._refresh_token)
        except StarfleetError as e:
            debug('Could not revoke the pgEdge Starfleet refresh token: '
                  '{}'.format(e))

    @staticmethod
    def _create_body(args):
        body = {'name': args.name}
        if args.display_name:
            body['display_name'] = args.display_name
        if args.pg_version:
            body['pg_version'] = args.pg_version
        body['region'] = args.region
        body['size'] = args.size
        cidrs = [c.strip() for c in args.allowlist.split(',') if c.strip()]
        body['ip_allowlist'] = {'rules': [
            {'cidr': c, 'label': 'pgAdmin'} for c in cidrs]}
        return body

    @staticmethod
    def _has_connection(db):
        conn = db.get('connection') or {}
        return bool((conn.get('host') or db.get('domain')) and
                    conn.get('port'))

    def _wait(self, client, path, params):
        deadline = time.monotonic() + POLL_TIMEOUT
        while True:
            try:
                db = client.get(path, params)
            except StarfleetError as e:
                # A client error other than rate limiting will not go away
                # by retrying; anything else may be transient, and giving
                # up would orphan a database that is still being created.
                if e.status is not None and 400 <= e.status < 500 and \
                        e.status != 429:
                    raise
                if time.monotonic() > deadline:
                    raise
                debug('Error polling pgEdge Starfleet, retrying: '
                      '{}'.format(e))
                time.sleep(POLL_INTERVAL)
                continue
            status = db.get('status')
            if status == READY and self._has_connection(db):
                return db
            if status in FAILED:
                error('pgEdge Starfleet reported the database as '
                      '"{}". {}'.format(status, MAY_EXIST))
            if time.monotonic() > deadline:
                if status == READY:
                    error('The database is available, but pgEdge '
                          'Starfleet did not report its host and port '
                          'in time. {}'.format(MAY_EXIST))
                error('Timed out waiting for the database to become '
                      'available (last status: "{}"). {}'.format(
                          status, MAY_EXIST))
            debug('Database status: {}...'.format(status))
            time.sleep(POLL_INTERVAL)

    def cmd_create_instance(self, args):
        """ Create a database and wait for it to become available """
        try:
            self._create_instance(args)
        finally:
            self._revoke_refresh_token()

    def _create_instance(self, args):
        params = {'user_type': USER_TYPES[args.role]}

        try:
            client = self._client()
            debug('Creating pgEdge Starfleet database {}...'.format(
                args.name))
            created = client.post(DATABASES, self._create_body(args))
            path = '{}/{}'.format(DATABASES, created['id'])
            try:
                db = self._wait(client, path, params)
            except StarfleetError as e:
                error('{} {}'.format(e, MAY_EXIST))
            conn = db.get('connection') or {}
            # Never output conn['password']: stdout is persisted to disk.
            instance = {
                'Provider': 'starfleet',
                'Id': db['id'],
                'Role': args.role,
                'Hostname': conn.get('host') or db.get('domain'),
                'Port': conn.get('port'),
                'Database': conn.get('database'),
                'Username': conn.get('username'),
            }
        except StarfleetError as e:
            error(str(e))
        except (KeyError, TypeError, AttributeError):
            error('Unexpected response from pgEdge Starfleet.')

        output({'instance': instance})


def load():
    """ Loads the current provider """
    return StarfleetProvider()
