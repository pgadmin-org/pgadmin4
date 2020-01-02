##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""
A blueprint module providing utility functions for the notify the user about
the long running background-processes.
"""
from flask import url_for
from flask_security import login_required
from pgadmin.utils import PgAdminModule
from pgadmin.utils.ajax import make_response, gone, success_return

from .processes import BatchProcess

MODULE_NAME = 'bgprocess'


class BGProcessModule(PgAdminModule):
    def get_own_javascripts(self):
        return [{
            'name': 'pgadmin.browser.bgprocess',
            'path': url_for('bgprocess.static', filename='js/bgprocess'),
            'when': None
        }]

    def get_own_stylesheets(self):
        """
        Returns:
            list: the stylesheets used by this module.
        """
        stylesheets = []
        return stylesheets

    def get_exposed_url_endpoints(self):
        """
        Returns:
            list: URL endpoints for bgprocess
        """
        return [
            'bgprocess.status', 'bgprocess.detailed_status',
            'bgprocess.acknowledge', 'bgprocess.list',
            'bgprocess.stop_process'
        ]


# Initialise the module
blueprint = BGProcessModule(
    MODULE_NAME, __name__, url_prefix='/misc/bgprocess'
)


@blueprint.route('/', methods=['GET'], endpoint='list')
@login_required
def index():
    return make_response(response=BatchProcess.list())


@blueprint.route('/<pid>', methods=['GET'], endpoint='status')
@blueprint.route(
    '/<pid>/<int:out>/<int:err>/', methods=['GET'], endpoint='detailed_status'
)
@login_required
def status(pid, out=-1, err=-1):
    """
    Check the status of the process running in background.
    Sends back the output of stdout/stderr
    Fetches & sends STDOUT/STDERR logs for the process requested by client

    Args:
        pid:  Process ID
        out: position of the last stdout fetched
        err: position of the last stderr fetched

    Returns:
        Status of the process and logs (if out, and err not equal to -1)
    """
    try:
        process = BatchProcess(id=pid)

        return make_response(response=process.status(out, err))
    except LookupError as lerr:
        return gone(errormsg=str(lerr))


@blueprint.route('/<pid>', methods=['PUT'], endpoint='acknowledge')
@login_required
def acknowledge(pid):
    """
    User has acknowledge the process

    Args:
        pid:  Process ID

    Returns:
        Positive status
    """
    try:
        BatchProcess.acknowledge(pid)
        return success_return()
    except LookupError as lerr:
        return gone(errormsg=str(lerr))


@blueprint.route('/stop/<pid>', methods=['PUT'], endpoint='stop_process')
@login_required
def stop_process(pid):
    """
    User has stopped the process

    :param pid: Process ID
    """
    try:
        BatchProcess.stop_process(pid)
        return success_return()
    except LookupError as lerr:
        return gone(errormsg=str(lerr))


def escape_dquotes_process_arg(arg):
    # Double quotes has special meaning for shell command line and they are
    # run without the double quotes. Add extra quotes to save our double
    # quotes from stripping.

    # This cannot be at common place as this file executes
    # separately from pgadmin
    dq_id = "#DQ#"

    if arg.startswith('"') and arg.endswith('"'):
        return r'{0}{1}{0}'.format(dq_id, arg)
    else:
        return arg
