##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Deploy databases on pgEdge Starfleet."""

import time

from psycopg import pq
from flask import session, current_app, request
from flask_babel import gettext as _
from flask_security import current_user

import config
from config import root
from pgacloud.utils.starfleet_api import StarfleetClient, StarfleetError, \
    Auth0Client, Auth0Error, token_claims, token_tenants
from pgadmin.model import db, Server
from pgadmin.misc.bgprocess import BatchProcess
from pgadmin.misc.cloud.utils import _create_server, CloudProcessDesc
from pgadmin.user_login_check import pga_login_required
from pgadmin.utils import PgAdminModule
from pgadmin.utils.ajax import make_json_response, bad_request, \
    unauthorized, forbidden, gone
from pgadmin.utils.crypto import encrypt
from pgadmin.utils.master_password import get_crypt_key
from pgadmin.utils.text_sanitize import sanitize_external_text
from pgadmin.utils.tls import ca_file_env, get_ca_file

MODULE_NAME = 'starfleet'
TENANTS = '/account/v1/tenants'
DATABASES = '/managed/v1/databases'
SESSION_KEY = 'starfleet'
# The device code of a user sign-in that is waiting to be confirmed.
SIGNIN_KEY = 'starfleet_signin'
# How the wizard authenticates: a user's own sign-in, or an API client.
AUTH_USER = 'user'
AUTH_API_CLIENT = 'api_client'
# RFC 8628 section 3.5: each slow_down adds 5 seconds, permanently.
SLOW_DOWN_STEP = 5
# Tokens kept per deployment job, since closing the wizard clears
# SESSION_KEY long before the job finishes and the password is fetched.
JOBS_KEY = 'starfleet_jobs'
USER_TYPES = {'admin': 'admin', 'app': 'application'}
CONNECTION_PARAMS = {'sslmode': 'require', 'gssencmode': 'disable',
                     'connect_timeout': 30}
# Starfleet endpoints drop any SSL connection that arrives without SNI,
# which libpq only sends from version 14.
MIN_LIBPQ_VERSION = 140000


class StarfleetModule(PgAdminModule):
    """Cloud module to deploy on pgEdge Starfleet"""

    def get_exposed_url_endpoints(self):
        return ['starfleet.verify_credentials',
                'starfleet.signin_options',
                'starfleet.signin_start',
                'starfleet.signin_poll',
                'starfleet.select_tenant',
                'starfleet.regions',
                'starfleet.pg_versions',
                'starfleet.sizes',
                'starfleet.client_ip',
                'starfleet.save_password']


blueprint = StarfleetModule(MODULE_NAME, __name__,
                            static_url_path='/misc/cloud/starfleet')


def _api_url():
    return getattr(config, 'STARFLEET_API_URL', None)


def _auth0_app():
    """The Auth0 application for user sign-in to the configured API, or
    None if user sign-in is not available for it."""
    apps = getattr(config, 'STARFLEET_AUTH0_APPS', None) or {}
    app = apps.get((_api_url() or '').rstrip('/'))
    if not isinstance(app, dict) or not all(
            isinstance(app.get(k), str) and app.get(k)
            for k in ('domain', 'audience', 'client_id')):
        return None
    return app


def _auth0_client(app=None):
    app = app or _auth0_app()
    return Auth0Client(app['domain'], app['client_id'], app['audience'],
                       ca_certs=get_ca_file())


def get_session_client(pid=None):
    """Build a token-only client from the session (or the job's copy of
    it), or None."""
    state = session.get(JOBS_KEY, {}).get(pid) if pid \
        else session.get(SESSION_KEY)
    if not state or not state.get('access_token'):
        return None
    return StarfleetClient(_api_url(), token=state['access_token'],
                           expires_at=state.get('expires_at'),
                           tenant_id=state.get('tenant_id'),
                           ca_certs=get_ca_file())


def _revoke(refresh_token):
    """Revoke a user sign-in's refresh token that nothing will use."""
    app = _auth0_app()
    if not refresh_token or app is None:
        return
    try:
        _auth0_client(app).revoke(refresh_token)
    except StarfleetError as e:
        current_app.logger.warning(
            'Could not revoke the pgEdge Starfleet refresh token: %s',
            sanitize_external_text(str(e)))


def clear_starfleet_session():
    session.pop(SIGNIN_KEY, None)
    state = session.pop(SESSION_KEY, None)
    if state:
        _revoke(state.get('refresh_token'))


def _keep_token_for_job(pid):
    """Copy the wizard's token for a job, dropping expired copies. A
    user sign-in's refresh token goes to the job alone, since Auth0
    rotates it on use and would refuse whichever copy was used second."""
    state = session.get(SESSION_KEY)
    if not state:
        return
    state = dict(state)
    state.pop('refresh_token', None)
    session[SESSION_KEY] = state
    now = time.time()
    jobs = {k: v for k, v in session.get(JOBS_KEY, {}).items()
            if (v.get('expires_at') or 0) > now}
    jobs[pid] = state
    session[JOBS_KEY] = jobs
    # The job's status is polled by requests that may be served by another
    # worker, so write this through rather than letting the session manager
    # defer it.
    session.force_write = True


def clear_starfleet_job(pid):
    jobs = dict(session.get(JOBS_KEY, {}))
    if jobs.pop(pid, None) is not None:
        session[JOBS_KEY] = jobs


# Raised when an upstream response is not the shape we expect.
MALFORMED = (KeyError, ValueError, TypeError, AttributeError)


def _error(e):
    return bad_request(errormsg=sanitize_external_text(str(e)))


def _with_client(fn):
    """Run fn(client) for a dropdown endpoint, mapping errors."""
    client = get_session_client()
    if client is None:
        return unauthorized(errormsg=_(
            'Not authenticated to pgEdge Starfleet. Go back to the '
            'Credentials step and sign in again.'))
    try:
        return make_json_response(data=fn(client))
    except StarfleetError as e:
        return _error(e)
    except MALFORMED as e:
        current_app.logger.warning(
            'Unexpected pgEdge Starfleet response: %s', type(e).__name__)
        return bad_request(errormsg=_(
            'Unexpected response from pgEdge Starfleet.'))


@blueprint.route("/")
@pga_login_required
def index():
    return bad_request(errormsg=_("This URL cannot be called directly."))


@blueprint.route('/verify_credentials/', methods=['POST'],
                 endpoint='verify_credentials')
@pga_login_required
def verify_credentials():
    """Check the API client credentials."""
    clear_starfleet_session()
    data = request.get_json(silent=True)
    secret = data.get('secret') if isinstance(data, dict) else None
    if not isinstance(secret, dict):
        secret = {}
    client = StarfleetClient(_api_url(), secret.get('client_id'),
                             secret.get('client_secret'),
                             ca_certs=get_ca_file())
    try:
        client.get_token()
        tenants = client.get(TENANTS) or []
        tenant_name = tenants[0].get('name') if tenants else None
    except StarfleetError as e:
        return _error(e)
    except MALFORMED as e:
        current_app.logger.warning(
            'Unexpected pgEdge Starfleet response: %s', type(e).__name__)
        return bad_request(errormsg=_(
            'Unexpected response from pgEdge Starfleet.'))

    session[SESSION_KEY] = {'access_token': client.token,
                            'expires_at': client.expires_at}
    # The wizard's next request may be served by another worker.
    session.force_write = True
    return make_json_response(success=1,
                              data=_with_libpq_warning(
                                  {'tenant_name': tenant_name}))


def _with_libpq_warning(data):
    warning = _libpq_warning()
    if warning:
        data['libpq_warning'] = warning
    return data


@blueprint.route('/signin_options/', methods=['GET'],
                 endpoint='signin_options')
@pga_login_required
def signin_options():
    """Say whether user sign-in is available for the configured API."""
    return make_json_response(data={'user_signin': _auth0_app() is not None})


@blueprint.route('/signin/start/', methods=['POST'],
                 endpoint='signin_start')
@pga_login_required
def signin_start():
    """Start a user sign-in with the device authorization grant. The
    browser then calls signin_poll until the user has confirmed the code
    on the sign-in page, in any browser."""
    clear_starfleet_session()
    app = _auth0_app()
    if app is None:
        return bad_request(errormsg=_(
            'Signing in with a pgEdge account is not available for the '
            'configured pgEdge Starfleet API. Use API client credentials '
            'instead.'))
    try:
        code = _auth0_client(app).request_device_code()
    except StarfleetError as e:
        return _error(e)
    now = time.time()
    session[SIGNIN_KEY] = {
        'device_code': code['device_code'],
        'interval': code['interval'],
        'expires_at': now + code['expires_in'],
        'next_poll_at': now + code['interval'],
    }
    session.force_write = True
    return make_json_response(data={
        'user_code': code['user_code'],
        'verification_uri': code['verification_uri'],
        'verification_uri_complete': code['verification_uri_complete'],
        'expires_in': code['expires_in'],
        'interval': code['interval'],
    })


def _signin_status(status, **data):
    return make_json_response(data={'status': status, **data})


def _signin_ended(status, message):
    session.pop(SIGNIN_KEY, None)
    session.force_write = True
    return _signin_status(status, message=message)


@blueprint.route('/signin/poll/', methods=['POST'], endpoint='signin_poll')
@pga_login_required
def signin_poll():
    """Check once whether the user has confirmed the sign-in, making at
    most one token request, and none before the interval Auth0 set."""
    pending = session.get(SIGNIN_KEY)
    if not pending:
        return bad_request(errormsg=_(
            'No pgEdge sign-in is in progress. Click the sign-in button '
            'to start one.'))
    now = time.time()
    if now >= pending['expires_at']:
        return _signin_ended('expired', _(
            'The sign-in code expired before it was confirmed. Click the '
            'sign-in button to get a new one.'))
    if now < pending['next_poll_at']:
        return _signin_status('pending', interval=pending['interval'])

    try:
        tokens = _auth0_client().poll_device_code(pending['device_code'])
    except Auth0Error as e:
        pending = dict(pending)
        if e.code == 'slow_down':
            pending['interval'] += SLOW_DOWN_STEP
        elif e.code == 'expired_token':
            return _signin_ended('expired', _(
                'The sign-in code expired before it was confirmed. Click '
                'the sign-in button to get a new one.'))
        elif e.code == 'access_denied':
            return _signin_ended('denied', _(
                'The sign-in was refused: {0}').format(
                    sanitize_external_text(str(e))))
        elif e.code != 'authorization_pending':
            session.pop(SIGNIN_KEY, None)
            return _error(e)
        pending['next_poll_at'] = now + pending['interval']
        session[SIGNIN_KEY] = pending
        session.force_write = True
        return _signin_status('pending', interval=pending['interval'])
    except StarfleetError as e:
        # Possibly transient, so keep the code and carry on polling; its
        # expiry still ends the sign-in.
        current_app.logger.warning(
            'Could not check the pgEdge sign-in: %s',
            sanitize_external_text(str(e)))
        pending = dict(pending, next_poll_at=now + pending['interval'])
        session[SIGNIN_KEY] = pending
        session.force_write = True
        return _signin_status('pending', interval=pending['interval'])

    session.pop(SIGNIN_KEY, None)
    claims = token_claims(tokens['access_token'])
    tenant_ids, default = token_tenants(claims)
    if not tenant_ids:
        _revoke(tokens['refresh_token'])
        session.force_write = True
        return _signin_status('failed', message=_(
            'This pgEdge account does not belong to any pgEdge Starfleet '
            'tenant. Accept an invitation to a tenant first.'))
    session[SESSION_KEY] = {
        'auth': AUTH_USER,
        'access_token': tokens['access_token'],
        'refresh_token': tokens['refresh_token'],
        'expires_at': now + tokens['expires_in'],
        'tenant_ids': tenant_ids,
        'tenant_id': default,
    }
    session.force_write = True
    return _signin_status('complete', tenants=_tenant_options(
        tokens['access_token'], tenant_ids), tenant_id=default)


def _tenant_options(token, tenant_ids):
    """Label the token's tenants with their names where the API gives
    them; the IDs alone still work if it does not."""
    names = {}
    client = StarfleetClient(_api_url(), token=token,
                             ca_certs=get_ca_file())
    try:
        for t in client.get(TENANTS) or []:
            if isinstance(t, dict) and isinstance(t.get('name'), str):
                names[str(t.get('id')).lower()] = t['name']
    except StarfleetError as e:
        current_app.logger.warning(
            'Could not list the pgEdge Starfleet tenants: %s',
            sanitize_external_text(str(e)))
    except MALFORMED:
        pass
    # Plain text: the wizard shows these in a select, which escapes them.
    return [{'value': t,
             'label': '{0} ({1})'.format(names[t.lower()], t)
             if t.lower() in names else t}
            for t in tenant_ids]


@blueprint.route('/select_tenant/', methods=['POST'],
                 endpoint='select_tenant')
@pga_login_required
def select_tenant():
    """Choose which of a signed-in user's tenants to deploy in."""
    state = session.get(SESSION_KEY)
    if not state or state.get('auth') != AUTH_USER:
        return unauthorized(errormsg=_(
            'Not signed in to pgEdge Starfleet. Click the sign-in button '
            'to sign in.'))
    data = request.get_json(silent=True)
    tenant_id = data.get('tenant_id') if isinstance(data, dict) else None
    match = [t for t in state.get('tenant_ids') or []
             if isinstance(tenant_id, str) and t.lower() == tenant_id.lower()]
    if not match:
        return bad_request(errormsg=_(
            'Select one of the pgEdge Starfleet tenants this sign-in can '
            'use.'))
    session[SESSION_KEY] = dict(state, tenant_id=match[0])
    session.force_write = True
    return make_json_response(success=1, data=_with_libpq_warning({}))


def _libpq_warning():
    """Explain why connections will fail if libpq is too old for SNI."""
    version = pq.version()
    if version >= MIN_LIBPQ_VERSION:
        return None
    return _('pgAdmin is using libpq {0}, which cannot connect to pgEdge '
             'Starfleet because it does not send the server name (SNI) '
             'during the SSL handshake. The database can be deployed, but '
             'pgAdmin will not be able to connect to it until it uses '
             'libpq 14 or later.').format(pq.version_pretty(version))


def _cpu(limit):
    """'1000m' -> '1', '500m' -> '0.5'."""
    if isinstance(limit, str) and limit.endswith('m'):
        return '{:g}'.format(int(limit[:-1]) / 1000)
    return str(limit)


@blueprint.route('/regions/', methods=['GET'], endpoint='regions')
@pga_login_required
def get_regions():
    return _with_client(lambda c: [
        {'label': r['region'], 'value': r['region']}
        for r in c.get('/managed/v1/regions')])


@blueprint.route('/pg_versions/', methods=['GET'], endpoint='pg_versions')
@pga_login_required
def get_pg_versions():
    return _with_client(lambda c: [
        {'label': 'PostgreSQL {}'.format(v['version']),
         'value': v['version'], 'default': bool(v.get('default'))}
        for v in c.get('/managed/v1/pg-versions')])


@blueprint.route('/sizes/', methods=['GET'], endpoint='sizes')
@pga_login_required
def get_sizes():
    return _with_client(lambda c: [
        {'label': '{} ({} vCPU, {} RAM, {} storage, {} connections)'.format(
            s['display_name'], _cpu(s['cpu_limit']), s['memory_limit'],
            s['storage_size'], s['connections']),
         'value': s['name']}
        for s in c.get('/managed/v1/sizes') if s.get('status') == 'active'])


@blueprint.route('/client_ip/', methods=['GET'], endpoint='client_ip')
@pga_login_required
def get_client_ip():
    return _with_client(
        lambda c: c.get('/managed/v1/client-ip')['ip_address'])


def _job_credentials(secret):
    """The environment that authenticates the deployment job. Tokens and
    secrets go only in its environment, never on its command line."""
    if not isinstance(secret, dict) or \
            secret.get('auth_method') != AUTH_USER:
        return {'STARFLEET_CLIENT_ID': secret['client_id'],
                'STARFLEET_CLIENT_SECRET': secret['client_secret']}
    state = session.get(SESSION_KEY) or {}
    if state.get('auth') != AUTH_USER or not state.get('access_token'):
        raise ValueError(_('Not signed in to pgEdge Starfleet.'))
    env = {'STARFLEET_ACCESS_TOKEN': state['access_token'],
           'STARFLEET_TOKEN_EXPIRES_AT': str(state.get('expires_at') or ''),
           'STARFLEET_TENANT_ID': state.get('tenant_id') or ''}
    app = _auth0_app()
    if state.get('refresh_token') and app is not None:
        # Lets the job renew its token if the deployment outlasts it.
        env.update({'STARFLEET_REFRESH_TOKEN': state['refresh_token'],
                    'STARFLEET_AUTH0_DOMAIN': app['domain'],
                    'STARFLEET_AUTH0_CLIENT_ID': app['client_id']})
    return env


def deploy_on_starfleet(data):
    """Create the pgAdmin server and start the deployment job."""
    inst = data['instance_details']
    _cmd = 'python'
    _cmd_script = '{0}/pgacloud/pgacloud.py'.format(root)
    args = [_cmd_script, 'starfleet', 'create-instance',
            '--name', inst['name'],
            '--region', inst['region'], '--size', inst['size'],
            '--allowlist', inst.get('ip_allowlist') or '',
            '--role', inst.get('role') or 'admin']
    if inst.get('display_name'):
        args += ['--display-name', inst['display_name']]
    if inst.get('pg_version'):
        args += ['--pg-version', str(inst['pg_version'])]

    _cmd_msg = '{0} {1}'.format(_cmd, ' '.join(args))
    try:
        # Before the server is created, so that missing credentials leave
        # nothing behind.
        job_env = _job_credentials(data.get('secret'))
        sid = _create_server({
            'gid': data['db_details']['gid'],
            'name': inst['name'],
            # Placeholders; Starfleet assigns these and update_server
            # replaces them once the database is available.
            'db': 'postgres',
            'username': inst.get('role') or 'admin',
            'cloud_status': -1,
            'connection_params': dict(CONNECTION_PARAMS),
        })
        p = BatchProcess(
            desc=CloudProcessDesc(sid, _cmd_msg, data['cloud'],
                                  inst['name']),
            cmd=_cmd, args=args)
        p.set_env_variables(None, env={
            **job_env,
            'STARFLEET_API_URL': _api_url(),
            **ca_file_env(),
        })
        p.update_server_id(p.id, sid)
        p.start()
        # Only once the job exists: if it did not start, the session keeps
        # the refresh token, so clearing the session still revokes it.
        _keep_token_for_job(p.id)
        return True, p, {'label': inst['name'], 'sid': sid}
    except Exception as e:
        current_app.logger.exception(e)
        return False, None, str(e)


def allow_save_password():
    return bool(config.ALLOW_SAVE_PASSWORD and
                session.get('allow_save_password', None))


def fetch_password(db_id, role, pid):
    """Read the generated password once; never stored or logged."""
    client = get_session_client(pid)
    if client is None:
        return None
    params = {'user_type': USER_TYPES.get(role, 'admin')}
    try:
        db_info = client.get('{}/{}'.format(DATABASES, db_id), params)
        return (db_info.get('connection') or {}).get('password')
    except StarfleetError as e:
        current_app.logger.warning(
            'Could not fetch the pgEdge Starfleet password: %s',
            sanitize_external_text(str(e)))
    except MALFORMED as e:
        current_app.logger.warning(
            'Unexpected pgEdge Starfleet response whilst fetching the '
            'password: %s', type(e).__name__)
    return None


@blueprint.route('/save_password/<int:sid>', methods=['POST'],
                 endpoint='save_password')
@pga_login_required
def save_password(sid):
    """Save the generated password on a deployed server, if allowed."""
    if not allow_save_password():
        return forbidden(
            errmsg=_('Saving passwords is disabled on this server.'))
    server = Server.query.filter_by(user_id=current_user.id,
                                    id=sid).first()
    if server is None:
        return gone(errormsg=_('Could not find the server.'))
    password = (request.get_json(silent=True) or {}).get('password')
    if not password:
        return bad_request(errormsg=_('A password is required.'))
    crypt_key_present, crypt_key = get_crypt_key()
    if not crypt_key_present:
        return forbidden(errmsg=_('The master password is not set.'))
    server.password = encrypt(password, crypt_key)
    server.save_password = 1
    db.session.commit()
    return make_json_response(success=1)
