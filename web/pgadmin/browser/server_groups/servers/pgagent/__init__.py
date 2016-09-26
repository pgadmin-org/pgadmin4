##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Implements the pgAgent Jobs Node"""
from functools import wraps
import json

from flask import render_template, make_response, request, jsonify
from flask_babel import gettext as _

from config import PG_DEFAULT_DRIVER

from pgadmin.browser.collection import CollectionNodeModule
from pgadmin.browser.utils import PGChildNodeView
from pgadmin.browser.server_groups import servers
from pgadmin.utils.ajax import make_json_response, internal_server_error, \
    make_response as ajax_response, gone, success_return
from pgadmin.utils.driver import get_driver


class JobModule(CollectionNodeModule):
    NODE_TYPE = 'pga_job'
    COLLECTION_LABEL = _("pgAgent Jobs")

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
        return servers.ServerModule.NODE_TYPE

    def BackendSupported(self, manager, **kwargs):
        if hasattr(self, 'show_node'):
            if not self.show_node:
                return False

        conn = manager.connection()

        status, res = conn.execute_scalar("""
SELECT
    has_table_privilege('pgagent.pga_job', 'INSERT, SELECT, UPDATE') has_priviledge
WHERE EXISTS(
    SELECT has_schema_privilege('pgagent', 'USAGE')
    WHERE EXISTS(
        SELECT cl.oid FROM pg_class cl
        LEFT JOIN pg_namespace ns ON ns.oid=relnamespace
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
                "browser/css/collection.css",
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
            {'get': 'properties', 'post': 'create'}
        ],
        'nodes': [{'get': 'nodes'}, {'get': 'nodes'}],
        'sql': [{'get': 'sql'}],
        'msql': [{'get': 'msql'}, {'get': 'msql'}],
        'run_now': [{'post': 'run_now'}],
        'classes': [{}, {'get': 'job_classes'}],
        'children': [{'get': 'children'}],
        'stats': [{'get': 'statistics'}],
        'module.js': [{}, {}, {'get': 'module_js'}]
    })

    def check_precondition(f):
        """
        This function will behave as a decorator which will checks
        database connection before running view, it will also attaches
        manager,conn & template_path properties to self
        """

        @wraps(f)
        def wrap(self, *args, **kwargs):

            self.manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(kwargs['sid'])
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
            "/".join([self.template_path, 'nodes.sql']),
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
                        ))
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
            "/".join([self.template_path, 'properties.sql']),
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

    def module_js(self):
        """
        This property defines (if javascript) exists for this node.
        Override this property for your own logic.
        """
        return make_response(
            render_template(
                "pga_job/js/pga_job.js",
                _=_
            ),
            200, {'Content-Type': 'application/x-javascript'}
        )

    @check_precondition
    def create(self, gid, sid):
        """Create the pgAgent job."""
        required_args = [
            u'jobname'
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
                        "Could not find the required parameter (%s)." % arg
                    )
                )

        status, res = self.conn.execute_void('BEGIN')
        if not status:
            return internal_server_error(errormsg=res)

        status, res = self.conn.execute_scalar(
            render_template(
                "/".join([self.template_path, 'create.sql']),
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
                "/".join([self.template_path, 'nodes.sql']),
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
                icon="icon-pga_job"
            )
        )

    @check_precondition
    def update(self, gid, sid, jid):
        """Update the pgAgent Job."""

        data = request.form if request.form else json.loads(
            request.data.decode('utf-8')
        )

        status, res = self.conn.execute_void(
            render_template(
                "/".join([self.template_path, 'update.sql']),
                data=data, conn=self.conn, jid=jid,
                has_connstr=self.manager.db_info['pgAgent']['has_connstr']
            )
        )

        if not status:
            return internal_server_error(errormsg=res)

        # We need oid of newly created database
        status, res = self.conn.execute_dict(
            render_template(
                "/".join([self.template_path, 'nodes.sql']),
                jid=res, conn=self.conn
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
                icon="icon-pga_job" if row['jobenabled'] else
                    "icon-pga_job-disabled"
            )
        )

    @check_precondition
    def delete(self, gid, sid, jid):
        """Delete the pgAgent Job."""

        status, res = self.conn.execute_void(
            render_template(
                "/".join([self.template_path, 'delete.sql']),
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

        return make_json_response(
            data=render_template(
                "/".join([
                    self.template_path,
                    'create.sql' if jid is None else 'update.sql'
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
        status, res = self.conn.execute_dict(
            render_template(
                "/".join([self.template_path, 'stats.sql']),
                jid=jid, conn=self.conn
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
            "/".join([self.template_path, 'properties.sql']),
            jid=jid, conn=self.conn, last_system_oid=0
        )
        status, res = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=res)

        row = res['rows'][0]

        status, res= self.conn.execute_dict(
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
                    schedule['jscexceptions'].append({
                        'jexid': exc,
                        'jexdate': schedule['jexdate'][idx],
                        'jextime': schedule['jextime'][idx]
                    })
                    idx+=1
            del schedule['jexid']
            del schedule['jexdate']
            del schedule['jextime']

        return ajax_response(
            response=render_template(
                "/".join([self.template_path, 'create.sql']),
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
            message=_("Updated the next-runtime to now!")
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

JobView.register_node_view(blueprint)
