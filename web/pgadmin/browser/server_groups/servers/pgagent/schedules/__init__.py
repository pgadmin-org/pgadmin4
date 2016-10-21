##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Implements pgAgent Job Schedule Node"""

import json
from functools import wraps

from flask import render_template, make_response, request
from flask_babel import gettext
from pgadmin.browser.collection import CollectionNodeModule
from pgadmin.browser.utils import PGChildNodeView
from pgadmin.utils.ajax import make_json_response, gone, \
    make_response as ajax_response, internal_server_error
from pgadmin.utils.driver import get_driver

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

    NODE_TYPE = 'pga_schedule'
    COLLECTION_LABEL = gettext("Schedules")

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
        Load the module script for language, when any of the database nodes are initialized.

        Returns: node type of the server module.
        """
        return 'pga_job'


blueprint = JobScheduleModule(__name__)


class JobScheduleView(PGChildNodeView):
    """
    class JobScheduleView(PGChildNodeView)

        A view class for JobSchedule node derived from PGChildNodeView. This class is
        responsible for all the stuff related to view like updating language
        node, showing properties, showing sql in sql pane.

    Methods:
    -------
    * __init__(**kwargs)
      - Method is used to initialize the JobScheduleView and it's base view.

    * module_js()
      - This property defines (if javascript) exists for this node.
        Override this property for your own logic

    * check_precondition()
      - This function will behave as a decorator which will checks
        database connection before running view, it will also attaches
        manager,conn & template_path properties to self

    * list()
      - This function is used to list all the language nodes within that collection.

    * nodes()
      - This function will used to create all the child node within that collection.
        Here it will create all the language node.

    * properties(gid, sid, jid, jscid)
      - This function will show the properties of the selected language node

    * update(gid, sid, jid, jscid)
      - This function will update the data for the selected language node

    * msql(gid, sid, jid, jscid)
      - This function is used to return modified SQL for the selected language node
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
            {'get': 'properties', 'put': 'update'},
            {'get': 'list', 'post': 'create'}
        ],
        'nodes': [{'get': 'nodes'}, {'get': 'nodes'}],
        'msql': [{'get': 'msql'}, {'get': 'msql'}],
        'module.js': [{}, {}, {'get': 'module_js'}]
    })

    def _init_(self, **kwargs):
        """
        Method is used to initialize the JobScheduleView and its base view.
        Initialize all the variables create/used dynamically like conn, template_path.

        Args:
            **kwargs:
        """
        self.conn = None
        self.template_path = None
        self.manager = None

        super(JobScheduleView, self).__init__(**kwargs)

    def module_js(self):
        """
        This property defines whether javascript exists for this node.
        """
        return make_response(
            render_template(
                "pga_schedule/js/pga_schedule.js",
                _=gettext
            ),
            200, {'Content-Type': 'application/x-javascript'}
        )

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
        This function is used to list all the language nodes within that collection.

        Args:
            gid: Server Group ID
            sid: Server ID
            jid: Job ID
        """
        sql = render_template(
            "/".join([self.template_path, 'properties.sql']),
            jid=jid
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
        This function is used to create all the child nodes within the collection.
        Here it will create all the language nodes.

        Args:
            gid: Server Group ID
            sid: Server ID
            jid: Job ID
        """
        res = []
        sql = render_template(
            "/".join([self.template_path, 'nodes.sql']),
            jscid=jscid,
            jid=jid
        )

        status, result = self.conn.execute_2darray(sql)

        if not status:
            return internal_server_error(errormsg=result)

        if jscid is not None:
            if len(result['rows']) == 0:
                return gone(errormsg="Couldn't find the specified job step.")

            row = result['rows'][0]
            return make_json_response(
                self.blueprint.generate_browser_node(
                    row['jscid'],
                    row['jscjobid'],
                    row['jscname'],
                    icon="icon-pga_schedule",
                    enabled=row['jscenabled']
                )
            )

        for row in result['rows']:
            res.append(
                self.blueprint.generate_browser_node(
                    row['jscid'],
                    row['jscjobid'],
                    row['jscname'],
                    icon="icon-pga_schedule",
                    enabled=row['jscenabled']
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
            "/".join([self.template_path, 'properties.sql']),
            jscid=jscid, jid=jid
        )
        status, res = self.conn.execute_dict(sql)

        if not status:
            return internal_server_error(errormsg=res)

        if len(res['rows']) == 0:
            return gone(errormsg="Couldn't find the specified job step.")

        return ajax_response(
            response=res['rows'][0],
            status=200
        )

    @check_precondition
    def create(self, gid, sid, jid):
        """
        This function will update the data for the selected language node.

        Args:
            gid: Server Group ID
            sid: Server ID
            jid: Job ID
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
            data['jscminutes'] = data['jscminutes'].replace("[", "{").replace("]", "}")
            data['jschours'] = data['jschours'].replace("[", "{").replace("]", "}")
            data['jscweekdays'] = data['jscweekdays'].replace("[", "{").replace("]", "}")
            data['jscmonthdays'] = data['jscmonthdays'].replace("[", "{").replace("]", "}")
            data['jscmonths'] = data['jscmonths'].replace("[", "{").replace("]", "}")

        sql = render_template(
            "/".join([self.template_path, 'create.sql']),
            jid=jid,
            data=data,
            fetch_id=False
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
            "/".join([self.template_path, 'nodes.sql']),
            jscid=res,
            jid=jid
        )
        status, res = self.conn.execute_2darray(sql)

        if not status:
            return internal_server_error(errormsg=res)

        row = res['rows'][0]
        return make_json_response(
            data=self.blueprint.generate_browser_node(
                row['jscid'],
                row['jscjobid'],
                row['jscname'],
                icon="icon-pga_schedule"
            )
        )

    @check_precondition
    def update(self, gid, sid, jid, jscid):
        """
        This function will update the data for the selected language node.

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
            if 'jscminutes' in data:
                data['jscminutes'] = data['jscminutes'].replace("[", "{").replace("]", "}")

            if 'jschours' in data:
                data['jschours'] = data['jschours'].replace("[", "{").replace("]", "}")

            if 'jscweekdays' in data:
                data['jscweekdays'] = data['jscweekdays'].replace("[", "{").replace("]", "}")

            if 'jscmonthdays' in data:
                data['jscmonthdays'] = data['jscmonthdays'].replace("[", "{").replace("]", "}")

            if 'jscmonths' in data:
                data['jscmonths'] = data['jscmonths'].replace("[", "{").replace("]", "}")

        sql = render_template(
            "/".join([self.template_path, 'update.sql']),
            jid=jid,
            jscid=jscid,
            data=data
        )

        status, res = self.conn.execute_void(sql)

        if not status:
            return internal_server_error(errormsg=res)

        sql = render_template(
            "/".join([self.template_path, 'nodes.sql']),
            jscid=jscid,
            jid=jid
        )
        status, res = self.conn.execute_2darray(sql)

        if not status:
            return internal_server_error(errormsg=res)

        row = res['rows'][0]
        return make_json_response(
            self.blueprint.generate_browser_node(
                row['jscid'],
                row['jscjobid'],
                row['jscname'],
                icon="icon-pga_schedule"
            )
        )

    @check_precondition
    def msql(self, gid, sid, jid, jscid=None):
        """
        This function is used to return modified SQL for the selected language node.

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
                "/".join([self.template_path, 'create.sql']),
                jid=jid,
                data=data,
                fetch_id=False
            )
        else:
            sql = render_template(
                "/".join([self.template_path, 'update.sql']),
                jid=jid,
                jscid=jscid,
                data=data
            )

        return make_json_response(
            data=sql,
            status=200
        )


JobScheduleView.register_node_view(blueprint)
