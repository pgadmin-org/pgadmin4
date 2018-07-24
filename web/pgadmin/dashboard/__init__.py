##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2018, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""A blueprint module implementing the dashboard frame."""
from functools import wraps
from flask import render_template, url_for, Response, g
from flask_babelex import gettext
from flask_security import login_required
from pgadmin.utils import PgAdminModule
from pgadmin.utils.ajax import make_response as ajax_response,\
    internal_server_error
from pgadmin.utils.ajax import precondition_required
from pgadmin.utils.driver import get_driver
from pgadmin.utils.menu import Panel
from pgadmin.utils.preferences import Preferences

from config import PG_DEFAULT_DRIVER

MODULE_NAME = 'dashboard'


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
                isCloseable=True,
                isPrivate=False,
                limit=1,
                isIframe=False,
                canHide=True
            ).__dict__
        ]

    def register_preferences(self):
        """
        register_preferences
        Register preferences for this module.
        """
        # Register options for the PG and PPAS help paths
        self.dashboard_preference = Preferences(
            'dashboards', gettext('Dashboards')
        )

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

        self.display_graphs = self.dashboard_preference.register(
            'display', 'show_graphs',
            gettext("Show graphs?"), 'boolean', True,
            category_label=gettext('Display'),
            help_str=gettext('If set to True, graphs '
                             'will be displayed on dashboards.')
        )

        self.display_server_activity = self.dashboard_preference.register(
            'display', 'show_activity',
            gettext("Show activity?"), 'boolean', True,
            category_label=gettext('Display'),
            help_str=gettext('If set to True, activity tables '
                             'will be displayed on dashboards.')
        )

    def get_exposed_url_endpoints(self):
        """
        Returns:
            list: a list of url endpoints exposed to the client.
        """
        return [
            'dashboard.index', 'dashboard.get_by_sever_id',
            'dashboard.get_by_database_id',
            'dashboard.session_stats',
            'dashboard.get_session_stats_by_sever_id',
            'dashboard.get_session_stats_by_database_id',
            'dashboard.tps_stats',
            'dashboard.tps_stats_by_server_id',
            'dashboard.tps_stats_by_database_id',
            'dashboard.ti_stats',
            'dashboard.ti_stats_by_server_id',
            'dashboard.ti_stats_by_database_id',
            'dashboard.to_stats',
            'dashboard.to_stats_by_server_id',
            'dashboard.to_stats_by_database_id',
            'dashboard.bio_stats',
            'dashboard.bio_stats_by_server_id',
            'dashboard.bio_stats_by_database_id',
            'dashboard.activity',
            'dashboard.get_activity_by_server_id',
            'dashboard.get_activity_by_database_id',
            'dashboard.locks',
            'dashboard.get_locks_by_server_id',
            'dashboard.get_locks_by_database_id',
            'dashboard.prepared',
            'dashboard.get_prepared_by_server_id',
            'dashboard.get_prepared_by_database_id',
            'dashboard.config',
            'dashboard.get_config_by_server_id',
        ]


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

        stats_type = ('activity', 'prepared', 'locks', 'config')

        # Below check handle the case where existing server is deleted
        # by user and python server will raise exception if this check
        # is not introduce.
        if g.manager is None:
            if f.__name__ in stats_type:
                return precondition_required(
                    gettext("Please connect to the selected server"
                            " to view the table.")
                )
            else:
                return precondition_required(
                    gettext("Please connect to the selected server"
                            " to view the graph.")
                )

        g.conn = g.manager.connection()

        # If DB not connected then return error to browser
        if not g.conn.connected():
            if f.__name__ in stats_type:
                return precondition_required(
                    gettext("Please connect to the selected server"
                            " to view the table.")
                )
            else:
                return precondition_required(
                    gettext("Please connect to the selected server"
                            " to view the graph.")
                )

        if 'did' in kwargs:
            db_conn = g.manager.connection(did=kwargs['did'])
            # If the selected DB not connected then return error to browser
            if not db_conn.connected():
                if f.__name__ in stats_type:
                    return precondition_required(
                        gettext("Please connect to the selected database"
                                " to view the table.")
                    )
                else:
                    return precondition_required(
                        gettext("Please connect to the selected database to"
                                " view the graph.")
                    )

        # Set template path for sql scripts
        g.server_type = g.manager.server_type
        g.version = g.manager.version

        # Include server_type in template_path when server_type is gpdb
        g.template_path = 'dashboard/sql/' + (
            '#{0}#{1}#'.format(g.server_type, g.version)
            if g.server_type == 'gpdb' else '#{0}#'.format(g.version)
        )

        return f(*args, **kwargs)

    return wrap


@blueprint.route("/dashboard.js")
@login_required
def script():
    """render the required javascript"""
    return Response(
        response=render_template(
            "dashboard/js/dashboard.js",
            _=gettext
        ),
        status=200,
        mimetype="application/javascript"
    )


@blueprint.route('/', endpoint='index')
@blueprint.route('/<int:sid>', endpoint='get_by_sever_id')
@blueprint.route('/<int:sid>/<int:did>', endpoint='get_by_database_id')
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
    settings = {}

    # Get the server version
    if sid is not None:
        g.manager = get_driver(
            PG_DEFAULT_DRIVER).connection_manager(sid)
        g.conn = g.manager.connection()

        g.version = g.manager.version

        if not g.conn.connected():
            g.version = 0

    # Show the appropriate dashboard based on the identifiers passed to us
    if sid is None and did is None:
        return render_template('/dashboard/welcome_dashboard.html')
    if did is None:
        return render_template(
            '/dashboard/server_dashboard.html',
            sid=sid,
            rates=rates,
            version=g.version
        )
    else:
        return render_template(
            '/dashboard/database_dashboard.html',
            sid=sid,
            did=did,
            rates=rates,
            version=g.version
        )


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


@blueprint.route('/session_stats/', endpoint='session_stats')
@blueprint.route(
    '/session_stats/<int:sid>', endpoint='get_session_stats_by_sever_id'
)
@blueprint.route(
    '/session_stats/<int:sid>/<int:did>',
    endpoint='get_session_stats_by_database_id'
)
@login_required
@check_precondition
def session_stats(sid=None, did=None):
    """
    This function returns server session statistics
    :param sid: server id
    :return:
    """
    return get_data(sid, did, 'session_stats.sql')


@blueprint.route('/tps_stats/', endpoint='tps_stats')
@blueprint.route('/tps_stats/<int:sid>', endpoint='tps_stats_by_server_id')
@blueprint.route(
    '/tps_stats/<int:sid>/<int:did>', endpoint='tps_stats_by_database_id'
)
@login_required
@check_precondition
def tps_stats(sid=None, did=None):
    """
    This function returns server TPS throughput
    :param sid: server id
    :return:
    """
    return get_data(sid, did, 'tps_stats.sql')


@blueprint.route('/ti_stats/', endpoint='ti_stats')
@blueprint.route('/ti_stats/<int:sid>', endpoint='ti_stats_by_server_id')
@blueprint.route(
    '/ti_stats/<int:sid>/<int:did>', endpoint='ti_stats_by_database_id'
)
@login_required
@check_precondition
def ti_stats(sid=None, did=None):
    """
    This function returns server tuple input statistics
    :param sid: server id
    :return:
    """
    return get_data(sid, did, 'ti_stats.sql')


@blueprint.route('/to_stats/', endpoint='to_stats')
@blueprint.route('/to_stats/<int:sid>', endpoint='to_stats_by_server_id')
@blueprint.route(
    '/to_stats/<int:sid>/<int:did>', endpoint='to_stats_by_database_id'
)
@login_required
@check_precondition
def to_stats(sid=None, did=None):
    """
    This function returns server tuple output statistics
    :param sid: server id
    :return:
    """
    return get_data(sid, did, 'to_stats.sql')


@blueprint.route('/bio_stats/', endpoint='bio_stats')
@blueprint.route('/bio_stats/<int:sid>', endpoint='bio_stats_by_server_id')
@blueprint.route(
    '/bio_stats/<int:sid>/<int:did>', endpoint='bio_stats_by_database_id'
)
@login_required
@check_precondition
def bio_stats(sid=None, did=None):
    """
    This function returns server block IO statistics
    :param sid: server id
    :return:
    """
    return get_data(sid, did, 'bio_stats.sql')


@blueprint.route('/activity/', endpoint='activity')
@blueprint.route('/activity/<int:sid>', endpoint='get_activity_by_server_id')
@blueprint.route(
    '/activity/<int:sid>/<int:did>', endpoint='get_activity_by_database_id'
)
@login_required
@check_precondition
def activity(sid=None, did=None):
    """
    This function returns server activity information
    :param sid: server id
    :return:
    """
    return get_data(sid, did, 'activity.sql')


@blueprint.route('/locks/', endpoint='locks')
@blueprint.route('/locks/<int:sid>', endpoint='get_locks_by_server_id')
@blueprint.route(
    '/locks/<int:sid>/<int:did>', endpoint='get_locks_by_database_id'
)
@login_required
@check_precondition
def locks(sid=None, did=None):
    """
    This function returns server lock information
    :param sid: server id
    :return:
    """
    return get_data(sid, did, 'locks.sql')


@blueprint.route('/prepared/', endpoint='prepared')
@blueprint.route('/prepared/<int:sid>', endpoint='get_prepared_by_server_id')
@blueprint.route(
    '/prepared/<int:sid>/<int:did>', endpoint='get_prepared_by_database_id'
)
@login_required
@check_precondition
def prepared(sid=None, did=None):
    """
    This function returns prepared XACT information
    :param sid: server id
    :return:
    """
    return get_data(sid, did, 'prepared.sql')


@blueprint.route('/config/', endpoint='config')
@blueprint.route('/config/<int:sid>', endpoint='get_config_by_server_id')
@login_required
@check_precondition
def config(sid=None):
    """
    This function returns server config information
    :param sid: server id
    :return:
    """
    return get_data(sid, None, 'config.sql')


@blueprint.route(
    '/cancel_query/<int:sid>/<int:pid>', methods=['DELETE']
)
@blueprint.route(
    '/cancel_query/<int:sid>/<int:did>/<int:pid>', methods=['DELETE']
)
@login_required
@check_precondition
def cancel_query(sid=None, did=None, pid=None):
    """
    This function cancel the specific session
    :param sid: server id
    :param did: database id
    :param pid: session/process id
    :return: Response
    """
    sql = "SELECT pg_cancel_backend({0});".format(pid)
    status, res = g.conn.execute_scalar(sql)
    if not status:
        return internal_server_error(errormsg=res)

    return ajax_response(
        response=gettext("Success") if res else gettext("Failed"),
        status=200
    )


@blueprint.route(
    '/terminate_session/<int:sid>/<int:pid>', methods=['DELETE']
)
@blueprint.route(
    '/terminate_session/<int:sid>/<int:did>/<int:pid>', methods=['DELETE']
)
@login_required
@check_precondition
def terminate_session(sid=None, did=None, pid=None):
    """
    This function terminate the specific session
    :param sid: server id
    :param did: database id
    :param pid: session/process id
    :return: Response
    """
    sql = "SELECT pg_terminate_backend({0});".format(pid)
    status, res = g.conn.execute_scalar(sql)
    if not status:
        return internal_server_error(errormsg=res)

    return ajax_response(
        response=gettext("Success") if res else gettext("Failed"),
        status=200
    )
