##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Implements Foreign Data Wrapper Node"""

import simplejson as json
from functools import wraps

import pgadmin.browser.server_groups.servers as servers
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


class ForeignDataWrapperModule(CollectionNodeModule):
    """
    class ForeignDataWrapperModule(CollectionNodeModule)

        A module class for foreign data wrapper node derived from CollectionNodeModule.

    Methods:
    -------
    * __init__(*args, **kwargs)
      - Method is used to initialize the Foreign data wrapper module and it's base module.

    * get_nodes(gid, sid, did)
      - Method is used to generate the browser collection node.

    * script_load()
      - Load the module script for foreign data wrapper, when any of the database node is
        initialized.
    """

    NODE_TYPE = 'foreign_data_wrapper'
    COLLECTION_LABEL = gettext("Foreign Data Wrappers")

    def __init__(self, *args, **kwargs):
        """
        Method is used to initialize the Foreign data wrapper module and it's base module.

        Args:
            *args:
            **kwargs:
        """

        self.min_ver = None
        self.max_ver = None

        super(ForeignDataWrapperModule, self).__init__(*args, **kwargs)

    def get_nodes(self, gid, sid, did):
        """
        Method is used to generate the browser collection node

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database Id
        """
        yield self.generate_browser_collection_node(did)

    @property
    def script_load(self):
        """
        Load the module script for foreign data wrapper, when any of the database node is initialized.

        Returns: node type of the server module.
        """
        return servers.ServerModule.NODE_TYPE


blueprint = ForeignDataWrapperModule(__name__)


class ForeignDataWrapperView(PGChildNodeView):
    """
    class ForeignDataWrapperView(PGChildNodeView)

        A view class for foreign data wrapper node derived from PGChildNodeView. This class is
        responsible for all the stuff related to view like updating foreign data wrapper
        node, showing properties, showing sql in sql pane.

    Methods:
    -------
    * __init__(**kwargs)
      - Method is used to initialize the ForeignDataWrapperView and it's base view.

    * module_js()
      - This property defines (if javascript) exists for this node.
        Override this property for your own logic

    * check_precondition()
      - This function will behave as a decorator which will checks
        database connection before running view, it will also attaches
        manager,conn & template_path properties to self

    * list(gid, sid, did)
      - This function is used to list all the foreign data wrapper nodes within that collection.

    * nodes(gid, sid, did)
      - This function will used to create all the child node within that collection.
        Here it will create all the foreign data wrapper node.

    * properties(gid, sid, did, fid)
      - This function will show the properties of the selected foreign data wrapper node

    * tokenizeOptions(option_value)
      - This function will tokenize the string stored in database

    * create(gid, sid, did)
      - This function will create the new foreign data wrapper node

    * delete(gid, sid, did, fid)
      - This function will delete the selected foreign data wrapper node

    * update(gid, sid, did, fid)
      - This function will update the data for the selected foreign data wrapper node

    * msql(gid, sid, did, fid)
      - This function is used to return modified SQL for the selected foreign data wrapper node

    * get_sql(data, fid)
      - This function will generate sql from model data

    * get_validators(gid, sid, did)
      - This function returns the validators for the selected foreign data wrapper node

    * get_handlers(gid, sid, did)
      - This function returns the handlers for the selected foreign data wrapper node

    * sql(gid, sid, did, fid):
      - This function will generate sql to show it in sql pane for the selected foreign data wrapper node.

    * dependents(gid, sid, did, fid):
      - This function get the dependents and return ajax response for the foreign data wrapper node.

    * dependencies(self, gid, sid, did, fid):
      - This function get the dependencies and return ajax response for the foreign data wrapper node.
    """

    node_type = blueprint.node_type

    parent_ids = [
        {'type': 'int', 'id': 'gid'},
        {'type': 'int', 'id': 'sid'},
        {'type': 'int', 'id': 'did'}
    ]
    ids = [
        {'type': 'int', 'id': 'fid'}
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
        'module.js': [{}, {}, {'get': 'module_js'}],
        'get_handlers': [{}, {'get': 'get_handlers'}],
        'get_validators': [{}, {'get': 'get_validators'}]
    })

    def module_js(self):
        """
        This property defines (if javascript) exists for this node.
        Override this property for your own logic.
        """
        return make_response(
            render_template(
                "foreign_data_wrappers/js/foreign_data_wrappers.js",
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
                self.template_path = 'foreign_data_wrappers/sql/9.3_plus'
            else:
                self.template_path = 'foreign_data_wrappers/sql/9.1_plus'

            return f(*args, **kwargs)

        return wrap

    @check_precondition
    def list(self, gid, sid, did):
        """
        This function is used to list all the foreign data wrapper nodes within that collection.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
        """
        sql = render_template("/".join([self.template_path, 'properties.sql']), conn=self.conn)
        status, res = self.conn.execute_dict(sql)

        if not status:
            return internal_server_error(errormsg=res)

        for row in res['rows']:
            if row['fdwoptions'] is not None:
                row['fdwoptions'] = self.tokenize_options(row['fdwoptions'])

        return ajax_response(
            response=res['rows'],
            status=200
        )

    @check_precondition
    def nodes(self, gid, sid, did):
        """
        This function will used to create all the child node within that collection.
        Here it will create all the foreign data wrapper node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
        """
        res = []
        sql = render_template("/".join([self.template_path, 'properties.sql']), conn=self.conn)
        status, r_set = self.conn.execute_2darray(sql)
        if not status:
            return internal_server_error(errormsg=r_set)

        for row in r_set['rows']:
            res.append(
                self.blueprint.generate_browser_node(
                    row['fdwoid'],
                    did,
                    row['name'],
                    icon="icon-foreign_data_wrapper"
                ))

        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition
    def node(self, gid, sid, did, fid):
        """
        This function will fetch properties of foreign data wrapper node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            fid: Foreign data wrapper ID
        """
        sql = render_template("/".join([self.template_path, 'properties.sql']),
                              conn=self.conn, fid=fid)
        status, r_set = self.conn.execute_2darray(sql)
        if not status:
            return internal_server_error(errormsg=r_set)

        for row in r_set['rows']:
            return make_json_response(
                data=self.blueprint.generate_browser_node(
                    row['fdwoid'],
                    did,
                    row['name'],
                    icon="icon-foreign_data_wrapper"
                ),
                status=200
            )

        return gone(gettext("Could not find the specified foreign data wrapper."))

    def tokenize_options(self, option_value):
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
            fdw_options = []
            for fdw_option in option_str:
                k, v = fdw_option.split('=', 1)
                fdw_options.append({'fdwoption': k, 'fdwvalue': v})
            return fdw_options

    @check_precondition
    def properties(self, gid, sid, did, fid):
        """
        This function will show the properties of the selected foreign data wrapper node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            fid: foreign data wrapper ID
        """
        sql = render_template("/".join([self.template_path, 'properties.sql']), fid=fid, conn=self.conn)
        status, res = self.conn.execute_dict(sql)

        if not status:
            return internal_server_error(errormsg=res)

        if len(res['rows']) == 0:
            return gone(
                gettext("Couldnot find the foreign data wrapper information.")
            )

        if res['rows'][0]['fdwoptions'] is not None:
            res['rows'][0]['fdwoptions'] = self.tokenize_options(res['rows'][0]['fdwoptions'])

        sql = render_template("/".join([self.template_path, 'acl.sql']), fid=fid)
        status, fdw_acl_res = self.conn.execute_dict(sql)
        if not status:
            return internal_server_error(errormsg=fdw_acl_res)

        for row in fdw_acl_res['rows']:
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
    def create(self, gid, sid, did):
        """
        This function will create the foreign data wrapper node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
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

            if 'fdwacl' in data:
                data['fdwacl'] = parse_priv_to_db(data['fdwacl'], ['U'])

            new_list = []

            # Allow user to set the blank value in fdwvalue field in option model
            if 'fdwoptions' in data:
                for item in data['fdwoptions']:
                    new_dict = {}
                    if item['fdwoption']:
                        if 'fdwvalue' in item and item['fdwvalue'] and item['fdwvalue'] != '':
                            new_dict.update(item);
                        else:
                            new_dict.update({'fdwoption': item['fdwoption'], 'fdwvalue': ''})

                    new_list.append(new_dict)

                data['fdwoptions'] = new_list

            sql = render_template("/".join([self.template_path, 'create.sql']), data=data, conn=self.conn)
            status, res = self.conn.execute_dict(sql)
            if not status:
                return internal_server_error(errormsg=res)

            sql = render_template("/".join([self.template_path, 'properties.sql']), fname=data['name'], conn=self.conn)

            status, r_set = self.conn.execute_dict(sql)
            if not status:
                return internal_server_error(errormsg=r_set)

            for row in r_set['rows']:
                return jsonify(
                    node=self.blueprint.generate_browser_node(
                        row['fdwoid'],
                        did,
                        row['name'],
                        icon='icon-foreign_data_wrapper'
                    )
                )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def update(self, gid, sid, did, fid):
        """
        This function will update the data for the selected foreign data wrapper node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            fid: foreign data wrapper ID
        """
        data = request.form if request.form else json.loads(
            request.data, encoding='utf-8'
        )

        try:
            sql, name = self.get_sql(gid, sid, data, did, fid)

            status, res = self.conn.execute_scalar(sql)
            if not status:
                return internal_server_error(errormsg=res)

            return jsonify(
                node=self.blueprint.generate_browser_node(
                    fid,
                    did,
                    name,
                    icon="icon-%s" % self.node_type
                )
            )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def delete(self, gid, sid, did, fid):
        """
        This function will delete the selected foreign data wrapper node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            fid: foreign data wrapper ID
        """
        if self.cmd == 'delete':
            # This is a cascade operation
            cascade = True
        else:
            cascade = False

        try:
            # Get name of foreign data wrapper from fid
            sql = render_template("/".join([self.template_path, 'delete.sql']), fid=fid, conn=self.conn)
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
                        'The specified foreign data wrapper could not be found.\n'
                    )
                )
            # drop foreign data wrapper node
            sql = render_template("/".join([self.template_path, 'delete.sql']), name=name, cascade=cascade,
                                  conn=self.conn)
            status, res = self.conn.execute_scalar(sql)
            if not status:
                return internal_server_error(errormsg=res)

            return make_json_response(
                success=1,
                info=gettext("Foreign Data Wrapper dropped"),
                data={
                    'id': fid,
                    'did': did,
                    'sid': sid,
                    'gid': gid,
                }
            )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def msql(self, gid, sid, did, fid=None):
        """
        This function is used to return modified SQL for the selected foreign data wrapper node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            fid: foreign data wrapper ID
        """
        data = {}
        for k, v in request.args.items():
            try:
                data[k] = json.loads(v, encoding='utf-8')
            except ValueError:
                data[k] = v
        try:
            sql, name = self.get_sql(gid, sid, data, did, fid)

            if sql == '':
                sql = "--modified SQL"

            return make_json_response(
                data=sql,
                status=200
            )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    def get_sql(self, gid, sid, data, did, fid=None):
        """
        This function will generate sql from model data.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            data: Contains the data of the selected foreign data wrapper node
            fid: foreign data wrapper ID
        """
        required_args = [
            'name'
        ]

        if fid is not None:
            sql = render_template("/".join([self.template_path, 'properties.sql']), fid=fid, conn=self.conn)
            status, res = self.conn.execute_dict(sql)
            if not status:
                return internal_server_error(errormsg=res)

            if len(res['rows']) == 0:
                return gone(
                    gettext("Couldnot find the foreign data wrapper information.")
                )

            if res['rows'][0]['fdwoptions'] is not None:
                res['rows'][0]['fdwoptions'] = self.tokenize_options(res['rows'][0]['fdwoptions'])

            for key in ['fdwacl']:
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

            # Allow user to set the blank value in fdwvalue field in option model
            if 'fdwoptions' in data and 'added' in data['fdwoptions']:
                for item in data['fdwoptions']['added']:
                    new_dict_add = {}
                    if item['fdwoption']:
                        if 'fdwvalue' in item and item['fdwvalue'] and item['fdwvalue'] != '':
                            new_dict_add.update(item);
                        else:
                            new_dict_add.update({'fdwoption': item['fdwoption'], 'fdwvalue': ''})

                    new_list_add.append(new_dict_add)

                data['fdwoptions']['added'] = new_list_add

            # Allow user to set the blank value in fdwvalue field in option model
            if 'fdwoptions' in data and 'changed' in data['fdwoptions']:
                for item in data['fdwoptions']['changed']:
                    new_dict_change = {}
                    if item['fdwoption']:
                        if 'fdwvalue' in item and item['fdwvalue'] and item['fdwvalue'] != '':
                            new_dict_change.update(item);
                        else:
                            new_dict_change.update({'fdwoption': item['fdwoption'], 'fdwvalue': ''})

                    new_list_change.append(new_dict_change)

                data['fdwoptions']['changed'] = new_list_change

            sql = render_template("/".join([self.template_path, 'update.sql']), data=data, o_data=old_data,
                                  conn=self.conn)
            return sql, data['name'] if 'name' in data else old_data['name']
        else:
            for key in ['fdwacl']:
                if key in data and data[key] is not None:
                    data[key] = parse_priv_to_db(data[key], ['U'])

            new_list = []

            # Allow user to set the blank value in fdwvalue field in option model
            if 'fdwoptions' in data:
                for item in data['fdwoptions']:
                    new_dict = {}
                    if item['fdwoption']:
                        if 'fdwvalue' in item and item['fdwvalue'] and item['fdwvalue'] != '':
                            new_dict.update(item);
                        else:
                            new_dict.update({'fdwoption': item['fdwoption'], 'fdwvalue': ''})

                    new_list.append(new_dict)

                data['fdwoptions'] = new_list

            sql = render_template("/".join([self.template_path, 'create.sql']), data=data, conn=self.conn)
            sql += "\n"
        return sql, data['name']


    @check_precondition
    def sql(self, gid, sid, did, fid):
        """
        This function will generate sql to show it in sql pane for the selected foreign data wrapper node.

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

        if res['rows'][0]['fdwoptions'] is not None:
            res['rows'][0]['fdwoptions'] = self.tokenize_options(res['rows'][0]['fdwoptions'])

        sql = render_template("/".join([self.template_path, 'acl.sql']), fid=fid)
        status, fdw_acl_res = self.conn.execute_dict(sql)
        if not status:
            return internal_server_error(errormsg=fdw_acl_res)

        for row in fdw_acl_res['rows']:
            privilege = parse_priv_from_db(row)
            if row['deftype'] in res['rows'][0]:
                res['rows'][0][row['deftype']].append(privilege)
            else:
                res['rows'][0][row['deftype']] = [privilege]

        # To format privileges
        if 'fdwacl' in res['rows'][0]:
            res['rows'][0]['fdwacl'] = parse_priv_to_db(res['rows'][0]['fdwacl'], ['U'])

        sql = ''
        sql = render_template("/".join([self.template_path, 'create.sql']), data=res['rows'][0], conn=self.conn)
        sql += "\n"

        sql_header = """-- Foreign Data Wrapper: {0}

-- DROP FOREIGN DATA WRAPPER {0}

""".format(res['rows'][0]['name'])

        if hasattr(str, 'decode'):
            sql_header = sql_header.decode('utf-8')

        sql = sql_header + sql

        return ajax_response(response=sql)

    @check_precondition
    def get_validators(self, gid, sid, did):
        """
        This function returns the validators for the selected foreign data wrapper node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
        """
        res = [{'label': '', 'value': ''}]
        try:
            sql = render_template("/".join([self.template_path, 'validators.sql']), conn=self.conn)
            status, r_set = self.conn.execute_2darray(sql)

            if not status:
                return internal_server_error(errormsg=r_set)

            for row in r_set['rows']:
                res.append({'label': row['schema_prefix_fdw_val'], 'value': row['schema_prefix_fdw_val']})

            return make_json_response(data=res, status=200)

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def get_handlers(self, gid, sid, did):
        """
        This function returns the handlers for the selected foreign data wrapper node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
        """
        res = [{'label': '', 'value': ''}]
        try:
            sql = render_template("/".join([self.template_path, 'handlers.sql']), conn=self.conn)
            status, r_set = self.conn.execute_2darray(sql)

            if not status:
                return internal_server_error(errormsg=r_set)

            for row in r_set['rows']:
                res.append({'label': row['schema_prefix_fdw_hand'], 'value': row['schema_prefix_fdw_hand']})

            return make_json_response(
                data=res,
                status=200
            )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def dependents(self, gid, sid, did, fid):
        """
        This function get the dependents and return ajax response
        for the foreign data wrapper node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            fid: foreign data wrapper ID
        """
        dependents_result = self.get_dependents(self.conn, fid)
        return ajax_response(
            response=dependents_result,
            status=200
        )

    @check_precondition
    def dependencies(self, gid, sid, did, fid):
        """
        This function get the dependencies and return ajax response
        for the foreign data wrapper node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            fid: Foreign Data Wrapper ID
        """
        dependencies_result = self.get_dependencies(self.conn, fid)
        return ajax_response(
            response=dependencies_result,
            status=200
        )


ForeignDataWrapperView.register_node_view(blueprint)
