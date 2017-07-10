##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2017, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

""" Implements Table Node """

import simplejson as json
import re

import pgadmin.browser.server_groups.servers.databases as database
from flask import render_template, request, jsonify, url_for
from flask_babel import gettext
from pgadmin.browser.server_groups.servers.databases.schemas.utils \
    import SchemaChildModule, DataTypeReader, VacuumSettings
from pgadmin.browser.server_groups.servers.utils import parse_priv_to_db
from pgadmin.utils.ajax import make_json_response, internal_server_error, \
    make_response as ajax_response, gone
from .utils import BaseTableView


class TableModule(SchemaChildModule):
    """
     class TableModule(SchemaChildModule)

        A module class for Table node derived from SchemaChildModule.

    Methods:
    -------
    * __init__(*args, **kwargs)
      - Method is used to initialize the Table and it's base module.

    * get_nodes(gid, sid, did, scid, tid)
      - Method is used to generate the browser collection node.

    * node_inode()
      - Method is overridden from its base class to make the node as leaf node.

    * script_load()
      - Load the module script for schema, when any of the server node is
        initialized.
    """
    NODE_TYPE = 'table'
    COLLECTION_LABEL = gettext("Tables")

    def __init__(self, *args, **kwargs):
        """
        Method is used to initialize the TableModule and it's base module.

        Args:
            *args:
            **kwargs:
        """
        super(TableModule, self).__init__(*args, **kwargs)
        self.max_ver = None
        self.min_ver = None

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
        return database.DatabaseModule.NODE_TYPE

    def get_own_javascripts(self):
        scripts = SchemaChildModule.get_own_javascripts(self)

        scripts.append({
            'name': 'pgadmin.browser.table.partition.utils',
            'path': url_for('browser.index') + 'table/static/js/partition.utils',
            'when': 'database', 'is_template': False
        })

        return scripts


blueprint = TableModule(__name__)


class TableView(BaseTableView, DataTypeReader, VacuumSettings):
    """
    This class is responsible for generating routes for Table node

    Methods:
    -------
    * __init__(**kwargs)
      - Method is used to initialize the TableView and it's base view.

    * module_js()
      - This property defines (if javascript) exists for this node.
        Override this property for your own logic

    * list()
      - This function is used to list all the Table nodes within that
      collection.

    * nodes()
      - This function will used to create all the child node within that
        collection, Here it will create all the Table node.

    * properties(gid, sid, did, scid, tid)
      - This function will show the properties of the selected Table node

    * create(gid, sid, did, scid)
      - This function will create the new Table object

    * update(gid, sid, did, scid, tid)
      - This function will update the data for the selected Table node

    * delete(gid, sid, scid, tid):
      - This function will drop the Table object

    * truncate(gid, sid, scid, tid):
      - This function will truncate table object

    * set_trigger(gid, sid, scid, tid):
      - This function will enable/disable trigger(s) on table object

    * reset(gid, sid, scid, tid):
      - This function will reset table object statistics

    * msql(gid, sid, did, scid, tid)
      - This function is used to return modified SQL for the selected
        Table node

    * get_sql(did, scid, tid, data)
      - This function will generate sql from model data

    * sql(gid, sid, did, scid, tid):
      - This function will generate sql to show it in sql pane for the
        selected Table node.

    * dependency(gid, sid, did, scid, tid):
      - This function will generate dependency list show it in dependency
        pane for the selected Table node.

    * dependent(gid, sid, did, scid, tid):
      - This function will generate dependent list to show it in dependent
        pane for the selected node.

    * get_types(self, gid, sid, did, scid)
      - This function will return list of types available for columns node
        via AJAX response

    * get_oftype(self, gid, sid, did, scid, tid)
      - This function will return list of types available for table node
        via AJAX response

    * get_inherits(self, gid, sid, did, scid, tid)
      - This function will return list of tables availablefor inheritance
        via AJAX response

    * get_relations(self, gid, sid, did, scid, tid)
      - This function will return list of tables available for like/relation
        via AJAX response

    * get_columns(gid, sid, did, scid, foid=None):
      - Returns the Table Columns.

    * get_table_vacuum(gid, sid, did, scid=None, tid=None):
      - Fetch the default values for table auto-vacuum

    * get_toast_table_vacuum(gid, sid, did, scid=None, tid=None)
      - Fetch the default values for toast table auto-vacuum

    * _parse_format_columns(self, data, mode=None):
       - This function will parse and return formatted list of columns
         added by user

    * get_index_constraint_sql(self, did, tid, data):
      - This function will generate modified sql for index constraints
        (Primary Key & Unique)

    * select_sql(gid, sid, did, scid, foid):
      - Returns sql for Script

    * insert_sql(gid, sid, did, scid, foid):
      - Returns sql for Script

    * update_sql(gid, sid, did, scid, foid):
      - Returns sql for Script

    * delete_sql(gid, sid, did, scid, foid):
      - Returns sql for Script
"""

    node_type = blueprint.node_type

    parent_ids = [
        {'type': 'int', 'id': 'gid'},
        {'type': 'int', 'id': 'sid'},
        {'type': 'int', 'id': 'did'},
        {'type': 'int', 'id': 'scid'}
    ]
    ids = [
        {'type': 'int', 'id': 'tid'}
    ]

    operations = dict({
        'obj': [
            {'get': 'properties', 'delete': 'delete', 'put': 'update'},
            {'get': 'list', 'post': 'create'}
        ],
        'delete': [{'delete': 'delete'}],
        'children': [{'get': 'children'}],
        'nodes': [{'get': 'node'}, {'get': 'nodes'}],
        'sql': [{'get': 'sql'}],
        'msql': [{'get': 'msql'}, {'get': 'msql'}],
        'stats': [{'get': 'statistics'}, {'get': 'statistics'}],
        'dependency': [{'get': 'dependencies'}],
        'dependent': [{'get': 'dependents'}],
        'module.js': [{}, {}, {'get': 'module_js'}],
        'get_oftype': [{'get': 'get_oftype'}, {'get': 'get_oftype'}],
        'get_inherits': [{'get': 'get_inherits'}, {'get': 'get_inherits'}],
        'get_relations': [{'get': 'get_relations'}, {'get': 'get_relations'}],
        'truncate': [{'put': 'truncate'}],
        'reset': [{'delete': 'reset'}],
        'set_trigger': [{'put': 'enable_disable_triggers'}],
        'get_types': [{'get': 'types'}, {'get': 'types'}],
        'get_columns': [{'get': 'get_columns'}, {'get': 'get_columns'}],
        'get_table_vacuum': [{}, {'get': 'get_table_vacuum'}],
        'get_toast_table_vacuum': [{}, {'get': 'get_toast_table_vacuum'}],
        'all_tables': [{}, {'get': 'get_all_tables'}],
        'get_access_methods': [{}, {'get': 'get_access_methods'}],
        'get_oper_class': [{}, {'get': 'get_oper_class'}],
        'get_operator': [{}, {'get': 'get_operator'}],
        'get_attach_tables': [
            {'get': 'get_attach_tables'},
            {'get': 'get_attach_tables'}],
        'select_sql': [{'get': 'select_sql'}],
        'insert_sql': [{'get': 'insert_sql'}],
        'update_sql': [{'get': 'update_sql'}],
        'delete_sql': [{'get': 'delete_sql'}]
    })

    @BaseTableView.check_precondition
    def list(self, gid, sid, did, scid):
        """
        This function is used to list all the table nodes within that collection.

        Args:
            gid: Server group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID

        Returns:
            JSON of available table nodes
        """
        SQL = render_template(
            "/".join([self.table_template_path, 'properties.sql']),
            did=did, scid=scid,
            datlastsysoid=self.datlastsysoid
        )
        status, res = self.conn.execute_dict(SQL)

        if not status:
            return internal_server_error(errormsg=res)
        return ajax_response(
            response=res['rows'],
            status=200
        )

    @BaseTableView.check_precondition
    def node(self, gid, sid, did, scid, tid):
        """
        This function is used to list all the table nodes within that collection.

        Args:
            gid: Server group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID
            tid: Table ID

        Returns:
            JSON of available table nodes
        """
        res = []
        SQL = render_template(
            "/".join([self.table_template_path, 'nodes.sql']),
            scid=scid, tid=tid
        )
        status, rset = self.conn.execute_2darray(SQL)
        if not status:
            return internal_server_error(errormsg=rset)
        if len(rset['rows']) == 0:
                return gone(gettext("Could not find the table."))

        res = self.blueprint.generate_browser_node(
                rset['rows'][0]['oid'],
                scid,
                rset['rows'][0]['name'],
                icon="icon-partition" if 'is_partitioned' in rset['rows'][0] and rset['rows'][0]['is_partitioned'] else "icon-table",
                tigger_count=rset['rows'][0]['triggercount'],
                has_enable_triggers=rset['rows'][0]['has_enable_triggers'],
                is_partitioned=rset['rows'][0]['is_partitioned'] if 'is_partitioned' in rset['rows'][0] else False
            )

        return make_json_response(
            data=res,
            status=200
        )

    @BaseTableView.check_precondition
    def nodes(self, gid, sid, did, scid):
        """
        This function is used to list all the table nodes within that collection.

        Args:
            gid: Server group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID

        Returns:
            JSON of available table nodes
        """
        res = []
        SQL = render_template(
            "/".join([self.table_template_path, 'nodes.sql']),
            scid=scid
        )
        status, rset = self.conn.execute_2darray(SQL)
        if not status:
            return internal_server_error(errormsg=rset)

        for row in rset['rows']:
            res.append(
                self.blueprint.generate_browser_node(
                    row['oid'],
                    scid,
                    row['name'],
                    icon="icon-partition" if 'is_partitioned' in row and row['is_partitioned'] else "icon-table",
                    tigger_count=row['triggercount'],
                    has_enable_triggers=row['has_enable_triggers'],
                    is_partitioned=row['is_partitioned'] if 'is_partitioned' in row else False
                ))

        return make_json_response(
            data=res,
            status=200
        )

    @BaseTableView.check_precondition
    def get_all_tables(self, gid, sid, did, scid, tid=None):
        """
        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            tid: Table Id

        Returns:
            Returns the lits of tables required for constraints.
        """
        try:
            SQL = render_template(
                "/".join([
                    self.table_template_path, 'get_tables_for_constraints.sql'
                ]),
                show_sysobj=self.blueprint.show_system_objects
            )

            status, res = self.conn.execute_dict(SQL)

            if not status:
                return internal_server_error(errormsg=res)

            return make_json_response(
                data=res['rows'],
                status=200
            )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @BaseTableView.check_precondition
    def get_table_vacuum(self, gid, sid, did, scid=None, tid=None):
        """
        Fetch the default values for table auto-vacuum
        fields, return an array of
          - label
          - name
          - setting
        values
        """
        res = self.get_vacuum_table_settings(self.conn)
        return ajax_response(
            response=res['rows'],
            status=200
        )

    @BaseTableView.check_precondition
    def get_toast_table_vacuum(self, gid, sid, did, scid=None, tid=None):
        """
        Fetch the default values for toast table auto-vacuum
        fields, return an array of
          - label
          - name
          - setting
        values
        """
        res = self.get_vacuum_toast_settings(self.conn)
        return ajax_response(
            response=res['rows'],
            status=200
        )

    @BaseTableView.check_precondition
    def get_access_methods(self, gid, sid, did, scid, tid=None):
        """
        This function returns access methods.

        Args:
          gid: Server Group ID
          sid: Server ID
          did: Database ID
          scid: Schema ID
          tid: Table ID
          exid: Exclusion constraint ID

        Returns:

        """
        res = [{'label': '', 'value': ''}]
        sql = render_template("/".join([
            self.exclusion_constraint_template_path, 'get_access_methods.sql'
        ]))

        status, rest = self.conn.execute_2darray(sql)

        if not status:
            return internal_server_error(errormsg=rest)

        for row in rest['rows']:
            res.append(
                {'label': row['amname'], 'value': row['amname']}
            )
        return make_json_response(
            data=res,
            status=200
        )

    @BaseTableView.check_precondition
    def get_oper_class(self, gid, sid, did, scid, tid=None):
        """

        Args:
          gid: Server Group ID
          sid: Server ID
          did: Database ID
          scid: Schema ID
          tid: Table ID
          exid: Exclusion constraint ID

        Returns:

        """
        data = request.args if request.args else None
        try:
            if data and 'indextype' in data:
                SQL = render_template(
                    "/".join([
                        self.exclusion_constraint_template_path,
                        'get_oper_class.sql'
                    ]),
                    indextype=data['indextype']
                )

                status, res = self.conn.execute_2darray(SQL)

                if not status:
                    return internal_server_error(errormsg=res)
                result = []
                for row in res['rows']:
                    result.append([row['opcname'], row['opcname']])
                return make_json_response(
                    data=result,
                    status=200
                )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @BaseTableView.check_precondition
    def get_operator(self, gid, sid, did, scid, tid=None):
        """

        Args:
          gid: Server Group ID
          sid: Server ID
          did: Database ID
          scid: Schema ID
          tid: Table ID
          exid: Exclusion constraint ID

        Returns:

        """
        data = request.args if request.args else None
        try:
            if data and 'col_type' in data:
                SQL = render_template(
                    "/".join([
                        self.exclusion_constraint_template_path,
                        'get_operator.sql'
                    ]),
                    type=data['col_type'],
                    show_sysobj=self.blueprint.show_system_objects
                )

                status, res = self.conn.execute_2darray(SQL)

                if not status:
                    return internal_server_error(errormsg=res)
                result = []
                for row in res['rows']:
                    result.append([row['oprname'], row['oprname']])
                return make_json_response(
                    data=result,
                    status=200
                )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @BaseTableView.check_precondition
    def properties(self, gid, sid, did, scid, tid):
        """
        This function will show the properties of the selected table node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did:  Database ID
            scid: Schema ID
            scid: Schema ID
            tid: Table ID

        Returns:
            JSON of selected table node
        """

        SQL = render_template(
            "/".join([self.table_template_path, 'properties.sql']),
            did=did, scid=scid, tid=tid,
            datlastsysoid=self.datlastsysoid
        )
        status, res = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=res)

        if len(res['rows']) == 0:
                return gone(gettext("The specified table could not be found."))

        return super(TableView, self).properties(
            gid, sid, did, scid, tid, res)

    @BaseTableView.check_precondition
    def types(self, gid, sid, did, scid, tid=None, clid=None):
        """
        Returns:
            This function will return list of types available for column node
            for node-ajax-control
        """
        condition = render_template(
            "/".join([
                self.table_template_path, 'get_types_where_condition.sql'
            ]),
            show_system_objects=self.blueprint.show_system_objects
        )

        status, types = self.get_types(self.conn, condition, True)

        if not status:
            return internal_server_error(errormsg=types)

        return make_json_response(
            data=types,
            status=200
        )

    @BaseTableView.check_precondition
    def get_columns(self, gid, sid, did, scid, tid=None):
        """
        Returns the Table Columns.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            tid: Table Id

        Returns:
              JSON Array with below parameters.
              name: Column Name
              ctype: Column Data Type
              inherited_from: Parent Table from which the related column
                              is inheritted.
        """
        res = []
        data = request.args if request.args else None
        try:
            if data and 'tid' in data:
                SQL = render_template(
                    "/".join([
                        self.table_template_path, 'get_columns_for_table.sql'
                    ]),
                    tid=data['tid']
                )
            elif data and 'tname' in data:
                SQL = render_template(
                    "/".join([
                        self.table_template_path, 'get_columns_for_table.sql'
                    ]),
                    tname=data['tname']
                )

            if SQL:
                status, res = self.conn.execute_dict(SQL)
                if not status:
                    return internal_server_error(errormsg=res)
                res = res['rows']

            return make_json_response(
                data=res,
                status=200
            )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @BaseTableView.check_precondition
    def get_oftype(self, gid, sid, did, scid, tid=None):
        """
        Returns:
            This function will return list of types available for table node
            for node-ajax-control
        """
        res = [{'label': '', 'value': ''}]
        try:
            SQL = render_template(
                "/".join([self.table_template_path, 'get_oftype.sql']),
                scid=scid,
                server_type=self.manager.server_type,
                show_sys_objects=self.blueprint.show_system_objects
            )
            status, rset = self.conn.execute_2darray(SQL)
            if not status:
                return internal_server_error(errormsg=res)
            for row in rset['rows']:
                # Get columns for all 'OF TYPES'.
                SQL = render_template("/".join([self.table_template_path,
                                                'get_columns_for_table.sql']),
                                      tid=row['oid'])

                status, type_cols = self.conn.execute_dict(SQL)
                if not status:
                    return internal_server_error(errormsg=type_cols)

                res.append(
                    {'label': row['typname'], 'value': row['typname'],
                     'tid': row['oid'], 'oftype_columns': type_cols['rows']
                     }
                )
            return make_json_response(
                data=res,
                status=200
            )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @BaseTableView.check_precondition
    def get_inherits(self, gid, sid, did, scid, tid=None):
        """
        Returns:
            This function will return list of tables available for inheritance
            while creating new table
        """
        try:
            res = []
            SQL = render_template(
                "/".join([self.table_template_path, 'get_inherits.sql']),
                show_system_objects=self.blueprint.show_system_objects,
                tid=tid,
                server_type=self.manager.server_type
            )
            status, rset = self.conn.execute_2darray(SQL)
            if not status:
                return internal_server_error(errormsg=res)
            for row in rset['rows']:
                res.append(
                    {'label': row['inherits'], 'value': row['inherits'],
                     'tid': row['oid']
                     }
                )
            return make_json_response(
                data=res,
                status=200
            )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @BaseTableView.check_precondition
    def get_attach_tables(self, gid, sid, did, scid, tid=None):
        """
        Returns:
            This function will return list of tables available to be attached
            to the partitioned table.
        """
        try:
            res = []
            SQL = render_template(
                "/".join([
                    self.partition_template_path, 'get_attach_tables.sql'
                ]),
                tid=tid
            )

            status, rset = self.conn.execute_2darray(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            for row in rset['rows']:
                res.append(
                    {'label': row['table_name'], 'value': row['oid']}
                )

            return make_json_response(
                data=res,
                status=200
            )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @BaseTableView.check_precondition
    def get_relations(self, gid, sid, did, scid, tid=None):
        """
        Returns:
            This function will return list of tables available for like/relation
            combobox while creating new table
        """
        res = [{'label': '', 'value': ''}]
        try:
            SQL = render_template(
                "/".join([self.table_template_path, 'get_relations.sql']),
                show_sys_objects=self.blueprint.show_system_objects,
                server_type=self.manager.server_type
            )
            status, rset = self.conn.execute_2darray(SQL)
            if not status:
                return internal_server_error(errormsg=res)
            for row in rset['rows']:
                res.append(
                    {'label': row['like_relation'], 'value': row['like_relation']}
                )
            return make_json_response(
                data=res,
                status=200
            )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    def _parse_format_columns(self, data, mode=None):
        """
        data:
            Data coming from client side

        Returns:
            This function will parse and return formatted list of columns
            added by user
        """
        columns = data['columns']
        # 'EDIT' mode
        if mode is not None:
            for action in ['added', 'changed']:
                if action in columns:
                    final_columns = []
                    for c in columns[action]:
                        if 'inheritedfrom' not in c:
                            final_columns.append(c)

                    for c in final_columns:
                        if 'attacl' in c:
                            c['attacl'] = parse_priv_to_db(c['attacl'], self.column_acl)

                        if 'cltype' in c:
                            # check type for '[]' in it
                            c['cltype'], c['hasSqrBracket'] = self._cltype_formatter(c['cltype'])

                        c = TableView.convert_length_precision_to_string(c)

                    data['columns'][action] = final_columns
        else:
            # We need to exclude all the columns which are inherited from other
            # tables 'CREATE' mode
            final_columns = []

            for c in columns:
                if 'inheritedfrom' not in c:
                    final_columns.append(c)

            # Now we have all lis of columns which we need
            # to include in our create definition, Let's format them
            for c in final_columns:
                if 'attacl' in c:
                    c['attacl'] = parse_priv_to_db(c['attacl'], self.column_acl)

                if 'cltype' in c:
                    # check type for '[]' in it
                    c['cltype'], c['hasSqrBracket'] = self._cltype_formatter(c['cltype'])

                c = TableView.convert_length_precision_to_string(c)

            data['columns'] = final_columns

        return data

    @BaseTableView.check_precondition
    def create(self, gid, sid, did, scid):
        """
        This function will creates new the table object

         Args:
           gid: Server Group ID
           sid: Server ID
           did: Database ID
           scid: Schema ID
        """
        data = request.form if request.form else json.loads(
            request.data, encoding='utf-8'
        )

        for k, v in data.items():
            try:
                data[k] = json.loads(v, encoding='utf-8')
            except (ValueError, TypeError, KeyError):
                data[k] = v

        required_args = [
            'name'
        ]

        for arg in required_args:
            if arg not in data:
                return make_json_response(
                    status=410,
                    success=0,
                    errormsg=gettext(
                        "Could not find the required parameter (%s)." % arg
                    )
                )

        # Parse privilege data coming from client according to database format
        if 'relacl' in data:
            data['relacl'] = parse_priv_to_db(data['relacl'], self.acl)

        # Parse & format columns
        data = self._parse_format_columns(data)
        data = TableView.check_and_convert_name_to_string(data)

        # 'coll_inherits' is Array but it comes as string from browser
        # We will convert it again to list
        if 'coll_inherits' in data and \
                isinstance(data['coll_inherits'], str):
            data['coll_inherits'] = json.loads(
                data['coll_inherits'], encoding='utf-8'
            )

        if 'foreign_key' in data:
            for c in data['foreign_key']:
                SQL = render_template(
                    "/".join([
                        self.foreign_key_template_path, 'get_parent.sql'
                    ]),
                    tid=c['columns'][0]['references']
                )
                status, rset = self.conn.execute_2darray(SQL)
                if not status:
                    return internal_server_error(errormsg=rset)

                c['remote_schema'] = rset['rows'][0]['schema']
                c['remote_table'] = rset['rows'][0]['table']

        try:
            partitions_sql = ''
            partitioned = False
            if 'is_partitioned' in data and data['is_partitioned']:
                data['relkind'] = 'p'
                # create partition scheme
                data['partition_scheme'] = self.get_partition_scheme(data)
                partitions_sql = self.get_partitions_sql(data)
                partitioned = True

            SQL = render_template(
                "/".join([self.table_template_path, 'create.sql']),
                data=data, conn=self.conn
            )

            # Append SQL for partitions
            SQL += '\n' + partitions_sql

            status, res = self.conn.execute_scalar(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            # PostgreSQL truncates the table name to 63 characters.
            # Have to truncate the name like PostgreSQL to get the
            # proper OID
            CONST_MAX_CHAR_COUNT = 63

            if len(data['name']) > CONST_MAX_CHAR_COUNT:
                data['name'] = data['name'][0:CONST_MAX_CHAR_COUNT]

            # Get updated schema oid
            SQL = render_template(
                "/".join([self.table_template_path, 'get_schema_oid.sql']),
                tname=data['name']
            )

            status, scid = self.conn.execute_scalar(SQL)
            if not status:
                return internal_server_error(errormsg=scid)

            # we need oid to to add object in tree at browser
            SQL = render_template(
                "/".join([self.table_template_path, 'get_oid.sql']),
                scid=scid, data=data
            )

            status, tid = self.conn.execute_scalar(SQL)
            if not status:
                return internal_server_error(errormsg=tid)

            return jsonify(
                node=self.blueprint.generate_browser_node(
                    tid,
                    scid,
                    data['name'],
                    icon="icon-partition" if partitioned else "icon-table",
                    is_partitioned=partitioned
                )
            )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @BaseTableView.check_precondition
    def update(self, gid, sid, did, scid, tid):
        """
        This function will update an existing table object

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
                data[k] = json.loads(v, encoding='utf-8')
            except (ValueError, TypeError, KeyError):
                data[k] = v

        try:
            SQL = render_template(
                "/".join([self.table_template_path, 'properties.sql']),
                did=did, scid=scid, tid=tid,
                datlastsysoid=self.datlastsysoid
            )
            status, res = self.conn.execute_dict(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            return super(TableView, self).update(
                gid, sid, did, scid, tid, data, res)
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @BaseTableView.check_precondition
    def delete(self, gid, sid, did, scid, tid):
        """
        This function will deletes the table object

         Args:
           gid: Server Group ID
           sid: Server ID
           did: Database ID
           scid: Schema ID
           tid: Table ID
        """

        try:
            SQL = render_template(
                "/".join([self.table_template_path, 'properties.sql']),
                did=did, scid=scid, tid=tid,
                datlastsysoid=self.datlastsysoid
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
                        'The specified table could not be found.\n'
                    )
                )

            return super(TableView, self).delete(gid, sid, did, scid, tid, res)

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @BaseTableView.check_precondition
    def truncate(self, gid, sid, did, scid, tid):
        """
        This function will truncate the table object

         Args:
           gid: Server Group ID
           sid: Server ID
           did: Database ID
           scid: Schema ID
           tid: Table ID
        """

        try:
            SQL = render_template(
                "/".join([self.table_template_path, 'properties.sql']),
                did=did, scid=scid, tid=tid,
                datlastsysoid=self.datlastsysoid
            )
            status, res = self.conn.execute_dict(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            return super(TableView, self).truncate(gid, sid, did, scid, tid, res)

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @BaseTableView.check_precondition
    def enable_disable_triggers(self, gid, sid, did, scid, tid):
        """
        This function will enable/disable trigger(s) on the table object

         Args:
           gid: Server Group ID
           sid: Server ID
           did: Database ID
           scid: Schema ID
           tid: Table ID
        """
        # Below will decide if it's simple drop or drop with cascade call
        data = request.form if request.form else json.loads(
            request.data, encoding='utf-8'
        )
        # Convert str 'true' to boolean type
        is_enable = json.loads(data['enable'])

        try:
            SQL = render_template(
                "/".join([self.table_template_path, 'properties.sql']),
                did=did, scid=scid, tid=tid,
                datlastsysoid=self.datlastsysoid
            )
            status, res = self.conn.execute_dict(SQL)
            if not status:
                return internal_server_error(errormsg=res)
            data = res['rows'][0]

            SQL = render_template(
                "/".join([
                    self.table_template_path, 'enable_disable_trigger.sql'
                ]),
                data=data, is_enable_trigger=is_enable
            )
            status, res = self.conn.execute_scalar(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            return make_json_response(
                success=1,
                info=gettext("Trigger(s) have been enabled") if is_enable
                else gettext("Trigger(s) have been disabled"),
                data={
                    'id': tid,
                    'scid': scid
                }
            )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @BaseTableView.check_precondition
    def reset(self, gid, sid, did, scid, tid):
        """
        This function will reset statistics of table

         Args:
           gid: Server Group ID
           sid: Server ID
           did: Database ID
           scid: Schema ID
           tid: Table ID
        """
        return BaseTableView.reset_statistics(self, scid, tid)

    @BaseTableView.check_precondition
    def msql(self, gid, sid, did, scid, tid=None):
        """
        This function will create modified sql for table object

         Args:
           gid: Server Group ID
           sid: Server ID
           did: Database ID
           scid: Schema ID
           tid: Table ID
        """
        data = dict()
        res = None
        for k, v in request.args.items():
            try:
                data[k] = json.loads(v, encoding='utf-8')
            except (ValueError, TypeError, KeyError):
                data[k] = v

        if tid is not None:
            SQL = render_template(
                "/".join([self.table_template_path, 'properties.sql']),
                did=did, scid=scid, tid=tid,
                datlastsysoid=self.datlastsysoid
            )
            status, res = self.conn.execute_dict(SQL)
            if not status:
                return internal_server_error(errormsg=res)

        SQL, name = self.get_sql(did, scid, tid, data, res)
        SQL = re.sub('\n{2,}', '\n\n', SQL)
        SQL = SQL.strip('\n')
        if SQL == '':
            SQL = "--modified SQL"
        return make_json_response(
            data=SQL,
            status=200
        )

    @BaseTableView.check_precondition
    def dependents(self, gid, sid, did, scid, tid):
        """
        This function get the dependents and return ajax response
        for the table node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID
            tid: Table ID
        """
        return BaseTableView.get_table_dependents(self, tid)

    @BaseTableView.check_precondition
    def dependencies(self, gid, sid, did, scid, tid):
        """
        This function get the dependencies and return ajax response
        for the table node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID
            tid: Table ID
        """
        return BaseTableView.get_table_dependencies(self, tid)

    @BaseTableView.check_precondition
    def sql(self, gid, sid, did, scid, tid):
        """
        This function will creates reverse engineered sql for
        the table object

         Args:
           gid: Server Group ID
           sid: Server ID
           did: Database ID
           scid: Schema ID
           tid: Table ID
        """
        main_sql = []

        SQL = render_template(
            "/".join([self.table_template_path, 'properties.sql']),
            did=did, scid=scid, tid=tid,
            datlastsysoid=self.datlastsysoid
        )
        status, res = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=res)

        if len(res['rows']) == 0:
                return gone(gettext("The specified table could not be found."))

        data = res['rows'][0]

        return BaseTableView.get_reverse_engineered_sql(
            self, did, scid, tid, main_sql, data)

    @BaseTableView.check_precondition
    def select_sql(self, gid, sid, did, scid, tid):
        """
        SELECT script sql for the object

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            tid: Table Id

        Returns:
            SELECT Script sql for the object
        """
        SQL = render_template(
            "/".join([self.table_template_path, 'properties.sql']),
            did=did, scid=scid, tid=tid,
            datlastsysoid=self.datlastsysoid
        )
        status, res = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=res)

        data = res['rows'][0]
        data = self._formatter(did, scid, tid, data)

        columns = []

        # Now we have all list of columns which we need
        if 'columns' in data:
            for c in data['columns']:
                columns.append(self.qtIdent(self.conn, c['attname']))

        if len(columns) > 0:
            columns = ", ".join(columns)
        else:
            columns = '*'

        sql = u"SELECT {0}\n\tFROM {1};".format(
            columns,
            self.qtIdent(self.conn, data['schema'], data['name'])
        )
        return ajax_response(response=sql)

    @BaseTableView.check_precondition
    def insert_sql(self, gid, sid, did, scid, tid):
        """
        INSERT script sql for the object

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            tid: Table Id

        Returns:
            INSERT Script sql for the object
        """
        SQL = render_template(
            "/".join([self.table_template_path, 'properties.sql']),
            did=did, scid=scid, tid=tid,
            datlastsysoid=self.datlastsysoid
        )
        status, res = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=res)

        data = res['rows'][0]
        data = self._formatter(did, scid, tid, data)

        columns = []
        values = []

        # Now we have all list of columns which we need
        if 'columns' in data:
            for c in data['columns']:
                columns.append(self.qtIdent(self.conn, c['attname']))
                values.append('?')

        if len(columns) > 0:
            columns = ", ".join(columns)
            values = ", ".join(values)
            sql = u"INSERT INTO {0}(\n\t{1})\n\tVALUES ({2});".format(
                self.qtIdent(self.conn, data['schema'], data['name']),
                columns, values
            )
        else:
            sql = gettext('-- Please create column(s) first...')

        return ajax_response(response=sql)

    @BaseTableView.check_precondition
    def update_sql(self, gid, sid, did, scid, tid):
        """
        UPDATE script sql for the object

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            tid: Table Id

        Returns:
            UPDATE Script sql for the object
        """
        SQL = render_template(
            "/".join([self.table_template_path, 'properties.sql']),
            did=did, scid=scid, tid=tid,
            datlastsysoid=self.datlastsysoid
        )
        status, res = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=res)

        data = res['rows'][0]
        data = self._formatter(did, scid, tid, data)

        columns = []

        # Now we have all list of columns which we need
        if 'columns' in data:
            for c in data['columns']:
                columns.append(self.qtIdent(self.conn, c['attname']))

        if len(columns) > 0:
            if len(columns) == 1:
                columns = columns[0]
            else:
                columns = "=?, ".join(columns)
            columns += "=?"

            sql = u"UPDATE {0}\n\tSET {1}\n\tWHERE <condition>;".format(
                self.qtIdent(self.conn, data['schema'], data['name']),
                columns
            )
        else:
            sql = gettext('-- Please create column(s) first...')

        return ajax_response(response=sql)

    @BaseTableView.check_precondition
    def delete_sql(self, gid, sid, did, scid, tid):
        """
        DELETE script sql for the object

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            tid: Table Id

        Returns:
            DELETE Script sql for the object
        """
        SQL = render_template(
            "/".join([self.table_template_path, 'properties.sql']),
            did=did, scid=scid, tid=tid,
            datlastsysoid=self.datlastsysoid
        )
        status, res = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=res)

        data = res['rows'][0]

        sql = u"DELETE FROM {0}\n\tWHERE <condition>;".format(
            self.qtIdent(self.conn, data['schema'], data['name'])
        )

        return ajax_response(response=sql)

    @BaseTableView.check_precondition
    def statistics(self, gid, sid, did, scid, tid=None):
        """
        Statistics

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            tid: Table Id

        Returns the statistics for a particular table if tid is specified,
        otherwise it will return statistics for all the tables in that
        schema.
        """
        return BaseTableView.get_table_statistics(self, scid, tid)

TableView.register_node_view(blueprint)
