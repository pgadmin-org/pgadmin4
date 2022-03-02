##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2022, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Implements Cloud Deployment"""

import simplejson as json
from flask import Response, url_for, session
from flask import render_template, request, current_app
from flask_babel import gettext
from flask_security import login_required, current_user

from pgadmin.utils import PgAdminModule, html
from pgadmin.utils.ajax import make_json_response,\
    internal_server_error, bad_request, success_return

from pgadmin.utils.constants import MIMETYPE_APP_JS
from pgadmin.misc.bgprocess.processes import BatchProcess, IProcessDesc
from pgadmin.model import db, Server, Process
from pgadmin.misc.cloud.utils.rds import RDS, verify_aws_credentials,\
    get_aws_db_instances, get_aws_db_versions, clear_aws_session,\
    get_aws_regions
from pgadmin.misc.cloud.utils import get_my_ip

from config import root

# set template path for sql scripts
MODULE_NAME = 'cloud'
server_info = {}


class CloudModule(PgAdminModule):
    """
    class CloudModule(Object):

        It is a wizard which inherits PgAdminModule
        class and define methods to load its own
        javascript file.

    LABEL = gettext('Browser')
    """

    def get_own_stylesheets(self):
        """
        Returns:
            list: the stylesheets used by this module.
        """
        stylesheets = []
        return stylesheets

    def get_own_javascripts(self):
        """"
        Returns:
            list: js files used by this module
        """
        scripts = []
        scripts.append({
            'name': 'pgadmin.misc.cloud',
            'path': url_for('cloud.index') + 'cloud',
            'when': None
        })
        scripts.append({
            'name': 'pgadmin.browser.wizard',
            'path': url_for('browser.static', filename='js/wizard'),
            'when': None
        })
        return scripts

    def get_exposed_url_endpoints(self):
        """
        Returns:
            list: URL endpoints for cloud module
        """
        return ['cloud.deploy_on_cloud',
                'cloud.get_aws_db_versions',
                'cloud.verify_credentials',
                'cloud.get_aws_db_instances',
                'cloud.update_cloud_server',
                'cloud.update_cloud_process',
                'cloud.get_aws_regions',
                'cloud.get_host_ip']


# Create blueprint for CloudModule class
blueprint = CloudModule(
    MODULE_NAME, __name__, static_url_path='/misc/cloud')


@blueprint.route("/")
@login_required
def index():
    return bad_request(
        errormsg=gettext("This URL cannot be called directly.")
    )


@blueprint.route("/cloud.js")
@login_required
def script():
    """render own javascript"""
    res = Response(response=render_template(
        "cloud/js/cloud.js", _=gettext),
        status=200,
        mimetype=MIMETYPE_APP_JS)
    return res


@blueprint.route('/get_host_ip/',
                 methods=['GET'], endpoint='get_host_ip')
@login_required
def get_host_ip():
    """test"""
    ip = get_my_ip()
    return make_json_response(data=ip)


@blueprint.route('/verify_credentials/',
                 methods=['POST'], endpoint='verify_credentials')
@login_required
def verify_credentials():
    """Verify Credentials."""
    data = json.loads(request.data, encoding='utf-8')

    status, msg = verify_aws_credentials(data)
    if status:
        msg = 'verified'

    return make_json_response(success=status, info=msg)


@blueprint.route('/get_aws_db_instances/',
                 methods=['GET'], endpoint='get_aws_db_instances')
@login_required
def get_db_instances():
    """
    Fetch AWS DB Instances based on engine version.
    """
    # Get Engine Version
    eng_version = request.args.get('eng_version')
    status, versions = get_aws_db_instances(eng_version)

    if not status:
        return make_json_response(
            status=410,
            success=0,
            errormsg=versions
        )

    return make_json_response(data=versions)


@blueprint.route('/get_aws_db_versions/',
                 methods=['GET', 'POST'], endpoint='get_aws_db_versions')
@login_required
def get_db_versions():
    """GET AWS Database Versions for AWS."""
    status, versions = get_aws_db_versions()
    if not status:
        return make_json_response(
            status=410,
            success=0,
            errormsg=str(versions)
        )
    return make_json_response(data=versions)


@blueprint.route('/get_aws_regions/',
                 methods=['GET', 'POST'], endpoint='get_aws_regions')
@login_required
def get_db_versions():
    """GET AWS Regions for AWS."""
    status, regions = get_aws_regions()
    if not status:
        return make_json_response(
            status=410,
            success=0,
            errormsg=str(regions)
        )
    return make_json_response(data=regions)


@blueprint.route(
    '/deploy', methods=['POST'], endpoint='deploy_on_cloud'
)
@login_required
def deploy_on_cloud():
    """Deploy on Cloud"""

    data = json.loads(request.data, encoding='utf-8')
    from subprocess import Popen, PIPE
    _cmd = 'python'
    _cmd_script = '{0}/pgacloud/pgacloud.py'.format(root)

    args = [_cmd_script,
            '--debug',
            data['cloud'],
            '--region',
            str(data['secret']['aws_region']),
            'create-instance',
            '--name',
            data['instance_details']['aws_name'],
            '--db-name',
            data['db_details']['aws_db_name'],
            '--db-username',
            data['db_details']['aws_db_username'],
            '--db-port',
            str(data['db_details']['aws_db_port']),
            '--db-version',
            str(data['instance_details']['aws_db_version']),
            '--instance-type',
            data['instance_details']['aws_instance_type'],
            '--storage-type',
            data['instance_details']['aws_storage_type'],
            '--storage-size',
            str(data['instance_details']['aws_storage_size']),
            '--public-ip',
            str(data['instance_details']['aws_public_ip']),
            ]

    if data['instance_details']['aws_storage_type'] == 'io1':
        args.append('--storage-iops')
        args.append(str(data['instance_details']['aws_storage_IOPS']))

    _cmd_msg = '{0} {1} {2}'.format(_cmd, _cmd_script, ' '.join(args))
    try:
        sid = _create_server({
            'gid': data['db_details']['gid'],
            'name': data['instance_details']['aws_name'],
            'db': data['db_details']['aws_db_name'],
            'username': data['db_details']['aws_db_username'],
            'port': data['db_details']['aws_db_port'],
            'cloud_status': -1
        })

        p = BatchProcess(
            desc=CloudProcessDesc(sid, _cmd_msg, data['cloud'],
                                  data['instance_details']['aws_name']),
            cmd=_cmd,
            args=args
        )

        env = dict()
        env['AWS_ACCESS_KEY_ID'] = data['secret']['aws_access_key']
        env['AWS_SECRET_ACCESS_KEY'] = data['secret']['aws_secret_access_key']

        if 'aws_session_token' in data['secret'] and\
                data['secret']['aws_session_token'] is not None:
            env['AWS_SESSION_TOKEN'] = data['secret']['aws_session_token']

        if 'aws_db_password' in data['db_details']:
            env['AWS_DATABASE_PASSWORD'] = data[
                'db_details']['aws_db_password']

        p.set_env_variables(None, env=env)
        p.update_server_id(p.id, sid)
        p.start()

    except Exception as e:
        current_app.logger.exception(e)
        return make_json_response(
            status=410,
            success=0,
            errormsg=str(e)
        )

    # Return response
    return make_json_response(
        success=1,
        data={'job_id': 1, 'node': {
            '_id': sid,
            '_pid': data['db_details']['gid'],
            'connected': False,
            '_type': 'server',
            'icon': 'icon-server-cloud-deploy',
            'id': 'server_{}'.format(sid),
            'inode': True,
            'label': data['instance_details']['aws_name'],
            'server_type': 'pg',
            'module': 'pgadmin.node.server',
            'cloud_status': -1
        }}
    )


def _create_server(data):
    """Create Server"""
    server = Server(
        user_id=current_user.id,
        servergroup_id=data.get('gid'),
        name=data.get('name'),
        maintenance_db=data.get('db'),
        username=data.get('username'),
        ssl_mode='prefer',
        cloud_status=data.get('cloud_status'),
        connect_timeout=30,
    )

    db.session.add(server)
    db.session.commit()

    return server.id


def update_server(data):
    """Update Server."""
    server_data = data
    server = Server.query.filter_by(
        user_id=current_user.id,
        id=server_data['instance']['sid']
    ).first()

    if server is None:
        return False, "Could not find the server."

    if server_data['instance'] == '' or\
            not server_data['instance']['status']:
        db.session.delete(server)
    else:
        server.host = server_data['instance']['Hostname']
        server.port = server_data['instance']['Port']
        server.cloud_status = 1

    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return False, e.message

    _server = {
        'id': server.id,
        'servergroup_id': server.servergroup_id,
        'name': server.name,
        'cloud_status': server.cloud_status
    }
    if not server_data['instance']['status']:
        _server['status'] = False
    else:
        _server['status'] = True
        clear_aws_session()

    return True, _server


@blueprint.route(
    '/update_cloud_process/<sid>', methods=['GET'],
    endpoint='update_cloud_process'
)
@login_required
def update_cloud_process(sid):
    """Update Cloud Server Process"""
    _process = Process.query.filter_by(user_id=current_user.id,
                                       server_id=sid).first()
    _process.acknowledge = None
    db.session.commit()
    return success_return()


@blueprint.route(
    '/update_cloud_server', methods=['POST'],
    endpoint='update_cloud_server'
)
@login_required
def update_cloud_server():
    """Update Cloud Server."""
    server_data = json.loads(request.data, encoding='utf-8')
    status, server = update_server(server_data)

    if not status:
        return make_json_response(
            status=410, success=0, errormsg=server
        )

    return make_json_response(
        success=1,
        data={'node': {
            'sid': server.id,
            'gid': server.servergroup_id,
            '_type': 'server',
            'icon': 'icon-server-not-connected',
            'id': 'server_{}'.format(server.id),
            'label': server.name
        }}
    )


class CloudProcessDesc(IProcessDesc):
    """Cloud Server Process Description."""
    def __init__(self, _sid, _cmd, _provider, _instance_name):
        self.sid = _sid
        self.cmd = _cmd
        self.instance_name = _instance_name
        self.provider = 'Amazon RDS'

        if _provider == 'rds':
            self.provider = 'Amazon RDS'
        elif _provider == 'azure':
            self.provider = 'Azure PostgreSQL'
        else:
            self.provider = 'EDB Big Animal'

    @property
    def message(self):
        return "Deployment on {0} is started for instance {1}.".format(
            self.provider, self.instance_name)

    def details(self, cmd, args):
        res = '<div>' + self.message
        res += '</div><div class="py-1">'
        res += '<div class="pg-bg-cmd enable-selection p-1">'
        res += html.safe_str(self.cmd)
        res += '</div></div>'

        return res

    @property
    def type_desc(self):
        return "Cloud Deployment"
