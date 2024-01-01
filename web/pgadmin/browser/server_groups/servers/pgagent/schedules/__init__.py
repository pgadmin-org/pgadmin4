##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Implements pgAgent Job Schedule Node"""

import json
from functools import wraps

from flask import render_template, request, jsonify
from flask_babel import gettext
from pgadmin.browser.collection import CollectionNodeModule
from pgadmin.browser.utils import PGChildNodeView
from pgadmin.utils.ajax import make_json_response, gone, \
    make_response as ajax_response, internal_server_error
from pgadmin.utils.driver import get_driver
from pgadmin.browser.server_groups.servers.pgagent.utils \
    import format_schedule_data

from config import PG_DEFAULT_DRIVER


class JobScheduleModule(CollectionNodeModule):
    """
    class JobScheduleModule(CollectionNodeModule)

        A module class for JobSchedule node derived from CollectionNodeModule.

    Methods:
    -------
    * get_nodes(gid, sid, jid)
      - Method is used to generate the browser collection node.

    * node_inode()
      - Method is overridden from its base class to make the node as leaf node.
    """

    _NODE_TYPE = 'pga_schedule'
    _COLLECTION_LABEL = gettext("Schedules")

    def get_nodes(self, gid, sid, jid):
        """
        Method is used to generate the browser collection node

        Args:
            gid: Server Group ID
            sid: Server ID
            jid: Database Id
        """
        yield self.generate_browser_collection_node(jid)

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
        Load the module script for schedule, when any of the pga_job
        nodes are initialized.

        Returns: node type of the server module.
        """
        return 'pga_job'

    @property
    def csssnippets(self):
        """
        Returns a snippet of css to include in the page
        """
        snippets = [
            render_template(
                "pga_schedule/css/pga_schedule.css",
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


blueprint = JobScheduleModule(__name__)


class JobScheduleView(PGChildNodeView):
    """
    class JobScheduleView(PGChildNodeView)

        A view class for JobSchedule node derived from PGChildNodeView.
        This class is responsible for all the stuff related to view like
        updating schedule node, showing properties, showing sql in sql pane.

    Methods:
    -------
    * __init__(**kwargs)
      - Method is used to initialize the JobScheduleView and it's base view.

    * check_precondition()
      - This function will behave as a decorator which will checks
        database connection before running view, it will also attaches
        manager,conn & template_path properties to self

    * list()
      - This function is used to list all the schedule nodes within that
      collection.

    * nodes()
      - This function will used to create all the child node within that
      collection. Here it will create all the schedule node.

    * properties(gid, sid, jid, jscid)
      - This function will show the properties of the selected schedule node

    * update(gid, sid, jid, jscid)
      - This function will update the data for the selected schedule node

    * msql(gid, sid, jid, jscid)
      - This function is used to return modified SQL for the
      selected schedule node

    * sql(gid, sid, jid, jscid)
      - Dummy response for sql panel

    * delete(gid, sid, jid, jscid)
      - Drops job schedule
    """

    node_type = blueprint.node_type

    parent_ids = [
        {'type': 'int', 'id': 'gid'},
        {'type': 'int', 'id': 'sid'},
        {'type': 'int', 'id': 'jid'}
    ]
    ids = [
        {'type': 'int', 'id': 'jscid'}
    ]

    operations = dict({
        'obj': [
            {'get': 'properties', 'put': 'update', 'delete': 'delete'},
            {'get': 'list', 'post': 'create', 'delete': 'delete'}
        ],
        'nodes': [{'get': 'nodes'}, {'get': 'nodes'}],
        'msql': [{'get': 'msql'}, {'get': 'msql'}],
        'sql': [{'get': 'sql'}]
    })

    def _init_(self, **kwargs):
        """
        Method is used to initialize the JobScheduleView and its base view.
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
            # Here args[0] will hold self & kwargs will hold gid,sid,jid
            self = args[0]
            self.driver = get_driver(PG_DEFAULT_DRIVER)
            self.manager = self.driver.connection_manager(kwargs['sid'])
            self.conn = self.manager.connection()

            self.template_path = 'pga_schedule/sql/pre3.4'

            return f(*args, **kwargs)

        return wrap

    @check_precondition
    def list(self, gid, sid, jid):
        """
        This function is used to list all the language nodes within
        that collection.

        Args:
            gid: Server Group ID
            sid: Server ID
            jid: Job ID
        """
        sql = render_template(
            "/".join([self.template_path, self._PROPERTIES_SQL]),
            jid=jid, conn=self.conn
        )
        status, res = self.conn.execute_dict(sql)

        if not status:
            return internal_server_error(errormsg=res)

        return ajax_response(
            response=res['rows'],
            status=200
        )

    @check_precondition
    def nodes(self, gid, sid, jid, jscid=None):
        """
        This function is used to create all the child nodes within
        the collection. Here it will create all the language nodes.

        Args:
            gid: Server Group ID
            sid: Server ID
            jid: Job ID
        """
        res = []
        sql = render_template(
            "/".join([self.template_path, self._NODES_SQL]),
            jscid=jscid,
            jid=jid,
            conn=self.conn
        )

        status, result = self.conn.execute_2darray(sql)

        if not status:
            return internal_server_error(errormsg=result)

        if jscid is not None:
            if len(result['rows']) == 0:
                return gone(
                    errormsg=gettext("Could not find the specified job step.")
                )

            row = result['rows'][0]
            return make_json_response(
                data=self.blueprint.generate_browser_node(
                    row['jscid'],
                    row['jscjobid'],
                    row['jscname'],
                    icon="icon-pga_schedule" if row['jscenabled'] else
                    "icon-pga_schedule-disabled",
                    enabled=row['jscenabled'],
                    description=row['jscdesc']
                )
            )

        for row in result['rows']:
            res.append(
                self.blueprint.generate_browser_node(
                    row['jscid'],
                    row['jscjobid'],
                    row['jscname'],
                    icon="icon-pga_schedule" if row['jscenabled'] else
                    "icon-pga_schedule-disabled",
                    enabled=row['jscenabled'],
                    description=row['jscdesc']
                )
            )

        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition
    def properties(self, gid, sid, jid, jscid):
        """
        This function will show the properties of the selected language node.

        Args:
            gid: Server Group ID
            sid: Server ID
            jid: Job ID
            jscid: JobSchedule ID
        """
        sql = render_template(
            "/".join([self.template_path, self._PROPERTIES_SQL]),
            jscid=jscid, jid=jid, conn=self.conn
        )
        status, res = self.conn.execute_dict(sql)

        if not status:
            return internal_server_error(errormsg=res)

        if len(res['rows']) == 0:
            return gone(
                errormsg=gettext("Could not find the specified job step.")
            )

        # Create jscexceptions in the correct format that React control
        # required.
        if 'jexid' in res['rows'][0] and res['rows'][0]['jexid'] is not None\
                and len(res['rows'][0]['jexid']) > 0:
            res['rows'][0]['jscexceptions'] = []
            index = 0
            for exid in res['rows'][0]['jexid']:
                res['rows'][0]['jscexceptions'].append(
                    {'jexid': exid,
                     'jexdate': res['rows'][0]['jexdate'][index],
                     'jextime': res['rows'][0]['jextime'][index]
                     }
                )

                index += 1

        return ajax_response(
            response=res['rows'][0],
            status=200
        )

    @check_precondition
    def create(self, gid, sid, jid):
        """
        This function will update the data for the selected schedule node.

        Args:
            gid: Server Group ID
            sid: Server ID
            jid: Job ID
        """
        data = json.loads(request.data)
        # convert python list literal to postgres array literal.
        format_schedule_data(data)

        sql = render_template(
            "/".join([self.template_path, self._CREATE_SQL]),
            jid=jid,
            data=data,
            fetch_id=True,
            conn=self.conn
        )

        status, res = self.conn.execute_void('BEGIN')
        if not status:
            return internal_server_error(errormsg=res)

        status, res = self.conn.execute_scalar(sql)
        if not status:
            if self.conn.connected():
                self.conn.execute_void('END')
            return internal_server_error(errormsg=res)

        self.conn.execute_void('END')
        sql = render_template(
            "/".join([self.template_path, self._PROPERTIES_SQL]),
            jscid=res,
            jid=jid,
            conn=self.conn
        )
        status, res = self.conn.execute_2darray(sql)

        if not status:
            return internal_server_error(errormsg=res)

        if len(res['rows']) == 0:
            return gone(
                errormsg=gettext("Job schedule creation failed.")
            )
        row = res['rows'][0]

        return jsonify(
            node=self.blueprint.generate_browser_node(
                row['jscid'],
                row['jscjobid'],
                row['jscname'],
                icon="icon-pga_schedule" if row['jscenabled'] else
                "icon-pga_schedule-disabled",
                enabled=row['jscenabled']
            )
        )

    @check_precondition
    def update(self, gid, sid, jid, jscid):
        """
        This function will update the data for the selected schedule node.

        Args:
            gid: Server Group ID
            sid: Server ID
            jid: Job ID
            jscid: JobSchedule ID
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
            # convert python list literal to postgres array literal.
            format_schedule_data(data)

        sql = render_template(
            "/".join([self.template_path, self._UPDATE_SQL]),
            jid=jid,
            jscid=jscid,
            data=data,
            conn=self.conn
        )

        status, res = self.conn.execute_void(sql)

        if not status:
            return internal_server_error(errormsg=res)

        sql = render_template(
            "/".join([self.template_path, self._PROPERTIES_SQL]),
            jscid=jscid,
            jid=jid,
            conn=self.conn
        )
        status, res = self.conn.execute_2darray(sql)

        if not status:
            return internal_server_error(errormsg=res)

        row = res['rows'][0]
        if len(res['rows']) == 0:
            return gone(
                errormsg=gettext("Job schedule update failed.")
            )

        return jsonify(
            node=self.blueprint.generate_browser_node(
                jscid,
                jid,
                row['jscname'],
                icon="icon-pga_schedule" if row['jscenabled'] else
                "icon-pga_schedule-disabled",
                enabled=row['jscenabled'],
                description=row['jscdesc']
            )
        )

    @check_precondition
    def delete(self, gid, sid, jid, jscid=None):
        """Delete the Job Schedule."""

        if jscid is None:
            data = request.form if request.form else json.loads(
                request.data
            )
        else:
            data = {'ids': [jscid]}

        for jscid in data['ids']:
            status, res = self.conn.execute_void(
                render_template(
                    "/".join([self.template_path, self._DELETE_SQL]),
                    jid=jid, jscid=jscid, conn=self.conn
                )
            )
            if not status:
                return internal_server_error(errormsg=res)

        return make_json_response(success=1)

    @check_precondition
    def msql(self, gid, sid, jid, jscid=None):
        """
        This function is used to return modified SQL for the
        selected Schedule node.

        Args:
            gid: Server Group ID
            sid: Server ID
            jid: Job ID
            jscid: Job Schedule ID (optional)
        """
        data = {}
        sql = ''
        for k, v in request.args.items():
            try:
                data[k] = json.loads(
                    v.decode('utf-8') if hasattr(v, 'decode') else v
                )
            except ValueError:
                data[k] = v

        if jscid is None:
            sql = render_template(
                "/".join([self.template_path, self._CREATE_SQL]),
                jid=jid,
                data=data,
                fetch_id=False,
                conn=self.conn
            )
        else:
            sql = render_template(
                "/".join([self.template_path, self._UPDATE_SQL]),
                jid=jid,
                jscid=jscid,
                data=data,
                conn=self.conn
            )

        return make_json_response(
            data=sql,
            status=200
        )

    @check_precondition
    def sql(self, gid, sid, jid, jscid):
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


JobScheduleView.register_node_view(blueprint)
