##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Implements Resource Groups for PPAS 9.4 and above"""

import simplejson as json
from functools import wraps

import pgadmin.browser.server_groups.servers as servers
from flask import render_template, make_response, request, jsonify
from flask_babelex import gettext
from pgadmin.browser.collection import CollectionNodeModule
from pgadmin.browser.utils import NodeView
from pgadmin.utils.ajax import make_json_response, \
    make_response as ajax_response, internal_server_error, gone
from pgadmin.utils.ajax import precondition_required
from pgadmin.utils.driver import get_driver
from config import PG_DEFAULT_DRIVER


class ResourceGroupModule(CollectionNodeModule):
    """
     class ResourceGroupModule(CollectionNodeModule)

        A module class for Resource Group node derived from
        CollectionNodeModule.

    Methods:
    -------
    * __init__(*args, **kwargs)
      - Method is used to initialize the ResourceGroupModule and it's
      base module.

    * backend_supported(manager, **kwargs)
      - This function is used to check the database server type and version.
        Resource Group only supported in PPAS 9.4 and above.

    * get_nodes(gid, sid, did)
      - Method is used to generate the browser collection node.

    * node_inode()
      - Method is overridden from its base class to make the node as leaf node.

    * script_load()
      - Load the module script for resource group, when any of the server
      node is initialized.
    """

    _NODE_TYPE = 'resource_group'
    _COLLECTION_LABEL = gettext("Resource Groups")

    def __init__(self, *args, **kwargs):
        """
        Method is used to initialize the ResourceGroupModule and
        it's base module.

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
        Load the module script for resource group, when any of the server
        node is initialized.

        Returns: node type of the server module.
        """
        return servers.ServerModule.NODE_TYPE

    @property
    def module_use_template_javascript(self):
        """
        Returns whether Jinja2 template is used for generating the javascript
        module.
        """
        return False


blueprint = ResourceGroupModule(__name__)


class ResourceGroupView(NodeView):
    """
    class ResourceGroupView(NodeView)

        A view class for resource group node derived from NodeView.
        This class is responsible for all the stuff related to view like
        create/update/delete resource group, showing properties of resource
        group node, showing sql in sql pane.

    Methods:
    -------
    * __init__(**kwargs)
      - Method is used to initialize the ResourceGroupView and it's base view.

    * check_precondition()
      - This function will behave as a decorator which will checks
        database connection before running view, it will also attaches
        manager,conn & template_path properties to self

    * list()
      - This function is used to list all the resource group nodes within
      that collection.

    * nodes()
      - This function will used to create all the child node within that
      collection. Here it will create all the resource group node.

    * properties(gid, sid, did, rg_id)
      - This function will show the properties of the selected resource
      group node

    * create(gid, sid, did, rg_id)
      - This function will create the new resource group object

    * update(gid, sid, did, rg_id)
      - This function will update the data for the selected resource group node

    * delete(self, gid, sid, rg_id):
      - This function will drop the resource group object

    * msql(gid, sid, did, rg_id)
      - This function is used to return modified SQL for the selected
      resource group node

    * get_sql(data, rg_id)
      - This function will generate sql from model data

    * sql(gid, sid, did, rg_id):
      - This function will generate sql to show it in sql pane for the
      selected resource group node.
    """

    node_type = blueprint.node_type
    _PROPERTIES_SQL = 'properties.sql'
    _CREATE_SQL = 'create.sql'
    _UPDATE_SQL = 'update.sql'

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
            {'get': 'list', 'post': 'create', 'delete': 'delete'}
        ],
        'nodes': [{'get': 'node'}, {'get': 'nodes'}],
        'sql': [{'get': 'sql'}],
        'msql': [{'get': 'msql'}, {'get': 'msql'}],
        'stats': [{'get': 'statistics'}],
        'dependency': [{'get': 'dependencies'}],
        'dependent': [{'get': 'dependents'}]
    })

    def __init__(self, **kwargs):
        """
        Method is used to initialize the ResourceGroupView and it's base view.
        Also initialize all the variables create/used dynamically like conn,
        template_path.

        Args:
            **kwargs:
        """
        self.conn = None
        self.template_path = None

        super(ResourceGroupView, self).__init__(**kwargs)

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

            self.datlastsysoid = \
                self.manager.db_info[self.manager.did]['datlastsysoid'] \
                if self.manager.db_info is not None and \
                self.manager.did in self.manager.db_info else 0

            self.datistemplate = False
            if (
                self.manager.db_info is not None and
                self.manager.did in self.manager.db_info and
                'datistemplate' in self.manager.db_info[self.manager.did]
            ):
                self.datistemplate = self.manager.db_info[
                    self.manager.did]['datistemplate']

            if not self.conn.connected():
                return precondition_required(
                    gettext(
                        "Connection to the server has been lost."
                    )
                )
            self.sql_path = 'resource_groups/sql/#{0}#'.format(
                self.manager.version
            )
            return f(*args, **kwargs)

        return wrap

    @check_precondition
    def list(self, gid, sid):
        """
        This function is used to list all the resource group nodes within
        that collection.

        Args:
            gid: Server Group ID
            sid: Server ID
        """
        sql = render_template("/".join([self.sql_path, self._PROPERTIES_SQL]))
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
        This function will used to create all the child node within that
        collection. Here it will create all the resource group node.

        Args:
            gid: Server Group ID
            sid: Server ID
        """

        sql = render_template("/".join([self.sql_path, 'nodes.sql']),
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
        This function will used to create all the child node within that
        collection. Here it will create all the resource group node.

        Args:
            gid: Server Group ID
            sid: Server ID
        """
        res = []
        sql = render_template("/".join([self.sql_path, 'nodes.sql']))
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
        This function will show the properties of the selected resource
        group node.

        Args:
            gid: Server Group ID
            sid: Server ID
            rg_id: Resource Group ID
        """
        sql = render_template(
            "/".join([self.sql_path, self._PROPERTIES_SQL]), rgid=rg_id)
        status, res = self.conn.execute_dict(sql)

        if not status:
            return internal_server_error(errormsg=res)

        if len(res['rows']) == 0:
            return gone(gettext("""Could not find the resource group."""))

        res['rows'][0]['is_sys_obj'] = (
            res['rows'][0]['oid'] <= self.datlastsysoid or self.datistemplate)

        return ajax_response(
            response=res['rows'][0],
            status=200
        )

    @staticmethod
    def _check_req_parameters(data, required_args):
        """
        This function is used to check the request parameter.
        :param data:
        :param required_args:
        :return:
        """
        for arg in required_args:
            if arg not in data:
                return True, make_json_response(
                    status=410,
                    success=0,
                    errormsg=gettext(
                        "Could not find the required parameter ({})."
                    ).format(arg)
                )
        return False, ''

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

        is_error, errmsg = ResourceGroupView._check_req_parameters(
            data, required_args)

        if is_error:
            return errmsg

        try:
            # Below logic will create new resource group
            sql = render_template(
                "/".join([self.sql_path, self._CREATE_SQL]),
                rgname=data['name'], conn=self.conn
            )
            if sql and sql.strip('\n') and sql.strip(' '):
                status, res = self.conn.execute_scalar(sql)
                if not status:
                    return internal_server_error(errormsg=res)
            # Below logic will update the cpu_rate_limit and dirty_rate_limit
            # for resource group, we need to add this logic because in
            # resource group you can't run multiple commands in one
            # transaction.
            sql = render_template(
                "/".join([self.sql_path, self._UPDATE_SQL]),
                data=data, conn=self.conn
            )
            # Checking if we are not executing empty query
            if sql and sql.strip('\n') and sql.strip(' '):
                status, res = self.conn.execute_scalar(sql)
                if not status:
                    return internal_server_error(errormsg=res)
            # Below logic is used to fetch the oid of the newly created
            # resource group
            sql = render_template(
                "/".join([self.sql_path, 'getoid.sql']),
                rgname=data['name']
            )
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

    def _check_cpu_and_dirty_rate_limit(self, data, old_data):
        """
        Below logic will update the cpu_rate_limit and dirty_rate_limit
        for resource group we need to add this logic because in
        resource group you can't run multiple commands in one
        transaction.
        :param data:
        :param old_data:
        :return:
        """

        # Below logic will update the cpu_rate_limit and dirty_rate_limit
        # for resource group we need to add this logic because in
        # resource group you can't run multiple commands in one
        # transaction.
        if data['cpu_rate_limit'] != old_data['cpu_rate_limit'] or \
                data['dirty_rate_limit'] != old_data['dirty_rate_limit']:
            sql = render_template(
                "/".join([self.sql_path, self._UPDATE_SQL]),
                data=data, conn=self.conn
            )
            if sql and sql.strip('\n') and sql.strip(' '):
                status, res = self.conn.execute_scalar(sql)
                if not status:
                    return internal_server_error(errormsg=res)

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
            sql = render_template(
                "/".join([self.sql_path, self._PROPERTIES_SQL]), rgid=rg_id)
            status, res = self.conn.execute_dict(sql)
            if not status:
                return internal_server_error(errormsg=res)
            old_data = res['rows'][0]
            for arg in required_args:
                if arg not in data:
                    data[arg] = old_data[arg]

            if data['name'] != old_data['name']:
                sql = render_template(
                    "/".join([self.sql_path, self._UPDATE_SQL]),
                    oldname=old_data['name'], newname=data['name'],
                    conn=self.conn
                )
                if sql and sql.strip('\n') and sql.strip(' '):
                    status, res = self.conn.execute_scalar(sql)
                    if not status:
                        return internal_server_error(errormsg=res)

            # Below logic will update the cpu_rate_limit and dirty_rate_limit
            # for resource group we need to add this logic because in
            # resource group you can't run multiple commands in one
            # transaction.
            self._check_cpu_and_dirty_rate_limit(data, old_data)

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
    def delete(self, gid, sid, rg_id=None):
        """
        This function will drop the resource group object

        Args:
            gid: Server Group ID
            sid: Server ID
            rg_id: Resource Group ID
        """
        if rg_id is None:
            data = request.form if request.form else json.loads(
                request.data, encoding='utf-8'
            )
        else:
            data = {'ids': [rg_id]}

        try:
            for rg_id in data['ids']:
                # Get name for resource group from rg_id
                sql = render_template(
                    "/".join([self.sql_path, 'delete.sql']),
                    rgid=rg_id, conn=self.conn
                )
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
                            'The specified resource group '
                            'could not be found.\n'
                        )
                    )

                # drop resource group
                sql = render_template(
                    "/".join([self.sql_path, 'delete.sql']),
                    rgname=rgname, conn=self.conn
                )
                status, res = self.conn.execute_scalar(sql)
                if not status:
                    return internal_server_error(errormsg=res)

            return make_json_response(
                success=1,
                info=gettext("Resource Group dropped")
            )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def msql(self, gid, sid, rg_id=None):
        """
        This function is used to return modified SQL for the selected
        resource group node

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
        # Most probably this is due to error
        if not isinstance(sql, str):
            return sql

        sql = sql.strip('\n').strip(' ')

        if sql == '':
            sql = "--modified SQL"
        return make_json_response(
            data=sql,
            status=200
        )

    def _get_update_sql(self, rg_id, data, required_args):
        """
        This function is used to get the sql for resource group
        :param rg_id:
        :param data:
        :param required_args:
        :return:
        """
        sql = render_template(
            "/".join([self.sql_path, self._PROPERTIES_SQL]), rgid=rg_id)
        status, res = self.conn.execute_dict(sql)
        if not status:
            return internal_server_error(errormsg=res)

        if len(res['rows']) == 0:
            return gone(
                gettext("The specified resource group could not be found.")
            )
        old_data = res['rows'][0]
        for arg in required_args:
            if arg not in data:
                data[arg] = old_data[arg]

        sql = ''
        name_changed = False
        if data['name'] != old_data['name']:
            name_changed = True
            sql = render_template(
                "/".join([self.sql_path, self._UPDATE_SQL]),
                oldname=old_data['name'], newname=data['name'],
                conn=self.conn
            )
        if data['cpu_rate_limit'] != old_data['cpu_rate_limit'] or \
                data['dirty_rate_limit'] != old_data['dirty_rate_limit']:
            if name_changed:
                sql += "\n-- Following query will be executed in a " \
                       "separate transaction\n"
            sql += render_template(
                "/".join([self.sql_path, self._UPDATE_SQL]),
                data=data, conn=self.conn
            )

        return sql, old_data['name']

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

        old_name = ''
        if rg_id is not None:
            # Get sql for Resource group by ID.
            sql, old_name = self._get_update_sql(rg_id, data, required_args)
        else:
            sql = render_template(
                "/".join([self.sql_path, self._CREATE_SQL]),
                rgname=data['name'], conn=self.conn
            )

            cpu_rate_limit_flag = False
            dirty_rate_limit_flag = False
            if 'cpu_rate_limit' in data and data['cpu_rate_limit'] >= 0:
                cpu_rate_limit_flag = True

            if 'dirty_rate_limit' in data and data['dirty_rate_limit'] >= 0:
                dirty_rate_limit_flag = True

            if cpu_rate_limit_flag or dirty_rate_limit_flag:
                sql += "\n-- Following query will be executed in a " \
                       "separate transaction\n"
                sql += render_template(
                    "/".join([self.sql_path, self._UPDATE_SQL]),
                    data=data, conn=self.conn
                )

        return sql, data['name'] if 'name' in data else old_name

    @check_precondition
    def sql(self, gid, sid, rg_id):
        """
        This function will generate sql for sql pane

        Args:
            gid: Server Group ID
            sid: Server ID
            rg_id: Resource Group ID
        """
        sql = render_template(
            "/".join([self.sql_path, self._PROPERTIES_SQL]), rgid=rg_id
        )
        status, res = self.conn.execute_dict(sql)
        if not status:
            return internal_server_error(errormsg=res)
        if len(res['rows']) == 0:
            return gone(
                gettext("The specified resource group could not be found.")
            )

        # Making copy of output for future use
        old_data = dict(res['rows'][0])

        sql = render_template(
            "/".join([self.sql_path, self._CREATE_SQL]),
            display_comments=True,
            rgname=old_data['name'], conn=self.conn
        )
        sql += "\n"
        sql += render_template(
            "/".join([self.sql_path, self._UPDATE_SQL]),
            data=old_data, conn=self.conn
        )

        return ajax_response(response=sql)


ResourceGroupView.register_node_view(blueprint)
