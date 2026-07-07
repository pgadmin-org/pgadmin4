##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Implements the pgTimeTable Chains Node"""
from functools import wraps
import json
from datetime import datetime, time

from flask import render_template, request, jsonify
from flask_babel import gettext as _

from config import PG_DEFAULT_DRIVER

from pgadmin.browser.collection import CollectionNodeModule
from pgadmin.browser.utils import PGChildNodeView
from pgadmin.browser.server_groups import servers
from pgadmin.utils.ajax import make_json_response, internal_server_error, \
    make_response as ajax_response, gone, success_return
from pgadmin.utils.driver import get_driver
from pgadmin.utils.preferences import Preferences


class ChainModule(CollectionNodeModule):
    _NODE_TYPE = 'pgt_chain'
    _COLLECTION_LABEL = _("pgTimeTable Chains")

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

        status, res = conn.execute_scalar("""
SELECT
    has_table_privilege(
      'timetable.chain', 'INSERT, SELECT, UPDATE'
    ) has_priviledge
WHERE EXISTS(
    SELECT has_schema_privilege('timetable', 'USAGE')
    WHERE EXISTS(
        SELECT cl.oid FROM pg_catalog.pg_class cl
        LEFT JOIN pg_catalog.pg_namespace ns ON ns.oid=relnamespace
        WHERE relname='chain' AND nspname='timetable'
    )
)
""")
        if status and res:
            status, res = conn.execute_dict("""
SELECT EXISTS(
        SELECT 1 FROM information_schema.columns
        WHERE
            table_schema='timetable' AND table_name='task' AND
            column_name='database_connection'
    ) has_connstr""")

            manager.db_info['timetable'] = res['rows'][0]
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
                "pgt_chain/css/pgt_chain.css",
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

    def register(self, app, options):
        """
        Override the default register function to automagically register
        sub-modules at once.
        """
        from .tasks import blueprint as module
        self.submodules.append(module)

        super().register(app, options)


blueprint = ChainModule(__name__)


class ChainView(PGChildNodeView):
    node_type = blueprint.node_type

    parent_ids = [
        {'type': 'int', 'id': 'gid'},
        {'type': 'int', 'id': 'sid'}
    ]
    ids = [
        {'type': 'int', 'id': 'chain_id'}
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
            self.template_path = 'pgt_chain/sql/default'

            if 'timetable' not in self.manager.db_info:
                _, res = self.conn.execute_dict("""
SELECT EXISTS(
        SELECT 1 FROM information_schema.columns
        WHERE
            table_schema='timetable' AND table_name='task' AND
            column_name='database_connection'
    ) has_connstr""")

                self.manager.db_info['timetable'] = res['rows'][0]

            return f(self, *args, **kwargs)
        return wrap

    @check_precondition
    def nodes(self, gid, sid, chain_id=None):
        SQL = render_template(
            "/".join([self.template_path, self._NODES_SQL]),
            chain_id=chain_id, conn=self.conn
        )
        status, rset = self.conn.execute_dict(SQL)

        if not status:
            return internal_server_error(errormsg=rset)

        if chain_id is not None:
            if len(rset['rows']) != 1:
                return gone(
                    errormsg=_("Could not find the pgTimeTable chain on the server.")
                )
            return make_json_response(
                data=self.blueprint.generate_browser_node(
                    rset['rows'][0]['chain_id'],
                    sid,
                    rset['rows'][0]['chain_name'],
                    "icon-pgt_chain" if rset['rows'][0]['live'] else
                    "icon-pgt_chain-disabled",
                    description=rset['rows'][0]['chain_name']
                ),
                status=200
            )

        res = []
        for row in rset['rows']:
            res.append(
                self.blueprint.generate_browser_node(
                    row['chain_id'],
                    sid,
                    row['chain_name'],
                    "icon-pgt_chain" if row['live'] else
                    "icon-pgt_chain-disabled",
                    description=row['chain_name']
                )
            )

        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition
    def properties(self, gid, sid, chain_id=None):
        SQL = render_template(
            "/".join([self.template_path, self._PROPERTIES_SQL]),
            chain_id=chain_id, conn=self.conn
        )
        status, rset = self.conn.execute_dict(SQL)

        if not status:
            return internal_server_error(errormsg=rset)

        if chain_id is not None:
            if len(rset['rows']) != 1:
                return gone(
                    errormsg=_(
                        "Could not find the pgTimeTable chain on the server."
                    )
                )
            res = rset['rows'][0]
            status, rset = self.conn.execute_dict(
                render_template(
                    "/".join([self.template_path, 'tasks.sql']),
                    chain_id=chain_id, conn=self.conn,
                    has_connstr=self.manager.db_info['timetable']['has_connstr']
                )
            )
            if not status:
                return internal_server_error(errormsg=rset)
            res['ctasks'] = rset['rows']
            for task in res['ctasks']:
                if isinstance(task.get('parameters'), str):
                    task['parameters'] = json.loads(task['parameters'])
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
            'chain_name'
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

        for task in data.get('ctasks', []):
            if not isinstance(task, dict):
                continue
            cleaned_params = []
            for idx, param in enumerate(task.get('parameters', [])):
                if not isinstance(param, dict):
                    cleaned_params.append({'order_id': idx + 1, 'value': str(param), '_is_json': False})
                else:
                    try:
                        json.loads(param.get('value', ''))
                        param['_is_json'] = True
                    except (ValueError, TypeError):
                        param['_is_json'] = False
                    cleaned_params.append(param)
            if cleaned_params:
                task['parameters'] = cleaned_params

        status, res = self.conn.execute_void('BEGIN')
        if not status:
            return internal_server_error(errormsg=res)

        status, res = self.conn.execute_scalar(
            render_template(
                "/".join([self.template_path, self._CREATE_SQL]),
                data=data, conn=self.conn, fetch_id=True,
                has_connstr=self.manager.db_info['timetable']['has_connstr']
            )
        )

        if not status:
            self.conn.execute_void('END')
            return internal_server_error(errormsg=res)

        # We need oid of newly created database
        status, res = self.conn.execute_dict(
            render_template(
                "/".join([self.template_path, self._NODES_SQL]),
                chain_id=res, conn=self.conn
            )
        )

        self.conn.execute_void('END')
        if not status:
            return internal_server_error(errormsg=res)

        row = res['rows'][0]

        return jsonify(
            node=self.blueprint.generate_browser_node(
                row['chain_id'],
                sid,
                row['chain_name'],
                icon="icon-pgt_chain" if row['live']
                else "icon-pgt_chain-disabled"
            )
        )

    @check_precondition
    def update(self, gid, sid, chain_id):
        """Update the pgTimeTable chain."""

        data = request.form if request.form else json.loads(
            request.data.decode('utf-8')
        )

        chain_fields = {k: data[k] for k in ['chain_name', 'live', 'max_instances', 'timeout', 'self_destruct', 'exclusive_execution', 'client_name', 'on_error', 'run_at'] if k in data}
        if chain_fields:
            sets = []
            params = []
            bool_keys = ['live', 'self_destruct', 'exclusive_execution']
            for key, val in chain_fields.items():
                sets.append(f"{key} = %s")
                if key in bool_keys:
                    params.append('t' if val else 'f')
                else:
                    params.append(val)
            params.append(chain_id)
            sql = f"UPDATE timetable.chain SET {', '.join(sets)} WHERE chain_id = %s"
            status, res = self.conn.execute_void(sql, params)
            if not status:
                return internal_server_error(errormsg=res)

        self._process_ctasks(chain_id, data.get('ctasks', {}))

        status, res = self.conn.execute_dict(
            render_template(
                "/".join([self.template_path, self._NODES_SQL]),
                chain_id=chain_id, conn=self.conn
            )
        )

        if not status:
            return internal_server_error(errormsg=res)

        row = res['rows'][0]

        return jsonify(
            node=self.blueprint.generate_browser_node(
                chain_id,
                sid,
                row['chain_name'],
                icon="icon-pgt_chain" if row['live']
                else "icon-pgt_chain-disabled",
                description=row['chain_name']
            )
        )

    def _process_ctasks(self, chain_id, ctasks):
        if not isinstance(ctasks, dict):
            return

        for task in ctasks.get('deleted', []):
            tid = task.get('task_id') if isinstance(task, dict) else task
            if tid:
                self.conn.execute_void(
                    "DELETE FROM timetable.task WHERE task_id = %s AND chain_id = %s",
                    (tid, chain_id)
                )

        for task in ctasks.get('changed', []):
            if not isinstance(task, dict):
                continue
            tid = task.get('task_id')
            if not tid:
                continue
            sets = []
            params = []
            field_map = {
                'task_name': 'task_name',
                'task_order': 'task_order',
                'command': 'command',
                'database_connection': 'database_connection',
                'ignore_error': 'ignore_error',
            }
            if 'kind' in task:
                sets.append("kind = %s::timetable.command_kind")
                params.append(task['kind'])
            for frontend_field, db_field in field_map.items():
                if frontend_field in task:
                    sets.append(f"{db_field} = %s")
                    params.append(task[frontend_field])
            if sets:
                params.extend([tid, chain_id])
                sql = f"UPDATE timetable.task SET {', '.join(sets)} WHERE task_id = %s AND chain_id = %s"
                self.conn.execute_void(sql, params)
            if 'parameters' in task:
                self._upsert_task_params(tid, task['parameters'])

        has_connstr = self.manager.db_info['timetable']['has_connstr']
        for task in ctasks.get('added', []):
            if not isinstance(task, dict):
                continue
            fields = ['chain_id', 'task_name', 'task_order', 'command']
            values = [chain_id, task.get('task_name', ''), task.get('task_order', 10), task.get('command', '')]
            if 'ignore_error' in task:
                fields.append('ignore_error')
                values.append(task['ignore_error'])
            if 'kind' in task:
                fields.append('kind')
                values.append(task['kind'])
            if has_connstr and 'database_connection' in task and task['database_connection']:
                fields.append('database_connection')
                values.append(task['database_connection'])
            placeholders = ', '.join(['%s'] * len(values))
            sql = f"INSERT INTO timetable.task ({', '.join(fields)}) VALUES ({placeholders}) RETURNING task_id"
            status, tid = self.conn.execute_scalar(sql, values)
            if status and tid:
                self._upsert_task_params(tid, task.get('parameters', []))

    def _upsert_task_params(self, task_id, parameters):
        if not parameters:
            return
        if isinstance(parameters, dict):
            parameters = parameters.get('added', []) + parameters.get('changed', [])
        if not parameters:
            return
        self.conn.execute_void(
            "DELETE FROM timetable.parameter WHERE task_id = %s", (task_id,)
        )
        for idx, param in enumerate(parameters):
            if not isinstance(param, dict):
                param = {'order_id': idx + 1, 'value': str(param)}
            order_id = param.get('order_id')
            if order_id is None:
                order_id = idx + 1
            val = param.get('value', '')
            if val is None:
                val = ''
            try:
                json.loads(val)
                sql = "INSERT INTO timetable.parameter(task_id, order_id, value) VALUES (%s, %s, %s::jsonb)"
                params = (task_id, order_id, val)
            except (ValueError, TypeError):
                sql = "INSERT INTO timetable.parameter(task_id, order_id, value) VALUES (%s, %s, to_jsonb(%s::text))"
                params = (task_id, order_id, val)
            self.conn.execute_void(sql, params)

    @check_precondition
    def delete(self, gid, sid, chain_id=None):
        """Delete the pgAgent Job."""

        if chain_id is None:
            data = request.form if request.form else json.loads(
                request.data
            )
        else:
            data = {'ids': [chain_id]}

        for chain_id in data['ids']:
            status, res = self.conn.execute_void(
                render_template(
                    "/".join([self.template_path, self._DELETE_SQL]),
                    chain_id=chain_id, conn=self.conn
                )
            )
            if not status:
                return internal_server_error(errormsg=res)

        return make_json_response(success=1)

    @check_precondition
    def msql(self, gid, sid, chain_id=None):
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
                    self._CREATE_SQL if chain_id is None else self._UPDATE_SQL
                ]),
                chain_id=chain_id, data=data, conn=self.conn, fetch_id=False,
                has_connstr=self.manager.db_info['timetable']['has_connstr']
            ),
            status=200
        )

    @check_precondition
    def statistics(self, gid, sid, chain_id):
        """
        statistics
        Returns the statistics for a particular database if chain_id is specified,
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
                chain_id=chain_id, conn=self.conn,
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
    def sql(self, gid, sid, chain_id):
        """
        This function will generate sql for sql panel
        """
        SQL = render_template(
            "/".join([self.template_path, self._PROPERTIES_SQL]),
            chain_id=chain_id, conn=self.conn, last_system_oid=0
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
                "/".join([self.template_path, 'tasks.sql']),
                chain_id=chain_id, conn=self.conn,
                has_connstr=self.manager.db_info['timetable']['has_connstr']
            )
        )
        if not status:
            return internal_server_error(errormsg=res)

        row['ctasks'] = res['rows']
        for task in row['ctasks']:
            if isinstance(task.get('parameters'), str):
                task['parameters'] = json.loads(task['parameters'])

        return ajax_response(
            response=render_template(
                "/".join([self.template_path, self._CREATE_SQL]),
                chain_id=chain_id, data=row, conn=self.conn, fetch_id=False,
                has_connstr=self.manager.db_info['timetable']['has_connstr']
            )
        )

    @check_precondition
    def run_now(self, gid, sid, chain_id):
        """
        This function will set the next run to now, to inform the pgAgent to
        run the job now.
        """
        status, res = self.conn.execute_void(
            render_template(
                "/".join([self.template_path, 'run_now.sql']),
                chain_id=chain_id, conn=self.conn
            )
        )
        if not status:
            return internal_server_error(errormsg=res)

        return success_return(
            message=_("Updated the next runtime to now.")
        )

ChainView.register_node_view(blueprint)
