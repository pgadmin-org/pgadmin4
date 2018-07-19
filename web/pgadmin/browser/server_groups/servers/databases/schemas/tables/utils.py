##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2018, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

""" Implements Utility class for Table and Partitioned Table. """

import re
from functools import wraps
import simplejson as json
from flask import render_template, jsonify, request
from flask_babelex import gettext

from pgadmin.browser.server_groups.servers.databases.schemas\
    .tables.base_partition_table import BasePartitionTable
from pgadmin.utils.ajax import make_json_response, internal_server_error, \
    make_response as ajax_response
from pgadmin.browser.server_groups.servers.databases.schemas.utils \
    import DataTypeReader, trigger_definition, parse_rule_definition
from pgadmin.browser.server_groups.servers.utils import parse_priv_from_db, \
    parse_priv_to_db
from pgadmin.browser.utils import PGChildNodeView
from pgadmin.utils import IS_PY2
from pgadmin.utils.compile_template_name import compile_template_path
from pgadmin.utils.driver import get_driver
from config import PG_DEFAULT_DRIVER


class BaseTableView(PGChildNodeView, BasePartitionTable):
    """
    This class is base class for tables and partitioned tables.

    Methods:
    -------
    * check_precondition()
      - This function will behave as a decorator which will checks
        database connection before running view, it will also attaches
        manager,conn & template_path properties to self

    * _formatter(data, tid)
      - It will return formatted output of query result
        as per client model format

    * _columns_formatter(tid, data):
      - It will return formatted output of query result
        as per client model format for column node

    * _index_constraints_formatter(self, did, tid, data):
      - It will return formatted output of query result
        as per client model format for index constraint node

    * _cltype_formatter(type): (staticmethod)
      - We need to remove [] from type and append it
        after length/precision so we will send flag for
        sql template.

    * get_table_dependents(self, tid):
      - This function get the dependents and return ajax response
        for the table node.

    * get_table_dependencies(self, tid):
      - This function get the dependencies and return ajax response
        for the table node.

    * get_table_statistics(self, tid):
      - Returns the statistics for a particular table if tid is specified,
        otherwise it will return statistics for all the tables in that
        schema.
    * get_reverse_engineered_sql(self, did, scid, tid, main_sql, data):
      - This function will creates reverse engineered sql for
        the table object.

    * reset_statistics(self, scid, tid):
      - This function will reset statistics of table.

    * get_trigger_function_schema(self, data)
      - This function will return trigger function with schema name

    * _format_args(self, arg)
      - This function will format trigger function arguments.
    """
    @staticmethod
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
            server_type = self.manager.server_type
            # Set the template path for the SQL scripts
            self.table_template_path = compile_template_path('table/sql',
                                                             server_type, ver)
            self.data_type_template_path = compile_template_path(
                'datatype/sql',
                server_type, ver)
            self.partition_template_path = \
                'partition/sql/{0}/#{0}#{1}#'.format(server_type, ver)

            # Template for Column ,check constraint and exclusion
            # constraint node
            self.column_template_path = 'column/sql/#{0}#'.format(ver)
            self.check_constraint_template_path = compile_template_path(
                'check_constraint/sql', server_type, ver)
            self.exclusion_constraint_template_path = compile_template_path(
                'exclusion_constraint/sql', server_type, ver)

            # Template for PK & Unique constraint node
            self.index_constraint_template_path = 'index_constraint/sql/#{0}#'\
                .format(ver)

            # Template for foreign key constraint node
            self.foreign_key_template_path = compile_template_path(
                'foreign_key/sql', server_type, ver)

            # Template for index node
            self.index_template_path = compile_template_path(
                'index/sql', server_type, ver)

            # Template for trigger node
            self.trigger_template_path = compile_template_path(
                'trigger/sql', server_type, ver)

            # Template for rules node
            self.rules_template_path = 'rules/sql'

            # Supported ACL for table
            self.acl = ['a', 'r', 'w', 'd', 'D', 'x', 't']

            # Supported ACL for columns
            self.column_acl = ['a', 'r', 'w', 'x']

            return f(*args, **kwargs)

        return wrap

    def get_trigger_function_schema(self, data):
        """
        This function will return trigger function with schema name
        """
        # If language is 'edbspl' then trigger function should be
        # 'Inline EDB-SPL' else we will find the trigger function
        # with schema name.
        if data['lanname'] == 'edbspl':
            data['tfunction'] = 'Inline EDB-SPL'
        else:
            SQL = render_template(
                "/".join(
                    [self.trigger_template_path, 'get_triggerfunctions.sql']
                ),
                tgfoid=data['tgfoid'],
                show_system_objects=self.blueprint.show_system_objects
            )

            status, result = self.conn.execute_dict(SQL)
            if not status:
                return internal_server_error(errormsg=result)

            # Update the trigger function which we have fetched with
            # schema name
            if 'rows' in result and len(result['rows']) > 0 and \
                    'tfunctions' in result['rows'][0]:
                data['tfunction'] = result['rows'][0]['tfunctions']
        return data

    def _format_args(self, args):
        """
        This function will format arguments.

        Args:
            args: Arguments

        Returns:
            Formated arguments for function
        """
        formatted_args = ["'{0}'".format(arg) for arg in args]
        return ', '.join(formatted_args)

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

            if 'attnum' in column and column['attnum'] is not None \
                    and column['attnum'] > 0:
                # We need to parse & convert ACL coming from database to
                # json format
                SQL = render_template("/".join(
                    [self.column_template_path, 'acl.sql']),
                    tid=tid, clid=column['attnum']
                )
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

                length = False
                precision = False
                if 'elemoid' in column:
                    length, precision, typeval = \
                        self.get_length_precision(column['elemoid'])

                # Set length and precision to None
                column['attlen'] = None
                column['attprecision'] = None

                # If we have length & precision both
                if length and precision:
                    matchObj = re.search(r'(\d+),(\d+)', fulltype)
                    if matchObj:
                        column['attlen'] = matchObj.group(1)
                        column['attprecision'] = matchObj.group(2)
                elif length:
                    # If we have length only
                    matchObj = re.search(r'(\d+)', fulltype)
                    if matchObj:
                        column['attlen'] = matchObj.group(1)
                        column['attprecision'] = None

                SQL = render_template("/".join([self.column_template_path,
                                                'is_referenced.sql']),
                                      tid=tid, clid=column['attnum'])

                status, is_reference = self.conn.execute_scalar(SQL)

                edit_types_list = list()
                # We will need present type in edit mode

                if column['typnspname'] == "pg_catalog" \
                        or column['typnspname'] == "public":
                    edit_types_list.append(present_type)
                else:
                    t = self.qtTypeIdent(self.conn, column['typnspname'],
                                         present_type)
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
                column['cltype'] = DataTypeReader.parse_type_name(
                    column['cltype']
                )

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

    def _index_constraints_formatter(self, did, tid, data):
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

            sql = render_template(
                "/".join(
                    [self.index_constraint_template_path, 'properties.sql']
                ),
                did=did,
                tid=tid,
                constraint_type=ctype
            )
            status, res = self.conn.execute_dict(sql)

            if not status:
                return internal_server_error(errormsg=res)

            for row in res['rows']:
                result = row
                sql = render_template(
                    "/".join([self.index_constraint_template_path,
                              'get_constraint_cols.sql']),
                    cid=row['oid'],
                    colcnt=row['col_count'])
                status, res = self.conn.execute_dict(sql)

                if not status:
                    return internal_server_error(errormsg=res)

                columns = []
                for r in res['rows']:
                    columns.append({"column": r['column'].strip('"')})

                result['columns'] = columns

                # INCLUDE clause in index is supported from PG-11+
                if self.manager.version >= 110000:
                    sql = render_template(
                        "/".join([self.index_constraint_template_path,
                                  'get_constraint_include.sql']),
                        cid=row['oid'])
                    status, res = self.conn.execute_dict(sql)

                    if not status:
                        return internal_server_error(errormsg=res)

                    result['include'] = [col['colname'] for col in res['rows']]

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

    def _exclusion_constraint_formatter(self, did, tid, data):
        """
        Args:
            tid: Table OID
            data: dict of query result

        Returns:
            It will return formatted output of query result
            as per client model format for exclusion constraint node
        """

        # We will fetch all the index constraints for the table
        sql = render_template(
            "/".join(
                [self.exclusion_constraint_template_path, 'properties.sql']
            ),
            did=did, tid=tid
        )

        status, result = self.conn.execute_dict(sql)

        if not status:
            return internal_server_error(errormsg=result)

        for ex in result['rows']:

            sql = render_template("/".join(
                [self.exclusion_constraint_template_path,
                 'get_constraint_cols.sql']),
                cid=ex['oid'],
                colcnt=ex['col_count'])

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

            # INCLUDE clause in index is supported from PG-11+
            if self.manager.version >= 110000:
                sql = render_template(
                    "/".join([self.exclusion_constraint_template_path,
                              'get_constraint_include.sql']),
                    cid=ex['oid'])
                status, res = self.conn.execute_dict(sql)

                if not status:
                    return internal_server_error(errormsg=res)

                ex['include'] = [col['colname'] for col in res['rows']]

            # If not exists then create list and/or append into
            # existing list [ Adding into main data dict]
            data.setdefault('exclude_constraint', []).append(ex)

        return data

    def _formatter(self, did, scid, tid, data):
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
        SQL = render_template("/".join([self.table_template_path, 'acl.sql']),
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
            SQL = render_template("/".join([self.table_template_path,
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
            SQL = render_template("/".join([self.table_template_path,
                                            'get_inherits.sql']),
                                  show_system_objects=False,
                                  scid=scid
                                  )
            status, rset = self.conn.execute_2darray(SQL)
            if not status:
                return internal_server_error(errormsg=rset)

            for row in rset['rows']:
                if row['inherits'] in data['coll_inherits']:
                    # Fetch columns using inherited table OID
                    SQL = render_template("/".join(
                        [self.table_template_path,
                         'get_columns_for_table.sql']),
                        tid=row['oid']
                    )
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
        data = self._index_constraints_formatter(did, tid, data)
        data = self._foreign_key_formatter(tid, data)
        data = self._check_constraint_formatter(tid, data)
        data = self._exclusion_constraint_formatter(did, tid, data)

        return data

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

    def get_table_dependents(self, tid):
        """
        This function get the dependents and return ajax response
        for the table node.

        Args:
            tid: Table ID
        """
        # Specific condition for column which we need to append
        where = "WHERE dep.refobjid={0}::OID".format(tid)

        dependents_result = self.get_dependents(
            self.conn, tid
        )

        # Specific sql to run againt column to fetch dependents
        SQL = render_template("/".join([self.table_template_path,
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

            dependents_result.append({'type': 'sequence', 'name': ref_name,
                                      'field': dep_type})

        return ajax_response(
            response=dependents_result,
            status=200
        )

    def get_table_dependencies(self, tid):
        """
        This function get the dependencies and return ajax response
        for the table node.

        Args:
            tid: Table ID

        """
        dependencies_result = self.get_dependencies(
            self.conn, tid
        )

        return ajax_response(
            response=dependencies_result,
            status=200
        )

    def get_table_statistics(self, scid, tid):
        """
        Statistics

        Args:
            scid: Schema Id
            tid: Table Id

        Returns the statistics for a particular table if tid is specified,
        otherwise it will return statistics for all the tables in that
        schema.
        """

        # Fetch schema name
        status, schema_name = self.conn.execute_scalar(
            render_template(
                "/".join([self.table_template_path, 'get_schema.sql']),
                conn=self.conn, scid=scid
            )
        )
        if not status:
            return internal_server_error(errormsg=schema_name)

        if tid is None:
            status, res = self.conn.execute_dict(
                render_template(
                    "/".join([self.table_template_path,
                              'coll_table_stats.sql']), conn=self.conn,
                    schema_name=schema_name
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
                    "/".join([self.table_template_path, 'get_table.sql']),
                    conn=self.conn, scid=scid, tid=tid
                )
            )
            if not status:
                return internal_server_error(errormsg=table_name)

            status, res = self.conn.execute_dict(
                render_template(
                    "/".join([self.table_template_path, 'stats.sql']),
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

    def get_reverse_engineered_sql(self, did, scid, tid, main_sql, data):
        """
        This function will creates reverse engineered sql for
        the table object

         Args:
           did: Database ID
           scid: Schema ID
           tid: Table ID
           main_sql: List contains all the reversed engineered sql
           data: Table's Data
        """
        """
        #####################################
        # 1) Reverse engineered sql for TABLE
        #####################################
        """

        # Table & Schema declaration so that we can use them in child nodes
        schema = data['schema']
        table = data['name']

        data = self._formatter(did, scid, tid, data)

        # Now we have all lis of columns which we need
        # to include in our create definition, Let's format them
        if 'columns' in data:
            for c in data['columns']:
                if 'attacl' in c:
                    c['attacl'] = parse_priv_to_db(
                        c['attacl'], self.column_acl
                    )

                # check type for '[]' in it
                if 'cltype' in c:
                    c['cltype'], c['hasSqrBracket'] = \
                        self._cltype_formatter(c['cltype'])

        sql_header = u"-- Table: {0}\n\n-- ".format(
            self.qtIdent(self.conn, data['schema'], data['name']))

        sql_header += render_template("/".join([self.table_template_path,
                                                'delete.sql']),
                                      data=data, conn=self.conn)

        sql_header = sql_header.strip('\n')
        sql_header += '\n'

        # Add into main sql
        main_sql.append(sql_header)

        # Parse privilege data
        if 'relacl' in data:
            data['relacl'] = parse_priv_to_db(data['relacl'], self.acl)

        # if table is partitions then
        if 'relispartition' in data and data['relispartition']:
            table_sql = render_template("/".join([self.partition_template_path,
                                                  'create.sql']),
                                        data=data, conn=self.conn)
        else:
            table_sql = render_template("/".join([self.table_template_path,
                                                  'create.sql']),
                                        data=data, conn=self.conn, is_sql=True)

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
                                  did=did, tid=tid, idx=row['oid'],
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
            # 'options' we need true/false to render switch
            # ASC(false)/DESC(true)
            columns = []
            cols = []
            for col_row in rset['rows']:
                # We need all data as collection for ColumnsModel
                # Only for displaying SQL, we can omit strip on colname
                cols_data = {
                    'colname': col_row['attdef'],
                    'collspcname': col_row['collnspname'],
                    'op_class': col_row['opcname'],
                }
                if col_row['options'][0] == 'DESC':
                    cols_data['sort_order'] = True
                columns.append(cols_data)

                # We need same data as string to display in properties window
                # If multiple column then separate it by colon
                cols_str = col_row['attdef']
                if col_row['collnspname']:
                    cols_str += ' COLLATE ' + col_row['collnspname']
                if col_row['opcname']:
                    cols_str += ' ' + col_row['opcname']
                if col_row['options'][0] == 'DESC':
                    cols_str += ' DESC'
                cols.append(cols_str)

            # Push as collection
            data['columns'] = columns
            # Push as string
            data['cols'] = ', '.join(cols)

            if self.manager.version >= 110000:
                SQL = render_template(
                    "/".join([self.index_template_path,
                              'include_details.sql']),
                    idx=row['oid'])
                status, res = self.conn.execute_dict(SQL)

                if not status:
                    return internal_server_error(errormsg=res)

                data['include'] = [col['colname'] for col in res['rows']]

            sql_header = u"\n-- Index: {0}\n\n-- ".format(data['name'])

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

            if len(res['rows']) == 0:
                continue
            data = dict(res['rows'][0])
            # Adding parent into data dict, will be using it while creating sql
            data['schema'] = schema
            data['table'] = table

            data = self.get_trigger_function_schema(data)

            if len(data['custom_tgargs']) > 1:
                # We know that trigger has more than 1 argument, let's
                # join them
                data['tgargs'] = self._format_args(data['custom_tgargs'])

            if len(data['tgattr']) >= 1:
                columns = ', '.join(data['tgattr'].split(' '))

                SQL = render_template("/".join([self.trigger_template_path,
                                                'get_columns.sql']),
                                      tid=tid, clist=columns)

                status, rset = self.conn.execute_2darray(SQL)
                if not status:
                    return internal_server_error(errormsg=rset)
                # 'tgattr' contains list of columns from table used in trigger
                columns = []

                for col_row in rset['rows']:
                    columns.append(col_row['name'])

                data['columns'] = columns

            data = trigger_definition(data)

            sql_header = u"\n-- Trigger: {0}\n\n-- ".format(data['name'])

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

        """
        ##########################################
        # 5) Reverse engineered sql for PARTITIONS
        ##########################################
        """
        if 'is_partitioned' in data and data['is_partitioned']:
            SQL = render_template("/".join([self.partition_template_path,
                                            'nodes.sql']),
                                  scid=scid, tid=tid)
            status, rset = self.conn.execute_2darray(SQL)
            if not status:
                return internal_server_error(errormsg=rset)

            if len(rset['rows']):
                sql_header = u"\n-- Partitions SQL"
                partition_sql = ''
                for row in rset['rows']:
                    part_data = dict()
                    part_data['partitioned_table_name'] = data['name']
                    part_data['parent_schema'] = data['schema']
                    part_data['schema'] = row['schema_name']
                    part_data['relispartition'] = True
                    part_data['name'] = row['name']
                    part_data['partition_value'] = row['partition_value']
                    part_data['is_partitioned'] = row['is_partitioned']
                    part_data['partition_scheme'] = row['partition_scheme']

                    partition_sql += render_template("/".join(
                        [self.partition_template_path, 'create.sql']),
                        data=part_data, conn=self.conn)

                # Add into main sql
                partition_sql = re.sub('\n{2,}', '\n\n', partition_sql)
                main_sql.append(
                    sql_header + '\n\n' + partition_sql.strip('\n')
                )

        sql = '\n'.join(main_sql)

        return ajax_response(response=sql.strip('\n'))

    def reset_statistics(self, scid, tid):
        """
        This function will reset statistics of table

         Args:
           scid: Schema ID
           tid: Table ID
        """
        try:
            SQL = render_template("/".join([self.table_template_path,
                                            'reset_stats.sql']),
                                  tid=tid)
            status, res = self.conn.execute_scalar(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            return make_json_response(
                success=1,
                info=gettext("Table statistics have been reset"),
                data={
                    'id': tid,
                    'scid': scid
                }
            )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    def get_partition_scheme(self, data):
        partition_scheme = None
        if 'partition_type' in data \
                and data['partition_type'] == 'range':
            partition_scheme = 'RANGE ('
        elif 'partition_type' in data \
                and data['partition_type'] == 'list':
            partition_scheme = 'LIST ('

        for row in data['partition_keys']:
            if row['key_type'] == 'column':
                partition_scheme += self.qtIdent(
                    self.conn, row['pt_column']) + ', '
            elif row['key_type'] == 'expression':
                partition_scheme += row['expression'] + ', '

        # Remove extra space and comma
        if len(data['partition_keys']) > 0:
            partition_scheme = partition_scheme[:-2]
        partition_scheme += ')'

        return partition_scheme

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

                if 'autoindex' in data and \
                        data['autoindex'] and \
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

    @staticmethod
    def check_and_convert_name_to_string(data):
        """
        This function will check and covert table to string incase
        it is numeric

        Args:
            data: data dict

        Returns:
            Updated data dict
        """
        # For Python2, it can be int, long, float
        if IS_PY2 and hasattr(str, 'decode'):
            if isinstance(data['name'], (int, long, float)):
                data['name'] = str(data['name'])
        else:
            # For Python3, it can be int, float
            if isinstance(data['name'], (int, float)):
                data['name'] = str(data['name'])
        return data

    def get_index_constraint_sql(self, did, tid, data):
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

                        properties_sql = render_template(
                            "/".join(
                                [
                                    self.index_constraint_template_path,
                                    'properties.sql'
                                ]
                            ),
                            did=did,
                            tid=tid,
                            cid=c['oid'],
                            constraint_type=ctype
                        )
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
                        if self.validate_constrains(
                                index_constraints[ctype], c):
                            sql.append(
                                render_template(
                                    "/".join(
                                        [self.index_constraint_template_path,
                                            'create.sql']
                                    ),
                                    data=c, conn=self.conn,
                                    constraint_name='PRIMARY KEY'
                                    if ctype == 'p' else 'UNIQUE'
                                ).strip('\n')
                            )
                        else:
                            sql.append(
                                gettext(
                                    '-- definition incomplete for {0} '
                                    'constraint'.format(
                                        index_constraints[ctype]
                                    )
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
                                '-- definition incomplete for foreign_key '
                                'constraint'
                            )
                        )
                        return '\n\n'.join(sql)

                    if 'columns' in c:
                        cols = []
                        for col in c['columns']:
                            cols.append(col['local_column'])

                        coveringindex = self.search_coveringindex(tid, cols)

                        if coveringindex is None and \
                            'autoindex' in c and \
                            c['autoindex'] and \
                            ('coveringindex' in c and
                                c['coveringindex'] != ''):
                            sql.append(render_template(
                                "/".join(
                                    [
                                        self.foreign_key_template_path,
                                        'create_index.sql'
                                    ]
                                ), data=c, conn=self.conn).strip('\n')
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
                                '-- definition incomplete for foreign_key '
                                'constraint'
                            )
                        )
                        return '\n\n'.join(sql)

                    SQL = render_template(
                        "/".join(
                            [self.foreign_key_template_path, 'get_parent.sql']
                        ), tid=c['columns'][0]['references']
                    )
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

                    properties_sql = render_template(
                        "/".join(
                            [self.check_constraint_template_path,
                             'properties.sql']
                        ), tid=tid, cid=c['oid']
                    )
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
                                '-- definition incomplete for check_constraint'
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

    def get_exclusion_constraint_sql(self, did, tid, data):
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
                        [self.exclusion_constraint_template_path,
                         'properties.sql']),
                        did=did, tid=tid, cid=c['oid'])
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
                                '-- definition incomplete for '
                                'exclusion_constraint'
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
            return u'\n\n'.join(sql)
        else:
            return None

    def get_sql(self, did, scid, tid, data, res):
        """
        This function will generate create/update sql from model data
        coming from client
        """
        if tid is not None:
            old_data = res['rows'][0]
            old_data = self._formatter(did, scid, tid, old_data)

            # We will convert privileges coming from client required
            if 'relacl' in data:
                for mode in ['added', 'changed', 'deleted']:
                    if mode in data['relacl']:
                        data['relacl'][mode] = parse_priv_to_db(
                            data['relacl'][mode], self.acl
                        )

            # If name is not present in request data
            if 'name' not in data:
                data['name'] = old_data['name']

            data = BaseTableView.check_and_convert_name_to_string(data)

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
                        set(data['coll_inherits']) -
                        set(old_data['coll_inherits'])
                    )
                # If table(s)removed
                elif c_len < p_len:
                    data['coll_inherits_removed'] = list(
                        set(old_data['coll_inherits']) -
                        set(data['coll_inherits'])
                    )
                # Safe side verification,In case it happens..
                # If user removes and adds same number of table
                # eg removed one table and added one new table
                elif c_len == p_len:
                    data['coll_inherits_added'] = list(
                        set(data['coll_inherits']) -
                        set(old_data['coll_inherits'])
                    )
                    data['coll_inherits_removed'] = list(
                        set(old_data['coll_inherits']) -
                        set(data['coll_inherits'])
                    )

            SQL = render_template(
                "/".join([self.table_template_path, 'update.sql']),
                o_data=old_data, data=data, conn=self.conn
            )
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

                        properties_sql = render_template(
                            "/".join([self.column_template_path,
                                      'properties.sql']),
                            tid=tid,
                            clid=c['attnum'],
                            show_sys_objects=self.blueprint.show_system_objects
                        )

                        status, res = self.conn.execute_dict(properties_sql)
                        if not status:
                            return internal_server_error(errormsg=res)
                        old_data = res['rows'][0]

                        old_data['cltype'], old_data['hasSqrBracket'] = \
                            self._cltype_formatter(old_data['cltype'])
                        old_data = \
                            BaseTableView.convert_length_precision_to_string(
                                old_data
                            )

                        fulltype = self.get_full_type(
                            old_data['typnspname'],
                            old_data['typname'],
                            old_data['isdup'],
                            old_data['attndims'],
                            old_data['atttypmod']
                        )

                        def get_type_attr(key, data):
                            """Utility function"""
                            if key in data:
                                return data[key]
                            return None

                        # If the column data type has not changed then fetch
                        # old length and precision
                        if 'elemoid' in old_data and 'cltype' not in c:
                            length, precision, typeval = \
                                self.get_length_precision(old_data['elemoid'])

                            # If we have length & precision both
                            if length and precision:
                                matchObj = re.search(r'(\d+),(\d+)', fulltype)
                                if matchObj:
                                    c['attlen'] = get_type_attr(
                                        'attlen', c
                                    ) or matchObj.group(1)
                                    c['attprecision'] = get_type_attr(
                                        'attprecision', c
                                    ) or matchObj.group(2)
                            elif length:
                                # If we have length only
                                matchObj = re.search(r'(\d+)', fulltype)
                                if matchObj:
                                    c['attlen'] = get_type_attr(
                                        'attlen', c
                                    ) or matchObj.group(1)
                                    c['attprecision'] = None
                            else:
                                c['attlen'] = None
                                c['attprecision'] = None

                        if 'cltype' in c:
                            typename = c['cltype']
                            if 'hasSqrBracket' in c and c['hasSqrBracket']:
                                typename += '[]'
                            length, precision, typeval = \
                                self.get_length_precision(typename)

                            # if new datatype does not have length or precision
                            # then we cannot apply length or precision of old
                            # datatype to new one.

                            if not length:
                                old_data['attlen'] = -1

                            if not precision:
                                old_data['attprecision'] = None

                        old_data['cltype'] = DataTypeReader.parse_type_name(
                            old_data['cltype']
                        )

                        if int(old_data['attlen']) == -1:
                            old_data['attlen'] = None
                        if 'attprecision' not in old_data:
                            old_data['attprecision'] = None

                        # Sql for alter column
                        if 'inheritedfrom' not in c:
                            column_sql += render_template("/".join(
                                [self.column_template_path, 'update.sql']),
                                data=c, o_data=old_data, conn=self.conn
                            ).strip('\n') + '\n\n'

                # If column(s) is/are added
                if 'added' in columns:
                    for c in columns['added']:
                        c['schema'] = data['schema']
                        c['table'] = data['name']
                        # Sql for create column
                        if 'attacl' in c:
                            c['attacl'] = parse_priv_to_db(c['attacl'],
                                                           self.column_acl)

                        c = BaseTableView.convert_length_precision_to_string(c)

                        if 'inheritedfrom' not in c:
                            column_sql += render_template("/".join(
                                [self.column_template_path, 'create.sql']),
                                data=c, conn=self.conn).strip('\n') + '\n\n'

                # Combine all the SQL together
                SQL += column_sql.strip('\n')

            # Check for partitions
            if 'partitions' in data:
                partitions = data['partitions']
                partitions_sql = '\n'

                # If partition(s) is/are deleted
                if 'deleted' in partitions:
                    for row in partitions['deleted']:
                        temp_data = dict()
                        schema_name, table_name = \
                            self.get_schema_and_table_name(row['oid'])

                        temp_data['parent_schema'] = data['schema']
                        temp_data['partitioned_table_name'] = data['name']
                        temp_data['schema'] = schema_name
                        temp_data['name'] = table_name

                        # Sql for detach partition
                        partitions_sql += render_template(
                            "/".join(
                                [
                                    self.partition_template_path,
                                    'detach.sql'
                                ]
                            ),
                            data=temp_data,
                            conn=self.conn).strip('\n') + '\n\n'

                # If partition(s) is/are added
                if 'added' in partitions:
                    temp_data = dict()
                    temp_data['schema'] = data['schema']
                    temp_data['name'] = data['name']
                    # get the partition type
                    temp_data['partition_type'] = \
                        old_data['partition_scheme'].split()[0].lower()
                    temp_data['partitions'] = partitions['added']

                    partitions_sql += \
                        self.get_partitions_sql(temp_data).strip('\n') + '\n\n'

                # Combine all the SQL together
                SQL += partitions_sql.strip('\n')

            # Check if index constraints are added/changed/deleted
            index_constraint_sql = self.get_index_constraint_sql(
                did, tid, data)
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
            exclusion_constraint_sql = self.get_exclusion_constraint_sql(
                did, tid, data)
            # If we have check constraint sql then ad it in main sql
            if exclusion_constraint_sql is not None:
                SQL += '\n' + exclusion_constraint_sql

        else:
            res = None
            required_args = [
                'name'
            ]

            for arg in required_args:
                if arg not in data:
                    return gettext('-- definition incomplete')

            # validate constraint data.
            for key in ['primary_key', 'unique_constraint',
                        'foreign_key', 'check_constraint',
                        'exclude_constraint']:
                if key in data and len(data[key]) > 0:
                    for constraint in data[key]:
                        if not self.validate_constrains(key, constraint):
                            return gettext(
                                '-- definition incomplete for {0}'.format(key)
                            )

            # We will convert privileges coming from client required
            # in server side format
            if 'relacl' in data:
                data['relacl'] = parse_priv_to_db(data['relacl'], self.acl)

            # Parse & format columns
            data = self._parse_format_columns(data)
            data = BaseTableView.check_and_convert_name_to_string(data)

            if 'foreign_key' in data:
                for c in data['foreign_key']:
                    SQL = render_template("/".join(
                        [self.foreign_key_template_path,
                         'get_parent.sql']),
                        tid=c['columns'][0]['references'])
                    status, rset = self.conn.execute_2darray(SQL)
                    if not status:
                        return internal_server_error(errormsg=rset)

                    c['remote_schema'] = rset['rows'][0]['schema']
                    c['remote_table'] = rset['rows'][0]['table']

            partitions_sql = ''
            if 'is_partitioned' in data and data['is_partitioned']:
                data['relkind'] = 'p'
                # create partition scheme
                data['partition_scheme'] = self.get_partition_scheme(data)
                partitions_sql = self.get_partitions_sql(data)

            SQL = render_template("/".join([self.table_template_path,
                                            'create.sql']),
                                  data=data, conn=self.conn)

            # Append SQL for partitions
            SQL += '\n' + partitions_sql

        SQL = re.sub('\n{2,}', '\n\n', SQL)
        SQL = SQL.strip('\n')

        return SQL, data['name'] if 'name' in data else old_data['name']

    def update(self, gid, sid, did, scid, tid, data, res, parent_id=None):
        """
        This function will update an existing table object

         Args:
           gid: Server Group ID
           sid: Server ID
           did: Database ID
           scid: Schema ID
           tid: Table ID
           data: Data to update
           res: Table properties
           parent_id: parent table id if current table is partition of parent
                    table else none
        """
        try:
            SQL, name = self.get_sql(did, scid, tid, data, res)

            SQL = SQL.strip('\n').strip(' ')
            status, rest = self.conn.execute_scalar(SQL)
            if not status:
                return internal_server_error(errormsg=rest)

            SQL = render_template("/".join([self.table_template_path,
                                  'get_schema_oid.sql']), tid=tid)
            status, rest = self.conn.execute_2darray(SQL)
            if not status:
                return internal_server_error(errormsg=rest)

            if not parent_id:
                parent_id = scid

            # Check for partitions
            partitions_oid = dict()
            if 'partitions' in data:
                # Fetch oid of schema for all detached partitions
                if 'deleted' in data['partitions']:
                    detached = []
                    for row in data['partitions']['deleted']:
                        status, pscid = self.conn.execute_scalar(
                            render_template(
                                "/".join([
                                    self.table_template_path,
                                    'get_schema_oid.sql'
                                ]),
                                tid=row['oid']
                            )
                        )
                        if not status:
                            return internal_server_error(errormsg=pscid)

                        detached.append(
                            {'oid': row['oid'], 'schema_id': pscid}
                        )
                    partitions_oid['detached'] = detached

                # Fetch oid and schema oid for all created/attached partitions
                if 'added' in data['partitions']:
                    created = []
                    attached = []
                    for row in data['partitions']['added']:
                        if row['is_attach']:
                            status, pscid = self.conn.execute_scalar(
                                render_template(
                                    "/".join([
                                        self.table_template_path,
                                        'get_schema_oid.sql'
                                    ]),
                                    tid=row['partition_name']
                                )
                            )
                            if not status:
                                return internal_server_error(errormsg=pscid)

                            attached.append({
                                'oid': row['partition_name'],
                                'schema_id': pscid
                            })

                        else:
                            tmp_data = dict()
                            tmp_data['name'] = row['partition_name']
                            SQL = render_template(
                                "/".join([
                                    self.table_template_path, 'get_oid.sql'
                                ]),
                                scid=scid, data=tmp_data
                            )

                            status, ptid = self.conn.execute_scalar(SQL)
                            if not status:
                                return internal_server_error(errormsg=ptid)

                            created.append({
                                'oid': ptid,
                                'schema_id': scid
                            })

                    partitions_oid['created'] = created
                    partitions_oid['attached'] = attached

            icon = self.get_icon_css_class(res['rows'][0])

            if 'relkind' in res['rows'][0] and \
                    res['rows'][0]['relkind'] == 'p':
                is_partitioned = True
            else:
                is_partitioned = False

            return jsonify(
                node=self.blueprint.generate_browser_node(
                    tid,
                    parent_id,
                    name,
                    icon=icon,
                    is_partitioned=is_partitioned,
                    parent_schema_id=scid,
                    schema_id=rest['rows'][0]['scid'],
                    schema_name=rest['rows'][0]['nspname'],
                    affected_partitions=partitions_oid
                )
            )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    def properties(self, gid, sid, did, scid, tid, res):
        """
        This function will show the properties of the selected table node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did:  Database ID
            scid: Schema ID
            scid: Schema ID
            tid: Table ID
            res: Table/Partition table properties

        Returns:
            JSON of selected table node
        """
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

        data = self._formatter(did, scid, tid, data)

        # Fetch partition of this table if it is partitioned table.
        if 'is_partitioned' in data and data['is_partitioned']:
            # get the partition type
            data['partition_type'] = \
                data['partition_scheme'].split()[0].lower()

            partitions = []
            SQL = render_template("/".join([self.partition_template_path,
                                            'nodes.sql']),
                                  scid=scid, tid=tid)
            status, rset = self.conn.execute_2darray(SQL)
            if not status:
                return internal_server_error(errormsg=rset)

            for row in rset['rows']:
                partition_name = row['name']
                # if schema name is different then display schema
                # qualified name on UI.
                if data['schema'] != row['schema_name']:
                    partition_name = row['schema_name'] + '.' + row['name']

                if data['partition_type'] == 'range':
                    range_part = row['partition_value'].split(
                        'FOR VALUES FROM (')[1].split(') TO')
                    range_from = range_part[0]
                    range_to = range_part[1][2:-1]

                    partitions.append({
                        'oid': row['oid'],
                        'partition_name': partition_name,
                        'values_from': range_from,
                        'values_to': range_to
                    })
                else:
                    range_part = \
                        row['partition_value'].split('FOR VALUES IN (')[1]

                    range_in = range_part[:-1]
                    partitions.append({
                        'oid': row['oid'],
                        'partition_name': partition_name,
                        'values_in': range_in
                    })

            data['partitions'] = partitions

        return ajax_response(
            response=data,
            status=200
        )

    def get_partitions_sql(self, partitions):
        """
        This function will iterate all the partitions and create SQL.

        :param partitions: List of partitions
        """
        sql = ''

        for row in partitions['partitions']:
            part_data = dict()
            part_data['partitioned_table_name'] = partitions['name']
            part_data['parent_schema'] = partitions['schema']

            if 'is_attach' in row and row['is_attach']:
                schema_name, table_name = \
                    self.get_schema_and_table_name(row['partition_name'])

                part_data['schema'] = schema_name
                part_data['name'] = table_name
            else:
                part_data['schema'] = partitions['schema']
                part_data['relispartition'] = True
                part_data['name'] = row['partition_name']

            if partitions['partition_type'] == 'range':
                range_from = row['values_from'].split(',')
                range_to = row['values_to'].split(',')

                from_str = ', '.join("{0}".format(item) for item in range_from)
                to_str = ', '.join("{0}".format(item) for item in range_to)

                part_data['partition_value'] = 'FOR VALUES FROM (' + from_str \
                                               + ') TO (' + to_str + ')'
            else:
                range_in = row['values_in'].split(',')
                in_str = ', '.join("{0}".format(item) for item in range_in)
                part_data['partition_value'] = 'FOR VALUES IN (' + in_str + ')'

            if 'is_attach' in row and row['is_attach']:
                partition_sql = render_template(
                    "/".join([self.partition_template_path, 'attach.sql']),
                    data=part_data, conn=self.conn
                )
            else:
                partition_sql = render_template(
                    "/".join([self.partition_template_path, 'create.sql']),
                    data=part_data, conn=self.conn
                )

            sql += partition_sql + '\n'

        return sql

    def truncate(self, gid, sid, did, scid, tid, res):
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

        data = res['rows'][0]

        SQL = render_template("/".join([self.table_template_path,
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

    def delete(self, gid, sid, did, scid, tid, res):
        """
        This function will delete the table object

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

        data = res['rows'][0]

        SQL = render_template(
            "/".join([self.table_template_path, 'delete.sql']),
            data=data, cascade=cascade,
            conn=self.conn
        )
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

    def get_schema_and_table_name(self, tid):
        """
        This function will fetch the schema qualified name of the
        given table id.

        :param tid: Table Id.
        """
        # Get schema oid
        status, scid = self.conn.execute_scalar(
            render_template("/".join([self.table_template_path,
                                      'get_schema_oid.sql']), tid=tid))
        if not status:
            return internal_server_error(errormsg=scid)

        # Fetch schema name
        status, schema_name = self.conn.execute_scalar(
            render_template("/".join([self.table_template_path,
                                      'get_schema.sql']), conn=self.conn,
                            scid=scid)
        )
        if not status:
            return internal_server_error(errormsg=schema_name)

        # Fetch Table name
        status, table_name = self.conn.execute_scalar(
            render_template(
                "/".join([self.table_template_path, 'get_table.sql']),
                conn=self.conn, scid=scid, tid=tid
            )
        )
        if not status:
            return internal_server_error(errormsg=table_name)

        return schema_name, table_name

    @staticmethod
    def convert_length_precision_to_string(data):
        """
        This function is used to convert length & precision to string
        to handle case like when user gives 0 as length

        Args:
            data: Data from client

        Returns:
            Converted data
        """
        if 'attlen' in data and data['attlen'] is not None:
            data['attlen'] = str(data['attlen'])
        if 'attprecision' in data and data['attprecision'] is not None:
            data['attprecision'] = str(data['attprecision'])
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
                colcnt=costrnt['col_count'])
            status, rest = self.conn.execute_dict(sql)

            if not status:
                return internal_server_error(errormsg=rest)

            indexcols = set()
            for r in rest['rows']:
                indexcols.add(r['column'].strip('"'))

            if len(cols - indexcols) == len(indexcols - cols) == 0:
                return costrnt["idxname"]

        return None
