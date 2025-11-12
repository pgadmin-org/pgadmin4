##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from flask import Blueprint, render_template, g, request
from flask_security import login_required
from flask_babel import gettext
import json

from .precondition import check_precondition
from pgadmin.utils.ajax import make_response as ajax_response,\
    internal_server_error
from pgadmin.utils.constants import PREF_LABEL_REFRESH_RATES, \
    ERROR_SERVER_ID_NOT_SPECIFIED


class PGDReplicationDashboard(Blueprint):
    @staticmethod
    def register_preferences(self):
        help_string = gettext('The number of seconds between graph samples.')

        self.pgd_replication_lag_refresh = self.dashboard_preference.register(
            'dashboards', 'pgd_replication_lag_refresh',
            gettext("PGD replication lag refresh rate"), 'integer',
            5, min_val=1, max_val=999999,
            category_label=PREF_LABEL_REFRESH_RATES,
            help_str=help_string
        )

    @staticmethod
    def get_exposed_url_endpoints():
        return [
            'dashboard.pgd.outgoing', 'dashboard.pgd.incoming',
            'dashboard.pgd.cluster_nodes', 'dashboard.pgd.raft_status',
            'dashboard.pgd.charts'
        ]


blueprint = PGDReplicationDashboard('pgd', __name__, url_prefix='/pgd')


@blueprint.route('/cluster_nodes/<int:sid>', endpoint='cluster_nodes')
@login_required
@check_precondition
def cluster_nodes(sid=None):
    """
    This function is used to list all the Replication slots of the cluster
    """

    if not sid:
        return internal_server_error(errormsg=ERROR_SERVER_ID_NOT_SPECIFIED)

    sql = render_template("/".join([g.template_path, 'pgd_cluster_nodes.sql']))
    status, res = g.conn.execute_dict(sql)

    if not status:
        return internal_server_error(errormsg=str(res))

    return ajax_response(
        response=res['rows'],
        status=200
    )


@blueprint.route('/raft_status/<int:sid>', endpoint='raft_status')
@login_required
@check_precondition
def raft_status(sid=None):
    """
    This function is used to list all the raft details of the cluster
    """

    if not sid:
        return internal_server_error(errormsg=ERROR_SERVER_ID_NOT_SPECIFIED)

    sql = render_template("/".join([g.template_path, 'pgd_raft_status.sql']))
    status, res = g.conn.execute_dict(sql)

    if not status:
        return internal_server_error(errormsg=str(res))

    return ajax_response(
        response=res['rows'],
        status=200
    )


@blueprint.route('/charts/<int:sid>', endpoint='charts')
@login_required
@check_precondition
def charts(sid=None):
    """
    This function is used to get all the charts
    """

    resp_data = {}

    if request.args['chart_names'] != '':
        chart_names = request.args['chart_names'].split(',')

        if not sid:
            return internal_server_error(
                errormsg=ERROR_SERVER_ID_NOT_SPECIFIED)

        sql = render_template(
            "/".join([g.template_path, 'pgd_charts.sql']),
            chart_names=chart_names,
        )
        status, res = g.conn.execute_dict(sql)

        if not status:
            return internal_server_error(errormsg=str(res))

        for chart_row in res['rows']:
            resp_data[chart_row['chart_name']] = json.loads(
                chart_row['chart_data'])

    return ajax_response(
        response=resp_data,
        status=200
    )


@blueprint.route('/outgoing/<int:sid>', endpoint='outgoing')
@login_required
@check_precondition
def outgoing(sid=None):
    """
    This function is used to list all the outgoing replications of the cluster
    """

    if not sid:
        return internal_server_error(errormsg=ERROR_SERVER_ID_NOT_SPECIFIED)

    sql = render_template("/".join([g.template_path, 'pgd_outgoing.sql']))
    status, res = g.conn.execute_dict(sql)

    if not status:
        return internal_server_error(errormsg=str(res))

    return ajax_response(
        response=res['rows'],
        status=200
    )


@blueprint.route('/incoming/<int:sid>', endpoint='incoming')
@login_required
@check_precondition
def incoming(sid=None):
    """
    This function is used to list all the incoming replications of the cluster
    """

    if not sid:
        return internal_server_error(errormsg=ERROR_SERVER_ID_NOT_SPECIFIED)

    sql = render_template("/".join([g.template_path, 'pgd_incoming.sql']))
    status, res = g.conn.execute_dict(sql)

    if not status:
        return internal_server_error(errormsg=str(res))

    return ajax_response(
        response=res['rows'],
        status=200
    )
