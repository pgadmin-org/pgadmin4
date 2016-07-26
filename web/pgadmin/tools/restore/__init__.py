##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Implements Restore Utility"""

import simplejson as json
import os

from flask import render_template, request, current_app, \
    url_for, Response
from flask_babel import gettext as _
from flask_security import login_required, current_user
from pgadmin.misc.bgprocess.processes import BatchProcess, IProcessDesc
from pgadmin.utils import PgAdminModule, get_storage_directory, html
from pgadmin.utils.ajax import make_json_response, bad_request

from config import PG_DEFAULT_DRIVER
from pgadmin.model import Server

# set template path for sql scripts
MODULE_NAME = 'restore'
server_info = {}


class RestoreModule(PgAdminModule):
    """
    class RestoreModule(Object):

        It is a utility which inherits PgAdminModule
        class and define methods to load its own
        javascript file.
    """

    LABEL = _('Restore')

    def get_own_javascripts(self):
        """"
        Returns:
            list: js files used by this module
        """
        return [{
            'name': 'pgadmin.tools.restore',
            'path': url_for('restore.index') + 'restore',
            'when': None
        }]


# Create blueprint for RestoreModule class
blueprint = RestoreModule(
    MODULE_NAME, __name__, static_url_path=''
)


class RestoreMessage(IProcessDesc):
    def __init__(self, _sid, _bfile):
        self.sid = _sid
        self.bfile = _bfile

    @property
    def message(self):
        # Fetch the server details like hostname, port, roles etc
        s = Server.query.filter_by(
            id=self.sid, user_id=current_user.id
        ).first()

        return _("Restoring backup on the server '{0}'...").format(
            "{0} ({1}:{2})".format(s.name, s.host, s.port),
        )

    def details(self, cmd, args):
        # Fetch the server details like hostname, port, roles etc
        s = Server.query.filter_by(
            id=self.sid, user_id=current_user.id
        ).first()

        res = '<div class="h5">'

        res += html.safe_str(
            _(
                "Restoring the backup on the server '{0}'..."
            ).format(
                "{0} ({1}:{2})".format(s.name, s.host, s.port)
            )
        )

        res += '</div><div class="h5"><b>'
        res += html.safe_str(
            _("Running command:")
        )
        res += '</b><br><i>'
        res += html.safe_str(cmd)

        def cmdArg(x):
            if x:
                x = x.replace('\\', '\\\\')
                x = x.replace('"', '\\"')
                x = x.replace('""', '\\"')

                return ' "' + html.safe_str(x) + '"'

            return ''

        idx = 0
        no_args = len(args)
        for arg in args:
            if idx < no_args - 1:
                if arg[:2] == '--':
                    res += ' ' + arg
                else:
                    res += cmdArg(arg)
            idx += 1

        if no_args > 1:
            res += ' "' + html.safe_str(arg) + '"'

        res += '</i></div>'

        return res


@blueprint.route("/")
@login_required
def index():
    return bad_request(errormsg=_("This URL can not be called directly."))


@blueprint.route("/restore.js")
@login_required
def script():
    """render own javascript"""
    return Response(
        response=render_template(
            "restore/js/restore.js", _=_
        ),
        status=200,
        mimetype="application/javascript"
    )


def filename_with_file_manager_path(file):
    """
    Args:
        file: File name returned from client file manager

    Returns:
        Filename to use for backup with full path taken from preference
    """
    # Set file manager directory from preference
    storage_dir = get_storage_directory()

    if storage_dir:
        return os.path.join(storage_dir, file.lstrip('/'))

    return file


@blueprint.route('/create_job/<int:sid>', methods=['POST'])
@login_required
def create_restore_job(sid):
    """
    Args:
        sid: Server ID

        Creates a new job for restore task

    Returns:
        None
    """
    if request.form:
        # Convert ImmutableDict to dict
        data = dict(request.form)
        data = json.loads(data['data'][0], encoding='utf-8')
    else:
        data = json.loads(request.data, encoding='utf-8')

    backup_file = filename_with_file_manager_path(data['file'])

    # Fetch the server details like hostname, port, roles etc
    server = Server.query.filter_by(
        id=sid
    ).first()

    if server is None:
        return make_json_response(
            success=0,
            errormsg=_("Could not find the specified server.")
        )

    # To fetch MetaData for the server
    from pgadmin.utils.driver import get_driver

    driver = get_driver(PG_DEFAULT_DRIVER)
    manager = driver.connection_manager(server.id)
    conn = manager.connection()
    connected = conn.connected()

    if not connected:
        return make_json_response(
            success=0,
            errormsg=_("Please connect to the server first.")
        )

    utility = manager.utility('restore')

    args = []

    if 'list' in data:
        args.append('--list')
    else:
        def set_param(key, param):
            if key in data and data[key]:
                args.append(param)
                return True
            return False

        def set_value(key, param, value):
            if key in data:
                if value:
                    if value is True and data[key]:
                        args.append(param)
                        args.append(data[key])
                    else:
                        args.append(param)
                        args.append(value)
                    return True
            return False

        def set_multiple(key, param, with_schema=True):
            if key in data:
                if len(data[key]) > 0:
                    if with_schema:
                        # TODO:// This is temporary
                        # Once object tree is implemented then we will use
                        # list of tuples 'else' part
                        if isinstance(data[key], list):
                            s, t = data[key]
                            args.extend([
                                param,
                                driver.qtIdent(
                                    conn, s
                                ) + '.' + driver.qtIdent(conn, t)
                            ])
                        else:
                            for s, o in data[key]:
                                args.extend([
                                    param,
                                    driver.qtIdent(
                                        conn, s
                                    ) + '.' + driver.qtIdent(conn, o)
                                ])
                    else:
                        for o in data[key]:
                            args.extend([param, o])
                    return True
            return False

        args.extend([
            '--host', server.host, '--port', server.port,
            '--username', server.username, '--no-password'
        ])

        set_value('role', '--role', True)
        set_value('database', '--dbname', True)

        if data['format'] == 'directory':
            args.extend(['--format=d'])

        set_value('pre_data', '--section=pre-data', False)
        set_value('data', '--section=data', False)
        set_value('post_data', '--section=post-data', False)

        if not set_param('only_data', '--data-only'):
            set_param('dns_owner', '--no-owner')
            set_param('dns_privilege ', '--no-privileges')
            set_param('dns_tablespace', '--no-tablespaces')

        if not set_param('only_schema', '--schema-only'):
            set_param('disable_trigger', '--disable-triggers')

        set_param('include_create_database', '--create')
        set_param('clean', '--clean')
        set_param('single_transaction', '--single-transaction')
        set_param('no_data_fail_table ', '--no-data-for-failed-tables')
        set_param('use_set_session_auth ', '--use-set-session-authorization')
        set_param('exit_on_error', '--exit-on-error')

        set_value('no_of_jobs', '--jobs', True)
        set_param('verbose', '--verbose')

        set_multiple('schemas', '--schema', False)
        set_multiple('tables', '--table')
        set_multiple('functions', '--function')
        set_multiple('triggers', '--trigger')
        set_multiple('trigger_funcs', '--function')
        set_multiple('indexes', '--index')

    args.append(backup_file)

    try:
        p = BatchProcess(
            desc=RestoreMessage(sid, data['file']),
            cmd=utility, args=args
        )
        manager.export_password_env(p.id)
        p.start()
        jid = p.id
    except Exception as e:
        current_app.logger.exception(e)
        return make_json_response(
            status=410,
            success=0,
            errormsg=str(e)
        )
    # Return response
    return make_json_response(
        data={'job_id': jid, 'Success': 1}
    )


"""
TODO://
    Add browser tree
"""
