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

from flask import session, current_app, request
from flask_babel import gettext as _
from flask_security import current_user

import config
from config import root
from pgacloud.utils.starfleet_api import StarfleetClient, StarfleetError
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

MODULE_NAME = 'starfleet'
TENANTS = '/account/v1/tenants'
DATABASES = '/managed/v1/databases'
SESSION_KEY = 'starfleet'
# Tokens kept per deployment job, since closing the wizard clears
# SESSION_KEY long before the job finishes and the password is fetched.
JOBS_KEY = 'starfleet_jobs'
USER_TYPES = {'admin': 'admin', 'app': 'application'}
CONNECTION_PARAMS = {'sslmode': 'require', 'gssencmode': 'disable',
                     'connect_timeout': 30}


class StarfleetModule(PgAdminModule):
    """Cloud module to deploy on pgEdge Starfleet"""

    def get_exposed_url_endpoints(self):
        return ['starfleet.verify_credentials',
                'starfleet.regions',
                'starfleet.pg_versions',
                'starfleet.sizes',
                'starfleet.client_ip',
                'starfleet.save_password']


blueprint = StarfleetModule(MODULE_NAME, __name__,
                            static_url_path='/misc/cloud/starfleet')


def _api_url():
    return getattr(config, 'STARFLEET_API_URL', None)


def get_session_client(pid=None):
    """Build a token-only client from the session (or the job's copy of
    it), or None."""
    state = session.get(JOBS_KEY, {}).get(pid) if pid \
        else session.get(SESSION_KEY)
    if not state or not state.get('access_token'):
        return None
    return StarfleetClient(_api_url(), token=state['access_token'],
                           expires_at=state.get('expires_at'))


def clear_starfleet_session():
    session.pop(SESSION_KEY, None)


def _keep_token_for_job(pid):
    """Copy the wizard's token for a job, dropping expired copies."""
    state = session.get(SESSION_KEY)
    if not state:
        return
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
            'Not authenticated to pgEdge Starfleet. Go back and verify '
            'your API client credentials.'))
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
                             secret.get('client_secret'))
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
    return make_json_response(success=1, data={
        'tenant_name': tenant_name})


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
            'STARFLEET_CLIENT_ID': data['secret']['client_id'],
            'STARFLEET_CLIENT_SECRET': data['secret']['client_secret'],
            'STARFLEET_API_URL': _api_url(),
        })
        p.update_server_id(p.id, sid)
        _keep_token_for_job(p.id)
        p.start()
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
