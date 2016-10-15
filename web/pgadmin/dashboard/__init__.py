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

from functools import wraps

from flask import render_template, url_for, Response, g
from flask_babel import gettext
from flask_security import login_required
from pgadmin.utils import PgAdminModule
from pgadmin.utils.ajax import make_response as ajax_response, internal_server_error
from pgadmin.utils.ajax import precondition_required
from pgadmin.utils.driver import get_driver
from pgadmin.utils.menu import Panel
from pgadmin.utils.preferences import Preferences

from config import PG_DEFAULT_DRIVER


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

    def get_own_stylesheets(self):
        """
        Returns:
            list: the stylesheets used by this module.
        """
        stylesheets = [
            url_for('dashboard.static', filename='css/dashboard.css')
        ]
        return stylesheets

    def get_panels(self):
        return [
            Panel(
                name='dashboard',
                priority=1,
                title=gettext('Dashboard'),
                icon='fa fa-tachometer',
                content='',
                isCloseable=False,
                isPrivate=True,
                isIframe=False)
        ]

    def register_preferences(self):
        """
        register_preferences
        Register preferences for this module.
        """
        # Register options for the PG and PPAS help paths
        self.dashboard_preference = Preferences('dashboards', gettext('Dashboards'))

        self.session_stats_refresh = self.dashboard_preference.register(
            'dashboards', 'session_stats_refresh',
            gettext("Session statistics refresh rate"), 'integer',
            1, min_val=1, max_val=999999,
            category_label=gettext('Graphs'),
            help_str=gettext('The number of seconds between graph samples.')
        )

        self.session_stats_refresh = self.dashboard_preference.register(
            'dashboards', 'tps_stats_refresh',
            gettext("Transaction throughput refresh rate"), 'integer',
            1, min_val=1, max_val=999999,
            category_label=gettext('Graphs'),
            help_str=gettext('The number of seconds between graph samples.')
        )

        self.session_stats_refresh = self.dashboard_preference.register(
            'dashboards', 'ti_stats_refresh',
            gettext("Tuples in refresh rate"), 'integer',
            1, min_val=1, max_val=999999,
            category_label=gettext('Graphs'),
            help_str=gettext('The number of seconds between graph samples.')
        )

        self.session_stats_refresh = self.dashboard_preference.register(
            'dashboards', 'to_stats_refresh',
            gettext("Tuples out refresh rate"), 'integer',
            1, min_val=1, max_val=999999,
            category_label=gettext('Graphs'),
            help_str=gettext('The number of seconds between graph samples.')
        )

        self.session_stats_refresh = self.dashboard_preference.register(
            'dashboards', 'bio_stats_refresh',
            gettext("Block I/O statistics refresh rate"), 'integer',
            1, min_val=1, max_val=999999,
            category_label=gettext('Graphs'),
            help_str=gettext('The number of seconds between graph samples.')
        )


blueprint = DashboardModule(MODULE_NAME, __name__)


def check_precondition(f):
    """
    This function will behave as a decorator which will check
    database connection before running view, it also adds
    manager, conn & template_path properties to self
    """

    @wraps(f)
    def wrap(*args, **kwargs):
        # Here args[0] will hold self & kwargs will hold gid,sid,did

        g.manager = get_driver(
            PG_DEFAULT_DRIVER).connection_manager(
            kwargs['sid']
        )
        g.conn = g.manager.connection()

        # If DB not connected then return error to browser
        if not g.conn.connected():
            return precondition_required(
                gettext("Connection to the server has been lost.")
            )

        # Set template path for sql scripts
        g.server_type = g.manager.server_type
        g.version = g.manager.version

        if g.version < 90600:
            g.template_path = 'dashboard/sql/9.1_plus'
        else:
            g.template_path = 'dashboard/sql/9.6_plus'

        return f(*args, **kwargs)

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
    """
    Renders the welcome, server or database dashboard
    Args:
        sid: Server ID
        did: Database ID

    Returns: Welcome/Server/database dashboard

    """
    rates = {}

    prefs = Preferences.module('dashboards')

    # Get the server version
    if sid is not None:
        g.manager = get_driver(
            PG_DEFAULT_DRIVER).connection_manager(sid)
        g.conn = g.manager.connection()

        g.version = g.manager.version

        if not g.conn.connected():
            g.version = 0

    session_stats_refresh_pref = prefs.preference('session_stats_refresh')
    rates['session_stats_refresh'] = session_stats_refresh_pref.get()
    tps_stats_refresh_pref = prefs.preference('tps_stats_refresh')
    rates['tps_stats_refresh'] = tps_stats_refresh_pref.get()
    ti_stats_refresh_pref = prefs.preference('ti_stats_refresh')
    rates['ti_stats_refresh'] = ti_stats_refresh_pref.get()
    to_stats_refresh_pref = prefs.preference('to_stats_refresh')
    rates['to_stats_refresh'] = to_stats_refresh_pref.get()
    bio_stats_refresh_pref = prefs.preference('bio_stats_refresh')
    rates['bio_stats_refresh'] = bio_stats_refresh_pref.get()

    # Show the appropriate dashboard based on the identifiers passed to us
    if sid is None and did is None:
        return render_template('/dashboard/welcome_dashboard.html')
    if did is None:
        return render_template('/dashboard/server_dashboard.html', sid=sid, rates=rates, version=g.version)
    else:
        return render_template('/dashboard/database_dashboard.html', sid=sid, did=did, rates=rates, version=g.version)


def get_data(sid, did, template):
    """
    Generic function to get server stats based on an SQL template
    Args:
        sid: The server ID
        did: The database ID
        template: The SQL template name

    Returns:

    """
    # Allow no server ID to be specified (so we can generate a route in JS)
    # but throw an error if it's actually called.
    if not sid:
        return internal_server_error(errormsg='Server ID not specified.')

    sql = render_template(
        "/".join([g.template_path, template]), did=did
    )
    status, res = g.conn.execute_dict(sql)

    if not status:
        return internal_server_error(errormsg=res)

    return ajax_response(
        response=res['rows'],
        status=200
    )


@blueprint.route('/session_stats/')
@blueprint.route('/session_stats/<int:sid>')
@blueprint.route('/session_stats/<int:sid>/<int:did>')
@login_required
@check_precondition
def session_stats(sid=None, did=None):
    """
    This function returns server session statistics
    :param sid: server id
    :return:
    """
    return get_data(sid, did, 'session_stats.sql')


@blueprint.route('/tps_stats/')
@blueprint.route('/tps_stats/<int:sid>')
@blueprint.route('/tps_stats/<int:sid>/<int:did>')
@login_required
@check_precondition
def tps_stats(sid=None, did=None):
    """
    This function returns server TPS throughput
    :param sid: server id
    :return:
    """
    return get_data(sid, did, 'tps_stats.sql')


@blueprint.route('/ti_stats/')
@blueprint.route('/ti_stats/<int:sid>')
@blueprint.route('/ti_stats/<int:sid>/<int:did>')
@login_required
@check_precondition
def ti_stats(sid=None, did=None):
    """
    This function returns server tuple input statistics
    :param sid: server id
    :return:
    """
    return get_data(sid, did, 'ti_stats.sql')


@blueprint.route('/to_stats/')
@blueprint.route('/to_stats/<int:sid>')
@blueprint.route('/to_stats/<int:sid>/<int:did>')
@login_required
@check_precondition
def to_stats(sid=None, did=None):
    """
    This function returns server tuple output statistics
    :param sid: server id
    :return:
    """
    return get_data(sid, did, 'to_stats.sql')


@blueprint.route('/bio_stats/')
@blueprint.route('/bio_stats/<int:sid>')
@blueprint.route('/bio_stats/<int:sid>/<int:did>')
@login_required
@check_precondition
def bio_stats(sid=None, did=None):
    """
    This function returns server block IO statistics
    :param sid: server id
    :return:
    """
    return get_data(sid, did, 'bio_stats.sql')


@blueprint.route('/activity/')
@blueprint.route('/activity/<int:sid>')
@blueprint.route('/activity/<int:sid>/<int:did>')
@login_required
@check_precondition
def activity(sid=None, did=None):
    """
    This function returns server activity information
    :param sid: server id
    :return:
    """
    return get_data(sid, did, 'activity.sql')


@blueprint.route('/locks/')
@blueprint.route('/locks/<int:sid>')
@blueprint.route('/locks/<int:sid>/<int:did>')
@login_required
@check_precondition
def locks(sid=None, did=None):
    """
    This function returns server lock information
    :param sid: server id
    :return:
    """
    return get_data(sid, did, 'locks.sql')


@blueprint.route('/prepared/')
@blueprint.route('/prepared/<int:sid>')
@blueprint.route('/prepared/<int:sid>/<int:did>')
@login_required
@check_precondition
def prepared(sid=None, did=None):
    """
    This function returns prepared XACT information
    :param sid: server id
    :return:
    """
    return get_data(sid, did, 'prepared.sql')


@blueprint.route('/config/')
@blueprint.route('/config/<int:sid>')
@login_required
@check_precondition
def config(sid=None):
    """
    This function returns server config information
    :param sid: server id
    :return:
    """
    return get_data(sid, None, 'config.sql')
