##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Implements Statistics Node"""

from functools import wraps
import json

from flask import render_template, request, jsonify
from flask_babel import gettext as _

import pgadmin.browser.server_groups.servers.databases as database
from config import PG_DEFAULT_DRIVER
from pgadmin.browser.server_groups.servers.databases.schemas.utils import \
    SchemaChildModule
from pgadmin.browser.utils import PGChildNodeView
from pgadmin.tools.schema_diff.compare import SchemaDiffObjectCompare
from pgadmin.tools.schema_diff.node_registry import SchemaDiffRegistry
from pgadmin.utils.ajax import make_json_response, internal_server_error, \
    make_response as ajax_response, gone
from pgadmin.utils.driver import get_driver


class StatisticsModule(SchemaChildModule):
    """
    class StatisticsModule(SchemaChildModule)

        A module class for Statistics node derived from
        SchemaChildModule.

    Methods:
    -------
    * __init__(*args, **kwargs)
      - Method is used to initialize the StatisticsModule and its base module.

    * get_nodes(gid, sid, did, scid)
      - Method is used to generate the browser collection node.

    * script_load()
      - Load the module script for statistics, when any of the database node
        is initialized.

    * node_inode()
      - Method is overridden from its base class to make the node as leaf node.

    """

    _NODE_TYPE = 'statistics'
    _COLLECTION_LABEL = _("Statistics")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.min_ver = 140000  # Only current official supported versions
        self.max_ver = None

    def get_nodes(self, gid, sid, did, scid):
        """
        Generate the statistics node
        """
        if self.has_nodes(
                sid,
                did,
                scid=scid,
                base_template_path=StatisticsView.BASE_TEMPLATE_PATH):
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
        """
        Override this property to make the node a leaf node.

        Returns: False as this is the leaf node
        """
        return False


blueprint = StatisticsModule(__name__)


class StatisticsView(PGChildNodeView, SchemaDiffObjectCompare):
    """
    This class is responsible for generating routes for Extended Statistics
    node.

    Methods:
    -------
    * list()
      - This function returns all statistics nodes within a schema.

    * nodes()
      - This function returns all statistics nodes as tree nodes.

    * properties()
      - This function shows the properties of a selected statistics node.

    * create()
      - This function creates a new statistics object.

    * update()
      - This function updates a statistics object.

    * delete()
      - This function deletes a statistics object.

    * sql()
      - This function returns the SQL for the selected statistics object.

    * msql()
      - This function returns the modified SQL.

    * statistics()
      - This function returns statistics information.

    * dependencies()
      - This function returns the dependencies for the selected statistics.

    * dependents()
      - This function returns the dependents for the selected statistics.

    """

    node_type = blueprint.node_type
    node_label = "Statistics"
    node_icon = "icon-%s" % node_type
    BASE_TEMPLATE_PATH = 'statistics/sql/#{0}#'

    parent_ids = [
        {'type': 'int', 'id': 'gid'},
        {'type': 'int', 'id': 'sid'},
        {'type': 'int', 'id': 'did'},
        {'type': 'int', 'id': 'scid'}
    ]
    ids = [
        {'type': 'int', 'id': 'stid'}
    ]

    operations = dict({
        'obj': [
            {'get': 'properties', 'delete': 'delete', 'put': 'update'},
            {'get': 'list', 'post': 'create', 'delete': 'delete'}
        ],
        'delete': [{'delete': 'delete'}, {'delete': 'delete'}],
        'children': [{'get': 'children'}],
        'nodes': [{'get': 'nodes'}, {'get': 'nodes'}],
        'sql': [{'get': 'sql'}],
        'msql': [{'get': 'msql'}, {'get': 'msql'}],
        'stats': [{'get': 'statistics'}, {'get': 'statistics'}],
        'dependency': [{'get': 'dependencies'}],
        'dependent': [{'get': 'dependents'}]
    })

    keys_to_ignore = ['oid', 'oid-2', 'schemaoid', 'tableoid']

    _PROPERTIES_SQL = 'properties.sql'
    _NODES_SQL = 'nodes.sql'
    _CREATE_SQL = 'create.sql'
    _UPDATE_SQL = 'update.sql'
    _DELETE_SQL = 'delete.sql'
    _OID_SQL = 'get_oid.sql'
    _STATS_SQL = 'stats.sql'
    _COLL_STATS_SQL = 'coll_stats.sql'

    def check_precondition(action=None):
        """
        This function will behave as a decorator which will check
        database connection before running view, it will also attach
        manager, conn & template_path properties to self
        """

        def wrap(f):
            @wraps(f)
            def wrapped(self, *args, **kwargs):

                driver = get_driver(PG_DEFAULT_DRIVER)
                self.manager = driver.connection_manager(kwargs['sid'])

                if action and action in ["drop"]:
                    self.conn = self.manager.connection()
                elif 'did' in kwargs:
                    self.conn = self.manager.connection(did=kwargs['did'])
                else:
                    self.conn = self.manager.connection()

                self.datistemplate = False
                if (
                    self.manager.db_info is not None and
                    kwargs['did'] in self.manager.db_info and
                    'datistemplate' in self.manager.db_info[kwargs['did']]
                ):
                    self.datistemplate = self.manager.db_info[
                        kwargs['did']]['datistemplate']

                self.template_path = self.BASE_TEMPLATE_PATH.format(
                    self.manager.version
                )
                self.qtIdent = driver.qtIdent

                return f(self, *args, **kwargs)
            return wrapped
        return wrap

    @check_precondition(action='list')
    def list(self, gid, sid, did, scid):
        """
        This function returns all statistics nodes within a schema.

        Args:
          gid: Server Group ID
          sid: Server ID
          did: Database ID
          scid: Schema ID

        Returns:
          JSON of available statistics nodes
        """
        SQL = render_template(
            "/".join([self.template_path, self._PROPERTIES_SQL]),
            scid=scid
        )
        status, res = self.conn.execute_dict(SQL)

        if not status:
            return internal_server_error(errormsg=res)

        return ajax_response(
            response=res['rows'],
            status=200
        )

    @check_precondition(action='nodes')
    def nodes(self, gid, sid, did, scid, stid=None):
        """
        This function returns all statistics nodes as tree nodes.

        Args:
          gid: Server Group ID
          sid: Server ID
          did: Database ID
          scid: Schema ID
          stid: Statistics ID (optional)

        Returns:
          JSON of available statistics nodes
        """
        res = []

        SQL = render_template(
            "/".join([self.template_path, self._NODES_SQL]),
            scid=scid,
            stid=stid,
            conn=self.conn
        )
        status, rset = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=rset)

        if stid is not None:
            if len(rset['rows']) == 0:
                return gone(errormsg=self.not_found_error_msg())
            row = rset['rows'][0]
            return make_json_response(
                data=self.blueprint.generate_browser_node(
                    row['oid'],
                    scid,
                    row['name'],
                    icon=self.node_icon,
                    description=row['comment']
                ),
                status=200
            )

        for row in rset['rows']:
            res.append(
                self.blueprint.generate_browser_node(
                    row['oid'],
                    scid,
                    row['name'],
                    icon=self.node_icon,
                    description=row['comment']
                ))

        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition(action='properties')
    def properties(self, gid, sid, did, scid, stid):
        """
        This function shows the properties of the selected statistics node.

        Args:
          gid: Server Group ID
          sid: Server ID
          did: Database ID
          scid: Schema ID
          stid: Statistics ID

        Returns:
          JSON of statistics properties
        """
        status, res = self._fetch_properties(scid, stid)
        if not status:
            return res

        return ajax_response(
            response=res,
            status=200
        )

    def _fetch_properties(self, scid, stid):
        """
        This function is used to fetch the properties of the specified object

        Args:
            scid: Schema ID
            stid: Statistics ID

        Returns:
            Tuple of (status, result)
        """
        sql = render_template(
            "/".join([self.template_path, self._PROPERTIES_SQL]),
            scid=scid, stid=stid
        )
        status, res = self.conn.execute_dict(sql)

        if not status:
            return False, internal_server_error(errormsg=res)
        elif len(res['rows']) == 0:
            return False, gone(self.not_found_error_msg())

        res['rows'][0]['is_sys_obj'] = (
            res['rows'][0]['oid'] <= self._DATABASE_LAST_SYSTEM_OID or
            self.datistemplate)

        # Convert stat_types from raw array to list of names
        row = res['rows'][0]
        stat_types = []
        if row.get('has_ndistinct'):
            stat_types.append('ndistinct')
        if row.get('has_dependencies'):
            stat_types.append('dependencies')
        if row.get('has_mcv'):
            stat_types.append('mcv')
        row['stat_types'] = stat_types

        # Ensure columns is an array (convert None to empty array)
        if row.get('columns') is None:
            row['columns'] = []

        # Set has_expressions boolean based on expressions field
        # expressions is pg_node_tree (bytea) - we just check if it exists
        row['has_expressions'] = row.get('expressions') is not None

        # Remove expressions from display (it's internal PostgreSQL format)
        row.pop('expressions', None)

        # Ensure stattarget has a default value if None
        if row.get('stattarget') is None:
            row['stattarget'] = -1

        # Format computed statistics values for display
        # These come from pg_statistic_ext_data and are already in text format
        if row.get('ndistinct_values'):
            row['ndistinct_values'] = str(row['ndistinct_values'])
        if row.get('dependencies_values'):
            row['dependencies_values'] = str(row['dependencies_values'])

        return True, res['rows'][0]

    @check_precondition(action='create')
    def create(self, gid, sid, did, scid):
        """
        This function creates a new statistics object.

        Args:
          gid: Server Group ID
          sid: Server ID
          did: Database ID
          scid: Schema ID

        Returns:
          JSON response with the new statistics node
        """
        data = request.form if request.form else json.loads(
            request.data
        )

        # Name is optional in PostgreSQL 16+ (version 160000)
        required_args = ['schema', 'table', 'stat_types']
        if self.manager.version < 160000:
            required_args.insert(0, 'name')

        for arg in required_args:
            is_arg = arg in data
            is_str_arg = isinstance(data.get(arg), str)
            is_arg_empty_str = is_str_arg and not data.get(arg).strip()
            if not is_arg or is_arg_empty_str:
                return make_json_response(
                    status=400,
                    success=0,
                    errormsg=_(
                        "Could not find the required parameter ({})."
                    ).format(arg)
                )

        # Parse expression_list into expressions array if provided
        has_columns = 'columns' in data and len(data.get('columns', [])) > 0
        has_expression_list = 'expression_list' in data and data.get(
            'expression_list', '').strip()

        # Convert expression_list (comma-separated) to expressions array
        if has_expression_list:
            expr_list = data.get('expression_list', '').strip()
            # Split by comma and strip whitespace from each expression
            data['expressions'] = [
                {'expression': expr.strip()}
                for expr in expr_list.split(',')
                if expr.strip()
            ]
            has_expressions = len(data['expressions']) > 0
        else:
            data['expressions'] = []
            has_expressions = False

        if not has_columns and not has_expressions:
            return make_json_response(
                status=400,
                success=0,
                errormsg=_(
                    "Either columns or expressions must be specified"
                )
            )

        # Validate minimum 2 items for multi-column statistics
        # (not for single expression)
        if has_columns and not has_expressions and \
                len(data.get('columns', [])) < 2:
            return make_json_response(
                status=400,
                success=0,
                errormsg=_(
                    "At least 2 columns must be specified "
                    "for multi-column statistics."
                )
            )

        # Validate at least 1 stat_type
        if len(data.get('stat_types', [])) < 1:
            return make_json_response(
                status=400,
                success=0,
                errormsg=_(
                    "At least 1 statistics type must be selected."
                )
            )

        try:
            # Generate CREATE STATISTICS SQL
            sql = render_template(
                "/".join([self.template_path, self._CREATE_SQL]),
                data=data, conn=self.conn
            )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

        status, msg = self.conn.execute_scalar(sql)
        if not status:
            return internal_server_error(errormsg=msg)

        # Get OID of newly created statistics
        # For PostgreSQL 16+, if name is not provided, it's auto-generated
        if data.get('name'):
            sql = render_template(
                "/".join([self.template_path, self._OID_SQL]),
                name=data['name'],
                schema=data['schema'],
                conn=self.conn
            )
            sql = sql.strip('\n').strip(' ')

            status, rset = self.conn.execute_2darray(sql)
            if not status:
                return internal_server_error(errormsg=rset)

            row = rset['rows'][0]
            return jsonify(
                node=self.blueprint.generate_browser_node(
                    row['oid'],
                    scid,
                    data['name'],
                    icon=self.node_icon
                )
            )
        else:
            # For auto-generated names in PG 16+, we need to query for the
            # latest statistics
            # This is a limitation - we'll return success but
            # can't return the node
            return make_json_response(
                success=1,
                info=_(
                    "Statistics created successfully with auto-generated name"
                )
            )

    @check_precondition(action='delete')
    def delete(self, gid, sid, did, scid, stid=None, only_sql=False):
        """
        This function deletes the statistics object.

        Args:
          gid: Server Group ID
          sid: Server ID
          did: Database ID
          scid: Schema ID
          stid: Statistics ID
          only_sql: Return SQL only if True

        Returns:
          JSON response
        """
        if stid is None:
            data = request.form if request.form else json.loads(
                request.data
            )
        else:
            data = {'ids': [stid]}

        # Check if CASCADE operation
        cascade = self._check_cascade_operation()

        try:
            for stid in data['ids']:
                # Fetch statistics details first
                sql = render_template(
                    "/".join([self.template_path, self._DELETE_SQL]),
                    stid=stid
                )
                status, res = self.conn.execute_dict(sql)
                if not status:
                    return internal_server_error(errormsg=res)

                elif not res['rows']:
                    return gone(
                        errormsg=self.not_found_error_msg()
                    )

                # Generate DROP SQL
                sql = render_template(
                    "/".join([self.template_path, self._DELETE_SQL]),
                    name=res['rows'][0]['name'],
                    schema=res['rows'][0]['schema'],
                    cascade=cascade,
                    conn=self.conn
                )

                if only_sql:
                    return sql

                status, res = self.conn.execute_scalar(sql)
                if not status:
                    return internal_server_error(errormsg=res)

            return make_json_response(
                success=1,
                info=_("Statistics dropped")
            )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition(action='update')
    def update(self, gid, sid, did, scid, stid):
        """
        This function updates the statistics object.

        Args:
          gid: Server Group ID
          sid: Server ID
          did: Database ID
          scid: Schema ID
          stid: Statistics ID

        Returns:
          JSON response with updated node
        """
        data = request.form if request.form else json.loads(
            request.data
        )
        sql, _ = self.get_SQL(gid, sid, did, data, scid, stid)

        # Most probably this is due to error
        if not isinstance(sql, str):
            return sql

        sql = sql.strip('\n').strip(' ')

        status, res = self.conn.execute_scalar(sql)
        if not status:
            return internal_server_error(errormsg=res)

        # Fetch updated node info
        sql = render_template(
            "/".join([self.template_path, self._NODES_SQL]),
            scid=scid,
            stid=stid,
            conn=self.conn
        )
        status, rset = self.conn.execute_2darray(sql)
        if not status:
            return internal_server_error(errormsg=rset)

        if len(rset['rows']) == 0:
            return gone(errormsg=self.not_found_error_msg())

        row = rset['rows'][0]

        return jsonify(
            node=self.blueprint.generate_browser_node(
                stid,
                scid,
                row['name'],
                icon=self.node_icon,
                description=row['comment']
            )
        )

    @check_precondition(action='msql')
    def msql(self, gid, sid, did, scid, stid=None):
        """
        This function returns modified SQL for the object.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID
            stid: Statistics ID
        """
        data = {}
        for k, v in request.args.items():
            try:
                # Comments should be taken as is
                if k in ('comment',):
                    data[k] = v
                else:
                    data[k] = json.loads(v)
            except ValueError:
                data[k] = v

        if stid is None:
            # Schema is required, name is optional in PG 16+
            if 'schema' not in data:
                return make_json_response(
                    status=400,
                    success=0,
                    errormsg=_(
                        "Could not find the required parameter (schema)."
                    )
                )

        sql, _sql_name = self.get_SQL(gid, sid, did, data, scid, stid)

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

    def get_SQL(self, gid, sid, did, data, scid, stid=None,
                add_not_exists_clause=False):
        """
        This function generates SQL from model data.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            data: Form data
            scid: Schema ID
            stid: Statistics ID
            add_not_exists_clause: Add IF NOT EXISTS clause

        Returns:
            Tuple of (SQL, name)
        """
        if stid is not None:
            # Update operation
            status, old_data = self._fetch_properties(scid, stid)
            if not status:
                return old_data, None

            # Remove keys that shouldn't be compared
            for key in self.keys_to_ignore:
                old_data.pop(key, None)

            sql = render_template(
                "/".join([self.template_path, self._UPDATE_SQL]),
                data=data, o_data=old_data, conn=self.conn
            )
            return sql, data.get('name', old_data['name'])
        else:
            # Create operation
            # Name is optional in PostgreSQL 16+
            sql = render_template(
                "/".join([self.template_path, self._CREATE_SQL]),
                data=data, conn=self.conn,
                add_not_exists_clause=add_not_exists_clause
            )
            return sql, data.get('name', '<auto-generated>')

    @check_precondition(action='sql')
    def sql(self, gid, sid, did, scid, stid, **kwargs):
        """
        This function generates reverse engineered SQL for the object.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID
            stid: Statistics ID
        """
        status, res = self._fetch_properties(scid, stid)
        if not status:
            return res

        sql = render_template(
            "/".join([self.template_path, self._CREATE_SQL]),
            data=res, conn=self.conn, add_not_exists_clause=False
        )

        return ajax_response(response=sql)

    @check_precondition(action='stats')
    def statistics(self, gid, sid, did, scid, stid=None):
        """
        Returns statistics for a particular object.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID
            stid: Statistics ID (optional)
        """
        if stid is not None:
            # Individual statistics
            sql = render_template(
                "/".join([self.template_path, self._STATS_SQL]),
                stid=stid,
                conn=self.conn
            )
        else:
            # Collection statistics
            sql = render_template(
                "/".join([self.template_path, self._COLL_STATS_SQL]),
                scid=scid,
                conn=self.conn
            )

        status, res = self.conn.execute_dict(sql)

        if not status:
            return internal_server_error(errormsg=res)

        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition(action='depend')
    def dependencies(self, gid, sid, did, scid, stid):
        """
        This function gets the dependencies for the selected statistics node

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID
            stid: Statistics ID
        """
        dependencies_result = self.get_dependencies(
            self.conn, stid
        )

        return ajax_response(
            response=dependencies_result,
            status=200
        )

    @check_precondition(action='dependent')
    def dependents(self, gid, sid, did, scid, stid):
        """
        This function gets the dependents for the selected statistics node

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID
            stid: Statistics ID
        """
        dependents_result = self.get_dependents(
            self.conn, stid
        )

        return ajax_response(
            response=dependents_result,
            status=200
        )

    @check_precondition(action='fetch_objects_to_compare')
    def fetch_objects_to_compare(self, sid, did, scid):
        """
        This function fetches the list of all statistics objects for
        schema diff.

        Args:
            sid: Server ID
            did: Database ID
            scid: Schema ID
        """
        res = dict()

        SQL = render_template(
            "/".join([self.template_path, self._NODES_SQL]),
            scid=scid,
            schema_diff=True
        )
        status, rset = self.conn.execute_2darray(SQL)
        if not status:
            return internal_server_error(errormsg=rset)

        for row in rset['rows']:
            status, data = self._fetch_properties(scid, row['oid'])
            if status:
                res[row['name']] = data

        return res

    def get_sql_from_diff(self, **kwargs):
        """
        This function generates SQL from model data for schema diff.

        Args:
            kwargs: Additional parameters

        Returns:
            SQL string
        """
        gid = kwargs.get('gid')
        sid = kwargs.get('sid')
        did = kwargs.get('did')
        scid = kwargs.get('scid')
        source_params = kwargs.get('source_params')
        target_params = kwargs.get('target_params')
        comp_status = kwargs.get('comp_status')

        if comp_status == 'source_only':
            # Object exists in source only - generate CREATE
            sql, _ = self.get_SQL(gid=gid, sid=sid, did=did,
                                  data=source_params, scid=scid)
        elif comp_status == 'target_only':
            # Object exists in target only - generate DROP
            sql = render_template(
                "/".join([self.template_path, self._DELETE_SQL]),
                name=target_params['name'],
                schema=target_params['schema'],
                cascade=False
            )
        else:
            # Object exists in both - generate ALTER
            sql, _ = self.get_SQL(gid=gid, sid=sid, did=did,
                                  data=source_params, scid=scid,
                                  stid=target_params['oid'])

        return sql


SchemaDiffRegistry(blueprint.node_type, StatisticsView)
StatisticsView.register_node_view(blueprint)
