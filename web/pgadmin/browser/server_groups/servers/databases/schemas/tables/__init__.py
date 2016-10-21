##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

""" Implements Table Node """

import simplejson as json
import re
from functools import wraps

import pgadmin.browser.server_groups.servers.databases as database
from flask import render_template, request, jsonify
from flask_babel import gettext
from pgadmin.browser.server_groups.servers.databases.schemas.utils \
    import SchemaChildModule, DataTypeReader, VacuumSettings, \
    trigger_definition, parse_rule_definition
from pgadmin.browser.server_groups.servers.utils import parse_priv_from_db, \
    parse_priv_to_db
from pgadmin.browser.utils import PGChildNodeView
from pgadmin.utils.ajax import make_json_response, internal_server_error, \
    make_response as ajax_response, gone
from pgadmin.utils.driver import get_driver

from config import PG_DEFAULT_DRIVER


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


blueprint = TableModule(__name__)


class TableView(PGChildNodeView, DataTypeReader, VacuumSettings):
    """
    This class is responsible for generating routes for Table node

    Methods:
    -------
    * __init__(**kwargs)
      - Method is used to initialize the TableView and it's base view.

    * module_js()
      - This property defines (if javascript) exists for this node.
        Override this property for your own logic

    * check_precondition()
      - This function will behave as a decorator which will checks
        database connection before running view, it will also attaches
        manager,conn & template_path properties to self

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

    * get_sql(data, scid, tid)
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

    * _formatter(data, tid)
      - It will return formatted output of query result
        as per client model format

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

    * _columns_formatter(tid, data):
      - It will return formatted output of query result
        as per client model format for column node

    * _index_constraints_formatter(self, tid, data):
      - It will return formatted output of query result
        as per client model format for index constraint node

    * _cltype_formatter(type): (staticmethod)
      - We need to remove [] from type and append it
        after length/precision so we will send flag for
        sql template

    * _parse_format_columns(self, data, mode=None):
       - This function will parse and return formatted list of columns
         added by user

    * get_index_constraint_sql(self, tid, data):
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
        'select_sql': [{'get': 'select_sql'}],
        'insert_sql': [{'get': 'insert_sql'}],
        'update_sql': [{'get': 'update_sql'}],
        'delete_sql': [{'get': 'delete_sql'}]

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
            did = kwargs['did']
            self.manager = driver.connection_manager(kwargs['sid'])
            self.conn = self.manager.connection(did=kwargs['did'])
            self.qtIdent = driver.qtIdent
            self.qtTypeIdent = driver.qtTypeIdent
            # We need datlastsysoid to check if current table is system table
            self.datlastsysoid = self.manager.db_info[
                did
            ]['datlastsysoid'] if self.manager.db_info is not None and \
                did in self.manager.db_info else 0

            ver = self.manager.version
            # Set the template path for the SQL scripts
            if ver >= 90500:
                self.template_path = 'table/sql/9.5_plus'
            else:
                self.template_path = 'table/sql/9.1_plus'

            # Template for Column ,check constraint and exclusion constraint node
            if ver >= 90600:
                self.column_template_path = 'column/sql/9.2_plus'
                self.check_constraint_template_path = 'check_constraint/sql/9.2_plus'
                self.exclusion_constraint_template_path = 'exclusion_constraint/sql/9.6_plus'
            elif ver >= 90200:
                self.column_template_path = 'column/sql/9.2_plus'
                self.check_constraint_template_path = 'check_constraint/sql/9.2_plus'
                self.exclusion_constraint_template_path = 'exclusion_constraint/sql/9.2_plus'
            else:
                self.column_template_path = 'column/sql/9.1_plus'
                self.check_constraint_template_path = 'check_constraint/sql/9.1_plus'
                self.exclusion_constraint_template_path = 'exclusion_constraint/sql/9.1_plus'

            # Template for PK & Unique constraint node
            self.index_constraint_template_path = 'index_constraint/sql'

            # Template for foreign key constraint node
            self.foreign_key_template_path = 'foreign_key/sql'

            # Template for index node
            self.index_template_path = 'index/sql/9.1_plus'

            # Template for trigger node
            self.trigger_template_path = 'trigger/sql/9.1_plus'

            # Template for rules node
            self.rules_template_path = 'rules/sql'

            # Supported ACL for table
            self.acl = ['a', 'r', 'w', 'd', 'D', 'x', 't']

            # Supported ACL for columns
            self.column_acl = ['a', 'r', 'w', 'x']

            return f(*args, **kwargs)

        return wrap

    @check_precondition
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
        SQL = render_template("/".join([self.template_path,
                                        'properties.sql']),
                              scid=scid, datlastsysoid=self.datlastsysoid)
        status, res = self.conn.execute_dict(SQL)

        if not status:
            return internal_server_error(errormsg=res)
        return ajax_response(
            response=res['rows'],
            status=200
        )

    @check_precondition
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
        SQL = render_template("/".join([self.template_path,
                                        'nodes.sql']),
                              scid=scid, tid=tid)
        status, rset = self.conn.execute_2darray(SQL)
        if not status:
            return internal_server_error(errormsg=rset)
        if len(rset['rows']) == 0:
                return gone(gettext("Could not find the table."))

        res = self.blueprint.generate_browser_node(
                rset['rows'][0]['oid'],
                scid,
                rset['rows'][0]['name'],
                icon="icon-table",
                tigger_count=rset['rows'][0]['triggercount'],
                has_enable_triggers=rset['rows'][0]['has_enable_triggers']
            )

        return make_json_response(
            data=res,
            status=200
        )


    @check_precondition
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
        SQL = render_template("/".join([self.template_path,
                                        'nodes.sql']),
                              scid=scid)
        status, rset = self.conn.execute_2darray(SQL)
        if not status:
            return internal_server_error(errormsg=rset)

        for row in rset['rows']:
            res.append(
                self.blueprint.generate_browser_node(
                    row['oid'],
                    scid,
                    row['name'],
                    icon="icon-table",
                    tigger_count=row['triggercount'],
                    has_enable_triggers=row['has_enable_triggers']
                ))

        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition
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
            SQL = render_template("/".join([self.template_path,
                                            'get_tables_for_constraints.sql']),
                                  show_sysobj=self.blueprint.show_system_objects)

            status, res = self.conn.execute_dict(SQL)

            if not status:
                return internal_server_error(errormsg=res)

            return make_json_response(
                data=res['rows'],
                status=200
            )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
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

    @check_precondition
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

    @check_precondition
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
        sql = render_template(
            "/".join([self.exclusion_constraint_template_path,
                      'get_access_methods.sql']))
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

    @check_precondition
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
                    "/".join([self.exclusion_constraint_template_path,
                              'get_oper_class.sql']),
                    indextype=data['indextype'])

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

    @check_precondition
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
                    "/".join([self.exclusion_constraint_template_path,
                              'get_operator.sql']),
                    type=data['col_type'],
                    show_sysobj=self.blueprint.show_system_objects)

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

    def _columns_formatter(self, tid, data):
        """
        Args:
            tid: Table OID
            data: dict of query result

        Returns:
            It will return formatted output of query result
            as per client model format for column node
        """
        for column in data['columns']:

            # We need to format variables according to client js collection
            if 'attoptions' in column and column['attoptions'] is not None:
                spcoptions = []
                for spcoption in column['attoptions']:
                    k, v = spcoption.split('=')
                    spcoptions.append({'name': k, 'value': v})

                column['attoptions'] = spcoptions

            # Need to format security labels according to client js collection
            if 'seclabels' in column and column['seclabels'] is not None:
                seclabels = []
                for seclbls in column['seclabels']:
                    k, v = seclbls.split('=')
                    seclabels.append({'provider': k, 'label': v})

                column['seclabels'] = seclabels

            if 'attnum' in column and column['attnum'] is not None and \
                            column['attnum'] > 0:
                # We need to parse & convert ACL coming from database to json format
                SQL = render_template("/".join([self.column_template_path, 'acl.sql']),
                                      tid=tid, clid=column['attnum'])
                status, acl = self.conn.execute_dict(SQL)

                if not status:
                    return internal_server_error(errormsg=acl)

                # We will set get privileges from acl sql so we don't need
                # it from properties sql
                column['attacl'] = []

                for row in acl['rows']:
                    priv = parse_priv_from_db(row)
                    column.setdefault(row['deftype'], []).append(priv)

                # we are receiving request when in edit mode
                # we will send filtered types related to current type
                present_type = column['cltype']

                type_id = column['atttypid']

                fulltype = self.get_full_type(
                    column['typnspname'], column['typname'],
                    column['isdup'], column['attndims'], column['atttypmod']
                )

                # If we have length & precision both
                matchObj = re.search(r'(\d+),(\d+)', fulltype)
                if matchObj:
                    column['attlen'] = int(matchObj.group(1))
                    column['attprecision'] = int(matchObj.group(2))
                else:
                    # If we have length only
                    matchObj = re.search(r'(\d+)', fulltype)
                    if matchObj:
                        column['attlen'] = int(matchObj.group(1))
                        column['attprecision'] = None
                    else:
                        column['attlen'] = None
                        column['attprecision'] = None

                SQL = render_template("/".join([self.column_template_path,
                                                'is_referenced.sql']),
                                      tid=tid, clid=column['attnum'])

                status, is_reference = self.conn.execute_scalar(SQL)

                edit_types_list = list()
                # We will need present type in edit mode

                if column['typnspname'] == "pg_catalog" or column['typnspname'] == "public":
                    edit_types_list.append(present_type)
                else:
                    t = self.qtTypeIdent(self.conn, column['typnspname'], present_type)
                    edit_types_list.append(t)
                    column['cltype'] = t

                if int(is_reference) == 0:
                    SQL = render_template("/".join([self.column_template_path,
                                                    'edit_mode_types.sql']),
                                          type_id=type_id)
                    status, rset = self.conn.execute_2darray(SQL)

                    for row in rset['rows']:
                        edit_types_list.append(row['typname'])
                else:
                    edit_types_list.append(present_type)

                column['edit_types'] = edit_types_list

                # Manual Data type formatting
                # If data type has () with them then we need to remove them
                # eg bit(1) because we need to match the name with combobox
                isArray = False
                if column['cltype'].endswith('[]'):
                    isArray = True
                    column['cltype'] = column['cltype'].rstrip('[]')

                idx = column['cltype'].find('(')
                if idx and column['cltype'].endswith(')'):
                    column['cltype'] = column['cltype'][:idx]

                if isArray:
                    column['cltype'] += "[]"

                if 'indkey' in column:
                    # Current column
                    attnum = str(column['attnum'])

                    # Single/List of primary key column(s)
                    indkey = str(column['indkey'])

                    # We will check if column is in primary column(s)
                    if attnum in indkey.split(" "):
                        column['is_primary_key'] = True
                    else:
                        column['is_primary_key'] = False

        return data

    def _index_constraints_formatter(self, tid, data):
        """
        Args:
            tid: Table OID
            data: dict of query result

        Returns:
            It will return formatted output of query result
            as per client model format for index constraint node
        """

        # We will fetch all the index constraints for the table
        index_constraints = {
            'p': 'primary_key', 'u': 'unique_constraint'
        }

        for ctype in index_constraints.keys():
            data[index_constraints[ctype]] = []

            sql = render_template("/".join([self.index_constraint_template_path,
                                            'properties.sql']),
                                  tid=tid,
                                  constraint_type=ctype)
            status, res = self.conn.execute_dict(sql)

            if not status:
                return internal_server_error(errormsg=res)

            for row in res['rows']:
                result = row
                sql = render_template(
                    "/".join([self.index_constraint_template_path,
                              'get_constraint_cols.sql']),
                    cid=row['oid'],
                    colcnt=row['indnatts'])
                status, res = self.conn.execute_dict(sql)

                if not status:
                    return internal_server_error(errormsg=res)

                columns = []
                for r in res['rows']:
                    columns.append({"column": r['column'].strip('"')})

                result['columns'] = columns

                # If not exists then create list and/or append into
                # existing list [ Adding into main data dict]
                data.setdefault(index_constraints[ctype], []).append(result)

        return data

    def _foreign_key_formatter(self, tid, data):
        """
        Args:
            tid: Table OID
            data: dict of query result

        Returns:
            It will return formatted output of query result
            as per client model format for foreign key constraint node
        """

        # We will fetch all the index constraints for the table
        sql = render_template("/".join([self.foreign_key_template_path,
                                        'properties.sql']),
                              tid=tid)

        status, result = self.conn.execute_dict(sql)

        if not status:
            return internal_server_error(errormsg=result)

        for fk in result['rows']:

            sql = render_template("/".join([self.foreign_key_template_path,
                                            'get_constraint_cols.sql']),
                                  tid=tid,
                                  keys=zip(fk['confkey'], fk['conkey']),
                                  confrelid=fk['confrelid'])

            status, res = self.conn.execute_dict(sql)

            if not status:
                return internal_server_error(errormsg=res)

            columns = []
            cols = []
            for row in res['rows']:
                columns.append({"local_column": row['conattname'],
                                "references": fk['confrelid'],
                                "referenced": row['confattname']})
                cols.append(row['conattname'])

            fk['columns'] = columns

            SQL = render_template("/".join([self.foreign_key_template_path,
                                            'get_parent.sql']),
                                  tid=fk['columns'][0]['references'])

            status, rset = self.conn.execute_2darray(SQL)
            if not status:
                return internal_server_error(errormsg=rset)

            fk['remote_schema'] = rset['rows'][0]['schema']
            fk['remote_table'] = rset['rows'][0]['table']

            coveringindex = self.search_coveringindex(tid, cols)

            fk['coveringindex'] = coveringindex
            if coveringindex:
                fk['autoindex'] = True
                fk['hasindex'] = True
            else:
                fk['autoindex'] = False
                fk['hasindex'] = False
            # If not exists then create list and/or append into
            # existing list [ Adding into main data dict]
            data.setdefault('foreign_key', []).append(fk)

        return data

    def _check_constraint_formatter(self, tid, data):
        """
        Args:
            tid: Table OID
            data: dict of query result

        Returns:
            It will return formatted output of query result
            as per client model format for check constraint node
        """

        # We will fetch all the index constraints for the table
        SQL = render_template("/".join([self.check_constraint_template_path,
                                        'properties.sql']),
                              tid=tid)

        status, res = self.conn.execute_dict(SQL)

        if not status:
            return internal_server_error(errormsg=res)
        # If not exists then create list and/or append into
        # existing list [ Adding into main data dict]

        data['check_constraint'] = res['rows']

        return data

    def _exclusion_constraint_formatter(self, tid, data):
        """
        Args:
            tid: Table OID
            data: dict of query result

        Returns:
            It will return formatted output of query result
            as per client model format for exclusion constraint node
        """

        # We will fetch all the index constraints for the table
        sql = render_template("/".join([self.exclusion_constraint_template_path,
                                        'properties.sql']),
                              tid=tid)

        status, result = self.conn.execute_dict(sql)

        if not status:
            return internal_server_error(errormsg=result)

        for ex in result['rows']:

            sql = render_template("/".join([self.exclusion_constraint_template_path,
                                            'get_constraint_cols.sql']),
                                  cid=ex['oid'],
                                  colcnt=ex['indnatts'])

            status, res = self.conn.execute_dict(sql)

            if not status:
                return internal_server_error(errormsg=res)

            columns = []
            for row in res['rows']:
                if row['options'] & 1:
                    order = False
                    nulls_order = True if (row['options'] & 2) else False
                else:
                    order = True
                    nulls_order = True if (row['options'] & 2) else False

                columns.append({"column": row['coldef'].strip('"'),
                                "oper_class": row['opcname'],
                                "order": order,
                                "nulls_order": nulls_order,
                                "operator": row['oprname'],
                                "col_type": row['datatype']
                                })

            ex['columns'] = columns
            # If not exists then create list and/or append into
            # existing list [ Adding into main data dict]
            data.setdefault('exclude_constraint', []).append(ex)

        return data

    def search_coveringindex(self, tid, cols):
        """

        Args:
          tid: Table id
          cols: column list

        Returns:

        """

        cols = set(cols)
        SQL = render_template("/".join([self.foreign_key_template_path,
                                        'get_constraints.sql']),
                              tid=tid)
        status, constraints = self.conn.execute_dict(SQL)

        if not status:
            raise Exception(constraints)

        for costrnt in constraints['rows']:

            sql = render_template(
                "/".join([self.foreign_key_template_path, 'get_cols.sql']),
                cid=costrnt['oid'],
                colcnt=costrnt['indnatts'])
            status, rest = self.conn.execute_dict(sql)

            if not status:
                return internal_server_error(errormsg=rest)

            indexcols = set()
            for r in rest['rows']:
                indexcols.add(r['column'].strip('"'))

            if len(cols - indexcols) == len(indexcols - cols) == 0:
                return costrnt["idxname"]

        return None

    def _formatter(self, scid, tid, data):
        """
        Args:
            data: dict of query result
            scid: schema oid
            tid: table oid

        Returns:
            It will return formatted output of query result
            as per client model format
        """
        # Need to format security labels according to client js collection
        if 'seclabels' in data and data['seclabels'] is not None:
            seclabels = []
            for seclbls in data['seclabels']:
                k, v = seclbls.split('=')
                seclabels.append({'provider': k, 'label': v})

            data['seclabels'] = seclabels

        # We need to parse & convert ACL coming from database to json format
        SQL = render_template("/".join([self.template_path, 'acl.sql']),
                              tid=tid, scid=scid)
        status, acl = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=acl)

        # We will set get privileges from acl sql so we don't need
        # it from properties sql
        for row in acl['rows']:
            priv = parse_priv_from_db(row)
            if row['deftype'] in data:
                data[row['deftype']].append(priv)
            else:
                data[row['deftype']] = [priv]

        # We will add Auto vacuum defaults with out result for grid
        data['vacuum_table'] = self.parse_vacuum_data(self.conn, data, 'table')
        data['vacuum_toast'] = self.parse_vacuum_data(self.conn, data, 'toast')

        # Fetch columns for the table logic
        #
        # 1) Check if of_type and inherited tables are present?
        # 2) If yes then Fetch all the columns for of_type and inherited tables
        # 3) Add columns in columns collection
        # 4) Find all the columns for tables and filter out columns which are
        #   not inherited from any table & format them one by one

        # Get of_type table columns and add it into columns dict
        if data['typname']:
            SQL = render_template("/".join([self.template_path,
                                            'get_columns_for_table.sql']),
                                  tname=data['typname'])

            status, res = self.conn.execute_dict(SQL)
            if not status:
                return internal_server_error(errormsg=res)
            data['columns'] = res['rows']

        # Get inherited table(s) columns and add it into columns dict
        elif data['coll_inherits'] and len(data['coll_inherits']) > 0:
            columns = []
            # Return all tables which can be inherited & do not show
            # system columns
            SQL = render_template("/".join([self.template_path, 'get_inherits.sql']),
                                  show_system_objects=False
                                  )
            status, rset = self.conn.execute_2darray(SQL)
            if not status:
                return internal_server_error(errormsg=rset)

            for row in rset['rows']:
                if row['inherits'] in data['coll_inherits']:
                    # Fetch columns using inherited table OID
                    SQL = render_template("/".join([self.template_path,
                                                    'get_columns_for_table.sql']),
                                          tid=row['oid'])
                    status, res = self.conn.execute_dict(SQL)
                    if not status:
                        return internal_server_error(errormsg=res)
                    columns.extend(res['rows'][:])
            data['columns'] = columns

        # We will fetch all the columns for the table using
        # columns properties.sql, so we need to set template path
        SQL = render_template("/".join([self.column_template_path,
                                        'properties.sql']),
                              tid=tid,
                              show_sys_objects=False
                              )

        status, res = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=res)
        all_columns = res['rows']

        # Filter inherited columns from all columns
        if 'columns' in data and len(data['columns']) > 0 \
                and len(all_columns) > 0:
            for row in data['columns']:
                for i, col in enumerate(all_columns):
                    # If both name are same then remove it
                    # as it is inherited from other table
                    if col['name'] == row['name']:
                        # Remove same column from all_columns as
                        # already have it columns collection
                        del all_columns[i]

            # If any column is added then update columns collection
            if len(all_columns) > 0:
                data['columns'] += all_columns
        # If no inherited columns found then add all columns
        elif len(all_columns) > 0:
            data['columns'] = all_columns

        if 'columns' in data and len(data['columns']) > 0:
            data = self._columns_formatter(tid, data)

        # Here we will add constraint in our output
        data = self._index_constraints_formatter(tid, data)
        data = self._foreign_key_formatter(tid, data)
        data = self._check_constraint_formatter(tid, data)
        data = self._exclusion_constraint_formatter(tid, data)

        return data

    @check_precondition
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

        SQL = render_template("/".join([self.template_path,
                                        'properties.sql']),
                              scid=scid, tid=tid,
                              datlastsysoid=self.datlastsysoid)
        status, res = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=res)
        data = res['rows'][0]

        data['vacuum_settings_str'] = ""

        if data['table_vacuum_settings_str'] is not None:
            data['vacuum_settings_str'] += data[
                'table_vacuum_settings_str'].replace(',', '\n')

        if data['toast_table_vacuum_settings_str'] is not None:
            data['vacuum_settings_str'] += '\n' + '\n'.join(
                ['toast_' + setting for setting in data[
                    'toast_table_vacuum_settings_str'
                ].split(',')]
            )
        data['vacuum_settings_str'] = data[
            'vacuum_settings_str'
        ].replace("=", " = ")

        data = self._formatter(scid, tid, data)

        return ajax_response(
            response=data,
            status=200
        )

    @check_precondition
    def types(self, gid, sid, did, scid, tid=None, clid=None):
        """
        Returns:
            This function will return list of types available for column node
            for node-ajax-control
        """
        condition = render_template("/".join([self.template_path,
                                              'get_types_where_condition.sql']),
                                    show_system_objects=self.blueprint.show_system_objects)

        status, types = self.get_types(self.conn, condition, True)

        if not status:
            return internal_server_error(errormsg=types)

        return make_json_response(
            data=types,
            status=200
        )

    @check_precondition
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
                SQL = render_template("/".join([self.template_path,
                                                'get_columns_for_table.sql']),
                                      tid=data['tid'])
            elif data and 'tname' in data:
                SQL = render_template("/".join([self.template_path,
                                                'get_columns_for_table.sql']),
                                      tname=data['tname'])

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

    @check_precondition
    def get_oftype(self, gid, sid, did, scid, tid=None):
        """
        Returns:
            This function will return list of types available for table node
            for node-ajax-control
        """
        res = [{'label': '', 'value': ''}]
        try:
            SQL = render_template("/".join([self.template_path,
                                            'get_oftype.sql']), scid=scid,
                                  server_type=self.manager.server_type,
                                  show_sys_objects=self.blueprint.show_system_objects)
            status, rset = self.conn.execute_2darray(SQL)
            if not status:
                return internal_server_error(errormsg=res)
            for row in rset['rows']:
                res.append(
                    {'label': row['typname'], 'value': row['typname'],
                     'tid': row['oid']
                     }
                )
            return make_json_response(
                data=res,
                status=200
            )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def get_inherits(self, gid, sid, did, scid, tid=None):
        """
        Returns:
            This function will return list of tables available for inheritance
            while creating new table
        """
        try:
            res = []
            SQL = render_template("/".join([self.template_path, 'get_inherits.sql']),
                                  show_system_objects=self.blueprint.show_system_objects,
                                  tid=tid,
                                  server_type=self.manager.server_type)
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

    @check_precondition
    def get_relations(self, gid, sid, did, scid, tid=None):
        """
        Returns:
            This function will return list of tables available for like/relation
            combobox while creating new table
        """
        res = [{'label': '', 'value': ''}]
        try:
            SQL = render_template("/".join([self.template_path, 'get_relations.sql']),
                                  show_sys_objects=self.blueprint.show_system_objects,
                                  server_type=self.manager.server_type)
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

    @staticmethod
    def _cltype_formatter(data_type):
        """

        Args:
            data_type: Type string

        Returns:
            We need to remove [] from type and append it
            after length/precision so we will send flag for
            sql template
        """
        if '[]' in data_type:
            return data_type[:-2], True
        else:
            return data_type, False

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

                    data['columns'][action] = final_columns
        else:
            # We need to exclude all the columns which are inherited from other tables
            # 'CREATE' mode
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

            data['columns'] = final_columns

        return data

    @check_precondition
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
                        "Couldn't find the required parameter (%s)." % arg
                    )
                )

        # Parse privilege data coming from client according to database format
        if 'relacl' in data:
            data['relacl'] = parse_priv_to_db(data['relacl'], self.acl)

        # Parse & format columns
        data = self._parse_format_columns(data)

        # 'coll_inherits' is Array but it comes as string from browser
        # We will convert it again to list
        if 'coll_inherits' in data and \
                isinstance(data['coll_inherits'], str):
            data['coll_inherits'] = json.loads(
                data['coll_inherits'], encoding='utf-8'
            )

        if 'foreign_key' in data:
            for c in data['foreign_key']:
                SQL = render_template("/".join([self.foreign_key_template_path,
                                                'get_parent.sql']),
                                      tid=c['columns'][0]['references'])
                status, rset = self.conn.execute_2darray(SQL)
                if not status:
                    return internal_server_error(errormsg=rset)

                c['remote_schema'] = rset['rows'][0]['schema']
                c['remote_table'] = rset['rows'][0]['table']

        try:
            SQL = render_template("/".join([self.template_path,
                                            'create.sql']),
                                  data=data, conn=self.conn)
            status, res = self.conn.execute_scalar(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            # Get updated schema oid
            SQL = render_template("/".join([self.template_path,
                                  'get_schema_oid.sql']), tname=data['name'])

            status, scid = self.conn.execute_scalar(SQL)
            if not status:
                return internal_server_error(errormsg=scid)

            # we need oid to to add object in tree at browser
            SQL = render_template("/".join([self.template_path,
                                  'get_oid.sql']), scid=scid, data=data)
            status, tid = self.conn.execute_scalar(SQL)
            if not status:
                return internal_server_error(errormsg=tid)

            return jsonify(
                node=self.blueprint.generate_browser_node(
                    tid,
                    scid,
                    data['name'],
                    icon="icon-table"
                )
            )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
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
            SQL, name = self.get_sql(scid, tid, data)

            SQL = SQL.strip('\n').strip(' ')
            status, res = self.conn.execute_scalar(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            SQL = render_template("/".join([self.template_path,
                                  'get_schema_oid.sql']), tid=tid)
            status, res = self.conn.execute_2darray(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            # new schema id
            scid = res['rows'][0]['scid']

            return jsonify(
                node=self.blueprint.generate_browser_node(
                    tid,
                    scid,
                    name,
                    icon="icon-%s" % self.node_type
                )
            )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
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
        # Below will decide if it's simple drop or drop with cascade call
        if self.cmd == 'delete':
            # This is a cascade operation
            cascade = True
        else:
            cascade = False

        try:
            SQL = render_template("/".join([self.template_path,
                                            'properties.sql']),
                                  scid=scid, tid=tid,
                                  datlastsysoid=self.datlastsysoid)
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

            data = res['rows'][0]

            SQL = render_template("/".join([self.template_path,
                                            'delete.sql']),
                                  data=data, cascade=cascade,
                                  conn=self.conn)
            status, res = self.conn.execute_scalar(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            return make_json_response(
                success=1,
                info=gettext("Table dropped"),
                data={
                    'id': tid,
                    'scid': scid
                }
            )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
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
        # Below will decide if it's simple drop or drop with cascade call
        data = request.form if request.form else json.loads(
            request.data, encoding='utf-8'
        )
        # Convert str 'true' to boolean type
        is_cascade = json.loads(data['cascade'])

        try:
            SQL = render_template("/".join([self.template_path,
                                            'properties.sql']),
                                  scid=scid, tid=tid,
                                  datlastsysoid=self.datlastsysoid)
            status, res = self.conn.execute_dict(SQL)
            if not status:
                return internal_server_error(errormsg=res)
            data = res['rows'][0]

            SQL = render_template("/".join([self.template_path,
                                            'truncate.sql']),
                                  data=data, cascade=is_cascade)
            status, res = self.conn.execute_scalar(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            return make_json_response(
                success=1,
                info=gettext("Table truncated"),
                data={
                    'id': tid,
                    'scid': scid
                }
            )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
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
            SQL = render_template("/".join([self.template_path,
                                            'properties.sql']),
                                  scid=scid, tid=tid,
                                  datlastsysoid=self.datlastsysoid)
            status, res = self.conn.execute_dict(SQL)
            if not status:
                return internal_server_error(errormsg=res)
            data = res['rows'][0]
            # TODO://
            # Find SQL which can enable all or disable all triggers
            SQL = render_template("/".join([self.template_path,
                                            'enable_disable_trigger.sql']),
                                  data=data, is_enable_trigger=is_enable)
            status, res = self.conn.execute_scalar(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            return make_json_response(
                success=1,
                info=gettext("Trigger(s) has been enabled") if is_enable
                else gettext("Trigger(s) has been disabled"),
                data={
                    'id': tid,
                    'scid': scid
                }
            )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
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
        try:
            SQL = render_template("/".join([self.template_path,
                                            'reset_stats.sql']),
                                  tid=tid)
            status, res = self.conn.execute_scalar(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            return make_json_response(
                success=1,
                info=gettext("Table statistics has been reset"),
                data={
                    'id': tid,
                    'scid': scid
                }
            )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
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
        for k, v in request.args.items():
            try:
                data[k] = json.loads(v, encoding='utf-8')
            except (ValueError, TypeError, KeyError):
                data[k] = v

        try:
            SQL, name = self.get_sql(scid, tid, data)
            SQL = re.sub('\n{2,}', '\n\n', SQL)
            SQL = SQL.strip('\n')
            if SQL == '':
                SQL = "--modified SQL"
            return make_json_response(
                data=SQL,
                status=200
            )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    def get_index_constraint_sql(self, tid, data):
        """
         Args:
           tid: Table ID
           data: data dict coming from the client

        Returns:
        This function will generate modified sql for index constraints
        (Primary Key & Unique)
        """
        sql = []
        # We will fetch all the index constraints for the table
        index_constraints = {
            'p': 'primary_key', 'u': 'unique_constraint'
        }

        for ctype in index_constraints.keys():
            # Check if constraint is in data
            # If yes then we need to check for add/change/delete
            if index_constraints[ctype] in data:
                constraint = data[index_constraints[ctype]]
                # If constraint(s) is/are deleted
                if 'deleted' in constraint:
                    for c in constraint['deleted']:
                        c['schema'] = data['schema']
                        c['table'] = data['name']

                        # Sql for drop
                        sql.append(
                            render_template("/".join(
                                [self.index_constraint_template_path,
                                 'delete.sql']),
                                data=c, conn=self.conn).strip('\n')
                        )

                if 'changed' in constraint:
                    for c in constraint['changed']:
                        c['schema'] = data['schema']
                        c['table'] = data['name']

                        properties_sql = render_template("/".join(
                            [self.index_constraint_template_path, 'properties.sql']),
                            tid=tid, cid=c['oid'], constraint_type=ctype)
                        status, res = self.conn.execute_dict(properties_sql)
                        if not status:
                            return internal_server_error(errormsg=res)

                        old_data = res['rows'][0]
                        # Sql to update object
                        sql.append(
                            render_template("/".join([
                                self.index_constraint_template_path,
                                'update.sql']), data=c, o_data=old_data,
                                conn=self.conn).strip('\n')
                        )

                if 'added' in constraint:
                    for c in constraint['added']:
                        c['schema'] = data['schema']
                        c['table'] = data['name']

                        # Sql to add object
                        if self.validate_constrains(index_constraints[ctype], c):
                            sql.append(
                                render_template(
                                    "/".join([self.index_constraint_template_path,
                                              'create.sql']),
                                    data=c, conn=self.conn,
                                    constraint_name='PRIMARY KEY'
                                    if ctype == 'p' else 'UNIQUE'
                                ).strip('\n')
                            )
                        else:
                            sql.append(
                                gettext(
                                    '-- incomplete definition for {0} constraint'.format(index_constraints[ctype])
                                )
                            )
        if len(sql) > 0:
            # Join all the sql(s) as single string
            return '\n\n'.join(sql)
        else:
            return None

    def get_foreign_key_sql(self, tid, data):
        """
         Args:
           tid: Table ID
           data: data dict coming from the client

        Returns:
        This function will generate modified sql for foreign key
        """
        sql = []
        # Check if constraint is in data
        # If yes then we need to check for add/change/delete
        if 'foreign_key' in data:
            constraint = data['foreign_key']
            # If constraint(s) is/are deleted
            if 'deleted' in constraint:
                for c in constraint['deleted']:
                    c['schema'] = data['schema']
                    c['table'] = data['name']

                    # Sql for drop
                    sql.append(
                        render_template("/".join(
                            [self.foreign_key_template_path,
                             'delete.sql']),
                            data=c, conn=self.conn).strip('\n')
                    )

            if 'changed' in constraint:
                for c in constraint['changed']:
                    c['schema'] = data['schema']
                    c['table'] = data['name']

                    properties_sql = render_template("/".join(
                        [self.foreign_key_template_path, 'properties.sql']),
                        tid=tid, cid=c['oid'])
                    status, res = self.conn.execute_dict(properties_sql)
                    if not status:
                        return internal_server_error(errormsg=res)

                    old_data = res['rows'][0]
                    # Sql to update object
                    sql.append(
                        render_template("/".join([
                            self.foreign_key_template_path,
                            'update.sql']), data=c, o_data=old_data,
                            conn=self.conn).strip('\n')
                    )

                    if not self.validate_constrains('foreign_key', c):
                        sql.append(
                            gettext(
                                '-- incomplete definition for foreign_key constraint'
                            )
                        )
                        return '\n\n'.join(sql)

                    if 'columns' in c:
                        cols = []
                        for col in c['columns']:
                            cols.append(col['local_column'])

                        coveringindex = self.search_coveringindex(tid, cols)

                        if coveringindex is None and 'autoindex' in c and c['autoindex'] and \
                                ('coveringindex' in c and
                                         c['coveringindex'] != ''):
                            sql.append(render_template(
                                "/".join([self.foreign_key_template_path, 'create_index.sql']),
                                data=c, conn=self.conn).strip('\n')
                                       )

            if 'added' in constraint:
                for c in constraint['added']:
                    c['schema'] = data['schema']
                    c['table'] = data['name']

                    # Sql to add object
                    # Columns

                    if not self.validate_constrains('foreign_key', c):
                        sql.append(
                            gettext(
                                '-- incomplete definition for foreign_key constraint'
                            )
                        )
                        return '\n\n'.join(sql)

                    SQL = render_template("/".join([self.foreign_key_template_path,
                                                    'get_parent.sql']),
                                          tid=c['columns'][0]['references'])
                    status, rset = self.conn.execute_2darray(SQL)
                    if not status:
                        return internal_server_error(errormsg=rset)

                    c['remote_schema'] = rset['rows'][0]['schema']
                    c['remote_table'] = rset['rows'][0]['table']

                    sql.append(
                        render_template(
                            "/".join([self.foreign_key_template_path,
                                      'create.sql']),
                            data=c, conn=self.conn
                        ).strip('\n')
                    )

                    if c['autoindex']:
                        sql.append(
                            render_template(
                                "/".join([self.foreign_key_template_path,
                                          'create_index.sql']),
                                data=c, conn=self.conn).strip('\n')
                        )

        if len(sql) > 0:
            # Join all the sql(s) as single string
            return '\n\n'.join(sql)
        else:
            return None

    def get_check_constraint_sql(self, tid, data):
        """
         Args:
           tid: Table ID
           data: data dict coming from the client

        Returns:
          This function will generate modified sql for check constraint
        """
        sql = []
        # Check if constraint is in data
        # If yes then we need to check for add/change/delete
        if 'check_constraint' in data:
            constraint = data['check_constraint']
            # If constraint(s) is/are deleted
            if 'deleted' in constraint:
                for c in constraint['deleted']:
                    c['schema'] = data['schema']
                    c['table'] = data['name']

                    # Sql for drop
                    sql.append(
                        render_template("/".join(
                            [self.check_constraint_template_path,
                             'delete.sql']),
                            data=c, conn=self.conn).strip('\n')
                    )

            if 'changed' in constraint:
                for c in constraint['changed']:
                    c['schema'] = data['schema']
                    c['table'] = data['name']

                    properties_sql = render_template("/".join(
                        [self.check_constraint_template_path, 'properties.sql']),
                        tid=tid, cid=c['oid'])
                    status, res = self.conn.execute_dict(properties_sql)
                    if not status:
                        return internal_server_error(errormsg=res)

                    old_data = res['rows'][0]
                    # Sql to update object
                    sql.append(
                        render_template("/".join([
                            self.check_constraint_template_path,
                            'update.sql']), data=c, o_data=old_data,
                            conn=self.conn).strip('\n')
                    )

            if 'added' in constraint:
                for c in constraint['added']:
                    c['schema'] = data['schema']
                    c['table'] = data['name']

                    if not self.validate_constrains('check_constraint', c):
                        sql.append(
                            gettext(
                                '-- incomplete definition for check_constraint'
                            )
                        )
                        return '\n\n'.join(sql)

                    sql.append(
                        render_template(
                            "/".join([self.check_constraint_template_path,
                                      'create.sql']),
                            data=c, conn=self.conn
                        ).strip('\n')
                    )

        if len(sql) > 0:
            # Join all the sql(s) as single string
            return '\n\n'.join(sql)
        else:
            return None

    def get_exclusion_constraint_sql(self, tid, data):
        """
         Args:
           tid: Table ID
           data: data dict coming from the client

        Returns:
          This function will generate modified sql for exclusion constraint
        """
        sql = []
        # Check if constraint is in data
        # If yes then we need to check for add/change/delete
        if 'exclude_constraint' in data:
            constraint = data['exclude_constraint']
            # If constraint(s) is/are deleted
            if 'deleted' in constraint:
                for c in constraint['deleted']:
                    c['schema'] = data['schema']
                    c['table'] = data['name']

                    # Sql for drop
                    sql.append(
                        render_template("/".join(
                            [self.exclusion_constraint_template_path,
                             'delete.sql']),
                            data=c, conn=self.conn).strip('\n')
                    )

            if 'changed' in constraint:
                for c in constraint['changed']:
                    c['schema'] = data['schema']
                    c['table'] = data['name']

                    properties_sql = render_template("/".join(
                        [self.exclusion_constraint_template_path, 'properties.sql']),
                        tid=tid, cid=c['oid'])
                    status, res = self.conn.execute_dict(properties_sql)
                    if not status:
                        return internal_server_error(errormsg=res)

                    old_data = res['rows'][0]
                    # Sql to update object
                    sql.append(
                        render_template("/".join([
                            self.exclusion_constraint_template_path,
                            'update.sql']), data=c, o_data=old_data,
                            conn=self.conn).strip('\n')
                    )

            if 'added' in constraint:
                for c in constraint['added']:
                    c['schema'] = data['schema']
                    c['table'] = data['name']

                    if not self.validate_constrains('exclude_constraint', c):
                        sql.append(
                            gettext(
                                '-- incomplete definition for exclusion_constraint'
                            )
                        )
                        return '\n\n'.join(sql)

                    sql.append(
                        render_template(
                            "/".join([self.exclusion_constraint_template_path,
                                      'create.sql']),
                            data=c, conn=self.conn
                        ).strip('\n')
                    )

        if len(sql) > 0:
            # Join all the sql(s) as single string
            return '\n\n'.join(sql)
        else:
            return None

    def get_sql(self, scid, tid, data):
        """
        This function will generate create/update sql from model data
        coming from client
        """
        if tid is not None:
            SQL = render_template("/".join([self.template_path,
                                            'properties.sql']),
                                  scid=scid, tid=tid,
                                  datlastsysoid=self.datlastsysoid)
            status, res = self.conn.execute_dict(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            old_data = res['rows'][0]
            old_data = self._formatter(scid, tid, old_data)

            # We will convert privileges coming from client required
            if 'relacl' in data:
                for mode in ['added', 'changed', 'deleted']:
                    if mode in data['relacl']:
                        data['relacl'][mode] = parse_priv_to_db(
                            data['relacl'][mode], self.acl
                        )

            # If name if not present
            if 'name' not in data:
                data['name'] = old_data['name']
            # If name if not present
            if 'schema' not in data:
                data['schema'] = old_data['schema']

            # Filter out new tables from list, we will send complete list
            # and not newly added tables in the list from client
            # so we will filter new tables here
            if 'coll_inherits' in data:
                p_len = len(old_data['coll_inherits'])
                c_len = len(data['coll_inherits'])
                # If table(s) added
                if c_len > p_len:
                    data['coll_inherits_added'] = list(
                        set(data['coll_inherits']) - set(old_data['coll_inherits'])
                    )
                # If table(s)removed
                elif c_len < p_len:
                    data['coll_inherits_removed'] = list(
                        set(old_data['coll_inherits']) - set(data['coll_inherits'])
                    )
                # Safe side verification,In case it happens..
                # If user removes and adds same number of table
                # eg removed one table and added one new table
                elif c_len == p_len:
                    data['coll_inherits_added'] = list(
                        set(data['coll_inherits']) - set(old_data['coll_inherits'])
                    )
                    data['coll_inherits_removed'] = list(
                        set(old_data['coll_inherits']) - set(data['coll_inherits'])
                    )

            SQL = render_template("/".join([self.template_path, 'update.sql']),
                                  o_data=old_data, data=data, conn=self.conn)
            # Removes training new lines
            SQL = SQL.strip('\n') + '\n\n'

            # Parse/Format columns & create sql
            if 'columns' in data:
                # Parse the data coming from client
                data = self._parse_format_columns(data, mode='edit')

                columns = data['columns']
                column_sql = '\n'

                # If column(s) is/are deleted
                if 'deleted' in columns:
                    for c in columns['deleted']:
                        c['schema'] = data['schema']
                        c['table'] = data['name']
                        # Sql for drop column
                        if 'inheritedfrom' not in c:
                            column_sql += render_template("/".join(
                                [self.column_template_path, 'delete.sql']),
                                data=c, conn=self.conn).strip('\n') + '\n\n'

                # If column(s) is/are changed
                # Here we will be needing previous properties of column
                # so that we can compare & update it
                if 'changed' in columns:
                    for c in columns['changed']:
                        c['schema'] = data['schema']
                        c['table'] = data['name']
                        if 'attacl' in c:
                            c['attacl'] = parse_priv_to_db(c['attacl'],
                                                           self.column_acl)

                        properties_sql = render_template("/".join([self.column_template_path,
                                                                   'properties.sql']),
                                                         tid=tid,
                                                         clid=c['attnum'],
                                                         show_sys_objects=self.blueprint.show_system_objects
                                                         )

                        status, res = self.conn.execute_dict(properties_sql)
                        if not status:
                            return internal_server_error(errormsg=res)
                        old_data = res['rows'][0]

                        old_data['cltype'], old_data['hasSqrBracket'] = self._cltype_formatter(old_data['cltype'])

                        fulltype = self.get_full_type(
                            old_data['typnspname'], old_data['typname'],
                            old_data['isdup'], old_data['attndims'], old_data['atttypmod']
                        )

                        # If we have length & precision both
                        matchObj = re.search(r'(\d+),(\d+)', fulltype)
                        if matchObj:
                            old_data['attlen'] = int(matchObj.group(1))
                            old_data['attprecision'] = int(matchObj.group(2))
                        else:
                            # If we have length only
                            matchObj = re.search(r'(\d+)', fulltype)
                            if matchObj:
                                old_data['attlen'] = int(matchObj.group(1))
                                old_data['attprecision'] = None
                            else:
                                old_data['attlen'] = None
                                old_data['attprecision'] = None

                        # Manual Data type formatting
                        # If data type has () with them then we need to remove them
                        # eg bit(1) because we need to match the name with combobox
                        isArray = False
                        if old_data['cltype'].endswith('[]'):
                            isArray = True
                            old_data['cltype'] = old_data['cltype'].rstrip('[]')

                        idx = old_data['cltype'].find('(')
                        if idx and old_data['cltype'].endswith(')'):
                            old_data['cltype'] = old_data['cltype'][:idx]

                        if isArray:
                            old_data['cltype'] += "[]"

                        if old_data['typnspname'] != 'pg_catalog':
                            old_data['cltype'] = self.qtIdent(self.conn, old_data['typnspname']) \
                                               + '.' + old_data['cltype']
                        # Sql for alter column
                        if 'inheritedfrom' not in c:
                            column_sql += render_template("/".join(
                                [self.column_template_path, 'update.sql']),
                                data=c, o_data=old_data, conn=self.conn).strip('\n') + '\n\n'

                # If column(s) is/are added
                if 'added' in columns:
                    for c in columns['added']:
                        c['schema'] = data['schema']
                        c['table'] = data['name']
                        # Sql for create column
                        if 'attacl' in c:
                            c['attacl'] = parse_priv_to_db(c['attacl'],
                                                           self.column_acl)
                        if 'inheritedfrom' not in c:
                            column_sql += render_template("/".join(
                                [self.column_template_path, 'create.sql']),
                                data=c, conn=self.conn).strip('\n') + '\n\n'

                # Combine all the SQL together
                SQL += column_sql.strip('\n')

            # Check if index constraints are added/changed/deleted
            index_constraint_sql = self.get_index_constraint_sql(tid, data)
            # If we have index constraint sql then ad it in main sql
            if index_constraint_sql is not None:
                SQL += '\n' + index_constraint_sql

            # Check if foreign key(s) is/are added/changed/deleted
            foreign_key_sql = self.get_foreign_key_sql(tid, data)
            # If we have foreign key sql then ad it in main sql
            if foreign_key_sql is not None:
                SQL += '\n' + foreign_key_sql

            # Check if check constraint(s) is/are added/changed/deleted
            check_constraint_sql = self.get_check_constraint_sql(tid, data)
            # If we have check constraint sql then ad it in main sql
            if check_constraint_sql is not None:
                SQL += '\n' + check_constraint_sql

            # Check if exclusion constraint(s) is/are added/changed/deleted
            exclusion_constraint_sql = self.get_exclusion_constraint_sql(tid, data)
            # If we have check constraint sql then ad it in main sql
            if exclusion_constraint_sql is not None:
                SQL += '\n' + exclusion_constraint_sql

        else:
            required_args = [
                'name'
            ]

            for arg in required_args:
                if arg not in data:
                    return gettext('-- incomplete definition')

            # validate constraint data.
            for key in ['primary_key', 'unique_constraint',
                        'foreign_key', 'check_constraint',
                        'exclude_constraint']:
                if key in data and len(data[key]) > 0:
                    for constraint in data[key]:
                        if not self.validate_constrains(key, constraint):
                            return gettext('-- incomplete definition for {0}'.format(key))

            # We will convert privileges coming from client required
            # in server side format
            if 'relacl' in data:
                data['relacl'] = parse_priv_to_db(data['relacl'], self.acl)

            # Parse & format columns
            data = self._parse_format_columns(data)

            if 'foreign_key' in data:
                for c in data['foreign_key']:
                    SQL = render_template("/".join([self.foreign_key_template_path,
                                                    'get_parent.sql']),
                                          tid=c['columns'][0]['references'])
                    status, rset = self.conn.execute_2darray(SQL)
                    if not status:
                        return internal_server_error(errormsg=rset)

                    c['remote_schema'] = rset['rows'][0]['schema']
                    c['remote_table'] = rset['rows'][0]['table']

            # If the request for new object which do not have did
            SQL = render_template("/".join([self.template_path, 'create.sql']),
                                  data=data, conn=self.conn)
        SQL = re.sub('\n{2,}', '\n\n', SQL)
        SQL = SQL.strip('\n')

        return SQL, data['name'] if 'name' in data else old_data['name']

    @staticmethod
    def validate_constrains(key, data):

        if key == 'primary_key' or key == 'unique_constraint':
            if 'columns' in data and len(data['columns']) > 0:
                return True
            else:
                return False
        elif key == 'foreign_key':
            if 'oid' not in data:
                for arg in ['columns']:
                    if arg not in data:
                        return False
                    elif isinstance(data[arg], list) and len(data[arg]) < 1:
                        return False

                if 'autoindex' in data and data['autoindex'] and \
                        ('coveringindex' not in data or
                                                  data['coveringindex'] == ''):
                    return False

            return True

        elif key == 'check_constraint':
            for arg in ['consrc']:
                if arg not in data or data[arg] == '':
                    return False
            return True

        elif key == 'exclude_constraint':
            pass

        return True

    @check_precondition
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
        # Specific condition for column which we need to append
        where = "WHERE dep.refobjid={0}::OID".format(tid)

        dependents_result = self.get_dependents(
            self.conn, tid
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

            dependents_result.append({'type': 'sequence', 'name': ref_name, 'field': dep_type})

        return ajax_response(
            response=dependents_result,
            status=200
        )

    @check_precondition
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
        dependencies_result = self.get_dependencies(
            self.conn, tid
        )

        return ajax_response(
            response=dependencies_result,
            status=200
        )

    @check_precondition
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

        """
        #####################################
        # 1) Reverse engineered sql for TABLE
        #####################################
        """
        SQL = render_template("/".join([self.template_path,
                                        'properties.sql']),
                              scid=scid, tid=tid,
                              datlastsysoid=self.datlastsysoid)
        status, res = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=res)

        data = res['rows'][0]

        # Table & Schema declaration so that we can use them in child nodes
        schema = data['schema']
        table = data['name']

        data = self._formatter(scid, tid, data)

        # Now we have all lis of columns which we need
        # to include in our create definition, Let's format them
        if 'columns' in data:
            for c in data['columns']:
                if 'attacl' in c:
                    c['attacl'] = parse_priv_to_db(c['attacl'], self.column_acl)

                # check type for '[]' in it
                if 'cltype' in c:
                    c['cltype'], c['hasSqrBracket'] = self._cltype_formatter(c['cltype'])

        sql_header = u"-- Table: {0}\n\n-- ".format(self.qtIdent(self.conn,
                                                                data['schema'],
                                                                data['name']))

        sql_header += render_template("/".join([self.template_path,
                                                'delete.sql']),
                                      data=data, conn=self.conn)

        sql_header = sql_header.strip('\n')
        sql_header += '\n'

        # Add into main sql
        main_sql.append(sql_header)

        # Parse privilege data
        if 'relacl' in data:
            data['relacl'] = parse_priv_to_db(data['relacl'], self.acl)

        # If the request for new object which do not have did
        table_sql = render_template("/".join([self.template_path,
                                              'create.sql']),
                                    data=data, conn=self.conn)

        # Add into main sql
        table_sql = re.sub('\n{2,}', '\n\n', table_sql)
        main_sql.append(table_sql.strip('\n'))

        """
        ######################################
        # 2) Reverse engineered sql for INDEX
        ######################################
        """

        SQL = render_template("/".join([self.index_template_path,
                                        'nodes.sql']), tid=tid)
        status, rset = self.conn.execute_2darray(SQL)
        if not status:
            return internal_server_error(errormsg=rset)

        for row in rset['rows']:

            SQL = render_template("/".join([self.index_template_path,
                                            'properties.sql']),
                                  tid=tid, idx=row['oid'],
                                  datlastsysoid=self.datlastsysoid)

            status, res = self.conn.execute_dict(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            data = dict(res['rows'][0])
            # Adding parent into data dict, will be using it while creating sql
            data['schema'] = schema
            data['table'] = table
            # We also need to fecth columns of index
            SQL = render_template("/".join([self.index_template_path,
                                            'column_details.sql']),
                                  idx=row['oid'])
            status, rset = self.conn.execute_2darray(SQL)
            if not status:
                return internal_server_error(errormsg=rset)

            # 'attdef' comes with quotes from query so we need to strip them
            # 'options' we need true/false to render switch ASC(false)/DESC(true)
            columns = []
            cols = []
            for row in rset['rows']:
                # We need all data as collection for ColumnsModel
                cols_data = {
                    'colname': row['attdef'].strip('"'),
                    'collspcname': row['collnspname'],
                    'op_class': row['opcname'],
                }
                if row['options'][0] == 'DESC':
                    cols_data['sort_order'] = True
                columns.append(cols_data)

                # We need same data as string to display in properties window
                # If multiple column then separate it by colon
                cols_str = row['attdef']
                if row['collnspname']:
                    cols_str += ' COLLATE ' + row['collnspname']
                if row['opcname']:
                    cols_str += ' ' + row['opcname']
                if row['options'][0] == 'DESC':
                    cols_str += ' DESC'
                cols.append(cols_str)

            # Push as collection
            data['columns'] = columns
            # Push as string
            data['cols'] = ', '.join(cols)

            sql_header = "\n-- Index: {0}\n\n-- ".format(data['name'])
            if hasattr(str, 'decode'):
                sql_header = sql_header.decode('utf-8')

            sql_header += render_template("/".join([self.index_template_path,
                                                    'delete.sql']),
                                          data=data, conn=self.conn)

            index_sql = render_template("/".join([self.index_template_path,
                                                  'create.sql']),
                                        data=data, conn=self.conn)
            index_sql += "\n"
            index_sql += render_template("/".join([self.index_template_path,
                                                   'alter.sql']),
                                         data=data, conn=self.conn)

            # Add into main sql
            index_sql = re.sub('\n{2,}', '\n\n', index_sql)
            main_sql.append(sql_header + '\n\n' + index_sql.strip('\n'))

        """
        ########################################
        # 3) Reverse engineered sql for TRIGGERS
        ########################################
        """
        SQL = render_template("/".join([self.trigger_template_path,
                                        'nodes.sql']), tid=tid)
        status, rset = self.conn.execute_2darray(SQL)
        if not status:
            return internal_server_error(errormsg=rset)

        for row in rset['rows']:
            trigger_sql = ''

            SQL = render_template("/".join([self.trigger_template_path,
                                            'properties.sql']),
                                  tid=tid, trid=row['oid'],
                                  datlastsysoid=self.datlastsysoid)

            status, res = self.conn.execute_dict(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            data = dict(res['rows'][0])
            # Adding parent into data dict, will be using it while creating sql
            data['schema'] = schema
            data['table'] = table

            if data['tgnargs'] > 1:
                # We know that trigger has more than 1 arguments, let's join them
                data['tgargs'] = ', '.join(data['tgargs'])

            if len(data['tgattr']) > 1:
                columns = ', '.join(data['tgattr'].split(' '))

                SQL = render_template("/".join([self.trigger_template_path,
                                                'get_columns.sql']),
                                      tid=tid, clist=columns)

                status, rset = self.conn.execute_2darray(SQL)
                if not status:
                    return internal_server_error(errormsg=rset)
                # 'tgattr' contains list of columns from table used in trigger
                columns = []

                for row in rset['rows']:
                    columns.append({'column': row['name']})

                data['columns'] = columns

            data = trigger_definition(data)

            sql_header = "\n-- Trigger: {0}\n\n-- ".format(data['name'])
            if hasattr(str, 'decode'):
                sql_header = sql_header.decode('utf-8')

            sql_header += render_template("/".join([self.trigger_template_path,
                                                    'delete.sql']),
                                          data=data, conn=self.conn)

            # If the request for new object which do not have did
            trigger_sql = render_template("/".join([self.trigger_template_path,
                                                    'create.sql']),
                                          data=data, conn=self.conn)

            trigger_sql = sql_header + '\n\n' + trigger_sql.strip('\n')

            # If trigger is disabled then add sql code for the same
            if not data['is_enable_trigger']:
                trigger_sql += '\n\n'
                trigger_sql += render_template("/".join([
                    self.trigger_template_path,
                    'enable_disable_trigger.sql']),
                    data=data, conn=self.conn)

            # Add into main sql
            trigger_sql = re.sub('\n{2,}', '\n\n', trigger_sql)
            main_sql.append(trigger_sql)

        """
        #####################################
        # 4) Reverse engineered sql for RULES
        #####################################
        """

        SQL = render_template("/".join(
            [self.rules_template_path, 'properties.sql']), tid=tid)

        status, rset = self.conn.execute_2darray(SQL)
        if not status:
            return internal_server_error(errormsg=rset)

        for row in rset['rows']:
            rules_sql = '\n'
            SQL = render_template("/".join(
                [self.rules_template_path, 'properties.sql']
            ), rid=row['oid'], datlastsysoid=self.datlastsysoid)

            status, res = self.conn.execute_dict(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            res_data = parse_rule_definition(res)
            rules_sql += render_template("/".join(
                [self.rules_template_path, 'create.sql']),
                data=res_data, display_comments=True)

            # Add into main sql
            rules_sql = re.sub('\n{2,}', '\n\n', rules_sql)
            main_sql.append(rules_sql)

        sql = '\n'.join(main_sql)

        return ajax_response(response=sql.strip('\n'))

    @check_precondition
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
        SQL = render_template("/".join([self.template_path,
                                        'properties.sql']),
                              scid=scid, tid=tid,
                              datlastsysoid=self.datlastsysoid)
        status, res = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=res)

        data = res['rows'][0]
        data = self._formatter(scid, tid, data)

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

    @check_precondition
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
        SQL = render_template("/".join([self.template_path,
                                        'properties.sql']),
                              scid=scid, tid=tid,
                              datlastsysoid=self.datlastsysoid)
        status, res = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=res)

        data = res['rows'][0]
        data = self._formatter(scid, tid, data)

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

    @check_precondition
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
        SQL = render_template("/".join([self.template_path,
                                        'properties.sql']),
                              scid=scid, tid=tid,
                              datlastsysoid=self.datlastsysoid)
        status, res = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=res)

        data = res['rows'][0]
        data = self._formatter(scid, tid, data)

        columns = []

        # Now we have all list of columns which we need
        if 'columns' in data:
            for c in data['columns']:
                columns.append(self.qtIdent(self.conn, c['attname']))

        if len(columns) > 0:
            if len(columns) == 1:
                columns = columns[0]
                columns += "=?"
            else:
                columns = "=?, ".join(columns)

            sql = u"UPDATE {0}\n\tSET {1}\n\tWHERE <condition>;".format(
                self.qtIdent(self.conn, data['schema'], data['name']),
                columns
            )
        else:
            sql = gettext('-- Please create column(s) first...')

        return ajax_response(response=sql)

    @check_precondition
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
        SQL = render_template("/".join([self.template_path,
                                        'properties.sql']),
                              scid=scid, tid=tid,
                              datlastsysoid=self.datlastsysoid)
        status, res = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=res)

        data = res['rows'][0]

        sql = u"DELETE FROM {0}\n\tWHERE <condition>;".format(
            self.qtIdent(self.conn, data['schema'], data['name'])
        )

        return ajax_response(response=sql)

    @check_precondition
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

        # Fetch schema name
        status, schema_name = self.conn.execute_scalar(
            render_template(
                "/".join([self.template_path, 'get_schema.sql']),
                conn=self.conn, scid=scid
            )
        )
        if not status:
            return internal_server_error(errormsg=schema_name)

        if tid is None:
            status, res = self.conn.execute_dict(
                render_template(
                    "/".join([self.template_path, 'coll_table_stats.sql']),
                    conn=self.conn, schema_name=schema_name
                )
            )
        else:
            # For Individual table stats

            # Check if pgstattuple extension is already created?
            # if created then only add extended stats
            status, is_pgstattuple = self.conn.execute_scalar("""
            SELECT (count(extname) > 0) AS is_pgstattuple
            FROM pg_extension
            WHERE extname='pgstattuple'
            """)
            if not status:
                return internal_server_error(errormsg=is_pgstattuple)

            # Fetch Table name
            status, table_name = self.conn.execute_scalar(
                render_template(
                    "/".join([self.template_path, 'get_table.sql']),
                    conn=self.conn, scid=scid, tid=tid
                )
            )
            if not status:
                return internal_server_error(errormsg=table_name)

            status, res = self.conn.execute_dict(
                render_template(
                    "/".join([self.template_path, 'stats.sql']),
                    conn=self.conn, schema_name=schema_name,
                    table_name=table_name,
                    is_pgstattuple=is_pgstattuple, tid=tid
                )
            )

        if not status:
            return internal_server_error(errormsg=res)

        return make_json_response(
            data=res,
            status=200
        )


TableView.register_node_view(blueprint)
