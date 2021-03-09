##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

""" Implements Index Node """

import simplejson as json
from functools import wraps

import pgadmin.browser.server_groups.servers.databases as database
from flask import render_template, request, jsonify, current_app
from flask_babelex import gettext
from pgadmin.browser.collection import CollectionNodeModule
from pgadmin.browser.server_groups.servers.databases.schemas.tables.\
    partitions import backend_supported
from pgadmin.browser.utils import PGChildNodeView
from pgadmin.utils.ajax import make_json_response, internal_server_error, \
    make_response as ajax_response, gone
from pgadmin.utils.compile_template_name import compile_template_path
from pgadmin.utils.driver import get_driver
from config import PG_DEFAULT_DRIVER
from pgadmin.tools.schema_diff.node_registry import SchemaDiffRegistry
from pgadmin.tools.schema_diff.directory_compare import directory_diff
from pgadmin.tools.schema_diff.compare import SchemaDiffObjectCompare
from pgadmin.browser.server_groups.servers.databases.schemas. \
    tables.indexes import utils as index_utils


class IndexesModule(CollectionNodeModule):
    """
     class IndexesModule(CollectionNodeModule)

        A module class for Index node derived from CollectionNodeModule.

    Methods:
    -------
    * __init__(*args, **kwargs)
      - Method is used to initialize the Index and it's base module.

    * get_nodes(gid, sid, did, scid, tid)
      - Method is used to generate the browser collection node.

    * node_inode()
      - Method is overridden from its base class to make the node as leaf node.

    * script_load()
      - Load the module script for schema, when any of the server node is
        initialized.
    """

    _NODE_TYPE = 'index'
    _COLLECTION_LABEL = gettext("Indexes")

    def __init__(self, *args, **kwargs):
        """
        Method is used to initialize the IndexModule and it's base module.

        Args:
            *args:
            **kwargs:
        """
        self.min_ver = None
        self.max_ver = None
        super(IndexesModule, self).__init__(*args, **kwargs)

    def backend_supported(self, manager, **kwargs):
        """
        Load this module if vid is view, we will not load it under
        material view
        """
        if super(IndexesModule, self).backend_supported(manager, **kwargs):
            conn = manager.connection(did=kwargs['did'])

            # If PG version > 100000 and < 110000 then index is
            # not supported for partitioned table.
            if 'tid' in kwargs and 100000 <= manager.version < 110000:
                return not backend_supported(self, manager, **kwargs)

            if 'vid' not in kwargs:
                return True

            template_path = 'indexes/sql/#{0}#'.format(manager.version)
            SQL = render_template(
                "/".join([template_path, 'backend_support.sql']),
                vid=kwargs['vid']
            )
            status, res = conn.execute_scalar(SQL)

            # check if any errors
            if not status:
                return internal_server_error(errormsg=res)
            # Check vid is view not material view
            # then true, othewise false
            return res

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


blueprint = IndexesModule(__name__)


class IndexesView(PGChildNodeView, SchemaDiffObjectCompare):
    """
    This class is responsible for generating routes for Index node

    Methods:
    -------
    * __init__(**kwargs)
      - Method is used to initialize the IndexView and it's base view.

    * check_precondition()
      - This function will behave as a decorator which will checks
        database connection before running view, it will also attaches
        manager,conn & template_path properties to self

    * list()
      - This function is used to list all the Index nodes within that
      collection.

    * nodes()
      - This function will used to create all the child node within that
        collection, Here it will create all the Index node.

    * node()
      - This function will used to create the child node within that
        collection, Here it will create specific the Index node.

    * properties(gid, sid, did, scid, tid, idx)
      - This function will show the properties of the selected Index node

    * create(gid, sid, did, scid, tid)
      - This function will create the new Index object

    * update(gid, sid, did, scid, tid, idx)
      - This function will update the data for the selected Index node

    * delete(self, gid, sid, scid, tid, idx):
      - This function will drop the Index object

    * msql(gid, sid, did, scid, tid, idx)
      - This function is used to return modified SQL for the selected
        Index node

    * get_sql(data, scid, tid)
      - This function will generate sql from model data

    * sql(gid, sid, did, scid):
      - This function will generate sql to show it in sql pane for the
        selected Index node.

    * dependency(gid, sid, did, scid):
      - This function will generate dependency list show it in dependency
        pane for the selected Index node.

    * dependent(gid, sid, did, scid):
      - This function will generate dependent list to show it in dependent
        pane for the selected Index node.
    """

    node_type = blueprint.node_type
    node_label = "Index"

    parent_ids = [
        {'type': 'int', 'id': 'gid'},
        {'type': 'int', 'id': 'sid'},
        {'type': 'int', 'id': 'did'},
        {'type': 'int', 'id': 'scid'},
        {'type': 'int', 'id': 'tid'}
    ]
    ids = [
        {'type': 'int', 'id': 'idx'}
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
        'stats': [{'get': 'statistics'}, {'get': 'statistics'}],
        'dependency': [{'get': 'dependencies'}],
        'dependent': [{'get': 'dependents'}],
        'get_collations': [{'get': 'get_collations'},
                           {'get': 'get_collations'}],
        'get_access_methods': [{'get': 'get_access_methods'},
                               {'get': 'get_access_methods'}],
        'get_op_class': [{'get': 'get_op_class'},
                         {'get': 'get_op_class'}]
    })

    # Schema Diff: Keys to ignore while comparing
    keys_to_ignore = ['oid', 'relowner', 'schema', 'indclass',
                      'indrelid', 'nspname', 'oid-2']

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
            # We need datlastsysoid to check if current index is system index
            self.datlastsysoid = self.manager.db_info[
                kwargs['did']
            ]['datlastsysoid'] if self.manager.db_info is not None and \
                kwargs['did'] in self.manager.db_info else 0

            self.table_template_path = compile_template_path(
                'tables/sql',
                self.manager.server_type,
                self.manager.version
            )

            # we will set template path for sql scripts
            self.template_path = compile_template_path(
                'indexes/sql/',
                self.manager.server_type,
                self.manager.version
            )

            # We need parent's name eg table name and schema name
            # when we create new index in update we can fetch it using
            # property sql
            schema, table = index_utils.get_parent(self.conn, kwargs['tid'])
            self.schema = schema
            self.table = table

            return f(*args, **kwargs)

        return wrap

    @check_precondition
    def get_collations(self, gid, sid, did, scid, tid, idx=None):
        """
        This function will return list of collation available
        via AJAX response
        """
        res = [{'label': '', 'value': ''}]
        try:
            SQL = render_template(
                "/".join([self.template_path, 'get_collations.sql'])
            )
            status, rset = self.conn.execute_2darray(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            for row in rset['rows']:
                res.append(
                    {'label': row['collation'],
                     'value': row['collation']}
                )
            return make_json_response(
                data=res,
                status=200
            )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def get_access_methods(self, gid, sid, did, scid, tid, idx=None):
        """
        This function will return list of access methods available
        via AJAX response
        """
        res = [{'label': '', 'value': ''}]
        try:
            SQL = render_template("/".join([self.template_path, 'get_am.sql']))
            status, rset = self.conn.execute_2darray(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            for row in rset['rows']:
                res.append(
                    {'label': row['amname'],
                     'value': row['amname']}
                )
            return make_json_response(
                data=res,
                status=200
            )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def get_op_class(self, gid, sid, did, scid, tid, idx=None):
        """
        This function will return list of op_class method
        for each access methods available via AJAX response
        """
        res = dict()
        try:
            # Fetching all the access methods
            SQL = render_template("/".join([self.template_path, 'get_am.sql']))
            status, rset = self.conn.execute_2darray(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            for row in rset['rows']:
                # Fetching all the op_classes for each access method
                SQL = render_template(
                    "/".join([self.template_path, 'get_op_class.sql']),
                    oid=row['oid']
                )
                status, result = self.conn.execute_2darray(SQL)
                if not status:
                    return internal_server_error(errormsg=res)

                op_class_list = [{'label': '', 'value': ''}]

                for r in result['rows']:
                    op_class_list.append({'label': r['opcname'],
                                          'value': r['opcname']})

                # Append op_class list in main result as collection
                res[row['amname']] = op_class_list

            return make_json_response(
                data=res,
                status=200
            )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

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
            JSON of available schema nodes
        """

        SQL = render_template(
            "/".join([self.template_path, self._NODES_SQL]), tid=tid
        )
        status, res = self.conn.execute_dict(SQL)

        if not status:
            return internal_server_error(errormsg=res)
        return ajax_response(
            response=res['rows'],
            status=200
        )

    @check_precondition
    def node(self, gid, sid, did, scid, tid, idx):
        """
        This function will used to create all the child node within that
        collection. Here it will create all the schema node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID
            tid: Table ID
            idx: Index ID

        Returns:
            JSON of available schema child nodes
        """
        SQL = render_template(
            "/".join([self.template_path, self._NODES_SQL]),
            tid=tid, idx=idx
        )
        status, rset = self.conn.execute_2darray(SQL)
        if not status:
            return internal_server_error(errormsg=rset)

        if len(rset['rows']) == 0:
            return gone(self.not_found_error_msg())

        res = self.blueprint.generate_browser_node(
            rset['rows'][0]['oid'],
            tid,
            rset['rows'][0]['name'],
            icon="icon-index"
        )

        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition
    def nodes(self, gid, sid, did, scid, tid):
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
            "/".join([self.template_path, self._NODES_SQL]), tid=tid
        )
        status, rset = self.conn.execute_2darray(SQL)
        if not status:
            return internal_server_error(errormsg=rset)

        for row in rset['rows']:
            res.append(
                self.blueprint.generate_browser_node(
                    row['oid'],
                    tid,
                    row['name'],
                    icon="icon-index"
                ))

        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition
    def properties(self, gid, sid, did, scid, tid, idx):
        """
        This function will show the properties of the selected schema node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did:  Database ID
            scid: Schema ID
            scid: Schema ID
            tid: Table ID
            idx: Index ID

        Returns:
            JSON of selected schema node
        """
        status, data = self._fetch_properties(did, tid, idx)
        if not status:
            return data

        return ajax_response(
            response=data,
            status=200
        )

    def _fetch_properties(self, did, tid, idx):
        """
        This function is used to fetch the properties of specified object.
        :param did:
        :param tid:
        :param idx:
        :return:
        """
        SQL = render_template(
            "/".join([self.template_path, self._PROPERTIES_SQL]),
            did=did, tid=tid, idx=idx, datlastsysoid=self.datlastsysoid
        )

        status, res = self.conn.execute_dict(SQL)
        if not status:
            return False, internal_server_error(errormsg=res)

        if len(res['rows']) == 0:
            return False, gone(self.not_found_error_msg())

        # Making copy of output for future use
        data = dict(res['rows'][0])

        # Add column details for current index
        data = index_utils.get_column_details(self.conn, idx, data)

        # Add Include details of the index
        if self.manager.version >= 110000:
            data = index_utils.get_include_details(self.conn, idx, data)

        return True, data

    @staticmethod
    def _check_for_error(required_args, data):
        """
        This function is used to check for any error.
        :param required_args:
        :param data:
        :return:
        """
        for arg in required_args:
            err_msg = None
            if arg == 'columns' and len(data['columns']) < 1:
                err_msg = gettext("You must provide one or more column to "
                                  "create index.")

            if arg not in data:
                err_msg = gettext("Could not find the required parameter ({})"
                                  ".").format(required_args[arg])
                # Check if we have at least one column
            if err_msg is not None:
                return True, err_msg
        return False, ''

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
            try:
                # comments should be taken as is because if user enters a
                # json comment it is parsed by loads which should not happen
                if k in ('description',):
                    data[k] = v
                else:
                    data[k] = json.loads(v, encoding='utf-8')
            except (ValueError, TypeError, KeyError):
                data[k] = v

        required_args = {
            'name': 'Name',
            'columns': 'Columns'
        }

        is_error, err_msg = IndexesView._check_for_error(required_args, data)
        if is_error:
            return make_json_response(
                status=410,
                success=0,
                errormsg=gettext(err_msg)
            )

        # Adding parent into data dict, will be using it while creating sql
        data['schema'] = self.schema
        data['table'] = self.table
        if len(data['table']) == 0:
            return gone(gettext(self.not_found_error_msg('Table')))

        try:
            # Start transaction.
            self.conn.execute_scalar("BEGIN;")
            SQL = render_template(
                "/".join([self.template_path, self._CREATE_SQL]),
                data=data, conn=self.conn, mode='create'
            )
            status, res = self.conn.execute_scalar(SQL)
            if not status:
                # End transaction.
                self.conn.execute_scalar("END;")
                return internal_server_error(errormsg=res)

            # If user chooses concurrent index then we cannot run it along
            # with other alter statements so we will separate alter index part
            SQL = render_template(
                "/".join([self.template_path, self._ALTER_SQL]),
                data=data, conn=self.conn
            )
            SQL = SQL.strip('\n').strip(' ')
            if SQL != '':
                status, res = self.conn.execute_scalar(SQL)
                if not status:
                    # End transaction.
                    self.conn.execute_scalar("END;")
                    return internal_server_error(errormsg=res)

            # we need oid to to add object in tree at browser
            SQL = render_template(
                "/".join([self.template_path, self._OID_SQL]),
                tid=tid, data=data
            )
            status, idx = self.conn.execute_scalar(SQL)
            if not status:
                # End transaction.
                self.conn.execute_scalar("END;")
                return internal_server_error(errormsg=tid)

            # End transaction.
            self.conn.execute_scalar("END;")
            return jsonify(
                node=self.blueprint.generate_browser_node(
                    idx,
                    tid,
                    data['name'],
                    icon="icon-index"
                )
            )
        except Exception as e:
            # End transaction.
            self.conn.execute_scalar("END;")
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def delete(self, gid, sid, did, scid, tid, **kwargs):
        """
        This function will updates existing the schema object

         Args:
           gid: Server Group ID
           sid: Server ID
           did: Database ID
           scid: Schema ID
           tid: Table ID
           idx: Index ID
        """
        idx = kwargs.get('idx', None)
        only_sql = kwargs.get('only_sql', False)

        if idx is None:
            data = request.form if request.form else json.loads(
                request.data, encoding='utf-8'
            )
        else:
            data = {'ids': [idx]}

        # Below will decide if it's simple drop or drop with cascade call

        cascade = self._check_cascade_operation()

        try:
            for idx in data['ids']:
                # We will first fetch the index name for current request
                # so that we create template for dropping index
                SQL = render_template(
                    "/".join([self.template_path, self._PROPERTIES_SQL]),
                    did=did, tid=tid, idx=idx, datlastsysoid=self.datlastsysoid
                )

                status, res = self.conn.execute_dict(SQL)
                if not status:
                    return internal_server_error(errormsg=res)
                elif not res['rows']:
                    return make_json_response(
                        success=0,
                        errormsg=gettext(
                            'Error: Object not found.'
                        ),
                        info=self.not_found_error_msg()
                    )

                data = dict(res['rows'][0])

                SQL = render_template(
                    "/".join([self.template_path, self._DELETE_SQL]),
                    data=data, conn=self.conn, cascade=cascade
                )

                if only_sql:
                    return SQL
                status, res = self.conn.execute_scalar(SQL)
                if not status:
                    return internal_server_error(errormsg=res)

            return make_json_response(
                success=1,
                info=gettext("Index is dropped")
            )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def update(self, gid, sid, did, scid, tid, idx):
        """
        This function will updates existing the schema object

         Args:
           gid: Server Group ID
           sid: Server ID
           did: Database ID
           scid: Schema ID
           tid: Table ID
           idx: Index ID
        """
        data = request.form if request.form else json.loads(
            request.data, encoding='utf-8'
        )
        data['schema'] = self.schema
        data['table'] = self.table
        try:
            SQL, name = index_utils.get_sql(
                self.conn, data=data, did=did, tid=tid, idx=idx,
                datlastsysoid=self.datlastsysoid)
            if not isinstance(SQL, str):
                return SQL
            SQL = SQL.strip('\n').strip(' ')
            status, res = self.conn.execute_scalar(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            return jsonify(
                node=self.blueprint.generate_browser_node(
                    idx,
                    tid,
                    name,
                    icon="icon-%s" % self.node_type
                )
            )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def msql(self, gid, sid, did, scid, tid, idx=None):
        """
        This function will generates modified sql for schema object

         Args:
           gid: Server Group ID
           sid: Server ID
           did: Database ID
           scid: Schema ID
           tid: Table ID
           idx: Index ID (When working with existing index)
        """
        data = dict()
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

        # Adding parent into data dict, will be using it while creating sql
        data['schema'] = self.schema
        data['table'] = self.table

        try:
            sql, name = index_utils.get_sql(
                self.conn, data=data, did=did, tid=tid, idx=idx,
                datlastsysoid=self.datlastsysoid, mode='create')
            if not isinstance(sql, str):
                return sql
            sql = sql.strip('\n').strip(' ')
            if sql == '':
                sql = "--modified SQL"
            return make_json_response(
                data=sql,
                status=200
            )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def sql(self, gid, sid, did, scid, tid, idx):
        """
        This function will generates reverse engineered sql for schema object

         Args:
           gid: Server Group ID
           sid: Server ID
           did: Database ID
           scid: Schema ID
           tid: Table ID
           idx: Index ID
        """

        SQL = index_utils.get_reverse_engineered_sql(
            self.conn, schema=self.schema, table=self.table, did=did,
            tid=tid, idx=idx, datlastsysoid=self.datlastsysoid)

        return ajax_response(response=SQL)

    @check_precondition
    def get_sql_from_index_diff(self, **kwargs):
        """
        This function get the sql from index diff.
        :param kwargs:
        :return:
        """
        sid = kwargs.get('sid')
        did = kwargs.get('did')
        scid = kwargs.get('scid')
        tid = kwargs.get('tid')
        idx = kwargs.get('idx')
        data = kwargs.get('data', None)
        target_schema = kwargs.get('target_schema', None)
        drop_req = kwargs.get('drop_req', False)

        sql = ''

        if data:
            data['schema'] = self.schema
            data['nspname'] = self.schema
            data['table'] = self.table

            sql, name = index_utils.get_sql(
                self.conn, data=data, did=did, tid=tid, idx=idx,
                datlastsysoid=self.datlastsysoid, mode='create')

            sql = sql.strip('\n').strip(' ')

        elif target_schema:
            sql = index_utils.get_reverse_engineered_sql(
                self.conn, schema=target_schema,
                table=self.table, did=did, tid=tid, idx=idx,
                datlastsysoid=self.datlastsysoid,
                template_path=None, with_header=False)

        drop_sql = ''
        if drop_req:
            drop_sql = '\n' + self.delete(gid=1, sid=sid, did=did,
                                          scid=scid, tid=tid,
                                          idx=idx, only_sql=True)

        if drop_sql != '':
            sql = drop_sql + '\n\n' + sql
        return sql

    @check_precondition
    def dependents(self, gid, sid, did, scid, tid, idx):
        """
        This function get the dependents and return ajax response
        for the schema node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID
            tid: Table ID
            idx: Index ID
        """
        dependents_result = self.get_dependents(
            self.conn, idx
        )

        return ajax_response(
            response=dependents_result,
            status=200
        )

    @check_precondition
    def dependencies(self, gid, sid, did, scid, tid, idx):
        """
        This function get the dependencies and return ajax response
        for the schema node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID
            tid: Table ID
            idx: Index ID

        """
        dependencies_result = self.get_dependencies(
            self.conn, idx
        )

        return ajax_response(
            response=dependencies_result,
            status=200
        )

    @check_precondition
    def statistics(self, gid, sid, did, scid, tid, idx=None):
        """
        Statistics

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            tid: Table Id
            idx: Index Id

        Returns the statistics for a particular object if idx is specified
        else return all indexes
        """

        if idx is not None:
            # Individual index

            # Check if pgstattuple extension is already created?
            # if created then only add extended stats
            status, is_pgstattuple = self.conn.execute_scalar("""
            SELECT (pg_catalog.count(extname) > 0) AS is_pgstattuple
            FROM pg_catalog.pg_extension
            WHERE extname='pgstattuple'
            """)
            if not status:
                return internal_server_error(errormsg=is_pgstattuple)

            if is_pgstattuple:
                # Fetch index details only if extended stats available
                SQL = render_template(
                    "/".join([self.template_path, self._PROPERTIES_SQL]),
                    did=did, tid=tid, idx=idx,
                    datlastsysoid=self.datlastsysoid
                )
                status, res = self.conn.execute_dict(SQL)
                if not status:
                    return internal_server_error(errormsg=res)
                if len(res['rows']) == 0:
                    return gone(self.not_found_error_msg())

                data = dict(res['rows'][0])
                index = data['name']
            else:
                index = None

            status, res = self.conn.execute_dict(
                render_template(
                    "/".join([self.template_path, 'stats.sql']),
                    conn=self.conn, schema=self.schema,
                    index=index, idx=idx, is_pgstattuple=is_pgstattuple
                )
            )

        else:
            status, res = self.conn.execute_dict(
                render_template(
                    "/".join([self.template_path, 'coll_stats.sql']),
                    conn=self.conn, schema=self.schema,
                    table=self.table
                )
            )

        if not status:
            return internal_server_error(errormsg=res)

        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition
    def fetch_objects_to_compare(self, sid, did, scid, tid, oid=None):
        """
        This function will fetch the list of all the indexes for
        specified schema id.

        :param sid: Server Id
        :param did: Database Id
        :param scid: Schema Id
        :param oid: Index Id
        :return:
        """

        res = dict()

        if not oid:
            SQL = render_template("/".join([self.template_path,
                                            self._NODES_SQL]), tid=tid)
            status, indexes = self.conn.execute_2darray(SQL)
            if not status:
                current_app.logger.error(indexes)
                return False

            for row in indexes['rows']:
                status, data = self._fetch_properties(did, tid,
                                                      row['oid'])
                if status:
                    res[row['name']] = data
        else:
            status, data = self._fetch_properties(did, tid,
                                                  oid)
            if not status:
                current_app.logger.error(data)
                return False
            res = data

        return res

    @staticmethod
    def _check_for_create_req(required_create_keys, diff_dict):
        """
        This function is used to check whether create required or not.
        :param required_create_keys:
        :param diff_dict:
        :return:
        """
        create_req = False
        for key in required_create_keys:
            if key in diff_dict and \
                ((key == 'columns' and
                  (('added' in diff_dict[key] and
                    len(diff_dict[key]['added']) > 0) or
                   ('changed' in diff_dict[key] and
                    len(diff_dict[key]['changed']) > 0) or
                   ('deleted' in diff_dict[key] and
                    len(diff_dict[key]['deleted']) > 0))) or
                 key != 'columns'):
                create_req = True
        return create_req

    def ddl_compare(self, **kwargs):
        """
        This function returns the DDL/DML statements based on the
        comparison status.

        :param kwargs:
        :return:
        """

        src_params = kwargs.get('source_params')
        tgt_params = kwargs.get('target_params')
        source = kwargs.get('source')
        target = kwargs.get('target')
        comp_status = kwargs.get('comp_status')
        tgt_schema = kwargs.get('target_schema', None)

        diff = ''
        if comp_status == 'source_only':
            diff = self.get_sql_from_index_diff(sid=src_params['sid'],
                                                did=src_params['did'],
                                                scid=src_params['scid'],
                                                tid=src_params['tid'],
                                                idx=source['oid'],
                                                target_schema=tgt_schema)
        elif comp_status == 'target_only':
            diff = self.delete(gid=1, sid=tgt_params['sid'],
                               did=tgt_params['did'], scid=tgt_params['scid'],
                               tid=tgt_params['tid'], idx=target['oid'],
                               only_sql=True)

        elif comp_status == 'different':
            diff_dict = directory_diff(
                source, target, ignore_keys=self.keys_to_ignore,
                difference={}
            )

            required_create_keys = ['columns']

            create_req = IndexesView._check_for_create_req(
                required_create_keys,
                diff_dict
            )

            if create_req:
                diff = self.get_sql_from_index_diff(sid=src_params['sid'],
                                                    did=src_params['did'],
                                                    scid=src_params['scid'],
                                                    tid=src_params['tid'],
                                                    idx=source['oid'],
                                                    target_schema=tgt_schema,
                                                    drop_req=True)
            else:
                diff = self.get_sql_from_index_diff(sid=tgt_params['sid'],
                                                    did=tgt_params['did'],
                                                    scid=tgt_params['scid'],
                                                    tid=tgt_params['tid'],
                                                    idx=target['oid'],
                                                    data=diff_dict)

        return diff


SchemaDiffRegistry(blueprint.node_type, IndexesView, 'table')
IndexesView.register_node_view(blueprint)
