##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2017, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""
A blueprint module providing utility functions for the notify the user about
the long running background-processes.
"""
from flask import url_for
from flask_babel import gettext as _
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
        stylesheets = [
            url_for('bgprocess.static', filename='css/bgprocess.css')
        ]
        return stylesheets

    def get_own_messages(self):
        """
        Returns:
            dict: the i18n messages used by this module
        """
        return {
            'bgprocess.index': url_for("bgprocess.index"),
            'seconds': _('seconds'),
            'started': _('Started'),
            'START_TIME': _('Start time'),
            'STATUS': _('Status'),
            'EXECUTION_TIME': _('Execution time'),
            'running': _('Running...'),
            'successfully_finished': _("Successfully completed."),
            'failed_with_exit_code': _("Failed (exit code: %s)."),
            'BG_TOO_MANY_LOGS': _("Too many logs generated!")
        }


# Initialise the module
blueprint = BGProcessModule(
    MODULE_NAME, __name__, url_prefix='/misc/bgprocess'
)


@blueprint.route('/', methods=['GET'])
@login_required
def index():
    return make_response(response=BatchProcess.list())


@blueprint.route('/<pid>', methods=['GET'])
@blueprint.route('/<pid>/<int:out>/<int:err>/', methods=['GET'])
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


@blueprint.route('/<pid>', methods=['PUT'])
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
