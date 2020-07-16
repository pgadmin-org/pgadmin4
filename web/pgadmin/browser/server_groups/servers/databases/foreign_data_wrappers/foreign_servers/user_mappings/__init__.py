##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Implements User Mapping Node"""

import simplejson as json
from functools import wraps

import pgadmin.browser.server_groups.servers as servers
from pgadmin.browser.server_groups.servers.utils import \
    validate_options, tokenize_options
from flask import render_template, make_response, request, jsonify
from flask_babelex import gettext
from pgadmin.browser.collection import CollectionNodeModule
from pgadmin.browser.utils import PGChildNodeView
from pgadmin.utils.ajax import make_json_response, internal_server_error, \
    make_response as ajax_response, gone
from pgadmin.utils.driver import get_driver
from config import PG_DEFAULT_DRIVER


class UserMappingModule(CollectionNodeModule):
    """
    class UserMappingModule(CollectionNodeModule)

        A module class for user mapping node derived
        from CollectionNodeModule.

    Methods:
    -------
    * __init__(*args, **kwargs)
      - Method is used to initialize the user mapping module and
        it's base module.

    * get_nodes(gid, sid, did, fid, fsid)
      - Method is used to generate the browser collection node.

    * node_inode()
      - Method is overridden from its base class to make the node
        as leaf node.

    * script_load(self)
      - Load the module script for user mapping, when any of the
        foreign server node is initialized.
    """

    _NODE_TYPE = 'user_mapping'
    _COLLECTION_LABEL = gettext("User Mappings")

    def __init__(self, *args, **kwargs):
        """
        Method is used to initialize the User mapping module and
        it's base module.

        Args:
            *args:
            **kwargs:
        """

        self.min_ver = None
        self.max_ver = None

        super(UserMappingModule, self).__init__(*args, **kwargs)

    def get_nodes(self, gid, sid, did, fid, fsid):
        """
        Method is used to generate the browser collection node

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            fid: foreign data wrapper ID
            fsid: Foreign server ID
        """

        yield self.generate_browser_collection_node(fsid)

    @property
    def node_inode(self):
        """
        node_inode

        Override this property to make the node as leaf node.
        """
        return False

    @property
    def script_load(self):
        """
        Load the module script for user mapping, when any of the
        foreign server node is initialized.

        Returns: node type of the server module.
        """

        return servers.ServerModule.node_type

    @property
    def module_use_template_javascript(self):
        """
        Returns whether Jinja2 template is used for generating the javascript
        module.
        """
        return False


blueprint = UserMappingModule(__name__)


class UserMappingView(PGChildNodeView):
    """
    class UserMappingView(PGChildNodeView)

        A view class for user mapping node derived from PGChildNodeView.
        This class is responsible for all the stuff related to view like
        updating user mapping node, showing properties,
        showing sql in sql pane.

    Methods:
    -------
    * __init__(**kwargs)
      - Method is used to initialize the UserMappingView and it's base view.

    * check_precondition()
      - This function will behave as a decorator which will checks
        database connection before running view, it will also attaches
        manager,conn & template_path properties to self

    * list(gid, sid, did, fid, fsid)
      - This function is used to list all the user mapping nodes
        within that collection.

    * nodes(gid, sid, did, fid, fsid)
      - This function will used to create all the child node
        within that collection.
        Here it will create all the user mapping node.

    * properties(gid, sid, did, fid, fsid, umid)
      - This function will show the properties of the selected
        user mapping node

    * update(gid, sid, did, fid, fsid, umid)
      - This function will update the data for the selected
        user mapping node

    * create(gid, sid, did, fid, fsid)
      - This function will create the new user mapping node

    * delete(gid, sid, did, fid, fsid, umid)
      - This function will delete the selected user mapping node

    * msql(gid, sid, did, fid, fsid, umid)
      - This function is used to return modified SQL for the
        selected user mapping node

    * get_sql(data, fid, fsid, umid)
      - This function will generate sql from model data

    * sql(gid, sid, did, fid, fsid, umid):
      - This function will generate sql to show it in sql pane for the
        selected user mapping node.

    * dependents(gid, sid, did, fid, fsid, umid):
      - This function get the dependents and return ajax response for the
        user mapping node.

    * dependencies(self, gid, sid, did, fid, fsid, umid):
      - This function get the dependencies and return ajax response for the
        user mapping node.
    """

    node_type = blueprint.node_type

    parent_ids = [
        {'type': 'int', 'id': 'gid'},
        {'type': 'int', 'id': 'sid'},
        {'type': 'int', 'id': 'did'},
        {'type': 'int', 'id': 'fid'},
        {'type': 'int', 'id': 'fsid'}
    ]
    ids = [
        {'type': 'int', 'id': 'umid'}
    ]

    operations = dict({
        'obj': [
            {'get': 'properties', 'delete': 'delete', 'put': 'update'},
            {'get': 'list', 'post': 'create', 'delete': 'delete'}
        ],
        'delete': [{'delete': 'delete'}, {'delete': 'delete'}],
        'nodes': [{'get': 'node'}, {'get': 'nodes'}],
        'children': [{'get': 'children'}],
        'sql': [{'get': 'sql'}],
        'msql': [{'get': 'msql'}, {'get': 'msql'}],
        'stats': [{'get': 'statistics'}],
        'dependency': [{'get': 'dependencies'}],
        'dependent': [{'get': 'dependents'}]
    })

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
            self.manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(
                kwargs['sid']
            )
            self.conn = self.manager.connection(did=kwargs['did'])
            self.datlastsysoid = \
                self.manager.db_info[kwargs['did']]['datlastsysoid'] \
                if self.manager.db_info is not None and \
                kwargs['did'] in self.manager.db_info else 0

            # Set the template path for the SQL scripts
            self.template_path = 'user_mappings/sql/#{0}#'.format(
                self.manager.version
            )

            return f(*args, **kwargs)

        return wrap

    @check_precondition
    def list(self, gid, sid, did, fid, fsid):
        """
        This function is used to list all the user mapping nodes
        within that collection.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            fid: Foreign data wrapper ID
            fsid: Foreign server ID
        """

        sql = render_template("/".join([self.template_path,
                                        self._PROPERTIES_SQL]),
                              fsid=fsid, conn=self.conn)
        status, res = self.conn.execute_dict(sql)

        if not status:
            return internal_server_error(errormsg=res)

        return ajax_response(
            response=res['rows'],
            status=200
        )

    @check_precondition
    def nodes(self, gid, sid, did, fid, fsid):
        """
        This function will used to create all the child
        node within that collection.
        Here it will create all the user mapping node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            fid: Foreign data wrapper ID
            fsid: Foreign server ID
        """

        res = []
        sql = render_template("/".join([self.template_path,
                                        self._PROPERTIES_SQL]),
                              fsid=fsid, conn=self.conn)
        status, r_set = self.conn.execute_2darray(sql)

        if not status:
            return internal_server_error(errormsg=r_set)

        for row in r_set['rows']:
            res.append(
                self.blueprint.generate_browser_node(
                    row['um_oid'],
                    fsid,
                    row['name'],
                    icon="icon-user_mapping"
                ))

        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition
    def node(self, gid, sid, did, fid, fsid, umid):
        """
        This function will fetch properties of user mapping node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            fid: Foreign data wrapper ID
            fsid: Foreign server ID
            umid: User mapping ID
        """
        sql = render_template("/".join([self.template_path,
                                        self._PROPERTIES_SQL]),
                              conn=self.conn, umid=umid)
        status, r_set = self.conn.execute_2darray(sql)

        if not status:
            return internal_server_error(errormsg=r_set)

        for row in r_set['rows']:
            return make_json_response(
                data=self.blueprint.generate_browser_node(
                    row['um_oid'],
                    fsid,
                    row['name'],
                    icon="icon-user_mapping"
                ),
                status=200
            )

        return gone(gettext("Could not find the specified user mapping."))

    @check_precondition
    def properties(self, gid, sid, did, fid, fsid, umid):
        """
        This function will show the properties of the
        selected user mapping node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            fid: Foreign data wrapper ID
            fsid: Foreign server ID
            umid: User mapping ID
        """

        sql = render_template("/".join([self.template_path,
                                        self._PROPERTIES_SQL]),
                              umid=umid, conn=self.conn)
        status, res = self.conn.execute_dict(sql)

        if not status:
            return internal_server_error(errormsg=res)

        if len(res['rows']) == 0:
            return gone(
                gettext("Could not find the user mapping information.")
            )

        res['rows'][0]['is_sys_obj'] = (
            res['rows'][0]['um_oid'] <= self.datlastsysoid)

        if res['rows'][0]['umoptions'] is not None:
            res['rows'][0]['umoptions'] = tokenize_options(
                res['rows'][0]['umoptions'],
                'umoption', 'umvalue'
            )
        return ajax_response(
            response=res['rows'][0],
            status=200
        )

    @check_precondition
    def create(self, gid, sid, did, fid, fsid):
        """
        This function will create the user mapping node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            fid: Foreign data wrapper ID
            fsid: Foreign server ID
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
                        "Could not find the required parameter ({})."
                    ).format(arg)
                )

        try:
            sql = render_template("/".join([self.template_path,
                                            self._PROPERTIES_SQL]),
                                  fserid=fsid, conn=self.conn)
            status, res1 = self.conn.execute_dict(sql)

            if not status:
                return internal_server_error(errormsg=res1)
            if len(res1['rows']) == 0:
                return gone(
                    gettext("The specified user mappings could not be found."))

            fdw_data = res1['rows'][0]

            is_valid_options = False
            if 'umoptions' in data:
                is_valid_options, data['umoptions'] = validate_options(
                    data['umoptions'], 'umoption', 'umvalue'
                )

            sql = render_template("/".join([self.template_path,
                                            self._CREATE_SQL]),
                                  data=data, fdwdata=fdw_data,
                                  is_valid_options=is_valid_options,
                                  conn=self.conn)
            status, res = self.conn.execute_scalar(sql)
            if not status:
                return internal_server_error(errormsg=res)

            sql = render_template("/".join([self.template_path,
                                            self._PROPERTIES_SQL]),
                                  fsid=fsid, data=data,
                                  conn=self.conn)
            status, r_set = self.conn.execute_dict(sql)
            if not status:
                return internal_server_error(errormsg=r_set)

            for row in r_set['rows']:
                return jsonify(
                    node=self.blueprint.generate_browser_node(
                        row['um_oid'],
                        fsid,
                        row['name'],
                        icon='icon-user_mapping'
                    )
                )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def update(self, gid, sid, did, fid, fsid, umid):
        """
        This function will update the data for the selected user mapping node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            fid: Foreign data wrapper ID
            fsid: Foreign server ID
            umid: User mapping ID
        """

        data = request.form if request.form else json.loads(
            request.data, encoding='utf-8'
        )
        try:
            sql, name = self.get_sql(data=data, fsid=fsid, umid=umid)
            # Most probably this is due to error
            if not isinstance(sql, str):
                return sql
            sql = sql.strip('\n').strip(' ')
            status, res = self.conn.execute_scalar(sql)
            if not status:
                return internal_server_error(errormsg=res)

            return jsonify(
                node=self.blueprint.generate_browser_node(
                    umid,
                    fsid,
                    name,
                    icon="icon-%s" % self.node_type
                )
            )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def delete(self, gid, sid, did, fid, fsid, umid=None):
        """
        This function will delete the selected user mapping node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            fid: foreign data wrapper ID
            fsid: foreign server ID
            umid: User mapping ID
        """
        if umid is None:
            data = request.form if request.form else json.loads(
                request.data, encoding='utf-8'
            )
        else:
            data = {'ids': [umid]}

        if self.cmd == 'delete':
            # This is a cascade operation
            cascade = True
        else:
            cascade = False

        try:
            for umid in data['ids']:
                # Get name of foreign server from fsid
                sql = render_template("/".join([self.template_path,
                                                self._DELETE_SQL]),
                                      fsid=fsid, conn=self.conn)
                status, name = self.conn.execute_scalar(sql)
                if not status:
                    return internal_server_error(errormsg=name)

                if name is None:
                    return make_json_response(
                        status=410,
                        success=0,
                        errormsg=gettext(
                            'Error: Object not found.'
                        ),
                        info=gettext(
                            'The specified foreign server '
                            'could not be found.\n'
                        )
                    )

                sql = render_template("/".join([self.template_path,
                                                self._PROPERTIES_SQL]),
                                      umid=umid, conn=self.conn)
                status, res = self.conn.execute_dict(sql)
                if not status:
                    return internal_server_error(errormsg=res)

                if not res['rows']:
                    return make_json_response(
                        status=410,
                        success=0,
                        errormsg=gettext(
                            'The specified user mapping could not be found.\n'
                        )
                    )

                data = res['rows'][0]

                # drop user mapping
                sql = render_template("/".join([self.template_path,
                                                self._DELETE_SQL]),
                                      data=data, name=name, cascade=cascade,
                                      conn=self.conn)
                status, res = self.conn.execute_scalar(sql)
                if not status:
                    return internal_server_error(errormsg=res)

            return make_json_response(
                success=1,
                info=gettext("User Mapping dropped")
            )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def msql(self, gid, sid, did, fid, fsid, umid=None):
        """
        This function is used to return modified SQL for the
        selected user mapping node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            fid: foreign data wrapper ID
            fsid: foreign server ID
            umid: User mapping ID
        """

        data = {}
        for k, v in request.args.items():
            try:
                data[k] = json.loads(v, encoding='utf-8')
            except ValueError:
                data[k] = v
        try:
            sql, name = self.get_sql(data=data, fsid=fsid, umid=umid)
            # Most probably this is due to error
            if not isinstance(sql, str):
                return sql
            if sql == '':
                sql = "--modified SQL"

            return make_json_response(
                data=sql,
                status=200)
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    def get_sql(self, **kwargs):
        """
        This function will generate sql from model data.

        Args:
            kwargs: Server Group ID
        """
        fsid = kwargs.get('fsid')
        data = kwargs.get('data')
        umid = kwargs.get('umid', None)

        required_args = [
            'name'
        ]

        if umid is not None:
            sql = render_template("/".join([self.template_path,
                                            self._PROPERTIES_SQL]),
                                  umid=umid, conn=self.conn)
            status, res = self.conn.execute_dict(sql)
            if not status:
                return internal_server_error(errormsg=res)
            if len(res['rows']) == 0:
                return gone(
                    gettext("Could not find the user mapping information.")
                )

            if res['rows'][0]['umoptions'] is not None:
                res['rows'][0]['umoptions'] = tokenize_options(
                    res['rows'][0]['umoptions'],
                    'umoption', 'umvalue'
                )
            old_data = res['rows'][0]

            sql = render_template("/".join([self.template_path,
                                            self._PROPERTIES_SQL]),
                                  fserid=fsid, conn=self.conn)
            status, res1 = self.conn.execute_dict(sql)
            if not status:
                return internal_server_error(errormsg=res1)

            fdw_data = res1['rows'][0]

            for arg in required_args:
                if arg not in data:
                    data[arg] = old_data[arg]

            # Allow user to set the blank value in fdwvalue
            # field in option model
            is_valid_added_options = is_valid_changed_options = False
            if 'umoptions' in data and 'added' in data['umoptions']:
                is_valid_added_options, data['umoptions']['added'] =\
                    validate_options(
                        data['umoptions']['added'],
                        'umoption',
                        'umvalue')
            if 'umoptions' in data and 'changed' in data['umoptions']:
                is_valid_changed_options, data['umoptions']['changed'] =\
                    validate_options(
                        data['umoptions']['changed'],
                        'umoption',
                        'umvalue')

            sql = render_template(
                "/".join([self.template_path, self._UPDATE_SQL]),
                data=data,
                o_data=old_data,
                is_valid_added_options=is_valid_added_options,
                is_valid_changed_options=is_valid_changed_options,
                fdwdata=fdw_data,
                conn=self.conn
            )
            return sql, data['name'] if 'name' in data else old_data['name']
        else:
            sql = render_template("/".join([self.template_path,
                                            self._PROPERTIES_SQL]),
                                  fserid=fsid, conn=self.conn)
            status, res = self.conn.execute_dict(sql)
            if not status:
                return internal_server_error(errormsg=res)
            fdw_data = res['rows'][0]

            is_valid_options = False
            if 'umoptions' in data:
                is_valid_options, data['umoptions'] = validate_options(
                    data['umoptions'], 'umoption', 'umvalue'
                )

            sql = render_template("/".join([self.template_path,
                                            self._CREATE_SQL]),
                                  data=data, fdwdata=fdw_data,
                                  is_valid_options=is_valid_options,
                                  conn=self.conn)
            sql += "\n"
        return sql, data['name']

    @check_precondition
    def sql(self, gid, sid, did, fid, fsid, umid):
        """
        This function will generate sql to show it in sql pane for
        the selected user mapping node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            fid: Foreign data wrapper ID
            fsid: Foreign server ID
            umid: User mapping ID
        """

        sql = render_template("/".join([self.template_path,
                                        self._PROPERTIES_SQL]),
                              umid=umid, conn=self.conn)
        status, res = self.conn.execute_dict(sql)
        if not status:
            return internal_server_error(errormsg=res)
        if len(res['rows']) == 0:
            return gone(
                gettext("Could not find the user mapping information.")
            )

        is_valid_options = False
        if res['rows'][0]['umoptions'] is not None:
            res['rows'][0]['umoptions'] = tokenize_options(
                res['rows'][0]['umoptions'],
                'umoption', 'umvalue'
            )
            if len(res['rows'][0]['umoptions']) > 0:
                is_valid_options = True

        sql = render_template("/".join([self.template_path,
                                        self._PROPERTIES_SQL]),
                              fserid=fsid, conn=self.conn
                              )
        status, res1 = self.conn.execute_dict(sql)
        if not status:
            return internal_server_error(errormsg=res1)

        fdw_data = res1['rows'][0]

        sql = ''
        sql = render_template("/".join([self.template_path,
                                        self._CREATE_SQL]),
                              data=res['rows'][0], fdwdata=fdw_data,
                              is_valid_options=is_valid_options,
                              conn=self.conn)
        sql += "\n"

        sql_header = u"""-- User Mapping : {0}

-- DROP USER MAPPING FOR {0} SERVER {1}

""".format(res['rows'][0]['name'], fdw_data['name'])

        sql = sql_header + sql

        return ajax_response(response=sql.strip('\n'))

    @check_precondition
    def dependents(self, gid, sid, did, fid, fsid, umid):
        """
        This function get the dependents and return ajax response
        for the user mapping node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            fid: foreign data wrapper ID
            fsid: Foreign server ID
            umid: user mapping ID
        """

        dependents_result = self.get_dependents(self.conn, umid)
        return ajax_response(
            response=dependents_result,
            status=200
        )

    @check_precondition
    def dependencies(self, gid, sid, did, fid, fsid, umid):
        """
        This function get the dependencies and return ajax response
        for the user mapping node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            fid: Foreign Data Wrapper ID
            fsid: Foreign server ID
            umid: user mapping ID
        """
        dependencies_result = self.get_dependencies(self.conn, umid)
        return ajax_response(
            response=dependencies_result,
            status=200
        )


UserMappingView.register_node_view(blueprint)
