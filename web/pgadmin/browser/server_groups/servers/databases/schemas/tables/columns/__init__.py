##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

""" Implements Column Node """

import simplejson as json
from functools import wraps

import pgadmin.browser.server_groups.servers.databases as database
from flask import render_template, request, jsonify
from flask_babelex import gettext
from pgadmin.browser.collection import CollectionNodeModule
from pgadmin.browser.server_groups.servers.databases.schemas.utils \
    import DataTypeReader
from pgadmin.browser.server_groups.servers.utils import parse_priv_from_db, \
    parse_priv_to_db
from pgadmin.browser.utils import PGChildNodeView
from pgadmin.utils.ajax import make_json_response, internal_server_error, \
    make_response as ajax_response, gone
from pgadmin.browser.server_groups.servers.databases.schemas.tables.\
    columns import utils as column_utils
from pgadmin.utils.driver import get_driver
from config import PG_DEFAULT_DRIVER
from pgadmin.utils.ajax import ColParamsJSONDecoder


class ColumnsModule(CollectionNodeModule):
    """
     class ColumnsModule(CollectionNodeModule)

        A module class for Column node derived from CollectionNodeModule.

    Methods:
    -------
    * __init__(*args, **kwargs)
      - Method is used to initialize the Column and it's base module.

    * get_nodes(gid, sid, did, scid, tid)
      - Method is used to generate the browser collection node.

    * node_inode()
      - Method is overridden from its base class to make the node as leaf node.

    * script_load()
      - Load the module script for schema, when any of the server node is
        initialized.
    """

    _NODE_TYPE = 'column'
    _COLLECTION_LABEL = gettext("Columns")

    def __init__(self, *args, **kwargs):
        """
        Method is used to initialize the ColumnModule and it's base module.

        Args:
            *args:
            **kwargs:
        """
        self.min_ver = None
        self.max_ver = None
        super(ColumnsModule, self).__init__(*args, **kwargs)

    def get_nodes(self, gid, sid, did, scid, **kwargs):
        """
        Generate the collection node
        """
        assert ('tid' in kwargs or 'vid' in kwargs)
        yield self.generate_browser_collection_node(
            kwargs['tid'] if 'tid' in kwargs else kwargs['vid']
        )

    @property
    def script_load(self):
        """
        Load the module script for server, when any of the server-group node is
        initialized.
        """
        return database.DatabaseModule.node_type

    @property
    def node_inode(self):
        """
        Load the module node as a leaf node
        """
        return False

    @property
    def module_use_template_javascript(self):
        """
        Returns whether Jinja2 template is used for generating the javascript
        module.
        """
        return False


blueprint = ColumnsModule(__name__)


class ColumnsView(PGChildNodeView, DataTypeReader):
    """
    This class is responsible for generating routes for Column node

    Methods:
    -------
    * __init__(**kwargs)
      - Method is used to initialize the ColumnView and it's base view.

    * check_precondition()
      - This function will behave as a decorator which will checks
        database connection before running view, it will also attaches
        manager,conn & template_path properties to self

    * list()
      - This function is used to list all the Column nodes within that
      collection.

    * nodes()
      - This function will used to create all the child node within that
        collection, Here it will create all the Column node.

    * properties(gid, sid, did, scid, tid, clid)
      - This function will show the properties of the selected Column node

    * create(gid, sid, did, scid, tid)
      - This function will create the new Column object

    * update(gid, sid, did, scid, tid, clid)
      - This function will update the data for the selected Column node

    * delete(self, gid, sid, scid, tid, clid):
      - This function will drop the Column object

    * msql(gid, sid, did, scid, tid, clid)
      - This function is used to return modified SQL for the selected
        Column node

    * get_sql(data, scid, tid)
      - This function will generate sql from model data

    * sql(gid, sid, did, scid):
      - This function will generate sql to show it in sql pane for the
        selected Column node.

    * dependency(gid, sid, did, scid):
      - This function will generate dependency list show it in dependency
        pane for the selected Column node.

    * dependent(gid, sid, did, scid):
      - This function will generate dependent list to show it in dependent
        pane for the selected Column node.
    """

    node_type = blueprint.node_type

    parent_ids = [
        {'type': 'int', 'id': 'gid'},
        {'type': 'int', 'id': 'sid'},
        {'type': 'int', 'id': 'did'},
        {'type': 'int', 'id': 'scid'},
        {'type': 'int', 'id': 'tid'}
    ]
    ids = [
        # Here we specify type as any because table
        # are also has '-' in them if they are system table
        {'type': 'string', 'id': 'clid'}
    ]

    operations = dict({
        'obj': [
            {'get': 'properties', 'delete': 'delete', 'put': 'update'},
            {'get': 'list', 'post': 'create', 'delete': 'delete'}
        ],
        'children': [{'get': 'children'}],
        'nodes': [{'get': 'nodes'}, {'get': 'nodes'}],
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
            driver = get_driver(PG_DEFAULT_DRIVER)
            self.manager = driver.connection_manager(
                kwargs['sid']
            )
            self.conn = self.manager.connection(did=kwargs['did'])
            self.qtIdent = driver.qtIdent
            self.qtTypeIdent = driver.qtTypeIdent

            # Set the template path for the SQL scripts
            self.template_path = 'columns/sql/#{0}#'.format(
                self.manager.version)

            # Allowed ACL for column 'Select/Update/Insert/References'
            self.acl = ['a', 'r', 'w', 'x']

            # We need parent's name eg table name and schema name
            schema, table = column_utils.get_parent(self.conn, kwargs['tid'])
            self.schema = schema
            self.table = table

            return f(*args, **kwargs)

        return wrap

    @check_precondition
    def list(self, gid, sid, did, scid, tid):
        """
        This function is used to list all the schema nodes within that
        collection.

        Args:
            gid: Server group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID
            tid: Table ID

        Returns:
            JSON of available column nodes
        """

        SQL = render_template(
            "/".join([self.template_path, self._PROPERTIES_SQL]),
            tid=tid, show_sys_objects=self.blueprint.show_system_objects
        )
        status, res = self.conn.execute_dict(SQL)

        if not status:
            return internal_server_error(errormsg=res)
        return ajax_response(
            response=res['rows'],
            status=200
        )

    @check_precondition
    def nodes(self, gid, sid, did, scid, tid, clid=None):
        """
        This function will used to create all the child node within that
        collection. Here it will create all the schema node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID
            tid: Table ID

        Returns:
            JSON of available schema child nodes
        """
        res = []
        SQL = render_template(
            "/".join([self.template_path, self._NODES_SQL]),
            tid=tid,
            clid=clid,
            show_sys_objects=self.blueprint.show_system_objects
        )
        status, rset = self.conn.execute_2darray(SQL)
        if not status:
            return internal_server_error(errormsg=rset)
        if clid is not None:
            if len(rset['rows']) == 0:
                return gone(
                    errormsg=gettext("Could not find the column.")
                )
            row = rset['rows'][0]
            return make_json_response(
                data=self.blueprint.generate_browser_node(
                    row['oid'],
                    tid,
                    row['name'],
                    icon="icon-column",
                    datatype=row['datatype']  # We need datatype somewhere in
                ),
                status=200
            )

        for row in rset['rows']:
            res.append(
                self.blueprint.generate_browser_node(
                    row['oid'],
                    tid,
                    row['name'],
                    icon="icon-column",
                    datatype=row['datatype']  # We need datatype somewhere in
                ))  # exclusion constraint.

        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition
    def properties(self, gid, sid, did, scid, tid, clid):
        """
        This function will show the properties of the selected schema node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did:  Database ID
            scid: Schema ID
            scid: Schema ID
            tid: Table ID
            clid: Column ID

        Returns:
            JSON of selected schema node
        """

        SQL = render_template(
            "/".join([self.template_path, self._PROPERTIES_SQL]),
            tid=tid, clid=clid,
            show_sys_objects=self.blueprint.show_system_objects
        )

        status, res = self.conn.execute_dict(SQL)

        if not status:
            return internal_server_error(errormsg=res)

        if len(res['rows']) == 0:
            return gone(gettext("""Could not find the column in the table."""))

        # Making copy of output for future use
        data = dict(res['rows'][0])
        data = column_utils.column_formatter(self.conn, tid, clid, data)

        return ajax_response(
            response=data,
            status=200
        )

    @check_precondition
    def create(self, gid, sid, did, scid, tid):
        """
        This function will creates new the schema object

         Args:
           gid: Server Group ID
           sid: Server ID
           did: Database ID
           scid: Schema ID
           tid: Table ID
        """
        data = request.form if request.form else json.loads(
            request.data, encoding='utf-8'
        )

        for k, v in data.items():
            # comments should be taken as is because if user enters a
            # json comment it is parsed by loads which should not happen
            if k in ('description',):
                data[k] = v
            else:
                data[k] = json.loads(v, encoding='utf-8',
                                     cls=ColParamsJSONDecoder)

        required_args = {
            'name': 'Name',
            'cltype': 'Type'
        }

        for arg in required_args:
            if arg not in data:
                return make_json_response(
                    status=410,
                    success=0,
                    errormsg=gettext(
                        "Could not find the required parameter ({})."
                    ).format(required_args[arg])
                )

        # Parse privilege data coming from client according to database format
        if 'attacl' in data:
            data['attacl'] = parse_priv_to_db(data['attacl'], self.acl)

        # Adding parent into data dict, will be using it while creating sql
        data['schema'] = self.schema
        data['table'] = self.table
        if len(data['table']) == 0:
            return gone(gettext("The specified table could not be found."))

        # check type for '[]' in it
        data['cltype'], data['hasSqrBracket'] = \
            column_utils.type_formatter(data['cltype'])
        data = column_utils.convert_length_precision_to_string(data)

        SQL = render_template("/".join([self.template_path,
                                        self._CREATE_SQL]),
                              data=data, conn=self.conn)
        status, res = self.conn.execute_scalar(SQL)
        if not status:
            return internal_server_error(errormsg=res)

        # we need oid to to add object in tree at browser
        SQL = render_template(
            "/".join([self.template_path, 'get_position.sql']),
            tid=tid, data=data
        )
        status, clid = self.conn.execute_scalar(SQL)
        if not status:
            return internal_server_error(errormsg=tid)

        return jsonify(
            node=self.blueprint.generate_browser_node(
                clid,
                tid,
                data['name'],
                icon="icon-column"
            )
        )

    @check_precondition
    def delete(self, gid, sid, did, scid, tid, clid=None):
        """
        This function will updates existing the schema object

         Args:
           gid: Server Group ID
           sid: Server ID
           did: Database ID
           scid: Schema ID
           tid: Table ID
           clid: Column ID
        """
        if clid is None:
            data = request.form if request.form else json.loads(
                request.data, encoding='utf-8'
            )
        else:
            data = {'ids': [clid]}

        # We will first fetch the column name for current request
        # so that we create template for dropping column
        try:
            for clid in data['ids']:
                SQL = render_template(
                    "/".join([self.template_path, self._PROPERTIES_SQL]),
                    tid=tid, clid=clid,
                    show_sys_objects=self.blueprint.show_system_objects
                )

                status, res = self.conn.execute_dict(SQL)
                if not status:
                    return internal_server_error(errormsg=res)

                if not res['rows']:
                    return make_json_response(
                        success=0,
                        errormsg=gettext(
                            'Error: Object not found.'
                        ),
                        info=gettext(
                            'The specified column could not be found.\n'
                        )
                    )

                data = dict(res['rows'][0])
                # We will add table & schema as well
                data['schema'] = self.schema
                data['table'] = self.table

                SQL = render_template("/".join([self.template_path,
                                                self._DELETE_SQL]),
                                      data=data, conn=self.conn)
                status, res = self.conn.execute_scalar(SQL)
                if not status:
                    return internal_server_error(errormsg=res)

            return make_json_response(
                success=1,
                info=gettext("Column is dropped"),
                data={
                    'id': clid,
                    'tid': tid
                }
            )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def update(self, gid, sid, did, scid, tid, clid):
        """
        This function will updates existing the schema object

         Args:
           gid: Server Group ID
           sid: Server ID
           did: Database ID
           scid: Schema ID
           tid: Table ID
           clid: Column ID
        """
        data = request.form if request.form else json.loads(
            request.data, encoding='utf-8'
        )

        # Adding parent into data dict, will be using it while creating sql
        data['schema'] = self.schema
        data['table'] = self.table

        # check type for '[]' in it
        if 'cltype' in data:
            data['cltype'], data['hasSqrBracket'] = \
                column_utils.type_formatter(data['cltype'])

        SQL, name = self.get_sql(scid, tid, clid, data)
        if not isinstance(SQL, str):
            return SQL
        SQL = SQL.strip('\n').strip(' ')
        status, res = self.conn.execute_scalar(SQL)
        if not status:
            return internal_server_error(errormsg=res)

        return jsonify(
            node=self.blueprint.generate_browser_node(
                clid,
                tid,
                name,
                icon="icon-%s" % self.node_type
            )
        )

    @check_precondition
    def msql(self, gid, sid, did, scid, tid, clid=None):
        """
        This function will generates modified sql for schema object

         Args:
           gid: Server Group ID
           sid: Server ID
           did: Database ID
           scid: Schema ID
           tid: Table ID
           clid: Column ID (When working with existing column)
        """
        data = dict()
        for k, v in request.args.items():
            data[k] = json.loads(v, encoding='utf-8', cls=ColParamsJSONDecoder)

        # Adding parent into data dict, will be using it while creating sql
        data['schema'] = self.schema
        data['table'] = self.table

        # check type for '[]' in it
        if 'cltype' in data:
            data['cltype'], data['hasSqrBracket'] = \
                column_utils.type_formatter(data['cltype'])

        try:
            SQL, name = self.get_sql(scid, tid, clid, data)
            if not isinstance(SQL, str):
                return SQL

            SQL = SQL.strip('\n').strip(' ')
            if SQL == '':
                SQL = "--modified SQL"
            return make_json_response(
                data=SQL,
                status=200
            )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    def _parse_acl_to_db_parsing(self, data, old_data):
        """
        Convert acl coming from client to required db parsing format.
        :param data: Data.
        :param old_data: old data for comparision and get name.
        """
        # If name is not present in data then
        # we will fetch it from old data, we also need schema & table name
        if 'name' not in data:
            data['name'] = old_data['name']

        # Convert acl coming from client in db parsing format
        key = 'attacl'
        if key in data and data[key] is not None:
            if 'added' in data[key]:
                data[key]['added'] = parse_priv_to_db(
                    data[key]['added'], self.acl
                )
            if 'changed' in data[key]:
                data[key]['changed'] = parse_priv_to_db(
                    data[key]['changed'], self.acl
                )
            if 'deleted' in data[key]:
                data[key]['deleted'] = parse_priv_to_db(
                    data[key]['deleted'], self.acl
                )

    def _get_sql_for_create(self, data, is_sql):
        """
        Get sql for create column model.
        :param data: Data.
        :param is_sql: flag for get sql.
        :return: if any error return error else return sql.
        """
        required_args = [
            'name',
            'cltype'
        ]

        for arg in required_args:
            if arg not in data:
                return True, gettext('-- definition incomplete'), ''

        # We will convert privileges coming from client required
        # in server side format
        if 'attacl' in data:
            data['attacl'] = parse_priv_to_db(data['attacl'],
                                              self.acl)
        # If the request for new object which do not have did
        sql = render_template(
            "/".join([self.template_path, self._CREATE_SQL]),
            data=data, conn=self.conn, is_sql=is_sql
        )

        return False, '', sql

    def _check_type(self, data, old_data):
        """
        Check cltype and get required data form it.
        :param data: Data.
        :param old_data: old data for check and get default values.
        """
        # check type for '[]' in it
        if 'cltype' in old_data:
            old_data['cltype'], old_data['hasSqrBracket'] = \
                column_utils.type_formatter(old_data['cltype'])

            if 'cltype' in data and data['cltype'] != old_data['cltype']:
                length, precision, typeval = \
                    self.get_length_precision(data['cltype'])

                # if new datatype does not have length or precision
                # then we cannot apply length or precision of old
                # datatype to new one.
                if not length:
                    old_data['attlen'] = -1
                if not precision:
                    old_data['attprecision'] = None

    def get_sql(self, scid, tid, clid, data, is_sql=False):
        """
        This function will generate sql from model data
        """
        data = column_utils.convert_length_precision_to_string(data)

        if clid is not None:
            sql = render_template(
                "/".join([self.template_path, self._PROPERTIES_SQL]),
                tid=tid, clid=clid,
                show_sys_objects=self.blueprint.show_system_objects
            )

            status, res = self.conn.execute_dict(sql)
            if not status:
                return internal_server_error(errormsg=res)
            elif len(res['rows']) == 0:
                return gone(
                    gettext("Could not find the column on the server.")
                )
            old_data = dict(res['rows'][0])

            is_view_only = True if 'is_view_only' in old_data and old_data[
                'is_view_only'] else False

            if 'seqcycle' in old_data and old_data['seqcycle'] is False:
                old_data['seqcycle'] = None
            # We will add table & schema as well
            old_data = column_utils.column_formatter(
                self.conn, tid, clid, old_data)

            self._check_type(data, old_data)
            self._parse_acl_to_db_parsing(data, old_data)

            sql = render_template(
                "/".join([self.template_path, self._UPDATE_SQL]),
                data=data, o_data=old_data, conn=self.conn,
                is_view_only=is_view_only
            )
        else:
            is_error, errmsg, sql = self._get_sql_for_create(data, is_sql)
            if is_error:
                return errmsg

        return sql, data['name'] if 'name' in data else old_data['name']

    @check_precondition
    def sql(self, gid, sid, did, scid, tid, clid):
        """
        This function will generates reverse engineered sql for schema object

         Args:
           gid: Server Group ID
           sid: Server ID
           did: Database ID
           scid: Schema ID
           tid: Table ID
           clid: Column ID
        """
        try:
            SQL = render_template(
                "/".join([self.template_path, self._PROPERTIES_SQL]),
                tid=tid, clid=clid,
                show_sys_objects=self.blueprint.show_system_objects
            )

            status, res = self.conn.execute_dict(SQL)
            if not status:
                return internal_server_error(errormsg=res)
            if len(res['rows']) == 0:
                return gone(
                    gettext("Could not find the column on the server.")
                )

            data = dict(res['rows'][0])
            # We do not want to display length as -1 in create query
            if 'attlen' in data and data['attlen'] == -1:
                data['attlen'] = ''
            # Adding parent into data dict, will be using it while creating sql
            data['schema'] = self.schema
            data['table'] = self.table
            # check type for '[]' in it
            if 'cltype' in data:
                data['cltype'], data['hasSqrBracket'] = \
                    column_utils.type_formatter(data['cltype'])

            # We will add table & schema as well
            # Passing edit_types_list param so that it does not fetch
            # edit types. It is not required here.
            data = column_utils.column_formatter(self.conn, tid, clid,
                                                 data, [])

            SQL, name = self.get_sql(scid, tid, None, data, is_sql=True)
            if not isinstance(SQL, str):
                return SQL

            sql_header = u"-- Column: {0}\n\n-- ".format(
                self.qtIdent(
                    self.conn, data['schema'], data['table'], data['name'])
            )

            sql_header += render_template(
                "/".join([self.template_path, self._DELETE_SQL]),
                data=data, conn=self.conn
            )
            SQL = sql_header + '\n\n' + SQL

            return ajax_response(response=SQL.strip('\n'))

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def dependents(self, gid, sid, did, scid, tid, clid):
        """
        This function get the dependents and return ajax response
        for the column node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID
            tid: Table ID
            clid: Column ID
        """
        # Specific condition for column which we need to append
        where = "WHERE dep.refobjid={0}::OID AND dep.refobjsubid={1}".format(
            tid, clid
        )

        dependents_result = self.get_dependents(
            self.conn, clid, where=where
        )

        # Specific sql to run againt column to fetch dependents
        SQL = render_template("/".join([self.template_path,
                                        'depend.sql']), where=where)

        status, res = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=res)

        for row in res['rows']:
            ref_name = row['refname']
            if ref_name is None:
                continue

            dep_type = ''
            dep_str = row['deptype']
            if dep_str == 'a':
                dep_type = 'auto'
            elif dep_str == 'n':
                dep_type = 'normal'
            elif dep_str == 'i':
                dep_type = 'internal'

            dependents_result.append(
                {'type': 'sequence', 'name': ref_name, 'field': dep_type}
            )

        return ajax_response(
            response=dependents_result,
            status=200
        )

    @check_precondition
    def dependencies(self, gid, sid, did, scid, tid, clid):
        """
        This function get the dependencies and return ajax response
        for the column node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID
            tid: Table ID
            clid: Column ID

        """

        # Specific condition for column which we need to append
        where = "WHERE dep.objid={0}::OID AND dep.objsubid={1}".format(
            tid, clid
        )

        # Specific condition for column which we need to append
        dependencies_result = self.get_dependencies(
            self.conn, clid, where
        )

        return ajax_response(
            response=dependencies_result,
            status=200
        )

    @check_precondition
    def statistics(self, gid, sid, did, scid, tid, clid):
        """
        Statistics

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            seid: Sequence Id

        Returns the statistics for a particular object if seid is specified
        """
        # Fetch column name
        SQL = render_template(
            "/".join([self.template_path, self._PROPERTIES_SQL]),
            tid=tid, clid=clid,
            show_sys_objects=self.blueprint.show_system_objects
        )

        status, res = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=res)
        if len(res['rows']) == 0:
            return gone(
                gettext("Could not find the column on the server.")
            )

        data = dict(res['rows'][0])
        column = data['name']

        status, res = self.conn.execute_dict(
            render_template(
                "/".join([self.template_path, 'stats.sql']),
                conn=self.conn, schema=self.schema,
                table=self.table, column=column
            )
        )

        if not status:
            return internal_server_error(errormsg=res)

        return make_json_response(
            data=res,
            status=200
        )


ColumnsView.register_node_view(blueprint)
