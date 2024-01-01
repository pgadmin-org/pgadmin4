##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Implements Cloud Deployment"""

import json
from flask import Response, url_for
from flask import render_template, request
from flask_babel import gettext
from flask_security import login_required, current_user

from pgadmin.utils import PgAdminModule, html
from pgadmin.utils.ajax import make_json_response,\
    internal_server_error, bad_request, success_return

from pgadmin.utils.constants import MIMETYPE_APP_JS
from pgadmin.model import db, Server, Process
from pgadmin.misc.cloud.utils import get_my_ip

from pgadmin.misc.cloud.biganimal import deploy_on_biganimal,\
    clear_biganimal_session
from pgadmin.misc.cloud.rds import deploy_on_rds, clear_aws_session
from pgadmin.misc.cloud.azure import deploy_on_azure, clear_azure_session
from pgadmin.misc.cloud.google import clear_google_session, deploy_on_google
import config

# set template path for sql scripts
MODULE_NAME = 'cloud'


class CloudModule(PgAdminModule):
    """
    class CloudModule():

        It is a wizard which inherits PgAdminModule
        class and define methods to load its own
        javascript file.

    """

    def get_exposed_url_endpoints(self):
        """
        Returns:
            list: URL endpoints for cloud module
        """
        return ['cloud.deploy_on_cloud',
                'cloud.update_cloud_server',
                'cloud.update_cloud_process',
                'cloud.get_host_ip',
                'cloud.clear_cloud_session']

    def register(self, app, options):
        """
        Override the default register function to automagically register
        sub-modules at once.
        """
        super().register(app, options)

        from .azure import blueprint as module
        app.register_blueprint(module)

        from .biganimal import blueprint as module
        app.register_blueprint(module)

        from .rds import blueprint as module
        app.register_blueprint(module)

        from .google import blueprint as module
        app.register_blueprint(module)


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


@blueprint.route('/clear_cloud_session/',
                 methods=['POST'], endpoint='clear_cloud_session')
@login_required
def clear_session():
    """Get host IP Address"""
    clear_cloud_session()
    return make_json_response(success=1)


@blueprint.route('/get_host_ip/',
                 methods=['GET'], endpoint='get_host_ip')
@login_required
def get_host_ip():
    """Get host IP Address"""
    ip = get_my_ip()
    return make_json_response(data=ip)


@blueprint.route(
    '/deploy', methods=['POST'], endpoint='deploy_on_cloud'
)
@login_required
def deploy_on_cloud():
    """Deploy on Cloud."""

    data = json.loads(request.data)
    if data['cloud'] == 'aws':
        status, p, resp = deploy_on_rds(data)
    elif data['cloud'] == 'biganimal':
        status, p, resp = deploy_on_biganimal(data)
    elif data['cloud'] == 'azure':
        status, p, resp = deploy_on_azure(data)
    elif data['cloud'] == 'google':
        status, p, resp = deploy_on_google(data)
    else:
        status = False
        resp = gettext('No cloud implementation.')

    if not status:
        return make_json_response(
            status=410,
            success=0,
            errormsg=resp
        )

    # Return response
    return make_json_response(
        success=1,
        data={
            'job_id': p.id,
            'desc': p.desc.message,
            'node': {
                '_id': resp['sid'],
                '_pid': data['db_details']['gid'],
                'connected': False,
                '_type': 'server',
                'icon': 'icon-server-cloud-deploy',
                'id': 'server_{}'.format(resp['sid']),
                'inode': True,
                'label': resp['label'],
                'server_type': 'pg',
                'module': 'pgadmin.node.server',
                'cloud_status': -1
            }}
    )


def update_server(data):
    """Update Server."""
    server_data = data
    pid = data['instance']['pid']
    server = Server.query.filter_by(
        user_id=current_user.id,
        id=server_data['instance']['sid']
    ).first()

    if server is None:
        return False, gettext("Could not find the server.")

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
    clear_cloud_session(pid)

    return True, _server


def clear_cloud_session(pid=None):
    """Clear cloud sessions."""
    clear_aws_session()
    clear_biganimal_session()
    clear_azure_session(pid)
    clear_google_session()


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
    server_data = json.loads(request.data)
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
