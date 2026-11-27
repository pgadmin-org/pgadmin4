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

import base64
import json
import time
from urllib.parse import urlencode, urlsplit

import urllib3

DEFAULT_API_URL = 'https://api.pgedge.com'
TOKEN_PATH = '/account/v1/oauth/token'
# Re-mint this many seconds before the token's stated expiry.
EXPIRY_MARGIN = 60
# Chooses which of a signed-in user's tenants a request acts in; it must
# be one of the token's pgedge_tenant_ids.
TENANT_HEADER = 'X-pgEdge-Selected-Tenant'
# RFC 8628 grant type for polling the token endpoint.
DEVICE_GRANT = 'urn:ietf:params:oauth:grant-type:device_code'
# offline_access asks Auth0 for a refresh token as well.
SIGNIN_SCOPE = 'openid profile email offline_access'


class StarfleetError(Exception):
    """An error returned by, or while talking to, the Starfleet API."""

    def __init__(self, message, status=None):
        super().__init__(message)
        self.status = status


class StarfleetClient:
    def __init__(self, api_url=DEFAULT_API_URL, client_id=None,
                 client_secret=None, token=None, expires_at=None,
                 http=None, ca_certs=None, tenant_id=None, refresh=None):
        """refresh, if given, is a callable returning a fresh
        (access_token, expires_in) pair for a user sign-in."""
        self.api_url = (api_url or DEFAULT_API_URL).rstrip('/')
        self.client_id = client_id
        self.client_secret = client_secret
        self.token = token
        self.expires_at = expires_at
        self.tenant_id = tenant_id
        self._refresh = refresh
        # ca_certs=None leaves OpenSSL's default verify paths in place, which
        # honour SSL_CERT_FILE; pgAdmin sets that for its background jobs.
        self._http = http or urllib3.PoolManager(
            timeout=urllib3.Timeout(connect=10, read=60), retries=False,
            cert_reqs='CERT_REQUIRED', ca_certs=ca_certs)

    def _can_mint(self):
        return bool(self.client_id and self.client_secret) or \
            self._refresh is not None

    def get_token(self):
        """Mint a new access token from the client credentials, or
        refresh a user sign-in's."""
        if self._refresh is not None and not \
                (self.client_id and self.client_secret):
            self.token, expires_in = self._refresh()
            self.expires_at = time.time() + expires_in
            return self.token
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
            if not isinstance(token, str) or not token:
                raise ValueError
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
            if self.tenant_id:
                headers[TENANT_HEADER] = self.tenant_id
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


def token_claims(token):
    """Decode a JWT's payload without checking its signature: the API
    verifies every token it receives, and this only reads it. Returns {}
    for anything that is not a JWT with a JSON object payload."""
    try:
        payload = token.split('.')[1]
        payload += '=' * (-len(payload) % 4)
        claims = json.loads(base64.urlsafe_b64decode(payload))
    except (AttributeError, IndexError, ValueError, TypeError):
        return {}
    return claims if isinstance(claims, dict) else {}


def token_tenants(claims):
    """The tenant IDs a user's token may act in, and its default one."""
    ids = claims.get('pgedge_tenant_ids')
    default = claims.get('pgedge_tenant_id')
    if not isinstance(ids, list) or not ids:
        ids = [default] if default else []
    ids = [t for t in ids if isinstance(t, str) and t]
    if default not in ids:
        default = ids[0] if ids else None
    return ids, default


class Auth0Error(StarfleetError):
    """An OAuth error returned by Auth0, such as authorization_pending."""

    def __init__(self, code, description=None, status=None):
        super().__init__(description or code, status)
        self.code = code


class Auth0Client:
    """The OAuth 2.0 device authorization grant (RFC 8628) and refresh
    token grant against the Auth0 tenant that pgEdge Starfleet's user
    sign-in uses."""

    def __init__(self, domain, client_id, audience=None, http=None,
                 ca_certs=None):
        self.base_url = 'https://' + domain.strip().rstrip('/')
        self.client_id = client_id
        self.audience = audience
        self._http = http or urllib3.PoolManager(
            timeout=urllib3.Timeout(connect=10, read=30), retries=False,
            cert_reqs='CERT_REQUIRED', ca_certs=ca_certs)

    def _post(self, path, form):
        try:
            resp = self._http.request(
                'POST', self.base_url + path,
                body=urlencode({k: v for k, v in form.items()
                                if v is not None}),
                headers={'Accept': 'application/json',
                         'Content-Type':
                             'application/x-www-form-urlencoded'})
        except urllib3.exceptions.HTTPError as e:
            raise StarfleetError(
                'Could not reach the pgEdge sign-in service: {}'.format(e))
        try:
            payload = json.loads(resp.data) if resp.data else {}
        except ValueError:
            payload = None
        if not isinstance(payload, dict):
            payload = {}
        if resp.status >= 400:
            code = payload.get('error')
            if isinstance(code, str) and code:
                desc = payload.get('error_description')
                raise Auth0Error(code, desc if isinstance(desc, str)
                                 else None, resp.status)
            raise StarfleetError('The pgEdge sign-in service returned '
                                 'HTTP {}'.format(resp.status), resp.status)
        return payload

    def request_device_code(self):
        """Start a sign-in. Returns device_code, user_code,
        verification_uri, verification_uri_complete (may be None),
        expires_in and interval."""
        resp = self._post('/oauth/device/code', {
            'client_id': self.client_id, 'audience': self.audience,
            'scope': SIGNIN_SCOPE})
        try:
            code = {
                'device_code': resp['device_code'],
                'user_code': resp['user_code'],
                'verification_uri': resp['verification_uri'],
                'verification_uri_complete':
                    resp.get('verification_uri_complete'),
                'expires_in': int(resp.get('expires_in') or 300),
                # RFC 8628 section 3.2: 5 seconds when none is given.
                'interval': int(resp.get('interval') or 5),
            }
            for key in ('device_code', 'user_code', 'verification_uri'):
                if not isinstance(code[key], str) or not code[key]:
                    raise ValueError
        except (KeyError, TypeError, ValueError):
            raise StarfleetError('The pgEdge sign-in service returned an '
                                 'incomplete response.')
        # The wizard shows these as links, so only ever an https page.
        for key in ('verification_uri', 'verification_uri_complete'):
            if code[key] is not None and not _is_web_url(code[key]):
                if key == 'verification_uri':
                    raise StarfleetError('The pgEdge sign-in service '
                                         'returned an invalid sign-in URL.')
                code[key] = None
        return code

    def poll_device_code(self, device_code):
        """Make one token request for a pending sign-in. Raises
        Auth0Error with code authorization_pending, slow_down,
        expired_token or access_denied until the user has confirmed."""
        return self._tokens({'grant_type': DEVICE_GRANT,
                             'device_code': device_code,
                             'client_id': self.client_id})

    def refresh(self, refresh_token):
        """Trade a refresh token for new tokens. Auth0 rotates refresh
        tokens, so the old one is dead once this succeeds."""
        return self._tokens({'grant_type': 'refresh_token',
                             'client_id': self.client_id,
                             'refresh_token': refresh_token})

    def revoke(self, refresh_token):
        """Revoke a refresh token that is no longer needed."""
        self._post('/oauth/revoke', {'client_id': self.client_id,
                                     'token': refresh_token})

    def _tokens(self, form):
        resp = self._post('/oauth/token', form)
        try:
            tokens = {'access_token': resp['access_token'],
                      'refresh_token': resp.get('refresh_token'),
                      'expires_in': int(resp.get('expires_in') or 3600)}
            if not isinstance(tokens['access_token'], str) or \
                    not tokens['access_token']:
                raise ValueError
            if not isinstance(tokens['refresh_token'], str):
                tokens['refresh_token'] = None
        except (KeyError, TypeError, ValueError):
            raise StarfleetError('The pgEdge sign-in service did not '
                                 'return an access token.')
        return tokens


def _is_web_url(url):
    parts = urlsplit(url)
    return parts.scheme == 'https' and bool(parts.netloc)
