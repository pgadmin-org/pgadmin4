##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Implements Foreign Data Wrapper Node"""

import simplejson as json
from functools import wraps

import pgadmin.browser.server_groups.servers.databases as databases
from flask import render_template, request, jsonify
from flask_babelex import gettext
from pgadmin.browser.collection import CollectionNodeModule
from pgadmin.browser.server_groups.servers.utils import parse_priv_from_db, \
    parse_priv_to_db, validate_options, tokenize_options
from pgadmin.browser.utils import PGChildNodeView
from pgadmin.utils.ajax import make_json_response, internal_server_error, \
    make_response as ajax_response, gone
from pgadmin.utils.driver import get_driver
from config import PG_DEFAULT_DRIVER
from pgadmin.tools.schema_diff.node_registry import SchemaDiffRegistry
from pgadmin.tools.schema_diff.compare import SchemaDiffObjectCompare


class ForeignDataWrapperModule(CollectionNodeModule):
    """
    class ForeignDataWrapperModule(CollectionNodeModule)

        A module class for foreign data wrapper node derived
        from CollectionNodeModule.

    Methods:
    -------
    * __init__(*args, **kwargs)
      - Method is used to initialize the Foreign data wrapper
        module and it's base module.

    * get_nodes(gid, sid, did)
      - Method is used to generate the browser collection node.

    * script_load()
      - Load the module script for foreign data wrapper,
        when any of the database node is initialized.
    """

    _NODE_TYPE = 'foreign_data_wrapper'
    _COLLECTION_LABEL = gettext("Foreign Data Wrappers")

    def __init__(self, *args, **kwargs):
        """
        Method is used to initialize the Foreign data wrapper module
        and it's base module.

        Args:
            *args:
            **kwargs:
        """

        self.min_ver = None
        self.max_ver = None

        super(ForeignDataWrapperModule, self).__init__(*args, **kwargs)
        self.min_gpdbver = 1000000000

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
        Load the module script for foreign data wrapper,
        when any of the database node is initialized.

        Returns: node type of the databse module.
        """
        return databases.DatabaseModule.node_type

    @property
    def module_use_template_javascript(self):
        """
        Returns whether Jinja2 template is used for
        generating the javascript module.
        """
        return False


blueprint = ForeignDataWrapperModule(__name__)


class ForeignDataWrapperView(PGChildNodeView, SchemaDiffObjectCompare):
    """
    class ForeignDataWrapperView(PGChildNodeView)

        A view class for foreign data wrapper node derived
        from PGChildNodeView. This class is responsible for all the
        stuff related to view like updating foreign data wrapper
        node, showing properties, showing sql in sql pane.

    Methods:
    -------
    * __init__(**kwargs)
      - Method is used to initialize the ForeignDataWrapperView
        and it's base view.

    * check_precondition()
      - This function will behave as a decorator which will checks
        database connection before running view, it will also attaches
        manager,conn & template_path properties to self

    * list(gid, sid, did)
      - This function is used to list all the foreign data wrapper nodes
        within that collection.

    * nodes(gid, sid, did)
      - This function will used to create all the child node within that
        collection. Here it will create all the foreign data wrapper node.

    * properties(gid, sid, did, fid)
      - This function will show the properties of the selected
        foreign data wrapper node

    * create(gid, sid, did)
      - This function will create the new foreign data wrapper node

    * delete(gid, sid, did, fid)
      - This function will delete the selected foreign data wrapper node

    * update(gid, sid, did, fid)
      - This function will update the data for the selected
        foreign data wrapper node

    * msql(gid, sid, did, fid)
      - This function is used to return modified SQL for the selected
        foreign data wrapper node

    * get_sql(data, fid)
      - This function will generate sql from model data

    * get_validators(gid, sid, did)
      - This function returns the validators for the selected
        foreign data wrapper node

    * get_handlers(gid, sid, did)
      - This function returns the handlers for the selected
        foreign data wrapper node

    * sql(gid, sid, did, fid):
      - This function will generate sql to show it in sql pane for
        the selected foreign data wrapper node.

    * dependents(gid, sid, did, fid):
      - This function get the dependents and return ajax response for the
        foreign data wrapper node.

    * dependencies(self, gid, sid, did, fid):
      - This function get the dependencies and return ajax response for the
        foreign data wrapper node.
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
            {'get': 'list', 'post': 'create', 'delete': 'delete'}
        ],
        'delete': [{'delete': 'delete'}, {'delete': 'delete'}],
        'nodes': [{'get': 'node'}, {'get': 'nodes'}],
        'children': [{'get': 'children'}],
        'sql': [{'get': 'sql'}],
        'msql': [{'get': 'msql'}, {'get': 'msql'}],
        'stats': [{'get': 'statistics'}],
        'dependency': [{'get': 'dependencies'}],
        'dependent': [{'get': 'dependents'}],
        'get_handlers': [{}, {'get': 'get_handlers'}],
        'get_validators': [{}, {'get': 'get_validators'}]
    })

    keys_to_ignore = ['oid', 'oid-2', 'fdwhandler', 'fdwvalidator']

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
            driver = get_driver(PG_DEFAULT_DRIVER)
            self.manager = driver.connection_manager(
                kwargs['sid']
            )
            self.conn = self.manager.connection(did=kwargs['did'])
            self.qtIdent = driver.qtIdent
            self.datlastsysoid = \
                self.manager.db_info[kwargs['did']]['datlastsysoid'] \
                if self.manager.db_info is not None and \
                kwargs['did'] in self.manager.db_info else 0

            self.datistemplate = False
            if (
                self.manager.db_info is not None and
                kwargs['did'] in self.manager.db_info and
                'datistemplate' in self.manager.db_info[kwargs['did']]
            ):
                self.datistemplate = self.manager.db_info[
                    kwargs['did']]['datistemplate']

            # Set the template path for the SQL scripts
            self.template_path = 'foreign_data_wrappers/sql/#{0}#'.format(
                self.manager.version
            )

            return f(*args, **kwargs)

        return wrap

    @check_precondition
    def list(self, gid, sid, did):
        """
        This function is used to list all the foreign data wrapper
        nodes within that collection.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
        """
        sql = render_template("/".join([self.template_path,
                                        self._PROPERTIES_SQL]),
                              conn=self.conn)
        status, res = self.conn.execute_dict(sql)

        if not status:
            return internal_server_error(errormsg=res)

        for row in res['rows']:
            if row['fdwoptions'] is not None:
                row['fdwoptions'] = tokenize_options(
                    row['fdwoptions'], 'fdwoption', 'fdwvalue'
                )

        return ajax_response(
            response=res['rows'],
            status=200
        )

    @check_precondition
    def nodes(self, gid, sid, did):
        """
        This function will used to create all the child node within that
        collection. Here it will create all the foreign data wrapper node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
        """
        res = []
        sql = render_template("/".join([self.template_path,
                                        self._PROPERTIES_SQL]),
                              conn=self.conn
                              )
        status, r_set = self.conn.execute_2darray(sql)
        if not status:
            return internal_server_error(errormsg=r_set)

        for row in r_set['rows']:
            res.append(
                self.blueprint.generate_browser_node(
                    row['oid'],
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
        sql = render_template("/".join([self.template_path,
                                        self._PROPERTIES_SQL]),
                              conn=self.conn, fid=fid)
        status, r_set = self.conn.execute_2darray(sql)
        if not status:
            return internal_server_error(errormsg=r_set)

        for row in r_set['rows']:
            return make_json_response(
                data=self.blueprint.generate_browser_node(
                    row['oid'],
                    did,
                    row['name'],
                    icon="icon-foreign_data_wrapper"
                ),
                status=200
            )

        return gone(gettext("Could not find the specified"
                            " foreign data wrapper."))

    @check_precondition
    def properties(self, gid, sid, did, fid):
        """
        This function will show the properties of the
        selected foreign data wrapper node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            fid: foreign data wrapper ID
        """
        status, res = self._fetch_properties(fid)
        if not status:
            return res

        return ajax_response(
            response=res,
            status=200
        )

    def _fetch_properties(self, fid):
        """
        This function fetch the properties of the FDW.
        :param fid:
        :return:
        """

        sql = render_template("/".join([self.template_path,
                                        self._PROPERTIES_SQL]),
                              fid=fid, conn=self.conn
                              )
        status, res = self.conn.execute_dict(sql)

        status, res = self.conn.execute_dict(sql)
        if not status:
            return False, internal_server_error(errormsg=res)

        if len(res['rows']) == 0:
            return False, gone(
                gettext("Could not find the foreign data"
                        " wrapper information.")
            )

        res['rows'][0]['is_sys_obj'] = (
            res['rows'][0]['oid'] <= self.datlastsysoid or self.datistemplate)

        if res['rows'][0]['fdwoptions'] is not None:
            res['rows'][0]['fdwoptions'] = tokenize_options(
                res['rows'][0]['fdwoptions'],
                'fdwoption', 'fdwvalue'
            )

        sql = render_template("/".join([self.template_path, self._ACL_SQL]),
                              fid=fid
                              )

        status, fdw_acl_res = self.conn.execute_dict(sql)
        if not status:
            return False, internal_server_error(errormsg=fdw_acl_res)

        for row in fdw_acl_res['rows']:
            privilege = parse_priv_from_db(row)
            if row['deftype'] in res['rows'][0]:
                res['rows'][0][row['deftype']].append(privilege)
            else:
                res['rows'][0][row['deftype']] = [privilege]

        return True, res['rows'][0]

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
                        "Could not find the required parameter ({})."
                    ).format(arg)
                )

        try:
            if 'fdwacl' in data:
                data['fdwacl'] = parse_priv_to_db(data['fdwacl'], ['U'])

            is_valid_options = False
            if 'fdwoptions' in data:
                is_valid_options, data['fdwoptions'] = validate_options(
                    data['fdwoptions'], 'fdwoption', 'fdwvalue'
                )

            sql = render_template("/".join([self.template_path,
                                            self._CREATE_SQL]),
                                  data=data,
                                  conn=self.conn,
                                  is_valid_options=is_valid_options
                                  )
            status, res = self.conn.execute_dict(sql)
            if not status:
                return internal_server_error(errormsg=res)

            sql = render_template("/".join([self.template_path,
                                            self._PROPERTIES_SQL]),
                                  fname=data['name'],
                                  conn=self.conn
                                  )

            status, r_set = self.conn.execute_dict(sql)
            if not status:
                return internal_server_error(errormsg=r_set)

            for row in r_set['rows']:
                return jsonify(
                    node=self.blueprint.generate_browser_node(
                        row['oid'],
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
        This function will update the data for the selected
        foreign data wrapper node.

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
            # Most probably this is due to error
            if not isinstance(sql, str):
                return sql
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

    @staticmethod
    def get_delete_data(cmd, fid, request_object):
        """
        This function is used to get the data and cascade information.
        :param cmd: Command
        :param fid: Object ID
        :param request_object: request object
        :return:
        """
        cascade = False
        # Below will decide if it's simple drop or drop with cascade call
        if cmd == 'delete':
            # This is a cascade operation
            cascade = True

        if fid is None:
            data = request_object.form if request_object.form else \
                json.loads(request_object.data, encoding='utf-8')
        else:
            data = {'ids': [fid]}

        return cascade, data

    @check_precondition
    def delete(self, gid, sid, did, fid=None, only_sql=False):
        """
        This function will delete the selected foreign data wrapper node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            fid: foreign data wrapper ID
            only_sql:
        """
        # get the value of cascade and data
        cascade, data = self.get_delete_data(self.cmd, fid, request)

        for fid in data['ids']:
            try:
                # Get name of foreign data wrapper from fid
                sql = render_template("/".join([self.template_path,
                                                self._DELETE_SQL]),
                                      fid=fid, conn=self.conn
                                      )
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
                            'The specified foreign data'
                            ' wrapper could not be found.\n'
                        )
                    )
                # drop foreign data wrapper node
                sql = render_template("/".join([self.template_path,
                                                self._DELETE_SQL]),
                                      name=name,
                                      cascade=cascade,
                                      conn=self.conn)

                # Used for schema diff tool
                if only_sql:
                    return sql

                status, res = self.conn.execute_scalar(sql)
                if not status:
                    return internal_server_error(errormsg=res)

            except Exception as e:
                return internal_server_error(errormsg=str(e))

        return make_json_response(
            success=1,
            info=gettext("Foreign Data Wrapper dropped")
        )

    @check_precondition
    def msql(self, gid, sid, did, fid=None):
        """
        This function is used to return modified SQL for the
        selected foreign data wrapper node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            fid: foreign data wrapper ID
        """
        data = {}
        for k, v in request.args.items():
            try:
                # comments should be taken as is because if user enters a
                # json comment it is parsed by loads which should not happen
                if k in ('description',):
                    data[k] = v
                else:
                    data[k] = json.loads(v, encoding='utf-8')
            except ValueError:
                data[k] = v
        try:
            sql, name = self.get_sql(gid, sid, data, did, fid)
            # Most probably this is due to error
            if not isinstance(sql, str):
                return sql
            if sql == '':
                sql = "--modified SQL"

            return make_json_response(
                data=sql.strip('\n'),
                status=200
            )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    def _get_create_sql(self, data):
        """
        Get sql for create foreign data wrapper.
        :param data: Data.
        :return: Create sql statement for foreign data wrapper.
        """
        for key in ['fdwacl']:
            if key in data and data[key] is not None:
                data[key] = parse_priv_to_db(data[key], ['U'])

        # Allow user to set the blank value in
        # fdwvalue field in option model
        is_valid_options = False
        if 'fdwoptions' in data:
            is_valid_options, data['fdwoptions'] = validate_options(
                data['fdwoptions'], 'fdwoption', 'fdwvalue'
            )

        sql = render_template("/".join([self.template_path,
                                        self._CREATE_SQL]),
                              data=data, conn=self.conn,
                              is_valid_options=is_valid_options
                              )
        return sql

    def _check_and_parse_priv_to_db(self, data):
        """
        Check foreign data wrapper privilege and parse privileges before
        sending to database.
        :param data: Data.
        """
        for key in ['fdwacl']:
            if key in data and data[key] is not None:
                if 'added' in data[key]:
                    data[key]['added'] = parse_priv_to_db(
                        data[key]['added'],
                        ['U']
                    )
                if 'changed' in data[key]:
                    data[key]['changed'] = parse_priv_to_db(
                        data[key]['changed'],
                        ['U']
                    )
                if 'deleted' in data[key]:
                    data[key]['deleted'] = parse_priv_to_db(
                        data[key]['deleted'],
                        ['U']
                    )

    def _check_validate_options(self, data):
        """
        Check option in foreign data wrapper Data and This will call
        validated options function to set flag for option valid or not in sql.
        :param data: Data.
        """
        is_valid_added_options = is_valid_changed_options = False

        if 'fdwoptions' in data and data['fdwoptions'] is not None and\
                'added' in data['fdwoptions']:
            is_valid_added_options, data['fdwoptions']['added'] = \
                validate_options(
                    data['fdwoptions']['added'],
                    'fdwoption',
                    'fdwvalue')

        if 'fdwoptions' in data and data['fdwoptions'] is not None and\
                'changed' in data['fdwoptions']:
            is_valid_changed_options, data['fdwoptions']['changed'] = \
                validate_options(
                    data['fdwoptions']['changed'],
                    'fdwoption',
                    'fdwvalue')

        return is_valid_added_options, is_valid_changed_options

    def get_sql(self, gid, sid, data, did, fid=None):
        """
        This function will generate sql from model data.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            data: Contains the data of the selected
                  foreign data wrapper node
            fid: foreign data wrapper ID
        """
        required_args = [
            'name'
        ]

        if fid is not None:
            sql = render_template("/".join([self.template_path,
                                            self._PROPERTIES_SQL]),
                                  fid=fid,
                                  conn=self.conn
                                  )
            status, res = self.conn.execute_dict(sql)
            if not status:
                return internal_server_error(errormsg=res)

            if len(res['rows']) == 0:
                return gone(
                    gettext("Could not find the foreign"
                            " data wrapper information.")
                )

            if res['rows'][0]['fdwoptions'] is not None:
                res['rows'][0]['fdwoptions'] = tokenize_options(
                    res['rows'][0]['fdwoptions'],
                    'fdwoption', 'fdwvalue'
                )

            self._check_and_parse_priv_to_db(data)

            old_data = res['rows'][0]
            for arg in required_args:
                if arg not in data:
                    data[arg] = old_data[arg]

            # Allow user to set the blank value in fdwvalue
            # field in option model
            is_valid_added_options, \
                is_valid_changed_options = self._check_validate_options(data)

            sql = render_template(
                "/".join([self.template_path, self._UPDATE_SQL]),
                data=data,
                o_data=old_data,
                is_valid_added_options=is_valid_added_options,
                is_valid_changed_options=is_valid_changed_options,
                conn=self.conn
            )
            return sql.strip('\n'), \
                data['name'] if 'name' in data else old_data['name']
        else:
            sql = self._get_create_sql(data)

        return sql.strip('\n'), data['name']

    @check_precondition
    def sql(self, gid, sid, did, fid, json_resp=True):
        """
        This function will generate sql to show it in sql pane
        for the selected foreign data wrapper node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            fid: Foreign data wrapper ID
            json_resp:
        """
        sql = render_template("/".join([self.template_path,
                                        self._PROPERTIES_SQL]),
                              fid=fid, conn=self.conn
                              )
        status, res = self.conn.execute_dict(sql)
        if not status:
            return internal_server_error(errormsg=res)
        if len(res['rows']) == 0:
            return gone(
                gettext(
                    "Could not find the foreign data wrapper on the server."
                )
            )

        is_valid_options = False
        if res['rows'][0]['fdwoptions'] is not None:
            res['rows'][0]['fdwoptions'] = tokenize_options(
                res['rows'][0]['fdwoptions'], 'fdwoption', 'fdwvalue'
            )

            if len(res['rows'][0]['fdwoptions']) > 0:
                is_valid_options = True

        sql = render_template("/".join([self.template_path, self._ACL_SQL]),
                              fid=fid)
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
            res['rows'][0]['fdwacl'] = parse_priv_to_db(
                res['rows'][0]['fdwacl'],
                ['U']
            )

        sql = ''
        sql = render_template("/".join([self.template_path,
                                        self._CREATE_SQL]),
                              data=res['rows'][0], conn=self.conn,
                              is_valid_options=is_valid_options
                              )
        sql += "\n"

        sql_header = """-- Foreign Data Wrapper: {0}\n\n""".format(
            res['rows'][0]['name'])

        sql_header += """-- DROP FOREIGN DATA WRAPPER {0}

""".format(self.qtIdent(self.conn, res['rows'][0]['name']))

        sql = sql_header + sql

        if not json_resp:
            return sql.strip('\n')

        return ajax_response(response=sql.strip('\n'))

    @check_precondition
    def get_validators(self, gid, sid, did):
        """
        This function returns the validators for the selected
        foreign data wrapper node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
        """
        res = [{'label': '', 'value': ''}]
        try:
            sql = render_template("/".join([self.template_path,
                                            'validators.sql']),
                                  conn=self.conn)
            status, r_set = self.conn.execute_2darray(sql)

            if not status:
                return internal_server_error(errormsg=r_set)

            for row in r_set['rows']:
                res.append({'label': row['schema_prefix_fdw_val'],
                            'value': row['schema_prefix_fdw_val']})

            return make_json_response(data=res, status=200)

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def get_handlers(self, gid, sid, did):
        """
        This function returns the handlers for the selected
        foreign data wrapper node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
        """
        res = [{'label': '', 'value': ''}]
        try:
            sql = render_template("/".join([self.template_path,
                                            'handlers.sql']),
                                  conn=self.conn)
            status, r_set = self.conn.execute_2darray(sql)

            if not status:
                return internal_server_error(errormsg=r_set)

            for row in r_set['rows']:
                res.append({'label': row['schema_prefix_fdw_hand'],
                            'value': row['schema_prefix_fdw_hand']})

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

    @check_precondition
    def fetch_objects_to_compare(self, sid, did):
        """
        This function will fetch the list of all the FDWs for
        specified database id.

        :param sid: Server Id
        :param did: Database Id
        :return:
        """
        res = dict()

        sql = render_template("/".join([self.template_path,
                                        'properties.sql']))
        status, rset = self.conn.execute_2darray(sql)
        if not status:
            return internal_server_error(errormsg=rset)

        for row in rset['rows']:
            status, data = self._fetch_properties(row['oid'])
            if status:
                # For schema diff if fdwoptions is None then convert it to
                # the empty list.
                if 'fdwoptions' in data and data['fdwoptions'] is None:
                    data['fdwoptions'] = []
                res[row['name']] = data

        return res

    def get_sql_from_diff(self, **kwargs):
        """
        This function is used to get the DDL/DML statements.
        :param kwargs
        :return:
        """
        gid = kwargs.get('gid')
        sid = kwargs.get('sid')
        did = kwargs.get('did')
        oid = kwargs.get('oid')
        data = kwargs.get('data', None)
        drop_sql = kwargs.get('drop_sql', False)

        if data:
            sql, name = self.get_sql(gid=gid, sid=sid, did=did, data=data,
                                     fid=oid)
        else:
            if drop_sql:
                sql = self.delete(gid=gid, sid=sid, did=did,
                                  fid=oid, only_sql=True)
            else:
                sql = self.sql(gid=gid, sid=sid, did=did, fid=oid,
                               json_resp=False)
        return sql


SchemaDiffRegistry(blueprint.node_type, ForeignDataWrapperView, 'Database')
ForeignDataWrapperView.register_node_view(blueprint)
