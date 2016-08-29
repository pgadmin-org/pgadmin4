##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Implements Resource Groups for PPAS 9.4 and above"""

import simplejson as json
from functools import wraps

import pgadmin.browser.server_groups.servers as servers
from flask import render_template, make_response, request, jsonify
from flask_babel import gettext
from pgadmin.browser.collection import CollectionNodeModule
from pgadmin.browser.utils import NodeView
from pgadmin.utils.ajax import make_json_response, \
    make_response as ajax_response, internal_server_error
from pgadmin.utils.ajax import precondition_required
from pgadmin.utils.driver import get_driver

from config import PG_DEFAULT_DRIVER
from pgadmin.utils.ajax import gone


class ResourceGroupModule(CollectionNodeModule):
    """
     class ResourceGroupModule(CollectionNodeModule)

        A module class for Resource Group node derived from CollectionNodeModule.

    Methods:
    -------
    * __init__(*args, **kwargs)
      - Method is used to initialize the ResourceGroupModule and it's base module.

    * BackendSupported(manager, **kwargs)
      - This function is used to check the database server type and version.
        Resource Group only supported in PPAS 9.4 and above.

    * get_nodes(gid, sid, did)
      - Method is used to generate the browser collection node.

    * node_inode()
      - Method is overridden from its base class to make the node as leaf node.

    * script_load()
      - Load the module script for resource group, when any of the server node is
        initialized.
    """

    NODE_TYPE = 'resource_group'
    COLLECTION_LABEL = gettext("Resource Groups")

    def __init__(self, *args, **kwargs):
        """
        Method is used to initialize the ResourceGroupModule and it's base module.

        Args:
            *args:
            **kwargs:
        """
        super(ResourceGroupModule, self).__init__(*args, **kwargs)

        self.min_ver = 90400
        self.max_ver = None
        self.server_type = ['ppas']

    def get_nodes(self, gid, sid):
        """
        Method is used to generate the browser collection node

        Args:
            gid: Server Group ID
            sid: Server ID
        """
        yield self.generate_browser_collection_node(sid)

    @property
    def node_inode(self):
        """
        Override this property to make the node as leaf node.

        Returns: False as this is the leaf node
        """
        return False

    @property
    def script_load(self):
        """
        Load the module script for resource group, when any of the server node is initialized.

        Returns: node type of the server module.
        """
        return servers.ServerModule.NODE_TYPE


blueprint = ResourceGroupModule(__name__)


class ResourceGroupView(NodeView):
    """
    class ResourceGroupView(NodeView)

        A view class for resource group node derived from NodeView. This class is
        responsible for all the stuff related to view like create/update/delete resource group,
        showing properties of resource group node, showing sql in sql pane.

    Methods:
    -------
    * __init__(**kwargs)
      - Method is used to initialize the ResourceGroupView and it's base view.

    * module_js()
      - This property defines (if javascript) exists for this node.
        Override this property for your own logic

    * check_precondition()
      - This function will behave as a decorator which will checks
        database connection before running view, it will also attaches
        manager,conn & template_path properties to self

    * list()
      - This function is used to list all the resource group nodes within that collection.

    * nodes()
      - This function will used to create all the child node within that collection.
        Here it will create all the resource group node.

    * properties(gid, sid, did, rg_id)
      - This function will show the properties of the selected resource group node

    * create(gid, sid, did, rg_id)
      - This function will create the new resource group object

    * update(gid, sid, did, rg_id)
      - This function will update the data for the selected resource group node

    * delete(self, gid, sid, rg_id):
      - This function will drop the resource group object

    * msql(gid, sid, did, rg_id)
      - This function is used to return modified SQL for the selected resource group node

    * get_sql(data, rg_id)
      - This function will generate sql from model data

    * sql(gid, sid, did, rg_id):
      - This function will generate sql to show it in sql pane for the selected resource group node.
    """

    node_type = blueprint.node_type

    parent_ids = [
        {'type': 'int', 'id': 'gid'},
        {'type': 'int', 'id': 'sid'}
    ]
    ids = [
        {'type': 'int', 'id': 'rg_id'}
    ]

    operations = dict({
        'obj': [
            {'get': 'properties', 'delete': 'delete', 'put': 'update'},
            {'get': 'list', 'post': 'create'}
        ],
        'nodes': [{'get': 'node'}, {'get': 'nodes'}],
        'sql': [{'get': 'sql'}],
        'msql': [{'get': 'msql'}, {'get': 'msql'}],
        'stats': [{'get': 'statistics'}],
        'dependency': [{'get': 'dependencies'}],
        'dependent': [{'get': 'dependents'}],
        'module.js': [{}, {}, {'get': 'module_js'}]
    })

    def __init__(self, **kwargs):
        """
        Method is used to initialize the ResourceGroupView and it's base view.
        Also initialize all the variables create/used dynamically like conn, template_path.

        Args:
            **kwargs:
        """
        self.conn = None
        self.template_path = None

        super(ResourceGroupView, self).__init__(**kwargs)

    def module_js(self):
        """
        This property defines (if javascript) exists for this node.
        Override this property for your own logic.
        """
        return make_response(
            render_template(
                "resource_groups/js/resource_groups.js",
                _=gettext
            ),
            200, {'Content-Type': 'application/x-javascript'}
        )

    def check_precondition(f):
        """
        This function will behave as a decorator which will checks
        database connection before running view, it will also attaches
        manager,conn & template_path properties to self
        """

        @wraps(f)
        def wrap(*args, **kwargs):
            # Here args[0] will hold self & kwargs will hold gid,sid,did
            self = args[0]
            self.driver = get_driver(PG_DEFAULT_DRIVER)
            self.manager = self.driver.connection_manager(kwargs['sid'])
            self.conn = self.manager.connection()

            # If DB not connected then return error to browser
            if not self.conn.connected():
                return precondition_required(
                    gettext(
                        "Connection to the server has been lost!"
                    )
                )

            self.template_path = 'resource_groups/sql'
            return f(*args, **kwargs)

        return wrap

    @check_precondition
    def list(self, gid, sid):
        """
        This function is used to list all the resource group nodes within that collection.

        Args:
            gid: Server Group ID
            sid: Server ID
        """
        sql = render_template("/".join([self.template_path, 'properties.sql']))
        status, res = self.conn.execute_dict(sql)

        if not status:
            return internal_server_error(errormsg=res)
        return ajax_response(
            response=res['rows'],
            status=200
        )

    @check_precondition
    def node(self, gid, sid, rg_id):
        """
        This function will used to create all the child node within that collection.
        Here it will create all the resource group node.

        Args:
            gid: Server Group ID
            sid: Server ID
        """

        sql = render_template("/".join([self.template_path, 'nodes.sql']),
                              rgid=rg_id)
        status, result = self.conn.execute_2darray(sql)
        if not status:
            return internal_server_error(errormsg=result)

        if len(result['rows']) == 0:
            return gone(gettext("""Could not find the resource group."""))

        res = self.blueprint.generate_browser_node(
                result['rows'][0]['oid'],
                sid,
                result['rows'][0]['name'],
                icon="icon-resource_group"
            )

        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition
    def nodes(self, gid, sid):
        """
        This function will used to create all the child node within that collection.
        Here it will create all the resource group node.

        Args:
            gid: Server Group ID
            sid: Server ID
        """
        res = []
        sql = render_template("/".join([self.template_path, 'nodes.sql']))
        status, result = self.conn.execute_2darray(sql)
        if not status:
            return internal_server_error(errormsg=result)

        for row in result['rows']:
            res.append(
                self.blueprint.generate_browser_node(
                    row['oid'],
                    sid,
                    row['name'],
                    icon="icon-resource_group"
                ))

        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition
    def properties(self, gid, sid, rg_id):
        """
        This function will show the properties of the selected resource group node.

        Args:
            gid: Server Group ID
            sid: Server ID
            rg_id: Resource Group ID
        """
        sql = render_template("/".join([self.template_path, 'properties.sql']), rgid=rg_id)
        status, res = self.conn.execute_dict(sql)

        if not status:
            return internal_server_error(errormsg=res)

        if len(res['rows']) == 0:
            return gone(gettext("""Could not find the resource group."""))

        return ajax_response(
            response=res['rows'][0],
            status=200
        )

    @check_precondition
    def create(self, gid, sid):
        """
        This function will create the new resource group object

        Args:
            gid: Server Group ID
            sid: Server ID
        """
        required_args = [
            'name'
        ]

        data = request.form if request.form else json.loads(
            request.data, encoding='utf-8'
        )
        for arg in required_args:
            if arg not in data:
                return make_json_response(
                    status=410,
                    success=0,
                    errormsg=gettext(
                        "Could not find the required parameter (%s)." % arg
                    )
                )
        try:
            # Below logic will create new resource group
            sql = render_template("/".join([self.template_path, 'create.sql']), rgname=data['name'], conn=self.conn)
            if sql and sql.strip('\n') and sql.strip(' '):
                status, res = self.conn.execute_scalar(sql)
                if not status:
                    return internal_server_error(errormsg=res)
            # Below logic will update the cpu_rate_limit and dirty_rate_limit for resource group
            # we need to add this logic because in resource group you can't run multiple commands in one transaction.
            sql = render_template("/".join([self.template_path, 'update.sql']), data=data, conn=self.conn)
            # Checking if we are not executing empty query
            if sql and sql.strip('\n') and sql.strip(' '):
                status, res = self.conn.execute_scalar(sql)
                if not status:
                    return internal_server_error(errormsg=res)
            # Below logic is used to fetch the oid of the newly created resource group
            sql = render_template("/".join([self.template_path, 'getoid.sql']), rgname=data['name'])
            # Checking if we are not executing empty query
            rg_id = 0
            if sql and sql.strip('\n') and sql.strip(' '):
                status, rg_id = self.conn.execute_scalar(sql)
                if not status:
                    return internal_server_error(errormsg=rg_id)

            return jsonify(
                node=self.blueprint.generate_browser_node(
                    rg_id,
                    sid,
                    data['name'],
                    icon="icon-resource_group"
                )
            )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def update(self, gid, sid, rg_id):
        """
        This function will update the data for the selected resource group node

        Args:
            gid: Server Group ID
            sid: Server ID
            rg_id: Resource Group ID
        """
        required_args = [
            'name', 'cpu_rate_limit', 'dirty_rate_limit'
        ]
        data = request.form if request.form else json.loads(
            request.data, encoding='utf-8'
        )

        try:
            sql = render_template("/".join([self.template_path, 'properties.sql']), rgid=rg_id)
            status, res = self.conn.execute_dict(sql)
            if not status:
                return internal_server_error(errormsg=res)
            old_data = res['rows'][0]
            for arg in required_args:
                if arg not in data:
                    data[arg] = old_data[arg]

            if data['name'] != old_data['name']:
                sql = render_template("/".join([self.template_path, 'update.sql']),
                                      oldname=old_data['name'], newname=data['name'], conn=self.conn)
                if sql and sql.strip('\n') and sql.strip(' '):
                    status, res = self.conn.execute_scalar(sql)
                    if not status:
                        return internal_server_error(errormsg=res)

            # Below logic will update the cpu_rate_limit and dirty_rate_limit for resource group
            # we need to add this logic because in resource group you can't run multiple commands
            # in one transaction.
            if (data['cpu_rate_limit'] != old_data['cpu_rate_limit']) \
                    or (data['dirty_rate_limit'] != old_data['dirty_rate_limit']):
                sql = render_template("/".join([self.template_path, 'update.sql']), data=data, conn=self.conn)
                if sql and sql.strip('\n') and sql.strip(' '):
                    status, res = self.conn.execute_scalar(sql)
                    if not status:
                        return internal_server_error(errormsg=res)

            return jsonify(
                node=self.blueprint.generate_browser_node(
                    rg_id,
                    sid,
                    data['name'],
                    icon="icon-%s" % self.node_type
                )
            )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def delete(self, gid, sid, rg_id):
        """
        This function will drop the resource group object

        Args:
            gid: Server Group ID
            sid: Server ID
            rg_id: Resource Group ID
        """
        try:
            # Get name for resource group from rg_id
            sql = render_template("/".join([self.template_path, 'delete.sql']), rgid=rg_id, conn=self.conn)
            status, rgname = self.conn.execute_scalar(sql)
            if not status:
                return internal_server_error(errormsg=rgname)

            if rgname is None:
                return make_json_response(
                    success=0,
                    errormsg=gettext(
                        'Error: Object not found.'
                    ),
                    info=gettext(
                        'The specified resource group could not be found.\n'
                    )
                )

            # drop resource group
            sql = render_template("/".join([self.template_path, 'delete.sql']), rgname=rgname, conn=self.conn)
            status, res = self.conn.execute_scalar(sql)
            if not status:
                return internal_server_error(errormsg=res)

            return make_json_response(
                success=1,
                info=gettext("Resource Group dropped"),
                data={
                    'id': rg_id,
                    'sid': sid,
                    'gid': gid,
                }
            )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def msql(self, gid, sid, rg_id=None):
        """
        This function is used to return modified SQL for the selected resource group node

        Args:
            gid: Server Group ID
            sid: Server ID
            rg_id: Resource Group ID
        """
        data = dict()
        for k, v in request.args.items():
            try:
                data[k] = json.loads(v, encoding='utf-8')
            except ValueError:
                data[k] = v

        sql, name = self.get_sql(data, rg_id)
        sql = sql.strip('\n').strip(' ')

        if sql == '':
            sql = "--modified SQL"
        return make_json_response(
            data=sql,
            status=200
        )

    def get_sql(self, data, rg_id=None):
        """
        This function will generate sql from model data

        Args:
            data: Contains the value of name, cpu_rate_limit, dirty_rate_limit
            rg_id: Resource Group Id
        """
        required_args = [
            'name', 'cpu_rate_limit', 'dirty_rate_limit'
        ]
        if rg_id is not None:
            sql = render_template("/".join([self.template_path, 'properties.sql']), rgid=rg_id)
            status, res = self.conn.execute_dict(sql)
            if not status:
                return internal_server_error(errormsg=res)
            old_data = res['rows'][0]
            for arg in required_args:
                if arg not in data:
                    data[arg] = old_data[arg]

            sql = ''
            name_changed = False
            if data['name'] != old_data['name']:
                name_changed = True
                sql = render_template("/".join([self.template_path, 'update.sql']),
                                      oldname=old_data['name'], newname=data['name'], conn=self.conn)
            if (data['cpu_rate_limit'] != old_data['cpu_rate_limit']) \
                    or data['dirty_rate_limit'] != old_data['dirty_rate_limit']:
                if name_changed:
                    sql += "\n-- Following query will be executed in a separate transaction\n"
                sql += render_template("/".join([self.template_path, 'update.sql']), data=data, conn=self.conn)
        else:
            sql = render_template("/".join([self.template_path, 'create.sql']), rgname=data['name'], conn=self.conn)
            if ('cpu_rate_limit' in data and data['cpu_rate_limit'] > 0) \
                    or ('dirty_rate_limit' in data and data['dirty_rate_limit'] > 0):
                sql += "\n-- Following query will be executed in a separate transaction\n"
                sql += render_template("/".join([self.template_path, 'update.sql']), data=data, conn=self.conn)

        return sql, data['name'] if 'name' in data else old_data['name']

    @check_precondition
    def sql(self, gid, sid, rg_id):
        """
        This function will generate sql for sql pane

        Args:
            gid: Server Group ID
            sid: Server ID
            rg_id: Resource Group ID
        """
        sql = render_template("/".join([self.template_path, 'properties.sql']), rgid=rg_id)
        status, res = self.conn.execute_dict(sql)
        if not status:
            return internal_server_error(errormsg=res)

        # Making copy of output for future use
        old_data = dict(res['rows'][0])

        sql = render_template("/".join([self.template_path, 'create.sql']), display_comments=True,
                              rgname=old_data['name'], conn=self.conn)
        sql += "\n"
        sql += render_template("/".join([self.template_path, 'update.sql']), data=old_data, conn=self.conn)

        return ajax_response(response=sql)


ResourceGroupView.register_node_view(blueprint)
