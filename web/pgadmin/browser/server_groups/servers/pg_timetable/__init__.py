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
    make_response as ajax_response, gone
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

    _CHAIN_BOOL_KEYS = [
        'live', 'self_destruct', 'exclusive_execution'
    ]
    _CHAIN_NULL_IF_EMPTY = [
        'run_at', 'client_name', 'on_error'
    ]

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
                    errormsg=_(
                        "Could not find the pgTimeTable"
                        " chain on the server."
                    )
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
                    chain_id=chain_id, conn=self.conn
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
        """Create the pgTimeTable chain."""
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
                    cleaned_params.append({
                        'order_id': idx + 1,
                        'value': str(param),
                        '_is_json': False
                    })
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
                data=data, conn=self.conn, fetch_id=True
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

        if not status:
            self.conn.execute_void('ROLLBACK')
            return internal_server_error(errormsg=res)

        status, commit_res = self.conn.execute_void('COMMIT')
        if not status:
            return internal_server_error(errormsg=commit_res)

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

        status, res = self.conn.execute_void('BEGIN')
        if not status:
            return internal_server_error(errormsg=res)

        chain_fields = {
            k: data[k] for k in [
                'chain_name', 'live', 'max_instances',
                'timeout', 'self_destruct',
                'exclusive_execution', 'client_name',
                'on_error', 'run_at'
            ] if k in data
        }
        if chain_fields:
            sets = []
            params = []
            bool_keys = self._CHAIN_BOOL_KEYS
            null_if_empty = self._CHAIN_NULL_IF_EMPTY
            for key, val in chain_fields.items():
                sets.append(f"{key} = %s")
                if key in bool_keys:
                    params.append('t' if val else 'f')
                elif key in null_if_empty and not val:
                    params.append(None)
                else:
                    params.append(val)
            params.append(chain_id)
            sql = (
                f"UPDATE timetable.chain"
                f" SET {', '.join(sets)}"
                f" WHERE chain_id = %s"
            )
            status, res = self.conn.execute_void(sql, params)
            if not status:
                self.conn.execute_void('ROLLBACK')
                return internal_server_error(errormsg=res)

        status, res = self._process_ctasks(
            chain_id, data.get('ctasks', {})
        )
        if not status:
            self.conn.execute_void('ROLLBACK')
            return internal_server_error(errormsg=res)

        status, res = self.conn.execute_dict(
            render_template(
                "/".join([
                    self.template_path, self._NODES_SQL
                ]),
                chain_id=chain_id, conn=self.conn
            )
        )

        if not status:
            self.conn.execute_void('ROLLBACK')
            return internal_server_error(errormsg=res)

        status, commit_res = self.conn.execute_void('COMMIT')
        if not status:
            return internal_server_error(errormsg=commit_res)

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

    def _generate_update_sql(self, chain_id, data):
        driver = get_driver(PG_DEFAULT_DRIVER)
        qt = driver.qtLiteral

        def _params_sql(parameters, task_id_ref):
            """Build the parameter DELETE + INSERT statements.

            task_id_ref is the SQL expression for the task id: a quoted
            literal for existing tasks, or the PL/pgSQL variable 'tid'
            for tasks added within the enclosing DO block.
            """
            lines = [
                f"DELETE FROM timetable.parameter"
                f" WHERE task_id = {task_id_ref}::integer;"
            ]
            if isinstance(parameters, dict):
                all_params = (
                    parameters.get('changed', []) +
                    parameters.get('added', [])
                )
            else:
                all_params = parameters
            val_strs = []
            for param in all_params:
                if not isinstance(param, dict):
                    continue
                oid = param.get('order_id', 0)
                val = param.get('value', '')
                if val is None:
                    val = ''
                oid_q = qt(oid, self.conn)
                if param.get('_is_json'):
                    vq = qt(val, self.conn)
                    val_strs.append(
                        f"({task_id_ref}::integer,"
                        f" {oid_q}::integer,"
                        f" {vq}::jsonb)"
                    )
                else:
                    vq = qt(val, self.conn)
                    val_strs.append(
                        f"({task_id_ref}::integer,"
                        f" {oid_q}::integer,"
                        f" to_jsonb({vq}::text))"
                    )
            if val_strs:
                lines.append(
                    "INSERT INTO timetable.parameter"
                    "(task_id, order_id, value)\n"
                    "VALUES\n" +
                    ",\n".join(val_strs) + ";"
                )
            return lines

        sql_parts = []

        chain_fields = {
            k: data[k] for k in [
                'chain_name', 'live', 'max_instances',
                'timeout', 'self_destruct',
                'exclusive_execution', 'client_name',
                'on_error', 'run_at'
            ] if k in data
        }
        if chain_fields:
            bool_keys = self._CHAIN_BOOL_KEYS
            null_if_empty = self._CHAIN_NULL_IF_EMPTY
            sets = []
            for key, val in chain_fields.items():
                if key in bool_keys:
                    v = 'true' if val else 'false'
                elif key in null_if_empty and not val:
                    v = 'NULL'
                elif key in ('max_instances', 'timeout'):
                    if val is not None:
                        v = f"{val}::integer"
                    elif key == 'timeout':
                        v = '0'
                    else:
                        v = 'NULL'
                elif key == 'chain_name':
                    v = f"{qt(val, self.conn)}::text"
                else:
                    v = qt(val, self.conn)
                sets.append(f"    {key} = {v}")
            chain_id_q = qt(chain_id, self.conn)
            sql_parts.append(
                f"UPDATE timetable.chain\n"
                f"SET\n" +
                ",\n".join(sets) + "\n"
                f"WHERE chain_id = {chain_id_q}::integer;"
            )

        ctasks = data.get('ctasks', {})
        if not isinstance(ctasks, dict):
            return "\n".join(sql_parts) if sql_parts else ""

        cid_q = qt(chain_id, self.conn)
        body = []

        for task in ctasks.get('deleted', []):
            tid = (
                task.get('task_id')
                if isinstance(task, dict) else task
            )
            if tid:
                tid_q = qt(tid, self.conn)
                body.append(
                    f"DELETE FROM timetable.parameter"
                    f" WHERE task_id = {tid_q}::integer;"
                )
                body.append(
                    f"DELETE FROM timetable.task"
                    f" WHERE task_id = {tid_q}::integer"
                    f" AND chain_id = {cid_q}::integer;"
                )

        for task in ctasks.get('changed', []):
            if not isinstance(task, dict):
                continue
            tid = task.get('task_id')
            if not tid:
                continue
            tid_q = qt(tid, self.conn)
            sets = []
            if 'kind' in task:
                kv = qt(task['kind'], self.conn)
                sets.append(
                    f"    kind = {kv}"
                    f"::timetable.command_kind"
                )
            field_map = {
                'task_name': 'text',
                'task_order': 'double precision',
                'command': 'text',
                'ignore_error': None,
                'database_connection': 'text',
            }
            for field, cast in field_map.items():
                if field not in task:
                    continue
                val = task[field]
                if field == 'ignore_error':
                    v = 'true' if val else 'false'
                elif field == 'database_connection':
                    v = (
                        f"{qt(val, self.conn)}::text"
                        if val else 'NULL'
                    )
                else:
                    v = f"{qt(val, self.conn)}::{cast}"
                sets.append(f"    {field} = {v}")
            if sets:
                body.append(
                    f"UPDATE timetable.task\n"
                    f"SET\n" +
                    ",\n".join(sets) + "\n"
                    f"WHERE task_id = {tid_q}::integer"
                    f" AND chain_id = {cid_q}::integer;"
                )
            if 'parameters' in task:
                body.extend(
                    _params_sql(
                        task['parameters'], tid_q
                    )
                )

        for task in ctasks.get('added', []):
            if not isinstance(task, dict):
                continue
            cols = [
                'chain_id', 'task_name', 'task_order',
                'command', 'kind', 'ignore_error',
                'database_connection'
            ]
            vals = [
                f"{cid_q}::integer",
                (f"{qt(task.get('task_name', ''), self.conn)}"
                 f"::text"),
                (f"{qt(task.get('task_order', 10), self.conn)}"
                 f"::double precision"),
                (f"{qt(task.get('command', ''), self.conn)}"
                 f"::text"),
                (f"{qt(task.get('kind', 'SQL'), self.conn)}"
                 f"::timetable.command_kind"),
            ]
            ie = task.get('ignore_error', False)
            vals.append('true' if ie else 'false')
            dc = task.get('database_connection', '')
            vals.append(
                f"{qt(dc, self.conn)}::text" if dc else 'NULL'
            )
            cols_str = ", ".join(cols)
            vals_str = ",\n    ".join(vals)
            body.append(
                f"INSERT INTO timetable.task(\n"
                f"    {cols_str}\n"
                f") VALUES (\n"
                f"    {vals_str}\n"
                f") RETURNING task_id INTO tid;"
            )
            params = task.get('parameters', [])
            if params:
                body.extend(_params_sql(params, 'tid'))

        if body:
            sql_parts.append(
                "DO $$\n"
                "DECLARE\n"
                "    tid bigint;\n"
                "BEGIN\n" +
                "\n".join(body) +
                "\nEND\n$$;"
            )

        return "\n".join(sql_parts) if sql_parts else ""

    def _process_ctasks(self, chain_id, ctasks):
        if not isinstance(ctasks, dict):
            return True, None

        for task in ctasks.get('deleted', []):
            tid = (
                task.get('task_id')
                if isinstance(task, dict) else task
            )
            if tid:
                status, res = self.conn.execute_void(
                    "DELETE FROM timetable.task"
                    " WHERE task_id = %s"
                    " AND chain_id = %s",
                    (tid, chain_id)
                )
                if not status:
                    return status, res

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
                'ignore_error': 'ignore_error',
                'database_connection':
                    'database_connection'
            }
            if 'kind' in task:
                sets.append(
                    "kind = %s::timetable.command_kind"
                )
                params.append(task['kind'])
            for fe_field, db_field in field_map.items():
                if fe_field in task:
                    sets.append(f"{db_field} = %s")
                    params.append(task[fe_field])
            if sets:
                params.extend([tid, chain_id])
                sql = (
                    f"UPDATE timetable.task"
                    f" SET {', '.join(sets)}"
                    f" WHERE task_id = %s"
                    f" AND chain_id = %s"
                )
                status, res = self.conn.execute_void(
                    sql, params
                )
                if not status:
                    return status, res
            if 'parameters' in task:
                status, res = self._upsert_task_params(
                    tid, task['parameters']
                )
                if not status:
                    return status, res

        for task in ctasks.get('added', []):
            if not isinstance(task, dict):
                continue
            fields = [
                'chain_id', 'task_name', 'task_order',
                'command', 'database_connection'
            ]
            values = [
                chain_id,
                task.get('task_name', ''),
                task.get('task_order', 10),
                task.get('command', ''),
                task.get('database_connection', '')
            ]
            if 'ignore_error' in task:
                fields.append('ignore_error')
                values.append(task['ignore_error'])
            if 'kind' in task:
                fields.append('kind')
                values.append(task['kind'])
            placeholders = ', '.join(
                ['%s'] * len(values)
            )
            sql = (
                f"INSERT INTO timetable.task"
                f" ({', '.join(fields)})"
                f" VALUES ({placeholders})"
                f" RETURNING task_id"
            )
            status, tid = self.conn.execute_scalar(
                sql, values
            )
            if not status:
                return status, tid
            if tid:
                status, res = self._upsert_task_params(
                    tid, task.get('parameters', [])
                )
                if not status:
                    return status, res

        return True, None

    def _upsert_task_params(self, task_id, parameters):
        def _insert_param(idx, param):
            if not isinstance(param, dict):
                param = {
                    'order_id': idx + 1,
                    'value': str(param)
                }
            param.pop('_t', None)
            order_id = param.get('order_id')
            if order_id is None:
                order_id = idx + 1
            order_id = int(order_id)
            val = param.get('value', '')
            if val is None:
                val = ''
            try:
                json.loads(val)
                sql = (
                    "INSERT INTO timetable.parameter"
                    "(task_id, order_id, value)"
                    " VALUES (%s, %s, %s::jsonb)"
                )
                p = (task_id, order_id, val)
            except (ValueError, TypeError):
                sql = (
                    "INSERT INTO timetable.parameter"
                    "(task_id, order_id, value)"
                    " VALUES (%s, %s,"
                    " to_jsonb(%s::text))"
                )
                p = (task_id, order_id, val)
            return self.conn.execute_void(sql, p)

        status, res = self.conn.execute_void(
            "DELETE FROM timetable.parameter"
            " WHERE task_id = %s",
            (task_id,)
        )
        if not status:
            return status, res

        if isinstance(parameters, dict):
            all_params = (
                parameters.get('changed', []) +
                parameters.get('added', [])
            )
        else:
            all_params = parameters

        for idx, param in enumerate(all_params):
            status, res = _insert_param(idx, param)
            if not status:
                return status, res
        return True, None

    @check_precondition
    def delete(self, gid, sid, chain_id=None):
        """Delete the pgTimeTable chain."""

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

    @staticmethod
    def _set_json_markers(ctasks):
        """Ensure _is_json markers are set on parameter values."""
        def _mark_params(params):
            for param in params:
                if not isinstance(param, dict):
                    continue
                val = param.get('value')
                if isinstance(val, (dict, list)):
                    param['value'] = json.dumps(val, indent=2)
                    param['_is_json'] = True
                elif '_is_json' not in param:
                    param['_is_json'] = False

        if isinstance(ctasks, list):
            for task in ctasks:
                if isinstance(task, dict):
                    _mark_params(task.get('parameters', []))
        elif isinstance(ctasks, dict):
            for task in ctasks.get('added', []):
                if isinstance(task, dict):
                    _mark_params(task.get('parameters', []))
            for task in ctasks.get('changed', []):
                if not isinstance(task, dict):
                    continue
                params = task.get('parameters')
                if isinstance(params, dict):
                    _mark_params(
                        params.get('changed', []) +
                        params.get('added', [])
                    )
                elif isinstance(params, list):
                    _mark_params(params)

    @check_precondition
    def msql(self, gid, sid, chain_id=None):
        """
        This function to return modified SQL.
        """
        data = {}
        for k, v in request.args.items():
            try:
                data[k] = json.loads(
                    v.decode('utf-8')
                    if hasattr(v, 'decode') else v
                )
            except ValueError:
                data[k] = v

        self._set_json_markers(data.get('ctasks'))

        if chain_id is not None:
            sql = self._generate_update_sql(
                chain_id, data
            )
        else:
            sql = render_template(
                "/".join([
                    self.template_path,
                    self._CREATE_SQL
                ]),
                data=data, conn=self.conn,
                fetch_id=False
            )

        return make_json_response(
            data=sql, status=200
        )

    @check_precondition
    def statistics(self, gid, sid, chain_id):
        """
        statistics
        Returns the recent execution details (run, status, start time,
        end time, duration and task) for the specified chain, up to the
        configured rows threshold.
        """
        pref = Preferences.module('browser')
        rows_threshold = pref.preference(
            'pgtimetable_row_threshold'
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
                chain_id=chain_id, conn=self.conn
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
                chain_id=chain_id, data=row, conn=self.conn, fetch_id=False
            )
        )

    @check_precondition
    def run_now(self, gid, sid, chain_id):
        """
        This function will set the next run to now, to inform pgTimeTable to
        run the chain now.
        """
        status, res = self.conn.execute_dict(
            render_template(
                "/".join([self.template_path, 'run_now.sql']),
                chain_id=chain_id, conn=self.conn
            )
        )
        if not status:
            return internal_server_error(errormsg=res)

        rows = (res or {}).get('rows') or []
        if not rows:
            return gone(errormsg=_("Could not find the requested chain."))

        notice = rows[0]['notice']
        notification = bool(rows[0].get('notification'))

        return make_json_response(
            success=1, info=notice, data={'notification': notification}
        )


ChainView.register_node_view(blueprint)
