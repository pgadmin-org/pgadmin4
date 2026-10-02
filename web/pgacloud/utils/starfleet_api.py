##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Minimal client for the pgEdge Starfleet REST API.

Shared by the pgacloud Starfleet provider and the pgAdmin cloud blueprint,
so it must not import anything from pgadmin.
"""

import json
import time
from urllib.parse import urlencode, urlsplit

import urllib3

DEFAULT_API_URL = 'https://api.pgedge.com'
TOKEN_PATH = '/account/v1/oauth/token'
# Re-mint this many seconds before the token's stated expiry.
EXPIRY_MARGIN = 60


class StarfleetError(Exception):
    """An error returned by, or while talking to, the Starfleet API."""

    def __init__(self, message, status=None):
        super().__init__(message)
        self.status = status


class StarfleetClient:
    def __init__(self, api_url=DEFAULT_API_URL, client_id=None,
                 client_secret=None, token=None, expires_at=None,
                 http=None):
        self.api_url = (api_url or DEFAULT_API_URL).rstrip('/')
        self.client_id = client_id
        self.client_secret = client_secret
        self.token = token
        self.expires_at = expires_at
        self._http = http or urllib3.PoolManager(
            timeout=urllib3.Timeout(connect=10, read=60), retries=False)

    def _can_mint(self):
        return bool(self.client_id and self.client_secret)

    def get_token(self):
        """Mint a new access token from the client credentials."""
        if not self._can_mint():
            raise StarfleetError('No pgEdge Starfleet API client credentials '
                                 'were provided.')
        resp = self._request('POST', TOKEN_PATH, body={
            'client_id': self.client_id,
            'client_secret': self.client_secret,
            'grant_type': 'client_credentials'}, auth=False)
        try:
            token = resp['access_token']
            expires_in = int(resp.get('expires_in') or 3600)
        except (KeyError, TypeError, ValueError, AttributeError):
            raise StarfleetError('pgEdge Starfleet did not return an access '
                                 'token.')
        self.token = token
        self.expires_at = time.time() + expires_in
        return self.token

    def _ensure_token(self):
        expired = self.expires_at is not None and \
            time.time() >= self.expires_at - EXPIRY_MARGIN
        if (self.token is None or expired) and self._can_mint():
            self.get_token()
        if self.token is None:
            raise StarfleetError('Not authenticated to pgEdge Starfleet.',
                                 401)

    def get(self, path, params=None):
        return self._request('GET', path, params=params)

    def post(self, path, body):
        return self._request('POST', path, body=body)

    def _request(self, method, path, body=None, params=None, auth=True,
                 retry=True):
        # Checked here rather than in __init__ so that every caller's
        # existing StarfleetError handler sees it, before any credential
        # or token can be sent in the clear.
        if urlsplit(self.api_url).scheme != 'https':
            raise StarfleetError('The pgEdge Starfleet API URL must use '
                                 'HTTPS.')
        headers = {'Accept': 'application/json'}
        if auth:
            self._ensure_token()
            headers['Authorization'] = 'Bearer ' + self.token
        url = self.api_url + path
        if params:
            url += '?' + urlencode(params)
        data = None
        if body is not None:
            data = json.dumps(body).encode('utf-8')
            headers['Content-Type'] = 'application/json'

        try:
            resp = self._http.request(method, url, body=data,
                                      headers=headers)
        except urllib3.exceptions.HTTPError as e:
            raise StarfleetError(
                'Could not reach the pgEdge Starfleet API: {}'.format(e))

        if resp.status == 401 and auth and retry and self._can_mint():
            self.token = None
            return self._request(method, path, body, params, auth,
                                 retry=False)

        try:
            payload = json.loads(resp.data) if resp.data else None
        except ValueError:
            if resp.status < 400:
                raise StarfleetError('pgEdge Starfleet returned a response '
                                     'that is not valid JSON.', resp.status)
            payload = None

        if resp.status >= 400:
            message = payload.get('message') \
                if isinstance(payload, dict) else None
            raise StarfleetError(
                message or 'pgEdge Starfleet API returned HTTP {}'.format(
                    resp.status), resp.status)
        return payload
