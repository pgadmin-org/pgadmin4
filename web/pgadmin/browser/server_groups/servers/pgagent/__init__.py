##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Implements the pgAgent Jobs Node"""
from functools import wraps
import simplejson as json
from datetime import datetime, time

from flask import render_template, request, jsonify
from flask_babelex import gettext as _

from config import PG_DEFAULT_DRIVER

from pgadmin.browser.collection import CollectionNodeModule
from pgadmin.browser.utils import PGChildNodeView
from pgadmin.browser.server_groups import servers
from pgadmin.utils.ajax import make_json_response, internal_server_error, \
    make_response as ajax_response, gone, success_return
from pgadmin.utils.driver import get_driver
from pgadmin.utils.preferences import Preferences
from pgadmin.browser.server_groups.servers.pgagent.utils \
    import format_schedule_data, format_step_data


class JobModule(CollectionNodeModule):
    _NODE_TYPE = 'pga_job'
    _COLLECTION_LABEL = _("pgAgent Jobs")

    def get_nodes(self, gid, sid):
        """
        Generate the collection node
        """
        if self.show_node:
            yield self.generate_browser_collection_node(sid)

    @property
    def script_load(self):
        """
        Load the module script for server, when any of the server-group node is
        initialized.
        """
        return servers.ServerModule.node_type

    def backend_supported(self, manager, **kwargs):
        if hasattr(self, 'show_node') and not self.show_node:
            return False

        conn = manager.connection()

        if manager.server_type == 'gpdb':
            return False

        status, res = conn.execute_scalar("""
SELECT
    has_table_privilege(
      'pgagent.pga_job', 'INSERT, SELECT, UPDATE'
    ) has_priviledge
WHERE EXISTS(
    SELECT has_schema_privilege('pgagent', 'USAGE')
    WHERE EXISTS(
        SELECT cl.oid FROM pg_catalog.pg_class cl
        LEFT JOIN pg_catalog.pg_namespace ns ON ns.oid=relnamespace
        WHERE relname='pga_job' AND nspname='pgagent'
    )
)
""")
        if status and res:
            status, res = conn.execute_dict("""
SELECT EXISTS(
        SELECT 1 FROM information_schema.columns
        WHERE
            table_schema='pgagent' AND table_name='pga_jobstep' AND
            column_name='jstconnstr'
    ) has_connstr""")

            manager.db_info['pgAgent'] = res['rows'][0]
            return True
        return False

    @property
    def csssnippets(self):
        """
        Returns a snippet of css to include in the page
        """
        snippets = [
            render_template(
                self._COLLECTION_CSS,
                node_type=self.node_type,
                _=_
            ),
            render_template(
                "pga_job/css/pga_job.css",
                node_type=self.node_type,
                _=_
            )
        ]

        for submodule in self.submodules:
            snippets.extend(submodule.csssnippets)

        return snippets

    @property
    def module_use_template_javascript(self):
        """
        Returns whether Jinja2 template is used for generating the javascript
        module.
        """
        return False


blueprint = JobModule(__name__)


class JobView(PGChildNodeView):
    node_type = blueprint.node_type

    parent_ids = [
        {'type': 'int', 'id': 'gid'},
        {'type': 'int', 'id': 'sid'}
    ]
    ids = [
        {'type': 'int', 'id': 'jid'}
    ]

    operations = dict({
        'obj': [
            {'get': 'properties', 'delete': 'delete', 'put': 'update'},
            {'get': 'properties', 'post': 'create', 'delete': 'delete'}
        ],
        'nodes': [{'get': 'nodes'}, {'get': 'nodes'}],
        'sql': [{'get': 'sql'}],
        'msql': [{'get': 'msql'}, {'get': 'msql'}],
        'run_now': [{'put': 'run_now'}],
        'classes': [{}, {'get': 'job_classes'}],
        'children': [{'get': 'children'}],
        'stats': [{'get': 'statistics'}]
    })

    def check_precondition(f):
        """
        This function will behave as a decorator which will checks
        database connection before running view, it will also attaches
        manager,conn & template_path properties to self
        """

        @wraps(f)
        def wrap(self, *args, **kwargs):

            self.manager = get_driver(
                PG_DEFAULT_DRIVER
            ).connection_manager(
                kwargs['sid']
            )
            self.conn = self.manager.connection()

            # Set the template path for the sql scripts.
            self.template_path = 'pga_job/sql/pre3.4'

            if not ('pgAgent' in self.manager.db_info):
                status, res = self.conn.execute_dict("""
SELECT EXISTS(
        SELECT 1 FROM information_schema.columns
        WHERE
            table_schema='pgagent' AND table_name='pga_jobstep' AND
            column_name='jstconnstr'
    ) has_connstr""")

                self.manager.db_info['pgAgent'] = res['rows'][0]

            return f(self, *args, **kwargs)
        return wrap

    @check_precondition
    def nodes(self, gid, sid, jid=None):
        SQL = render_template(
            "/".join([self.template_path, self._NODES_SQL]),
            jid=jid, conn=self.conn
        )
        status, rset = self.conn.execute_dict(SQL)

        if not status:
            return internal_server_error(errormsg=rset)

        if jid is not None:
            if len(rset['rows']) != 1:
                return gone(
                    errormsg=_("Could not find the pgAgent job on the server.")
                )
            return make_json_response(
                data=self.blueprint.generate_browser_node(
                    rset['rows'][0]['jobid'],
                    sid,
                    rset['rows'][0]['jobname'],
                    "icon-pga_job" if rset['rows'][0]['jobenabled'] else
                    "icon-pga_job-disabled"
                ),
                status=200
            )

        res = []
        for row in rset['rows']:
            res.append(
                self.blueprint.generate_browser_node(
                    row['jobid'],
                    sid,
                    row['jobname'],
                    "icon-pga_job" if row['jobenabled'] else
                    "icon-pga_job-disabled"
                )
            )

        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition
    def properties(self, gid, sid, jid=None):
        SQL = render_template(
            "/".join([self.template_path, self._PROPERTIES_SQL]),
            jid=jid, conn=self.conn
        )
        status, rset = self.conn.execute_dict(SQL)

        if not status:
            return internal_server_error(errormsg=rset)

        if jid is not None:
            if len(rset['rows']) != 1:
                return gone(
                    errormsg=_(
                        "Could not find the pgAgent job on the server."
                    )
                )
            res = rset['rows'][0]
            status, rset = self.conn.execute_dict(
                render_template(
                    "/".join([self.template_path, 'steps.sql']),
                    jid=jid, conn=self.conn,
                    has_connstr=self.manager.db_info['pgAgent']['has_connstr']
                )
            )
            if not status:
                return internal_server_error(errormsg=rset)
            res['jsteps'] = rset['rows']
            status, rset = self.conn.execute_dict(
                render_template(
                    "/".join([self.template_path, 'schedules.sql']),
                    jid=jid, conn=self.conn
                )
            )
            if not status:
                return internal_server_error(errormsg=rset)
            res['jschedules'] = rset['rows']
        else:
            res = rset['rows']

        return ajax_response(
            response=res,
            status=200
        )

    @check_precondition
    def create(self, gid, sid):
        """Create the pgAgent job."""
        required_args = [
            'jobname'
        ]

        data = request.form if request.form else json.loads(
            request.data.decode('utf-8')
        )

        for arg in required_args:
            if arg not in data:
                return make_json_response(
                    status=410,
                    success=0,
                    errormsg=_(
                        "Could not find the required parameter ({})."
                    ).format(arg)
                )

        status, res = self.conn.execute_void('BEGIN')
        if not status:
            return internal_server_error(errormsg=res)

        status, res = self.conn.execute_scalar(
            render_template(
                "/".join([self.template_path, self._CREATE_SQL]),
                data=data, conn=self.conn, fetch_id=True,
                has_connstr=self.manager.db_info['pgAgent']['has_connstr']
            )
        )

        if not status:
            self.conn.execute_void('END')
            return internal_server_error(errormsg=res)

        # We need oid of newly created database
        status, res = self.conn.execute_dict(
            render_template(
                "/".join([self.template_path, self._NODES_SQL]),
                jid=res, conn=self.conn
            )
        )

        self.conn.execute_void('END')
        if not status:
            return internal_server_error(errormsg=res)

        row = res['rows'][0]

        return jsonify(
            node=self.blueprint.generate_browser_node(
                row['jobid'],
                sid,
                row['jobname'],
                icon="icon-pga_job" if row['jobenabled']
                else "icon-pga_job-disabled"
            )
        )

    @check_precondition
    def update(self, gid, sid, jid):
        """Update the pgAgent Job."""

        data = request.form if request.form else json.loads(
            request.data.decode('utf-8')
        )

        # Format the schedule and step data
        self.format_schedule_step_data(data)

        status, res = self.conn.execute_void(
            render_template(
                "/".join([self.template_path, self._UPDATE_SQL]),
                data=data, conn=self.conn, jid=jid,
                has_connstr=self.manager.db_info['pgAgent']['has_connstr']
            )
        )

        if not status:
            return internal_server_error(errormsg=res)

        # We need oid of newly created database
        status, res = self.conn.execute_dict(
            render_template(
                "/".join([self.template_path, self._NODES_SQL]),
                jid=jid, conn=self.conn
            )
        )

        if not status:
            return internal_server_error(errormsg=res)

        row = res['rows'][0]

        return jsonify(
            node=self.blueprint.generate_browser_node(
                jid,
                sid,
                row['jobname'],
                icon="icon-pga_job" if row['jobenabled']
                else "icon-pga_job-disabled"
            )
        )

    @check_precondition
    def delete(self, gid, sid, jid=None):
        """Delete the pgAgent Job."""

        if jid is None:
            data = request.form if request.form else json.loads(
                request.data, encoding='utf-8'
            )
        else:
            data = {'ids': [jid]}

        for jid in data['ids']:
            status, res = self.conn.execute_void(
                render_template(
                    "/".join([self.template_path, self._DELETE_SQL]),
                    jid=jid, conn=self.conn
                )
            )
            if not status:
                return internal_server_error(errormsg=res)

        return make_json_response(success=1)

    @check_precondition
    def msql(self, gid, sid, jid=None):
        """
        This function to return modified SQL.
        """
        data = {}
        for k, v in request.args.items():
            try:
                data[k] = json.loads(
                    v.decode('utf-8') if hasattr(v, 'decode') else v
                )
            except ValueError:
                data[k] = v

        # Format the schedule and step data
        self.format_schedule_step_data(data)

        return make_json_response(
            data=render_template(
                "/".join([
                    self.template_path,
                    self._CREATE_SQL if jid is None else self._UPDATE_SQL
                ]),
                jid=jid, data=data, conn=self.conn, fetch_id=False,
                has_connstr=self.manager.db_info['pgAgent']['has_connstr']
            ),
            status=200
        )

    @check_precondition
    def statistics(self, gid, sid, jid):
        """
        statistics
        Returns the statistics for a particular database if jid is specified,
        otherwise it will return statistics for all the databases in that
        server.
        """
        pref = Preferences.module('browser')
        rows_threshold = pref.preference(
            'pgagent_row_threshold'
        )

        status, res = self.conn.execute_dict(
            render_template(
                "/".join([self.template_path, 'stats.sql']),
                jid=jid, conn=self.conn,
                rows_threshold=rows_threshold.get()
            )
        )

        if not status:
            return internal_server_error(errormsg=res)

        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition
    def sql(self, gid, sid, jid):
        """
        This function will generate sql for sql panel
        """
        SQL = render_template(
            "/".join([self.template_path, self._PROPERTIES_SQL]),
            jid=jid, conn=self.conn, last_system_oid=0
        )
        status, res = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=res)

        if len(res['rows']) == 0:
            return gone(
                _("Could not find the object on the server.")
            )

        row = res['rows'][0]

        status, res = self.conn.execute_dict(
            render_template(
                "/".join([self.template_path, 'steps.sql']),
                jid=jid, conn=self.conn,
                has_connstr=self.manager.db_info['pgAgent']['has_connstr']
            )
        )
        if not status:
            return internal_server_error(errormsg=res)

        row['jsteps'] = res['rows']

        status, res = self.conn.execute_dict(
            render_template(
                "/".join([self.template_path, 'schedules.sql']),
                jid=jid, conn=self.conn
            )
        )
        if not status:
            return internal_server_error(errormsg=res)

        row['jschedules'] = res['rows']
        for schedule in row['jschedules']:
            schedule['jscexceptions'] = []
            if schedule['jexid']:
                idx = 0
                for exc in schedule['jexid']:
                    # Convert datetime.time object to string
                    if isinstance(schedule['jextime'][idx], time):
                        schedule['jextime'][idx] = \
                            schedule['jextime'][idx].strftime("%H:%M:%S")
                    schedule['jscexceptions'].append({
                        'jexid': exc,
                        'jexdate': schedule['jexdate'][idx],
                        'jextime': schedule['jextime'][idx]
                    })
                    idx += 1
            del schedule['jexid']
            del schedule['jexdate']
            del schedule['jextime']

        return ajax_response(
            response=render_template(
                "/".join([self.template_path, self._CREATE_SQL]),
                jid=jid, data=row, conn=self.conn, fetch_id=False,
                has_connstr=self.manager.db_info['pgAgent']['has_connstr']
            )
        )

    @check_precondition
    def run_now(self, gid, sid, jid):
        """
        This function will set the next run to now, to inform the pgAgent to
        run the job now.
        """
        status, res = self.conn.execute_void(
            render_template(
                "/".join([self.template_path, 'run_now.sql']),
                jid=jid, conn=self.conn
            )
        )
        if not status:
            return internal_server_error(errormsg=res)

        return success_return(
            message=_("Updated the next runtime to now.")
        )

    @check_precondition
    def job_classes(self, gid, sid):
        """
        This function will return the set of job classes.
        """
        status, res = self.conn.execute_dict(
            render_template("/".join([self.template_path, 'job_classes.sql']))
        )

        if not status:
            return internal_server_error(errormsg=res)

        return make_json_response(
            data=res['rows'],
            status=200
        )

    def format_schedule_step_data(self, data):
        """
        This function is used to format the schedule and step data.
        :param data:
        :return:
        """
        # Format the schedule data. Convert the boolean array
        jschedules = data.get('jschedules', {})
        if type(jschedules) == dict:
            for schedule in jschedules.get('added', []):
                format_schedule_data(schedule)
            for schedule in jschedules.get('changed', []):
                format_schedule_data(schedule)

        has_connection_str = self.manager.db_info['pgAgent']['has_connstr']
        jssteps = data.get('jsteps', {})
        if type(jssteps) == dict:
            for changed_step in jssteps.get('changed', []):
                status, res = format_step_data(
                    data['jobid'], changed_step, has_connection_str,
                    self.conn, self.template_path)
                if not status:
                    internal_server_error(errormsg=res)


JobView.register_node_view(blueprint)
