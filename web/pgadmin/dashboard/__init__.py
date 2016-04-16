##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""A blueprint module implementing the dashboard frame."""
MODULE_NAME = 'dashboard'

from config import PG_DEFAULT_DRIVER
from flask import render_template, url_for, Response
from flask.ext.babel import gettext
from flask.ext.security import login_required
from pgadmin.utils import PgAdminModule
from pgadmin.utils.ajax import precondition_required
from pgadmin.utils.driver import get_driver
from pgadmin.utils.menu import Panel


class DashboardModule(PgAdminModule):
    def __init__(self, *args, **kwargs):
        super(DashboardModule, self).__init__(*args, **kwargs)

    def get_own_menuitems(self):
        return {}

    def get_own_javascripts(self):
        return [{
            'name': 'pgadmin.dashboard',
            'path': url_for('dashboard.index') + 'dashboard',
            'when': None
        }]

    def get_panels(self):
        return [
            Panel(
                name='dashboard',
                priority=1,
                title=gettext('Dashboard'),
                icon='fa fa-tachometer',
                content=url_for('dashboard.index'),
                isCloseable=False,
                isPrivate=True)
        ]


blueprint = DashboardModule(MODULE_NAME, __name__)


def check_precondition(f):
    """
    This function will behave as a decorator which will check
    database connection before running view, it also adds
    manager, conn & template_path properties to self
    """

    @wraps(f)
    def wrap(**kwargs):
        # Here args[0] will hold self & kwargs will hold gid,sid,did
        manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(
            kwargs['sid']
        )
        conn = manager.connection(did=kwargs['did'] if 'did' in kwargs and kwargs['did'] != 0 else None)
        # If DB not connected then return error to browser
        if not conn.connected():
            return precondition_required(
                gettext(
                    "Connection to the server has been lost!"
                )
            )

        return f(obj, **kwargs)

    return wrap


@blueprint.route("/dashboard.js")
@login_required
def script():
    """render the required javascript"""
    return Response(response=render_template("dashboard/js/dashboard.js", _=gettext),
                    status=200,
                    mimetype="application/javascript")


@blueprint.route('/')
@blueprint.route('/<int:sid>')
@blueprint.route('/<int:sid>/<int:did>')
@login_required
def index(sid=None, did=None):
    # Show the appropriate dashboard based on the identifiers passed to us
    if sid is None and did is None:
        return render_template('/dashboard/welcome_dashboard.html')
    if did is None:
        return render_template('/dashboard/server_dashboard.html', sid=sid)
    else:
        return render_template('/dashboard/database_dashboard.html', sid=sid, did=did)
