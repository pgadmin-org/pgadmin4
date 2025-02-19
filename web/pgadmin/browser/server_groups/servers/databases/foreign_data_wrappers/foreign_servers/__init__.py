##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Implements Foreign Server Node"""

import json
from functools import wraps

from pgadmin.browser.server_groups.servers import databases
from flask import render_template, make_response, request, jsonify
from flask_babel import gettext
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


class ForeignServerModule(CollectionNodeModule):
    """
    class ForeignServerModule(CollectionNodeModule)

        A module class for foreign server node derived from
        CollectionNodeModule.

    Methods:
    -------
    * __init__(*args, **kwargs)
      - Method is used to initialize the Foreign server module and
        it's base module.

    * get_nodes(gid, sid, did)
      - Method is used to generate the browser collection node.

    * script_load(self)
      - Load the module script for foreign server, when any of
        the database node is initialized.
    """

    _NODE_TYPE = 'foreign_server'
    _COLLECTION_LABEL = gettext("Foreign Servers")

    def __init__(self, *args, **kwargs):
        """
        Method is used to initialize the Foreign server module and
        it's base module.

        Args:
            *args:
            **kwargs:
        """

        self.min_ver = None
        self.max_ver = None

        super().__init__(*args, **kwargs)

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
        Load the module script for foreign server, when any of the
        foreign data wrapper node is initialized.

        Returns: node type of the server module.
        """
        return databases.DatabaseModule.node_type

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
        from .user_mappings import blueprint as module
        self.submodules.append(module)
        super().register(app, options)


blueprint = ForeignServerModule(__name__)


class ForeignServerView(PGChildNodeView, SchemaDiffObjectCompare):
    """
    class ForeignServerView(PGChildNodeView)

        A view class for foreign server node derived from PGChildNodeView.
        This class is responsible for all the stuff related to view like
        updating foreign server node, showing properties,
        showing sql in sql pane.

    Methods:
    -------
    * __init__(**kwargs)
      - Method is used to initialize the ForeignServerView and it's base view.

    * check_precondition()
      - This function will behave as a decorator which will checks
        database connection before running view, it will also attaches
        manager,conn & template_path properties to self

    * list(gid, sid, did, fid)
      - This function is used to list all the foreign server nodes within
        that collection.

    * nodes(gid, sid, did, fid)
      - This function will used to create all the child node within
        that collection.
        Here it will create all the foreign server node.

    * properties(gid, sid, did, fid, fsid)
      - This function will show the properties of the selected
        foreign server node

    * update(gid, sid, did, fid, fsid)
      - This function will update the data for the selected
        foreign server node

    * create(gid, sid, did, fid)
      - This function will create the new foreign server node

    * delete(gid, sid, did, fid, fsid)
      - This function will delete the selected foreign server node

    * msql(gid, sid, did, fid, fsid)
      - This function is used to return modified SQL for the selected
        foreign server node

    * get_sql(data, fid, fsid)
      - This function will generate sql from model data

    * sql(gid, sid, did, fid, fsid):
      - This function will generate sql to show it in sql pane for the
        selected foreign server node.

    * dependents(gid, sid, did, fid, fsid):
      - This function get the dependents and return ajax response for the
        foreign server node.

    * dependencies(self, gid, sid, did, fid, fsid):
      - This function get the dependencies and return ajax response for the
        foreign server node.
    """

    node_type = blueprint.node_type
    node_label = "Foreign Server"

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

    keys_to_ignore = ['oid', 'oid-2', 'fdwid']

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
            self.datistemplate = False
            if (
                self.manager.db_info is not None and
                kwargs['did'] in self.manager.db_info and
                'datistemplate' in self.manager.db_info[kwargs['did']]
            ):
                self.datistemplate = self.manager.db_info[
                    kwargs['did']]['datistemplate']

            # Set the template path for the SQL scripts
            self.template_path = "foreign_servers/sql/#{0}#".format(
                self.manager.version
            )
            self.is_valid_options = False

            return f(*args, **kwargs)

        return wrap

    @check_precondition
    def list(self, gid, sid, did, fid):
        """
        This function is used to list all the foreign server nodes
        within that collection.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            fid: Foreign data wrapper ID
        """

        sql = render_template("/".join([self.template_path,
                                        self._PROPERTIES_SQL]),
                              fid=fid, conn=self.conn)
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
        This function will used to create all the child node
        within that collection.
        Here it will create all the foreign server node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            fid: Foreign data wrapper ID
        """

        res = []
        sql = render_template("/".join([self.template_path,
                                        self._PROPERTIES_SQL]),
                              fid=fid, conn=self.conn)
        status, r_set = self.conn.execute_2darray(sql)

        if not status:
            return internal_server_error(errormsg=r_set)

        for row in r_set['rows']:
            res.append(
                self.blueprint.generate_browser_node(
                    row['oid'],
                    fid,
                    row['name'],
                    icon="icon-foreign_server",
                    description=row['description']
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

        sql = render_template("/".join([self.template_path,
                                        self._PROPERTIES_SQL]),
                              fsid=fsid, conn=self.conn)
        status, r_set = self.conn.execute_2darray(sql)

        if not status:
            return internal_server_error(errormsg=r_set)

        for row in r_set['rows']:

            return make_json_response(
                data=self.blueprint.generate_browser_node(
                    row['oid'],
                    fid,
                    row['name'],
                    icon="icon-foreign_server"
                ),
                status=200
            )

        return gone(gettext("Could not find the specified foreign server."))

    @check_precondition
    def properties(self, gid, sid, did, fid, fsid):
        """
        This function will show the properties of the selected
        foreign server node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            fid: foreign data wrapper ID
            fsid: foreign server ID
        """
        status, res = self._fetch_properties(fsid)
        if not status:
            return res

        return ajax_response(
            response=res,
            status=200
        )

    def _fetch_properties(self, fsid):
        """
        This function fetch the properties of the Foreign server.
        :param fsid:
        :return:
        """
        sql = render_template("/".join([self.template_path,
                                        self._PROPERTIES_SQL]),
                              fsid=fsid, conn=self.conn)

        status, res = self.conn.execute_dict(sql)
        if not status:
            return False, internal_server_error(errormsg=res)

        if len(res['rows']) == 0:
            return False, gone(self.not_found_error_msg())

        res['rows'][0]['is_sys_obj'] = (
            res['rows'][0]['oid'] <= self._DATABASE_LAST_SYSTEM_OID or
            self.datistemplate)

        if res['rows'][0]['fsrvoptions'] is not None:
            res['rows'][0]['fsrvoptions'] = tokenize_options(
                res['rows'][0]['fsrvoptions'], 'fsrvoption', 'fsrvvalue'
            )

        sql = render_template("/".join([self.template_path, self._ACL_SQL]),
                              fsid=fsid, conn=self.conn
                              )
        status, fs_rv_acl_res = self.conn.execute_dict(sql)
        if not status:
            return False, internal_server_error(errormsg=fs_rv_acl_res)

        for row in fs_rv_acl_res['rows']:
            privilege = parse_priv_from_db(row)
            if row['deftype'] in res['rows'][0]:
                res['rows'][0][row['deftype']].append(privilege)
            else:
                res['rows'][0][row['deftype']] = [privilege]

        return True, res['rows'][0]

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
            request.data
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
            if 'fsrvacl' in data:
                data['fsrvacl'] = parse_priv_to_db(data['fsrvacl'], ['U'])

            sql = render_template("/".join([self.template_path,
                                            self._PROPERTIES_SQL]),
                                  fdwid=fid, conn=self.conn)
            status, res1 = self.conn.execute_dict(sql)
            if not status:
                return internal_server_error(errormsg=res1)
            if len(res1['rows']) == 0:
                return gone(
                    gettext("The specified foreign server could not be found.")
                )
            fdw_data = res1['rows'][0]

            is_valid_options = False
            if 'fsrvoptions' in data:
                is_valid_options, data['fsrvoptions'] = validate_options(
                    data['fsrvoptions'], 'fsrvoption', 'fsrvvalue'
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
                                  data=data, fdwdata=fdw_data,
                                  conn=self.conn)
            status, r_set = self.conn.execute_dict(sql)
            if not status:
                return internal_server_error(errormsg=r_set)

            return jsonify(
                node=self.blueprint.generate_browser_node(
                    r_set['rows'][0]['oid'],
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
        This function will update the data for the selected
        foreign server node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            fid: foreign data wrapper ID
            fsid: foreign server ID
        """

        data = request.form if request.form else json.loads(
            request.data
        )

        try:
            sql, name = self.get_sql(gid, sid, data, did, fid, fsid)
            # Most probably this is due to error
            if not isinstance(sql, str):
                return sql
            sql = sql.strip('\n').strip(' ')
            status, res = self.conn.execute_scalar(sql)
            if not status:
                return internal_server_error(errormsg=res)

            other_node_info = {}
            if 'description' in data:
                other_node_info['description'] = data['description']

            return jsonify(
                node=self.blueprint.generate_browser_node(
                    fsid,
                    fid,
                    name,
                    icon="icon-%s" % self.node_type,
                    **other_node_info
                )
            )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @staticmethod
    def get_delete_data(cmd, fsid, request_object):
        """
        This function is used to get the data and cascade information.
        :param cmd: Command
        :param fsid: Object ID
        :param request_object: request object
        :return:
        """
        cascade = False
        # Below will decide if it's simple drop or drop with cascade call
        if cmd == 'delete':
            # This is a cascade operation
            cascade = True

        if fsid is None:
            data = request_object.form if request_object.form else \
                json.loads(request_object.data)
        else:
            data = {'ids': [fsid]}

        return cascade, data

    @check_precondition
    def delete(self, gid, sid, did, fid, fsid=None, only_sql=False):
        """
        This function will delete the selected foreign server node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            fid: foreign data wrapper ID
            fsid: foreign server ID
            only_sql:
        """
        # get the value of cascade and data
        cascade, data = self.get_delete_data(self.cmd, fsid, request)

        try:
            for fsid in data['ids']:
                # Get name of foreign data wrapper from fid
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

                # drop foreign server
                sql = render_template("/".join([self.template_path,
                                                self._DELETE_SQL]),
                                      name=name, cascade=cascade,
                                      conn=self.conn)

                # Used for schema diff tool
                if only_sql:
                    return sql.strip('\n')

                status, res = self.conn.execute_scalar(sql)
                if not status:
                    return internal_server_error(errormsg=res)

            return make_json_response(
                success=1,
                info=gettext("Foreign Server dropped")
            )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def msql(self, gid, sid, did, fid, fsid=None):
        """
        This function is used to return modified SQL for the selected foreign
        server node.

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
                # comments should be taken as is because if user enters a
                # json comment it is parsed by loads which should not happen
                if k in ('description',):
                    data[k] = v
                else:
                    data[k] = json.loads(v)
            except ValueError:
                data[k] = v
        try:
            sql, _ = self.get_sql(gid, sid, data, did, fid, fsid)
            # Most probably this is due to error
            if not isinstance(sql, str):
                return sql
            if sql == '':
                sql = "--modified SQL"

            return make_json_response(
                data=sql.strip('\n'),
                status=200)

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @staticmethod
    def _validate_fsvr_options(data, old_data):
        """
        Validate options for foreign server.
        :param data: Data.
        :param old_data: old data for get old args.
        :return: return is valid ad and change option flag.
        """
        required_args = [
            'name'
        ]
        for arg in required_args:
            if arg not in data:
                data[arg] = old_data[arg]

        is_valid_added_options = is_valid_changed_options = False
        if 'fsrvoptions' in data and data['fsrvoptions'] is not None and\
                'added' in data['fsrvoptions']:
            is_valid_added_options, data['fsrvoptions']['added'] = \
                validate_options(
                    data['fsrvoptions']['added'],
                    'fsrvoption',
                    'fsrvvalue')

        if 'fsrvoptions' in data and data['fsrvoptions'] is not None and\
                'changed' in data['fsrvoptions']:
            is_valid_changed_options, data['fsrvoptions']['changed'] = \
                validate_options(
                    data['fsrvoptions']['changed'],
                    'fsrvoption',
                    'fsrvvalue')

        return is_valid_added_options, is_valid_changed_options

    @staticmethod
    def _get_fsvr_acl(data):
        """
        Iterate and check acl type.
        :param data: Data.
        :return:
        """
        for key in ['fsrvacl']:
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
        if fsid is not None:
            sql = render_template("/".join([self.template_path,
                                            self._PROPERTIES_SQL]),
                                  fsid=fsid, conn=self.conn)
            status, res = self.conn.execute_dict(sql)
            if not status:
                return internal_server_error(errormsg=res)
            elif len(res['rows']) == 0:
                return gone(self.not_found_error_msg())
            elif res['rows'][0]['fsrvoptions'] is not None:
                res['rows'][0]['fsrvoptions'] = tokenize_options(
                    res['rows'][0]['fsrvoptions'], 'fsrvoption', 'fsrvvalue'
                )

            ForeignServerView._get_fsvr_acl(data)

            old_data = res['rows'][0]
            is_valid_added_options, \
                is_valid_changed_options = \
                ForeignServerView._validate_fsvr_options(data, old_data)

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
            sql = render_template("/".join([self.template_path,
                                            self._PROPERTIES_SQL]),
                                  fdwid=fid, conn=self.conn)
            status, res = self.conn.execute_dict(sql)
            if not status:
                return internal_server_error(errormsg=res)

            fdw_data = res['rows'][0]

            ForeignServerView._parse_priv(data)

            is_valid_options = False
            if 'fsrvoptions' in data:
                is_valid_options, data['fsrvoptions'] = validate_options(
                    data['fsrvoptions'], 'fsrvoption', 'fsrvvalue'
                )

            sql = render_template("/".join([self.template_path,
                                            self._CREATE_SQL]),
                                  data=data, fdwdata=fdw_data,
                                  is_valid_options=is_valid_options,
                                  conn=self.conn)
            sql += "\n"
        return sql, data['name']

    @staticmethod
    def _parse_priv(data):
        """
        Parse privilege data.
        :param data: Data.
        :return:
        """
        for key in ['fsrvacl']:
            if key in data and data[key] is not None:
                data[key] = parse_priv_to_db(data[key], ['U'])

    @check_precondition
    def sql(self, gid, sid, did, fid, fsid, json_resp=True):
        """
        This function will generate sql to show it in sql pane for the
        selected foreign server node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            fid: Foreign data wrapper ID
            fsid: Foreign server ID
            json_resp:
        """

        sql = render_template("/".join([self.template_path,
                                        self._PROPERTIES_SQL]),
                              fsid=fsid, conn=self.conn)
        status, res = self.conn.execute_dict(sql)
        if not status:
            return internal_server_error(errormsg=res)
        if len(res['rows']) == 0:
            return gone(self.not_found_error_msg())

        if fid is None and 'fdwid' in res['rows'][0]:
            fid = res['rows'][0]['fdwid']

        is_valid_options = False
        if res['rows'][0]['fsrvoptions'] is not None:
            res['rows'][0]['fsrvoptions'] = tokenize_options(
                res['rows'][0]['fsrvoptions'], 'fsrvoption', 'fsrvvalue'
            )

            if len(res['rows'][0]['fsrvoptions']) > 0:
                is_valid_options = True

        sql = render_template("/".join([self.template_path, self._ACL_SQL]),
                              fsid=fsid)
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
            res['rows'][0]['fsrvacl'] = parse_priv_to_db(
                res['rows'][0]['fsrvacl'],
                ['U']
            )

        sql = render_template("/".join([self.template_path,
                                        self._PROPERTIES_SQL]),
                              fdwid=fid, conn=self.conn)
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

        sql_header = """-- Foreign Server: {0}

-- DROP SERVER IF EXISTS {0}

""".format(res['rows'][0]['name'])

        sql = sql_header + sql

        if not json_resp:
            return sql.strip('\n')

        return ajax_response(response=sql.strip('\n'))

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
        query = render_template("/".join([self.template_path,
                                          'dependents.sql']),
                                fsid=fsid)
        status, result = self.conn.execute_dict(query)
        if not status:
            internal_server_error(errormsg=result)

        for row in result['rows']:
            dependents_result.append(
                {'type': 'user_mapping', 'name': row['name'],
                 'field': 'normal' if (row['deptype'] == 'n') else ''})

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
                                        self._PROPERTIES_SQL]),
                              schema_diff=True, conn=self.conn)
        status, rset = self.conn.execute_2darray(sql)
        if not status:
            return internal_server_error(errormsg=rset)

        for row in rset['rows']:
            status, data = self._fetch_properties(row['oid'])
            if status:
                # For schema diff if fsrvoptions is None then convert it to
                # the empty list.
                if 'fsrvoptions' in data and data['fsrvoptions'] is None:
                    data['fsrvoptions'] = []
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
        fdw_id = kwargs.get('fdwid')
        oid = kwargs.get('oid')
        data = kwargs.get('data', None)
        drop_sql = kwargs.get('drop_sql', False)

        if data:
            sql, _ = self.get_sql(gid=gid, sid=sid, did=did, data=data,
                                  fid=fdw_id, fsid=oid)
        else:
            if drop_sql:
                sql = self.delete(gid=gid, sid=sid, did=did, fid=fdw_id,
                                  fsid=oid, only_sql=True)
            else:
                sql = self.sql(gid=gid, sid=sid, did=did, fid=fdw_id,
                               fsid=oid, json_resp=False)
        return sql


SchemaDiffRegistry(blueprint.node_type, ForeignServerView, 'Database')
ForeignServerView.register_node_view(blueprint)
