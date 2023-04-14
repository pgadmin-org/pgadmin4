##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

""" Implements Collation Node """

from functools import wraps

import json
from flask import render_template, request, jsonify
from flask_babel import gettext

import pgadmin.browser.server_groups.servers.databases as database
from config import PG_DEFAULT_DRIVER
from pgadmin.browser.server_groups.servers.databases.schemas.utils \
    import SchemaChildModule
from pgadmin.browser.utils import PGChildNodeView
from pgadmin.utils.ajax import make_json_response, internal_server_error, \
    make_response as ajax_response, gone
from pgadmin.utils.compile_template_name import compile_template_path
from pgadmin.utils.driver import get_driver
from pgadmin.tools.schema_diff.node_registry import SchemaDiffRegistry
from pgadmin.tools.schema_diff.compare import SchemaDiffObjectCompare


class CollationModule(SchemaChildModule):
    """
     class CollationModule(CollectionNodeModule)

        A module class for Collation node derived from CollectionNodeModule.

    Methods:
    -------
    * __init__(*args, **kwargs)
      - Method is used to initialize the Collation and it's base module.

    * get_nodes(gid, sid, did, scid, coid)
      - Method is used to generate the browser collection node.

    * node_inode()
      - Method is overridden from its base class to make the node as leaf node.

    * script_load()
      - Load the module script for schema, when any of the server node is
        initialized.
    """

    _NODE_TYPE = 'collation'
    _COLLECTION_LABEL = gettext("Collations")

    def __init__(self, *args, **kwargs):
        """
        Method is used to initialize the CollationModule and it's base module.

        Args:
            *args:
            **kwargs:
        """

        super().__init__(*args, **kwargs)
        self.min_ver = 90100
        self.max_ver = None

    def get_nodes(self, gid, sid, did, scid):
        """
        Generate the collection node
        """
        yield self.generate_browser_collection_node(scid)

    @property
    def script_load(self):
        """
        Load the module script for database, when any of the database node is
        initialized.
        """
        return database.DatabaseModule.node_type

    @property
    def node_inode(self):
        return False


blueprint = CollationModule(__name__)


class CollationView(PGChildNodeView, SchemaDiffObjectCompare):
    """
    This class is responsible for generating routes for Collation node

    Methods:
    -------
    * __init__(**kwargs)
      - Method is used to initialize the CollationView and it's base view.

    * check_precondition()
      - This function will behave as a decorator which will checks
        database connection before running view, it will also attaches
        manager,conn & template_path properties to self

    * list()
      - This function is used to list all the Collation nodes within that
      collection.

    * nodes()
      - This function will used to create all the child node within that
        collection, Here it will create all the Collation node.

    * properties(gid, sid, did, scid, coid)
      - This function will show the properties of the selected Collation node

    * create(gid, sid, did, scid)
      - This function will create the new Collation object

    * update(gid, sid, did, scid, coid)
      - This function will update the data for the selected Collation node

    * delete(self, gid, sid, scid, coid):
      - This function will drop the Collation object

    * msql(gid, sid, did, scid, coid)
      - This function is used to return modified SQL for the selected
        Collation node

    * get_sql(data, scid, coid)
      - This function will generate sql from model data

    * sql(gid, sid, did, scid):
      - This function will generate sql to show it in sql pane for the
        selected Collation node.

    * dependency(gid, sid, did, scid):
      - This function will generate dependency list show it in dependency
        pane for the selected Collation node.

    * dependent(gid, sid, did, scid):
      - This function will generate dependent list to show it in dependent
        pane for the selected Collation node.

    * compare(**kwargs):
      - This function will compare the collation nodes from two different
        schemas.
    """

    node_type = blueprint.node_type
    node_label = "Collation"

    parent_ids = [
        {'type': 'int', 'id': 'gid'},
        {'type': 'int', 'id': 'sid'},
        {'type': 'int', 'id': 'did'},
        {'type': 'int', 'id': 'scid'}
    ]
    ids = [
        {'type': 'int', 'id': 'coid'}
    ]

    operations = dict({
        'obj': [
            {'get': 'properties', 'delete': 'delete', 'put': 'update'},
            {'get': 'list', 'post': 'create', 'delete': 'delete'}
        ],
        'delete': [{'delete': 'delete'}, {'delete': 'delete'}],
        'children': [{'get': 'children'}],
        'nodes': [{'get': 'node'}, {'get': 'nodes'}],
        'sql': [{'get': 'sql'}],
        'msql': [{'get': 'msql'}, {'get': 'msql'}],
        'stats': [{'get': 'statistics'}],
        'dependency': [{'get': 'dependencies'}],
        'dependent': [{'get': 'dependents'}],
        'get_collations': [{'get': 'get_collation'},
                           {'get': 'get_collation'}],
        'compare': [{'get': 'compare'}, {'get': 'compare'}]
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
            self.datistemplate = False
            if (
                self.manager.db_info is not None and
                kwargs['did'] in self.manager.db_info and
                'datistemplate' in self.manager.db_info[kwargs['did']]
            ):
                self.datistemplate = self.manager.db_info[
                    kwargs['did']]['datistemplate']

            # Set the template path for the SQL scripts
            self.template_path = compile_template_path(
                'collations/sql/',
                self.manager.version
            )

            return f(*args, **kwargs)

        return wrap

    @check_precondition
    def list(self, gid, sid, did, scid):
        """
        This function is used to list all the collation nodes within that
        collection.

        Args:
            gid: Server group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID

        Returns:
            JSON of available collation nodes
        """

        SQL = render_template("/".join([self.template_path,
                                        self._PROPERTIES_SQL]), scid=scid)
        status, res = self.conn.execute_dict(SQL)

        if not status:
            return internal_server_error(errormsg=res)
        return ajax_response(
            response=res['rows'],
            status=200
        )

    @check_precondition
    def nodes(self, gid, sid, did, scid):
        """
        This function will used to create all the child node within that
        collection.
        Here it will create all the collation node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID

        Returns:
            JSON of available collation child nodes
        """

        res = []
        SQL = render_template("/".join([self.template_path,
                                        self._NODES_SQL]), scid=scid)
        status, rset = self.conn.execute_2darray(SQL)
        if not status:
            return internal_server_error(errormsg=rset)

        for row in rset['rows']:
            res.append(
                self.blueprint.generate_browser_node(
                    row['oid'],
                    scid,
                    row['name'],
                    icon="icon-collation",
                    description=row['description']
                ))

        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition
    def node(self, gid, sid, did, scid, coid):
        """
        This function will fetch properties of the collation node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID
            coid: Collation ID

        Returns:
            JSON of given collation node
        """

        SQL = render_template("/".join([self.template_path,
                                        self._NODES_SQL]), coid=coid)
        status, rset = self.conn.execute_2darray(SQL)
        if not status:
            return internal_server_error(errormsg=rset)

        for row in rset['rows']:
            return make_json_response(
                data=self.blueprint.generate_browser_node(
                    row['oid'],
                    scid,
                    row['name'],
                    icon="icon-collation"
                ),
                status=200
            )

        return gone(self.not_found_error_msg())

    @check_precondition
    def properties(self, gid, sid, did, scid, coid):
        """
        This function will show the properties of the selected collation node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did:  Database ID
            scid: Schema ID
            scid: Schema ID
            coid: Collation ID

        Returns:
            JSON of selected collation node
        """

        status, res = self._fetch_properties(scid, coid)
        if not status:
            return res

        return ajax_response(
            response=res,
            status=200
        )

    def _fetch_properties(self, scid, coid):
        """
        This function fetch the properties for the specified object.

        :param scid: Schema ID
        :param coid: Collation ID
        """

        SQL = render_template("/".join([self.template_path,
                                        self._PROPERTIES_SQL]),
                              scid=scid, coid=coid,
                              datlastsysoid=self._DATABASE_LAST_SYSTEM_OID)
        status, res = self.conn.execute_dict(SQL)

        if not status:
            return False, internal_server_error(errormsg=res)

        if len(res['rows']) == 0:
            return False, gone(self.not_found_error_msg())

        res['rows'][0]['is_sys_obj'] = (
            res['rows'][0]['oid'] <= self._DATABASE_LAST_SYSTEM_OID or
            self.datistemplate)

        return True, res['rows'][0]

    @check_precondition
    def get_collation(self, gid, sid, did, scid, coid=None):
        """
        This function will return list of collation available
        as AJAX response.
        """

        res = []
        try:
            SQL = render_template("/".join([self.template_path,
                                            'get_collations.sql']))
            status, rset = self.conn.execute_2darray(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            for row in rset['rows']:
                res.append(
                    {'label': row['copy_collation'],
                     'value': row['copy_collation']}
                )
            return make_json_response(
                data=res,
                status=200
            )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    def _check_definition(self, data):
        """
        Args:
            data: request data received from client

        Returns:
            True if defination is missing, False otherwise
        """
        definition_args = [
            'locale',
            'copy_collation',
            'lc_collate',
            'lc_type'
        ]

        # Additional server side validation to check if
        # definition is sent properly from client side
        missing_definition_flag = False

        for arg in definition_args:
            if (
                arg == 'locale' and
                (arg not in data or data[arg] == '') and
                'copy_collation' not in data and
                'lc_collate' not in data and 'lc_type' not in data
            ):
                missing_definition_flag = True

            if (
                arg == 'copy_collation' and
                (arg not in data or data[arg] == '') and
                'locale' not in data and
                'lc_collate' not in data and 'lc_type' not in data
            ):
                missing_definition_flag = True

            if (
                (arg == 'lc_collate' or arg == 'lc_type') and
                (arg not in data or data[arg] == '') and
                'copy_collation' not in data and 'locale' not in data
            ):
                missing_definition_flag = True

        return missing_definition_flag

    @check_precondition
    def create(self, gid, sid, did, scid):
        """
        This function will creates new the collation object

         Args:
           gid: Server Group ID
           sid: Server ID
           did: Database ID
           scid: Schema ID
        """

        data = request.form if request.form else json.loads(
            request.data
        )

        required_args = [
            'schema',
            'name'
        ]

        for arg in required_args:
            if arg not in data:
                return make_json_response(
                    status=410,
                    success=0,
                    errormsg=gettext(
                        "Could not find the required parameter ({})."
                    ).format(arg)
                )
        if self._check_definition(data):
            return make_json_response(
                status=410,
                success=0,
                errormsg=gettext(
                    "Definition incomplete. Please provide Locale OR Copy "
                    "Collation OR LC_TYPE/LC_COLLATE."
                )
            )

        SQL = render_template(
            "/".join([self.template_path, self._CREATE_SQL]),
            data=data, conn=self.conn
        )
        status, res = self.conn.execute_scalar(SQL)
        if not status:
            return internal_server_error(errormsg=res)

        # We need oid to add object in tree at browser
        SQL = render_template(
            "/".join([self.template_path, self._OID_SQL]), data=data,
            conn=self.conn
        )
        status, coid = self.conn.execute_scalar(SQL)
        if not status:
            return internal_server_error(errormsg=coid)

        # Get updated schema oid
        SQL = render_template(
            "/".join([self.template_path, self._OID_SQL]), coid=coid,
            conn=self.conn
        )

        status, new_scid = self.conn.execute_scalar(SQL)
        if not status:
            return internal_server_error(errormsg=coid)

        return jsonify(
            node=self.blueprint.generate_browser_node(
                coid,
                new_scid,
                data['name'],
                icon="icon-collation"
            )
        )

    @check_precondition
    def delete(self, gid, sid, did, scid, coid=None, only_sql=False):
        """
        This function will delete the existing collation object

         Args:
           gid: Server Group ID
           sid: Server ID
           did: Database ID
           scid: Schema ID
           coid: Collation ID
           only_sql: Return only sql if True
        """
        data = json.loads(request.data) if coid is None \
            else {'ids': [coid]}

        # Below will decide if it's simple drop or drop with cascade call

        cascade = self._check_cascade_operation()

        try:
            for coid in data['ids']:
                SQL = render_template("/".join([self.template_path,
                                                'get_name.sql']),
                                      scid=scid, coid=coid)
                status, res = self.conn.execute_dict(SQL)
                if not status:
                    return internal_server_error(errormsg=res)

                if len(res['rows']) == 0:
                    return gone(self.not_found_error_msg())

                data = res['rows'][0]

                SQL = render_template("/".join([self.template_path,
                                                self._DELETE_SQL]),
                                      name=data['name'],
                                      nspname=data['schema'],
                                      cascade=cascade,
                                      conn=self.conn)

                # Used for schema diff tool
                if only_sql:
                    return SQL

                status, res = self.conn.execute_scalar(SQL)
                if not status:
                    return internal_server_error(errormsg=res)

            return make_json_response(
                success=1,
                info=gettext("Collation dropped")
            )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def update(self, gid, sid, did, scid, coid):
        """
        This function will updates the existing collation object

         Args:
           gid: Server Group ID
           sid: Server ID
           did: Database ID
           scid: Schema ID
           coid: Collation ID
        """
        data = request.form if request.form else json.loads(
            request.data
        )
        SQL, name = self.get_sql(gid, sid, data, scid, coid)
        # Most probably this is due to error
        if not isinstance(SQL, str):
            return SQL
        SQL = SQL.strip('\n').strip(' ')
        status, res = self.conn.execute_scalar(SQL)

        if not status:
            return internal_server_error(errormsg=res)

        # We need oid to add object in tree at browser
        SQL = render_template("/".join([self.template_path,
                                        self._OID_SQL]), coid=coid)

        status, res = self.conn.execute_2darray(SQL)
        if not status:
            return internal_server_error(errormsg=res)

        scid = res['rows'][0]['scid']

        other_node_info = {}
        if 'description' in data:
            other_node_info['description'] = data['description']

        return jsonify(
            node=self.blueprint.generate_browser_node(
                coid,
                scid,
                name,
                icon="icon-%s" % self.node_type,
                **other_node_info
            )
        )

    @check_precondition
    def msql(self, gid, sid, did, scid, coid=None):
        """
        This function will generates modified sql for collation object

         Args:
           gid: Server Group ID
           sid: Server ID
           did: Database ID
           scid: Schema ID
           coid: Collation ID
        """
        data = dict()
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
            SQL, name = self.get_sql(gid, sid, data, scid, coid)
            # Most probably this is due to error
            if not isinstance(SQL, str):
                return SQL
            if SQL == '':
                SQL = "--modified SQL"

            return make_json_response(
                data=SQL,
                status=200
            )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    def get_sql(self, gid, sid, data, scid, coid=None):
        """
        This function will genrate sql from model data
        """
        if coid is not None:
            SQL = render_template("/".join([self.template_path,
                                            self._PROPERTIES_SQL]),
                                  scid=scid, coid=coid)
            status, res = self.conn.execute_dict(SQL)
            if not status:
                return internal_server_error(errormsg=res)
            if len(res['rows']) == 0:
                return gone(self.not_found_error_msg())

            old_data = res['rows'][0]
            SQL = render_template(
                "/".join([self.template_path, self._UPDATE_SQL]),
                data=data, o_data=old_data, conn=self.conn
            )
            return SQL.strip('\n'), data['name'] if 'name' in data else \
                old_data['name']
        else:
            required_args = [
                'name'
            ]

            for arg in required_args:
                if arg not in data:
                    return gettext("-- missing definition")

            if self._check_definition(data):
                return gettext("-- missing definition")

            SQL = render_template("/".join([self.template_path,
                                            self._CREATE_SQL]),
                                  data=data, conn=self.conn)
            return SQL.strip('\n'), data['name']

    @check_precondition
    def sql(self, gid, sid, did, scid, coid, **kwargs):
        """
        This function will generates reverse engineered sql for collation
        object

         Args:
           gid: Server Group ID
           sid: Server ID
           did: Database ID
           scid: Schema ID
           coid: Collation ID
           json_resp: True then return json response
        """
        json_resp = kwargs.get('json_resp', True)
        target_schema = kwargs.get('target_schema', None)

        SQL = render_template("/".join([self.template_path,
                                        self._PROPERTIES_SQL]),
                              scid=scid, coid=coid)
        status, res = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=res)
        if len(res['rows']) == 0:
            return gone(self.not_found_error_msg())

        data = res['rows'][0]
        if target_schema:
            data['schema'] = target_schema

        SQL = render_template("/".join([self.template_path,
                                        self._CREATE_SQL]),
                              data=data, conn=self.conn,
                              add_not_exists_clause=True
                              )

        sql_header = "-- Collation: {0};\n\n-- ".format(data['name'])

        sql_header += render_template("/".join([self.template_path,
                                                self._DELETE_SQL]),
                                      name=data['name'],
                                      nspname=data['schema'])
        SQL = sql_header + '\n\n' + SQL.strip('\n')

        if not json_resp:
            return SQL

        return ajax_response(response=SQL)

    @check_precondition
    def dependents(self, gid, sid, did, scid, coid):
        """
        This function get the dependents and return ajax response
        for the Collation node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID
            coid: Collation ID
        """
        dependents_result = self.get_dependents(
            self.conn, coid
        )

        return ajax_response(
            response=dependents_result,
            status=200
        )

    @check_precondition
    def dependencies(self, gid, sid, did, scid, coid):
        """
        This function get the dependencies and return ajax response
        for the Collation node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID
            coid: Collation ID
        """
        dependencies_result = self.get_dependencies(
            self.conn, coid
        )

        return ajax_response(
            response=dependencies_result,
            status=200
        )

    @check_precondition
    def fetch_objects_to_compare(self, sid, did, scid):
        """
        This function will fetch the list of all the collations for
        specified schema id.

        :param sid: Server Id
        :param did: Database Id
        :param scid: Schema Id
        :return:
        """
        res = dict()
        SQL = render_template("/".join([self.template_path,
                                        self._NODES_SQL]), scid=scid,
                              schema_diff=True)
        status, rset = self.conn.execute_2darray(SQL)
        if not status:
            return internal_server_error(errormsg=res)

        for row in rset['rows']:
            status, data = self._fetch_properties(scid, row['oid'])
            if status:
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
        scid = kwargs.get('scid')
        oid = kwargs.get('oid')
        data = kwargs.get('data', None)
        drop_sql = kwargs.get('drop_sql', False)
        target_schema = kwargs.get('target_schema', None)

        if data:
            if target_schema:
                data['schema'] = target_schema
            sql, name = self.get_sql(gid=gid, sid=sid, data=data, scid=scid,
                                     coid=oid)
        else:
            if drop_sql:
                sql = self.delete(gid=gid, sid=sid, did=did,
                                  scid=scid, coid=oid, only_sql=True)
            elif target_schema:
                sql = self.sql(gid=gid, sid=sid, did=did, scid=scid, coid=oid,
                               target_schema=target_schema, json_resp=False)
            else:
                sql = self.sql(gid=gid, sid=sid, did=did, scid=scid, coid=oid,
                               json_resp=False)
        return sql


SchemaDiffRegistry(blueprint.node_type, CollationView)
CollationView.register_node_view(blueprint)
