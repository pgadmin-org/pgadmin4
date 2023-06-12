##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""A blueprint module implementing the import and export servers
functionality"""

import json
import os
import secrets

from flask import Response, render_template, request
from flask_babel import gettext as _
from flask_security import login_required, current_user
from pgadmin.utils import PgAdminModule
from pgadmin.utils.ajax import bad_request
from pgadmin.utils.constants import MIMETYPE_APP_JS
from pgadmin.utils.ajax import make_json_response, internal_server_error, \
    unauthorized
from pgadmin.model import ServerGroup, Server
from pgadmin.utils import clear_database_servers, dump_database_servers,\
    load_database_servers, validate_json_data, filename_with_file_manager_path
from urllib.parse import unquote
from pgadmin.utils.paths import get_storage_directory

MODULE_NAME = 'import_export_servers'


class ImportExportServersModule(PgAdminModule):
    """
    class ImportExportServersModule(PgAdminModule)

        A module class for import which is derived from PgAdminModule.
    """

    LABEL = _('Import/Export Servers')

    def get_exposed_url_endpoints(self):
        """
        Returns:
            list: URL endpoints for backup module
        """
        return ['import_export_servers.get_servers',
                'import_export_servers.load_servers',
                'import_export_servers.save']


blueprint = ImportExportServersModule(MODULE_NAME, __name__)


@blueprint.route("/")
@login_required
def index():
    return bad_request(errormsg=_("This URL cannot be called directly."))


@blueprint.route("/js/import_export_servers.js")
@login_required
def script():
    """render the import/export javascript file"""
    return Response(
        response=render_template(
            "import_export_servers/js/import_export_servers.js", _=_),
        status=200,
        mimetype=MIMETYPE_APP_JS
    )


@blueprint.route('/get_servers', methods=['GET'], endpoint='get_servers')
@login_required
def get_servers():
    """
    This function is used to get the servers with server groups
    """
    all_servers = []
    groups = ServerGroup.query.filter_by(
        user_id=current_user.id
    ).order_by("id")

    # Loop through all the server groups
    for idx, group in enumerate(groups):
        children = []
        # Loop through all the servers for specific server group
        servers = Server.query.filter(
            Server.user_id == current_user.id,
            Server.servergroup_id == group.id)
        for server in servers:
            children.append({'value': server.id, 'label': server.name})

        # Add server group only when some servers are there.
        if len(children) > 0:
            all_servers.append(
                {'value': group.name, 'label': group.name,
                 'children': children})

    return make_json_response(success=1, data=all_servers)


@blueprint.route('/load_servers', methods=['POST'], endpoint='load_servers')
@login_required
def load_servers():
    """
    This function is used to load the servers from the json file.
    """
    filename = None
    groups = {}
    all_servers = []

    data = request.form if request.form else json.loads(request.data.decode())
    if 'filename' in data:
        filename = data['filename']

    file_path = unquote(filename)

    try:
        file_path = filename_with_file_manager_path(file_path)
    except PermissionError as e:
        return unauthorized(errormsg=str(e))
    except Exception as e:
        return bad_request(errormsg=str(e))

    if file_path and os.path.exists(file_path):
        try:
            with open(file_path, 'r') as j:
                data = json.loads(j.read())

                # Validate the json file and data
                errmsg = validate_json_data(data, False)
                if errmsg is not None:
                    return internal_server_error(errmsg)

                if 'Servers' in data:
                    for server in data["Servers"]:
                        obj = data["Servers"][server]
                        server_id = server + '_' + str(
                            secrets.choice(range(1, 9999)))

                        if obj['Group'] in groups:
                            groups[obj['Group']]['children'].append(
                                {'value': server_id,
                                 'label': obj['Name']})
                        else:
                            groups[obj['Group']] = \
                                {'value': obj['Group'], 'label': obj['Group'],
                                 'children': [{
                                     'value': server_id,
                                     'label': obj['Name']}]}
                else:
                    return internal_server_error(
                        _('The specified file is not in the correct format.'))

            for item in groups:
                all_servers.append(groups[item])
        except Exception:
            return internal_server_error(
                _('Unable to load the specified file.'))
    else:
        return internal_server_error(_('The specified file does not exist.'))

    return make_json_response(success=1, data=all_servers)


@blueprint.route('/save', methods=['POST'], endpoint='save')
@login_required
def save():
    """
    This function is used to import or export based on the data
    """
    required_args = [
        'type', 'filename'
    ]

    data = request.form if request.form else json.loads(request.data.decode())
    for arg in required_args:
        if arg not in data:
            return make_json_response(
                status=410,
                success=0,
                errormsg=_(
                    "Could not find the required parameter ({})."
                ).format(arg)
            )

    status = False
    errmsg = None
    if data['type'] == 'export':
        status, errmsg = \
            dump_database_servers(data['filename'], data['selected_sever_ids'])
    elif data['type'] == 'import':
        # Clear all the existing servers
        if 'replace_servers' in data and data['replace_servers']:
            clear_database_servers()
        status, errmsg = \
            load_database_servers(data['filename'], data['selected_sever_ids'])

    if not status:
        return internal_server_error(errmsg)

    return make_json_response(success=1)
