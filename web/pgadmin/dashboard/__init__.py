##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""A blueprint module implementing the dashboard frame."""
from functools import wraps
from flask import render_template, url_for, Response, g, request
from flask_babelex import gettext
from flask_security import login_required
import simplejson as json
from pgadmin.utils import PgAdminModule
from pgadmin.utils.ajax import make_response as ajax_response,\
    internal_server_error
from pgadmin.utils.ajax import precondition_required
from pgadmin.utils.driver import get_driver
from pgadmin.utils.menu import Panel
from pgadmin.utils.preferences import Preferences
from pgadmin.utils.constants import PREF_LABEL_DISPLAY, MIMETYPE_APP_JS

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
        stylesheets = []
        return stylesheets

    def get_panels(self):
        return [
            Panel(
                name='dashboard',
                priority=1,
                title=gettext('Dashboard'),
                icon='',
                content='',
                is_closeable=True,
                is_private=False,
                limit=1,
                is_iframe=False,
                can_hide=True
            ).__dict__
        ]

    def register_preferences(self):
        """
        register_preferences
        Register preferences for this module.
        """
        help_string = gettext('The number of seconds between graph samples.')

        # Register options for the PG and PPAS help paths
        self.dashboard_preference = Preferences(
            'dashboards', gettext('Dashboards')
        )

        self.session_stats_refresh = self.dashboard_preference.register(
            'dashboards', 'session_stats_refresh',
            gettext("Session statistics refresh rate"), 'integer',
            1, min_val=1, max_val=999999,
            category_label=gettext('Graphs'),
            help_str=help_string
        )

        self.tps_stats_refresh = self.dashboard_preference.register(
            'dashboards', 'tps_stats_refresh',
            gettext("Transaction throughput refresh rate"), 'integer',
            1, min_val=1, max_val=999999,
            category_label=gettext('Graphs'),
            help_str=help_string
        )

        self.ti_stats_refresh = self.dashboard_preference.register(
            'dashboards', 'ti_stats_refresh',
            gettext("Tuples in refresh rate"), 'integer',
            1, min_val=1, max_val=999999,
            category_label=gettext('Graphs'),
            help_str=help_string
        )

        self.to_stats_refresh = self.dashboard_preference.register(
            'dashboards', 'to_stats_refresh',
            gettext("Tuples out refresh rate"), 'integer',
            1, min_val=1, max_val=999999,
            category_label=gettext('Graphs'),
            help_str=help_string
        )

        self.bio_stats_refresh = self.dashboard_preference.register(
            'dashboards', 'bio_stats_refresh',
            gettext("Block I/O statistics refresh rate"), 'integer',
            1, min_val=1, max_val=999999,
            category_label=gettext('Graphs'),
            help_str=help_string
        )

        self.display_graphs = self.dashboard_preference.register(
            'display', 'show_graphs',
            gettext("Show graphs?"), 'boolean', True,
            category_label=PREF_LABEL_DISPLAY,
            help_str=gettext('If set to True, graphs '
                             'will be displayed on dashboards.')
        )

        self.display_server_activity = self.dashboard_preference.register(
            'display', 'show_activity',
            gettext("Show activity?"), 'boolean', True,
            category_label=PREF_LABEL_DISPLAY,
            help_str=gettext('If set to True, activity tables '
                             'will be displayed on dashboards.')
        )

        self.graph_data_points = self.dashboard_preference.register(
            'display', 'graph_data_points',
            gettext("Show graph data points?"), 'boolean', False,
            category_label=PREF_LABEL_DISPLAY,
            help_str=gettext('If set to True, data points will be '
                             'visible on graph lines.')
        )

        self.graph_mouse_track = self.dashboard_preference.register(
            'display', 'graph_mouse_track',
            gettext("Show mouse hover tooltip?"), 'boolean', True,
            category_label=PREF_LABEL_DISPLAY,
            help_str=gettext('If set to True, tooltip will appear on mouse '
                             'hover on the graph lines giving the data point '
                             'details')
        )

    def get_exposed_url_endpoints(self):
        """
        Returns:
            list: a list of url endpoints exposed to the client.
        """
        return [
            'dashboard.index', 'dashboard.get_by_sever_id',
            'dashboard.get_by_database_id',
            'dashboard.dashboard_stats',
            'dashboard.dashboard_stats_sid',
            'dashboard.dashboard_stats_did',
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

        def get_error(i_node_type):
            stats_type = ('activity', 'prepared', 'locks', 'config')
            if f.__name__ in stats_type:
                return precondition_required(
                    gettext("Please connect to the selected {0}"
                            " to view the table.".format(i_node_type))
                )
            else:
                return precondition_required(
                    gettext("Please connect to the selected {0}"
                            " to view the graph.".format(i_node_type))
                )

        # Below check handle the case where existing server is deleted
        # by user and python server will raise exception if this check
        # is not introduce.
        if g.manager is None:
            return get_error('server')

        if 'did' in kwargs:
            g.conn = g.manager.connection(did=kwargs['did'])
            node_type = 'database'
        else:
            g.conn = g.manager.connection()
            node_type = 'server'

        # If not connected then return error to browser
        if not g.conn.connected():
            return get_error(node_type)

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
        mimetype=MIMETYPE_APP_JS
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


@blueprint.route('/dashboard_stats',
                 endpoint='dashboard_stats')
@blueprint.route('/dashboard_stats/<int:sid>',
                 endpoint='dashboard_stats_sid')
@blueprint.route('/dashboard_stats/<int:sid>/<int:did>',
                 endpoint='dashboard_stats_did')
@login_required
@check_precondition
def dashboard_stats(sid=None, did=None):
    resp_data = {}

    if request.args['chart_names'] != '':
        chart_names = request.args['chart_names'].split(',')

        if not sid:
            return internal_server_error(errormsg='Server ID not specified.')

        sql = render_template(
            "/".join([g.template_path, 'dashboard_stats.sql']), did=did,
            chart_names=chart_names,
        )
        status, res = g.conn.execute_dict(sql)

        for chart_row in res['rows']:
            resp_data[chart_row['chart_name']] = \
                json.loads(chart_row['chart_data'])

    return ajax_response(
        response=resp_data,
        status=200
    )


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
