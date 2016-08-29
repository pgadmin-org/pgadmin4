##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Implements Foreign Server Node"""

import simplejson as json
from functools import wraps

import pgadmin.browser.server_groups.servers.databases as databases
from flask import render_template, make_response, request, jsonify
from flask_babel import gettext
from pgadmin.browser.collection import CollectionNodeModule
from pgadmin.browser.server_groups.servers.utils import parse_priv_from_db, \
    parse_priv_to_db
from pgadmin.browser.utils import PGChildNodeView
from pgadmin.utils.ajax import make_json_response, internal_server_error, \
    make_response as ajax_response
from pgadmin.utils.driver import get_driver
from pgadmin.utils.ajax import gone

from config import PG_DEFAULT_DRIVER


class ForeignServerModule(CollectionNodeModule):
    """
    class ForeignServerModule(CollectionNodeModule)

        A module class for foreign server node derived from CollectionNodeModule.

    Methods:
    -------
    * __init__(*args, **kwargs)
      - Method is used to initialize the Foreign server module and it's base module.

    * get_nodes(gid, sid, did)
      - Method is used to generate the browser collection node.

    * script_load(self)
      - Load the module script for foreign server, when any of the database node is
        initialized.
    """

    NODE_TYPE = 'foreign_server'
    COLLECTION_LABEL = gettext("Foreign Servers")

    def __init__(self, *args, **kwargs):
        """
        Method is used to initialize the Foreign server module and it's base module.

        Args:
            *args:
            **kwargs:
        """

        self.min_ver = None
        self.max_ver = None

        super(ForeignServerModule, self).__init__(*args, **kwargs)

    def get_nodes(self, gid, sid, did, fid):
        """
        Method is used to generate the browser collection node

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            fid: foreign data wrapper ID
        """
        yield self.generate_browser_collection_node(fid)

    @property
    def script_load(self):
        """
        Load the module script for foreign server, when any of the foreign data wrapper node is initialized.

        Returns: node type of the server module.
        """
        return databases.DatabaseModule.NODE_TYPE


blueprint = ForeignServerModule(__name__)


class ForeignServerView(PGChildNodeView):
    """
    class ForeignServerView(PGChildNodeView)

        A view class for foreign server node derived from PGChildNodeView. This class is
        responsible for all the stuff related to view like updating foreign server
        node, showing properties, showing sql in sql pane.

    Methods:
    -------
    * __init__(**kwargs)
      - Method is used to initialize the ForeignServerView and it's base view.

    * module_js()
      - This property defines (if javascript) exists for this node.
        Override this property for your own logic

    * check_precondition()
      - This function will behave as a decorator which will checks
        database connection before running view, it will also attaches
        manager,conn & template_path properties to self

    * list(gid, sid, did, fid)
      - This function is used to list all the foreign server nodes within that collection.

    * nodes(gid, sid, did, fid)
      - This function will used to create all the child node within that collection.
        Here it will create all the foreign server node.

    * properties(gid, sid, did, fid, fsid)
      - This function will show the properties of the selected foreign server node

    * tokenizeOptions(option_value)
      - This function will tokenize the string stored in database

    * update(gid, sid, did, fid, fsid)
      - This function will update the data for the selected foreign server node

    * create(gid, sid, did, fid)
      - This function will create the new foreign server node

    * delete(gid, sid, did, fid, fsid)
      - This function will delete the selected foreign server node

    * msql(gid, sid, did, fid, fsid)
      - This function is used to return modified SQL for the selected foreign server node

    * get_sql(data, fid, fsid)
      - This function will generate sql from model data

    * sql(gid, sid, did, fid, fsid):
      - This function will generate sql to show it in sql pane for the selected foreign server node.

    * dependents(gid, sid, did, fid, fsid):
      - This function get the dependents and return ajax response for the foreign server node.

    * dependencies(self, gid, sid, did, fid, fsid):
      - This function get the dependencies and return ajax response for the foreign server node.
    """

    node_type = blueprint.node_type

    parent_ids = [
        {'type': 'int', 'id': 'gid'},
        {'type': 'int', 'id': 'sid'},
        {'type': 'int', 'id': 'did'},
        {'type': 'int', 'id': 'fid'}
    ]
    ids = [
        {'type': 'int', 'id': 'fsid'}
    ]

    operations = dict({
        'obj': [
            {'get': 'properties', 'delete': 'delete', 'put': 'update'},
            {'get': 'list', 'post': 'create'}
        ],
        'delete': [{
            'delete': 'delete'
        }],
        'nodes': [{'get': 'node'}, {'get': 'nodes'}],
        'children': [{'get': 'children'}],
        'sql': [{'get': 'sql'}],
        'msql': [{'get': 'msql'}, {'get': 'msql'}],
        'stats': [{'get': 'statistics'}],
        'dependency': [{'get': 'dependencies'}],
        'dependent': [{'get': 'dependents'}],
        'module.js': [{}, {}, {'get': 'module_js'}]
    })

    def module_js(self):
        """
        This property defines (if javascript) exists for this node.
        Override this property for your own logic.
        """
        return make_response(
            render_template(
                "foreign_servers/js/foreign_servers.js",
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
            self.manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(kwargs['sid'])
            self.conn = self.manager.connection(did=kwargs['did'])
            # Set the template path for the SQL scripts
            if self.manager.version >= 90300:
                self.template_path = 'foreign_servers/sql/9.3_plus'
            else:
                self.template_path = 'foreign_servers/sql/9.1_plus'

            return f(*args, **kwargs)

        return wrap

    @check_precondition
    def list(self, gid, sid, did, fid):
        """
        This function is used to list all the foreign server nodes within that collection.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            fid: Foreign data wrapper ID
        """

        sql = render_template("/".join([self.template_path, 'properties.sql']), fid=fid, conn=self.conn)
        status, res = self.conn.execute_dict(sql)

        if not status:
            return internal_server_error(errormsg=res)

        return ajax_response(
            response=res['rows'],
            status=200
        )

    @check_precondition
    def nodes(self, gid, sid, did, fid):
        """
        This function will used to create all the child node within that collection.
        Here it will create all the foreign server node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            fid: Foreign data wrapper ID
        """

        res = []
        sql = render_template("/".join([self.template_path, 'properties.sql']), fid=fid, conn=self.conn)
        status, r_set = self.conn.execute_2darray(sql)

        if not status:
            return internal_server_error(errormsg=r_set)

        for row in r_set['rows']:
            res.append(
                self.blueprint.generate_browser_node(
                    row['fsrvid'],
                    fid,
                    row['name'],
                    icon="icon-foreign_server"
                ))

        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition
    def node(self, gid, sid, did, fid, fsid):
        """
        This function will fetch properites foreign server node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            fid: Foreign data wrapper ID
            fsid: Foreign server ID
        """

        res = []
        sql = render_template("/".join([self.template_path, 'properties.sql']),
                              fsid=fsid, conn=self.conn)
        status, r_set = self.conn.execute_2darray(sql)

        if not status:
            return internal_server_error(errormsg=r_set)

        for row in r_set['rows']:

            return make_json_response(
                data=self.blueprint.generate_browser_node(
                    row['fsrvid'],
                    fid,
                    row['name'],
                    icon="icon-foreign_server"
                ),
                status=200
            )

        return gone(gettext("Could not find the specified foreign server."))

    def tokenizeOptions(self, option_value):
        """
        This function will tokenize the string stored in database
        e.g. database store the value as below
        key1=value1, key2=value2, key3=value3, ....
        This function will extract key and value from above string

        Args:
            option_value: key value option/value pair read from database
        """

        if option_value is not None:
            option_str = option_value.split(',')
            fs_rv_options = []
            for fs_rv_option in option_str:
                k, v = fs_rv_option.split('=', 1)
                fs_rv_options.append({'fsrvoption': k, 'fsrvvalue': v})
            return fs_rv_options

    @check_precondition
    def properties(self, gid, sid, did, fid, fsid):
        """
        This function will show the properties of the selected foreign server node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            fid: foreign data wrapper ID
            fsid: foreign server ID
        """

        sql = render_template("/".join([self.template_path, 'properties.sql']), fsid=fsid, conn=self.conn)
        status, res = self.conn.execute_dict(sql)

        if not status:
            return internal_server_error(errormsg=res)

        if len(res['rows']) == 0:
            return gone(
                gettext("Couldnot find the foreign server information.")
            )

        if res['rows'][0]['fsrvoptions'] is not None:
            res['rows'][0]['fsrvoptions'] = self.tokenizeOptions(res['rows'][0]['fsrvoptions'])

        sql = render_template("/".join([self.template_path, 'acl.sql']), fsid=fsid)
        status, fs_rv_acl_res = self.conn.execute_dict(sql)

        if not status:
            return internal_server_error(errormsg=fs_rv_acl_res)

        for row in fs_rv_acl_res['rows']:
            privilege = parse_priv_from_db(row)
            if row['deftype'] in res['rows'][0]:
                res['rows'][0][row['deftype']].append(privilege)
            else:
                res['rows'][0][row['deftype']] = [privilege]

        return ajax_response(
            response=res['rows'][0],
            status=200
        )

    @check_precondition
    def create(self, gid, sid, did, fid):
        """
        This function will create the foreign server node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            fid: foreign data wrapper ID
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
            if 'fsrvacl' in data:
                data['fsrvacl'] = parse_priv_to_db(data['fsrvacl'], ['U'])

            sql = render_template("/".join([self.template_path, 'properties.sql']), fdwid=fid, conn=self.conn)
            status, res1 = self.conn.execute_dict(sql)
            if not status:
                return internal_server_error(errormsg=res1)

            fdw_data = res1['rows'][0]

            new_list = []

            if 'fsrvoptions' in data:
                for item in data['fsrvoptions']:
                    new_dict = {}
                    if item['fsrvoption']:
                        if 'fsrvvalue' in item and item['fsrvvalue'] and item['fsrvvalue'] != '':
                            new_dict.update(item);
                        else:
                            new_dict.update({'fsrvoption': item['fsrvoption'], 'fsrvvalue': ''})

                    new_list.append(new_dict)

                data['fsrvoptions'] = new_list

            sql = render_template("/".join([self.template_path, 'create.sql']), data=data, fdwdata=fdw_data,
                                  conn=self.conn)
            status, res = self.conn.execute_scalar(sql)
            if not status:
                return internal_server_error(errormsg=res)

            sql = render_template("/".join([self.template_path, 'properties.sql']), data=data, fdwdata=fdw_data,
                                  conn=self.conn)
            status, r_set = self.conn.execute_dict(sql)
            if not status:
                return internal_server_error(errormsg=r_set)

            return jsonify(
                node=self.blueprint.generate_browser_node(
                    r_set['rows'][0]['fsrvid'],
                    fid,
                    r_set['rows'][0]['name'],
                    icon="icon-foreign_server"
                )
            )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def update(self, gid, sid, did, fid, fsid):
        """
        This function will update the data for the selected foreign server node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            fid: foreign data wrapper ID
            fsid: foreign server ID
        """

        data = request.form if request.form else json.loads(
            request.data, encoding='utf-8'
        )

        try:
            sql, name = self.get_sql(gid, sid, data, did, fid, fsid)
            sql = sql.strip('\n').strip(' ')
            status, res = self.conn.execute_scalar(sql)
            if not status:
                return internal_server_error(errormsg=res)

            return jsonify(
                node=self.blueprint.generate_browser_node(
                    fsid,
                    fid,
                    name,
                    icon="icon-%s" % self.node_type
                )
            )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def delete(self, gid, sid, did, fid, fsid):
        """
        This function will delete the selected foreign server node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            fid: foreign data wrapper ID
            fsid: foreign server ID
        """

        if self.cmd == 'delete':
            # This is a cascade operation
            cascade = True
        else:
            cascade = False

        try:
            # Get name of foreign data wrapper from fid
            sql = render_template("/".join([self.template_path, 'delete.sql']), fsid=fsid, conn=self.conn)
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
                        'The specified foreign server could not be found.\n'
                    )
                )

            # drop foreign server
            sql = render_template("/".join([self.template_path, 'delete.sql']), name=name, cascade=cascade,
                                  conn=self.conn)
            status, res = self.conn.execute_scalar(sql)
            if not status:
                return internal_server_error(errormsg=res)

            return make_json_response(
                success=1,
                info=gettext("Foreign Server dropped"),
                data={
                    'id': fsid,
                    'fid': fid,
                    'did': did,
                    'sid': sid,
                    'gid': gid,
                }
            )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def msql(self, gid, sid, did, fid, fsid=None):
        """
        This function is used to return modified SQL for the selected foreign server node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            fid: foreign data wrapper ID
            fsid: foreign server ID
        """

        data = {}
        for k, v in request.args.items():
            try:
                data[k] = json.loads(v, encoding='utf-8')
            except ValueError:
                data[k] = v
        try:
            sql, name = self.get_sql(gid, sid, data, did, fid, fsid)
            if sql == '':
                    sql = "--modified SQL"

            return make_json_response(
                data=sql,
                status=200
                )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    def get_sql(self, gid, sid, data, did, fid, fsid=None):
        """
        This function will generate sql from model data.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            data: Contains the data of the selected foreign server node
            fid: foreign data wrapper ID
            fsid: foreign server ID
        """

        required_args = [
            'name'
        ]

        if fsid is not None:
            sql = render_template("/".join([self.template_path, 'properties.sql']), fsid=fsid, conn=self.conn)
            status, res = self.conn.execute_dict(sql)
            if not status:
                return internal_server_error(errormsg=res)

            if res['rows'][0]['fsrvoptions'] is not None:
                res['rows'][0]['fsrvoptions'] = self.tokenizeOptions(res['rows'][0]['fsrvoptions'])

            for key in ['fsrvacl']:
                if key in data and data[key] is not None:
                    if 'added' in data[key]:
                        data[key]['added'] = parse_priv_to_db(data[key]['added'], ['U'])
                    if 'changed' in data[key]:
                        data[key]['changed'] = parse_priv_to_db(data[key]['changed'], ['U'])
                    if 'deleted' in data[key]:
                        data[key]['deleted'] = parse_priv_to_db(data[key]['deleted'], ['U'])

            old_data = res['rows'][0]
            for arg in required_args:
                if arg not in data:
                    data[arg] = old_data[arg]

            new_list_add = []
            new_list_change = []

            # Allow user to set the blank value in fsrvvalue field in option model
            if 'fsrvoptions' in data and 'added' in data['fsrvoptions']:
                for item in data['fsrvoptions']['added']:
                    new_dict_add = {}
                    if item['fsrvoption']:
                        if 'fsrvvalue' in item and item['fsrvvalue'] and item['fsrvvalue'] != '':
                            new_dict_add.update(item);
                        else:
                            new_dict_add.update({'fsrvoption': item['fsrvoption'], 'fsrvvalue': ''})

                    new_list_add.append(new_dict_add)

                data['fsrvoptions']['added'] = new_list_add

            # Allow user to set the blank value in fsrvvalue field in option model
            if 'fsrvoptions' in data and 'changed' in data['fsrvoptions']:
                for item in data['fsrvoptions']['changed']:
                    new_dict_change = {}
                    if item['fsrvoption']:
                        if 'fsrvvalue' in item and item['fsrvvalue'] and item['fsrvvalue'] != '':
                            new_dict_change.update(item);
                        else:
                            new_dict_change.update({'fsrvoption': item['fsrvoption'], 'fsrvvalue': ''})

                    new_list_change.append(new_dict_change)

                data['fsrvoptions']['changed'] = new_list_change

            sql = render_template("/".join([self.template_path, 'update.sql']), data=data, o_data=old_data,
                                  conn=self.conn)
            return sql, data['name'] if 'name' in data else old_data['name']
        else:
            sql = render_template("/".join([self.template_path, 'properties.sql']), fdwid=fid, conn=self.conn)
            status, res = self.conn.execute_dict(sql)
            if not status:
                return internal_server_error(errormsg=res)

            fdw_data = res['rows'][0]

            for key in ['fsrvacl']:
                if key in data and data[key] is not None:
                    data[key] = parse_priv_to_db(data[key], ['U'])

            new_list = []

            if 'fsrvoptions' in data:
                for item in data['fsrvoptions']:
                    new_dict = {}
                    if item['fsrvoption']:
                        if 'fsrvvalue' in item and item['fsrvvalue'] and item['fsrvvalue'] != '':
                            new_dict.update(item);
                        else:
                            new_dict.update({'fsrvoption': item['fsrvoption'], 'fsrvvalue': ''})

                    new_list.append(new_dict)

                data['fsrvoptions'] = new_list

            sql = render_template("/".join([self.template_path, 'create.sql']), data=data, fdwdata=fdw_data,
                                  conn=self.conn)
            sql += "\n"
        return sql, data['name']


    @check_precondition
    def sql(self, gid, sid, did, fid, fsid):
        """
        This function will generate sql to show it in sql pane for the selected foreign server node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            fid: Foreign data wrapper ID
            fsid: Foreign server ID
        """

        sql = render_template("/".join([self.template_path, 'properties.sql']), fsid=fsid, conn=self.conn)
        status, res = self.conn.execute_dict(sql)
        if not status:
            return internal_server_error(errormsg=res)

        if res['rows'][0]['fsrvoptions'] is not None:
            res['rows'][0]['fsrvoptions'] = self.tokenizeOptions(res['rows'][0]['fsrvoptions'])

        sql = render_template("/".join([self.template_path, 'acl.sql']), fsid=fsid)
        status, fs_rv_acl_res = self.conn.execute_dict(sql)
        if not status:
            return internal_server_error(errormsg=fs_rv_acl_res)

        for row in fs_rv_acl_res['rows']:
            privilege = parse_priv_from_db(row)
            if row['deftype'] in res['rows'][0]:
                res['rows'][0][row['deftype']].append(privilege)
            else:
                res['rows'][0][row['deftype']] = [privilege]

        # To format privileges
        if 'fsrvacl' in res['rows'][0]:
            res['rows'][0]['fsrvacl'] = parse_priv_to_db(res['rows'][0]['fsrvacl'], ['U'])

        sql = render_template("/".join([self.template_path, 'properties.sql']), fdwid=fid, conn=self.conn)
        status, res1 = self.conn.execute_dict(sql)
        if not status:
            return internal_server_error(errormsg=res1)

        fdw_data = res1['rows'][0]

        sql = ''
        sql = render_template("/".join([self.template_path, 'create.sql']), data=res['rows'][0], fdwdata=fdw_data,
                              conn=self.conn)
        sql += "\n"

        sql_header = """-- Foreign Server: {0}

-- DROP SERVER {0}

""".format(res['rows'][0]['name'])
        if hasattr(str, 'decode'):
            sql_header = sql_header.decode('utf-8')

        sql = sql_header + sql

        return ajax_response(response=sql)

    @check_precondition
    def dependents(self, gid, sid, did, fid, fsid):
        """
        This function get the dependents and return ajax response
        for the foreign server node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            fid: foreign data wrapper ID
            fsid: Foreign server ID
        """
        dependents_result = self.get_dependents(self.conn, fsid)

        # Fetching dependents of foreign servers
        query = render_template("/".join([self.template_path, 'dependents.sql']), fsid=fsid)
        status, result = self.conn.execute_dict(query)
        if not status:
            internal_server_error(errormsg=result)

        for row in result['rows']:
            dependents_result.append(
                {'type': 'user_mapping', 'name': row['name'], 'field': 'normal' if (row['deptype'] == 'n') else ''})

        return ajax_response(
            response=dependents_result,
            status=200
        )

    @check_precondition
    def dependencies(self, gid, sid, did, fid, fsid):
        """
        This function get the dependencies and return ajax response
        for the foreign server node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            fid: Foreign Data Wrapper ID
            fsid: Foreign server ID
        """
        dependencies_result = self.get_dependencies(self.conn, fsid)
        return ajax_response(
            response=dependencies_result,
            status=200
        )


ForeignServerView.register_node_view(blueprint)
