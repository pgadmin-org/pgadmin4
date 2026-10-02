##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Deploy databases on pgEdge Starfleet (Managed and BYOC)."""

import json

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
BYOC_PROBE = '/byoc/v1/cloud-accounts'
SESSION_KEY = 'starfleet'
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
                'starfleet.clusters',
                'starfleet.byoc_pg_versions',
                'starfleet.save_password']


blueprint = StarfleetModule(MODULE_NAME, __name__,
                            static_url_path='/misc/cloud/starfleet')


def _api_url():
    return getattr(config, 'STARFLEET_API_URL', None)


def get_session_client():
    """Build a token-only client from the session, or None."""
    state = session.get(SESSION_KEY)
    if not state or not state.get('access_token'):
        return None
    return StarfleetClient(_api_url(), token=state['access_token'],
                           expires_at=state.get('expires_at'))


def clear_starfleet_session():
    session.pop(SESSION_KEY, None)


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


@blueprint.route("/")
@pga_login_required
def index():
    return bad_request(errormsg=_("This URL cannot be called directly."))


@blueprint.route('/verify_credentials/', methods=['POST'],
                 endpoint='verify_credentials')
@pga_login_required
def verify_credentials():
    """Check the API client credentials and probe BYOC capability."""
    clear_starfleet_session()
    secret = json.loads(request.data).get('secret', {})
    client = StarfleetClient(_api_url(), secret.get('client_id'),
                             secret.get('client_secret'))
    try:
        client.get_token()
        tenants = client.get(TENANTS) or []
        try:
            client.get(BYOC_PROBE)
            byoc = True
        except StarfleetError as e:
            # A plan without BYOC answers 400 "plan does not allow ...".
            if e.status != 400:
                raise
            byoc = False
    except StarfleetError as e:
        return _error(e)

    session[SESSION_KEY] = {'access_token': client.token,
                            'expires_at': client.expires_at}
    return make_json_response(success=1, data={
        'tenant_name': tenants[0].get('name') if tenants else None,
        'byoc': byoc})


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


@blueprint.route('/clusters/', methods=['GET'], endpoint='clusters')
@pga_login_required
def get_clusters():
    return _with_client(lambda c: [
        {'label': cl['name'], 'value': cl['id'],
         'status': cl.get('status'),
         'node_location': cl.get('node_location')}
        for cl in c.get('/byoc/v1/clusters')])


@blueprint.route('/byoc_pg_versions/', methods=['GET'],
                 endpoint='byoc_pg_versions')
@pga_login_required
def get_byoc_pg_versions():
    def versions(c):
        configs = c.get('/byoc/v1/config-versions') or []
        supported = configs[0].get('supported_pg_versions', []) \
            if configs else []
        return [{'label': 'PostgreSQL {}'.format(v), 'value': v}
                for v in sorted(supported, key=int, reverse=True)]
    return _with_client(versions)


def deploy_on_starfleet(data):
    """Create the pgAdmin server and start the deployment job."""
    inst = data['instance_details']
    kind = inst['kind']
    _cmd = 'python'
    _cmd_script = '{0}/pgacloud/pgacloud.py'.format(root)
    args = [_cmd_script, 'starfleet', 'create-instance',
            '--kind', kind, '--name', inst['name']]
    if inst.get('display_name'):
        args += ['--display-name', inst['display_name']]
    if inst.get('pg_version'):
        args += ['--pg-version', str(inst['pg_version'])]
    if kind == 'managed':
        args += ['--region', inst['region'], '--size', inst['size'],
                 '--allowlist', inst.get('ip_allowlist') or '',
                 '--role', inst.get('role') or 'admin']
    else:
        args += ['--cluster-id', inst['cluster_id']]

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
        p.start()
        return True, p, {'label': inst['name'], 'sid': sid}
    except Exception as e:
        current_app.logger.exception(e)
        return False, None, str(e)


def allow_save_password():
    return bool(config.ALLOW_SAVE_PASSWORD and
                session.get('allow_save_password', None))


def fetch_password(kind, db_id, role):
    """Read the generated password once; never stored or logged."""
    client = get_session_client()
    if client is None:
        return None
    params = {'user_type': USER_TYPES.get(role, 'admin')} \
        if kind == 'managed' else None
    try:
        db_info = client.get('/{}/v1/databases/{}'.format(kind, db_id),
                             params)
    except StarfleetError as e:
        current_app.logger.warning(
            'Could not fetch the pgEdge Starfleet password: %s',
            sanitize_external_text(str(e)))
        return None
    return (db_info.get('connection') or {}).get('password')


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
