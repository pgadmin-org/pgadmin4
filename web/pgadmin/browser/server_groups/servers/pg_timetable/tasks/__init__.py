##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Implements pgAgent Job Step Node"""

import json
from functools import wraps

from flask import render_template, request, jsonify
from flask_babel import gettext
from pgadmin.browser.collection import CollectionNodeModule
from pgadmin.browser.utils import PGChildNodeView
from pgadmin.utils.ajax import make_json_response, gone, \
    make_response as ajax_response, internal_server_error
from pgadmin.utils.driver import get_driver
from pgadmin.utils.preferences import Preferences

from config import PG_DEFAULT_DRIVER


class ChainTaskModule(CollectionNodeModule):
    """
    class ChainTaskModule(CollectionNodeModule)

        A module class for ChainTask node derived from CollectionNodeModule.

    Methods:
    -------
    * get_nodes(gid, sid, chain_id)
      - Method is used to generate the browser collection node.

    * node_inode()
      - Method is overridden from its base class to make the node as leaf node.
    """

    _NODE_TYPE = 'pgt_chaintask'
    _COLLECTION_LABEL = gettext("Tasks")

    def get_nodes(self, gid, sid, chain_id):
        """
        Method is used to generate the browser collection node

        Args:
            gid: Server Group ID
            sid: Server ID
            chain_id: Database Id
        """
        yield self.generate_browser_collection_node(chain_id)

    @property
    def node_inode(self):
        """
        Override this property to make the node a leaf node.

        Returns: False as this is the leaf node
        """
        return False

    @property
    def script_load(self):
        """
        Load the module script for language, when any of the pga_job nodes
        are initialized.

        Returns: node type of the server module.
        """
        return 'pgt_chain'

    @property
    def csssnippets(self):
        """
        Returns a snippet of css to include in the page
        """
        snippets = [
            render_template(
                "pgt_chaintask/css/pgt_chaintask.css",
                node_type=self.node_type
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


blueprint = ChainTaskModule(__name__)


class ChainTaskView(PGChildNodeView):
    """
    class ChainTaskView(PGChildNodeView)

        A view class for ChainTask node derived from PGChildNodeView.
        This class is responsible for all the stuff related to view like
        updating job step node, showing properties, showing sql in sql pane.

    Methods:
    -------
    * __init__(**kwargs)
      - Method is used to initialize the ChainTaskView and it's base view.

    * check_precondition()
      - This function will behave as a decorator which will checks
        database connection before running view, it will also attaches
        manager,conn & template_path properties to self

    * list()
      - This function is used to list all the job step nodes within that
      collection.

    * nodes()
      - This function will used to create all the child node within that
      collection.
        Here it will create all the job step node.

    * properties(gid, sid, chain_id, task_id)
      - This function will show the properties of the selected job step node

    * update(gid, sid, chain_id, task_id)
      - This function will update the data for the selected job step node

    * msql(gid, sid, chain_id, task_id)
      - This function is used to return modified SQL for the selected
      job step node

    * sql(gid, sid, chain_id, jscid)
      - Dummy response for sql panel

    * delete(gid, sid, chain_id, jscid)
      - Drops job step
    """

    node_type = blueprint.node_type
    STEP_NOT_FOUND = "Could not find the specified chain task."

    parent_ids = [
        {'type': 'int', 'id': 'gid'},
        {'type': 'int', 'id': 'sid'},
        {'type': 'int', 'id': 'chain_id'}
    ]
    ids = [
        {'type': 'int', 'id': 'task_id'}
    ]

    operations = dict({
        'obj': [
            {'get': 'properties', 'put': 'update', 'delete': 'delete'},
            {'get': 'list', 'post': 'create', 'delete': 'delete'}
        ],
        'nodes': [{'get': 'nodes'}, {'get': 'nodes'}],
        'msql': [{'get': 'msql'}, {'get': 'msql'}],
        'sql': [{'get': 'sql'}],
        'stats': [{'get': 'statistics'}]
    })

    def _init_(self, **kwargs):
        """
        Method is used to initialize the ChainTaskView and its base view.
        Initialize all the variables create/used dynamically like conn,
        template_path.

        Args:
            **kwargs:
        """
        self.conn = None
        self.template_path = None
        self.manager = None

        super().__init__(**kwargs)

    def check_precondition(f):
        """
        This function will behave as a decorator which will check the
        database connection before running the view. It also attaches
        manager, conn & template_path properties to self
        """

        @wraps(f)
        def wrap(*args, **kwargs):
            # Here args[0] will hold self & kwargs will hold gid,sid,chain_id
            self = args[0]
            self.driver = get_driver(PG_DEFAULT_DRIVER)
            self.manager = self.driver.connection_manager(kwargs['sid'])
            self.conn = self.manager.connection()

            self.template_path = 'pgt_chaintask/sql/default'

            if 'timetable' not in self.manager.db_info:
                _, res = self.conn.execute_dict("""
SELECT EXISTS(
        SELECT 1 FROM information_schema.columns
        WHERE
            table_schema='timetable' AND table_name='task' AND
            column_name='database_connection'
    ) has_connstr""")

                self.manager.db_info['timetable'] = res['rows'][0]

            return f(*args, **kwargs)

        return wrap

    @check_precondition
    def list(self, gid, sid, chain_id):
        """
        This function is used to list all the job step nodes within
        that collection.

        Args:
            gid: Server Group ID
            sid: Server ID
            chain_id: Job ID
        """
        sql = render_template(
            "/".join([self.template_path, self._PROPERTIES_SQL]),
            chain_id=chain_id,
            has_connstr=self.manager.db_info['timetable']['has_connstr'],
            conn=self.conn
        )
        status, res = self.conn.execute_dict(sql)

        if not status:
            return internal_server_error(errormsg=res)

        for task in res['rows']:
            if isinstance(task.get('parameters'), str):
                task['parameters'] = json.loads(task['parameters'])

        return ajax_response(
            response=res['rows'],
            status=200
        )

    @check_precondition
    def nodes(self, gid, sid, chain_id, task_id=None):
        """
        This function is used to create all the child nodes
        within the collection.
        Here it will create all the job step nodes.

        Args:
            gid: Server Group ID
            sid: Server ID
            chain_id: Job ID
        """
        res = []
        sql = render_template(
            "/".join([self.template_path, self._NODES_SQL]),
            task_id=task_id,
            chain_id=chain_id,
            conn=self.conn
        )

        status, result = self.conn.execute_2darray(sql)

        if not status:
            return internal_server_error(errormsg=result)

        if task_id is not None:
            if len(result['rows']) == 0:
                return gone(errormsg=self.STEP_NOT_FOUND)

            row = result['rows'][0]
            return make_json_response(
                self.blueprint.generate_browser_node(
                    row['task_id'],
                    row['chain_id'],
                    row['task_name'],
                    icon="icon-pgt_chaintask",
                    enabled=True,
                    kind=row['kind'],
                    description=row['task_name']
                )
            )

        for row in result['rows']:
            res.append(
                self.blueprint.generate_browser_node(
                    row['task_id'],
                    row['chain_id'],
                    row['task_name'],
                    icon="icon-pgt_chaintask",
                    enabled=True,
                    kind=row['kind'],
                    description=row['task_name']
                )
            )

        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition
    def properties(self, gid, sid, chain_id, task_id):
        """
        This function will show the properties of the selected job step node.

        Args:
            gid: Server Group ID
            sid: Server ID
            chain_id: Job ID
            task_id: ChainTask ID
        """
        sql = render_template(
            "/".join([self.template_path, self._PROPERTIES_SQL]),
            task_id=task_id,
            chain_id=chain_id,
            has_connstr=self.manager.db_info['timetable']['has_connstr'],
            conn=self.conn
        )
        status, res = self.conn.execute_dict(sql)

        if not status:
            return internal_server_error(errormsg=res)

        if len(res['rows']) == 0:
            return gone(errormsg=self.STEP_NOT_FOUND)

        task = res['rows'][0]
        if isinstance(task.get('parameters'), str):
            task['parameters'] = json.loads(task['parameters'])

        return ajax_response(
            response=task,
            status=200
        )

    @check_precondition
    def create(self, gid, sid, chain_id):
        """
        This function will update the data for the selected job step node.

        Args:
            gid: Server Group ID
            sid: Server ID
            chain_id: Job ID
        """
        data = {}
        if request.args:
            for k, v in request.args.items():
                try:
                    data[k] = json.loads(
                        v.decode('utf-8') if hasattr(v, 'decode') else v
                    )
                except ValueError:
                    data[k] = v
        else:
            data = json.loads(request.data.decode())

        if 'parameters' in data:
            params_raw = data.get('parameters', [])
            if isinstance(params_raw, dict):
                params_raw = params_raw.get('added', []) + params_raw.get('changed', [])
            cleaned = []
            for idx, param in enumerate(params_raw):
                if not isinstance(param, dict):
                    cleaned.append({'order_id': idx + 1, 'value': str(param), '_is_json': False})
                else:
                    try:
                        json.loads(param.get('value', ''))
                        param['_is_json'] = True
                    except (ValueError, TypeError):
                        param['_is_json'] = False
                    cleaned.append(param)
            data['parameters'] = cleaned

        sql = render_template(
            "/".join([self.template_path, self._CREATE_SQL]),
            chain_id=chain_id,
            data=data,
            has_connstr=self.manager.db_info['timetable']['has_connstr'],
            conn=self.conn
        )

        status, res = self.conn.execute_scalar(sql)

        if not status:
            return internal_server_error(errormsg=res)

        sql = render_template(
            "/".join([self.template_path, self._NODES_SQL]),
            task_id=res,
            chain_id=chain_id,
            conn=self.conn
        )
        status, res = self.conn.execute_2darray(sql)

        if not status:
            return internal_server_error(errormsg=res)

        if len(res['rows']) == 0:
            return gone(
                errormsg=gettext(
                    "Job step creation failed."
                )
            )
        row = res['rows'][0]
        return jsonify(
            node=self.blueprint.generate_browser_node(
                row['task_id'],
                row['chain_id'],
                row['task_name'],
                icon="icon-pgt_chaintask"
            )
        )

    @check_precondition
    def update(self, gid, sid, chain_id, task_id):
        """
        This function will update the data for the selected job step node.

        Args:
            gid: Server Group ID
            sid: Server ID
            chain_id: Job ID
            task_id: ChainTask ID
        """
        data = request.form if request.form else json.loads(
            request.data.decode('utf-8')
        )

        if 'parameters' in data:
            params_raw = data.get('parameters', [])
            if isinstance(params_raw, dict):
                params_raw = params_raw.get('added', []) + params_raw.get('changed', [])
            cleaned = []
            for idx, param in enumerate(params_raw):
                if not isinstance(param, dict):
                    cleaned.append({'order_id': idx + 1, 'value': str(param), '_is_json': False})
                else:
                    try:
                        json.loads(param.get('value', ''))
                        param['_is_json'] = True
                    except (ValueError, TypeError):
                        param['_is_json'] = False
                    cleaned.append(param)
            data['parameters'] = cleaned

        sql = render_template(
            "/".join([self.template_path, self._UPDATE_SQL]),
            chain_id=chain_id,
            task_id=task_id,
            data=data,
            has_connstr=self.manager.db_info['timetable']['has_connstr'],
            conn=self.conn
        )

        status, res = self.conn.execute_void(sql)

        if not status:
            return internal_server_error(errormsg=res)

        sql = render_template(
            "/".join([self.template_path, self._NODES_SQL]),
            task_id=task_id,
            chain_id=chain_id,
            conn=self.conn
        )
        status, res = self.conn.execute_2darray(sql)

        if not status:
            return internal_server_error(errormsg=res)

        if len(res['rows']) == 0:
            return gone(
                errormsg=gettext(
                    "Job step update failed."
                )
            )
        row = res['rows'][0]
        return jsonify(
            node=self.blueprint.generate_browser_node(
                task_id,
                chain_id,
                row['task_name'],
                icon="icon-pgt_chaintask",
                description=row['task_name']
            )
        )

    @check_precondition
    def delete(self, gid, sid, chain_id, task_id=None):
        """Delete the Job step."""

        if task_id is None:
            data = request.form if request.form else json.loads(
                request.data
            )
        else:
            data = {'ids': [task_id]}

        for task_id in data['ids']:
            status, res = self.conn.execute_void(
                render_template(
                    "/".join([self.template_path, self._DELETE_SQL]),
                    chain_id=chain_id, task_id=task_id, conn=self.conn
                )
            )
            if not status:
                return internal_server_error(errormsg=res)

        return make_json_response(success=1)

    @check_precondition
    def msql(self, gid, sid, chain_id, task_id=None):
        """
        This function is used to return modified SQL for the selected
        job step node.

        Args:
            gid: Server Group ID
            sid: Server ID
            chain_id: Job ID
            task_id: Job Step ID
        """
        data = {}
        sql = ''
        for k, v in request.args.items():
            try:
                data[k] = json.loads(v)
            except ValueError:
                data[k] = v

        if task_id is None:
            sql = render_template(
                "/".join([self.template_path, self._CREATE_SQL]),
                chain_id=chain_id,
                data=data,
                has_connstr=self.manager.db_info['timetable']['has_connstr'],
                conn=self.conn
            )

            return make_json_response(
                data=sql,
                status=200
            )

        sql = render_template(
            "/".join([self.template_path, self._UPDATE_SQL]),
            chain_id=chain_id,
            task_id=task_id,
            data=data,
            has_connstr=self.manager.db_info['timetable']['has_connstr'],
            conn=self.conn
        )

        return make_json_response(
            data=sql,
            status=200
        )

    @check_precondition
    def statistics(self, gid, sid, chain_id, task_id):
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
                chain_id=chain_id, task_id=task_id, conn=self.conn,
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
    def sql(self, gid, sid, chain_id, task_id):
        """
        Dummy response for sql route.
        As we need to have msql tab for create and edit mode we can not
        disable it setting hasSQL=false because we have a single 'hasSQL'
        flag in JS to display both sql & msql tab
        """
        return ajax_response(
            response=gettext(
                "-- No SQL could be generated for the selected object."
            ),
            status=200
        )


ChainTaskView.register_node_view(blueprint)
