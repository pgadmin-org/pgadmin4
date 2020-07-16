##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

""" Implements Utility class for Table and Partitioned Table. """

import re
import copy
from functools import wraps
import simplejson as json
from flask import render_template, jsonify, request
from flask_babelex import gettext

from pgadmin.browser.server_groups.servers.databases.schemas\
    .tables.base_partition_table import BasePartitionTable
from pgadmin.utils.ajax import make_json_response, internal_server_error, \
    gone, make_response as ajax_response
from pgadmin.browser.server_groups.servers.databases.schemas.utils \
    import DataTypeReader, parse_rule_definition
from pgadmin.browser.server_groups.servers.utils import parse_priv_from_db, \
    parse_priv_to_db
from pgadmin.browser.utils import PGChildNodeView
from pgadmin.utils.compile_template_name import compile_template_path
from pgadmin.utils.driver import get_driver
from config import PG_DEFAULT_DRIVER
from pgadmin.browser.server_groups.servers.databases.schemas.tables.\
    columns import utils as column_utils
from pgadmin.browser.server_groups.servers.databases.schemas.tables.\
    constraints.foreign_key import utils as fkey_utils
from pgadmin.browser.server_groups.servers.databases.schemas.tables.\
    constraints.check_constraint import utils as check_utils
from pgadmin.browser.server_groups.servers.databases.schemas.tables.\
    constraints.exclusion_constraint import utils as exclusion_utils
from pgadmin.browser.server_groups.servers.databases.schemas.tables.\
    constraints.index_constraint import utils as idxcons_utils
from pgadmin.browser.server_groups.servers.databases.schemas.tables.\
    triggers import utils as trigger_utils
from pgadmin.browser.server_groups.servers.databases.schemas.tables.\
    compound_triggers import utils as compound_trigger_utils
from pgadmin.browser.server_groups.servers.databases.schemas. \
    tables.row_security_policies import \
    utils as row_security_policies_utils


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
            self.table_template_path = compile_template_path('tables/sql',
                                                             server_type, ver)
            self.data_type_template_path = compile_template_path(
                'datatype/sql',
                server_type, ver)
            self.partition_template_path = \
                'partitions/sql/{0}/#{0}#{1}#'.format(server_type, ver)

            # Template for Column ,check constraint and exclusion
            # constraint node
            self.column_template_path = 'columns/sql/#{0}#'.format(ver)

            # Template for index node
            self.index_template_path = compile_template_path(
                'indexes/sql', server_type, ver)

            # Template for index node
            self.row_security_policies_template_path = \
                'row_security_policies/sql/#{0}#'.format(ver)

            # Template for trigger node
            self.trigger_template_path = \
                'triggers/sql/{0}/#{1}#'.format(server_type, ver)

            # Template for compound trigger node
            self.compound_trigger_template_path = \
                'compound_triggers/sql/{0}/#{1}#'.format(server_type, ver)

            # Template for rules node
            self.rules_template_path = 'rules/sql'

            # Supported ACL for table
            self.acl = ['a', 'r', 'w', 'd', 'D', 'x', 't']

            # Supported ACL for columns
            self.column_acl = ['a', 'r', 'w', 'x']

            return f(*args, **kwargs)

        return wrap

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
        sql = render_template("/".join([self.table_template_path,
                                        self._ACL_SQL]),
                              tid=tid, scid=scid)
        status, acl = self.conn.execute_dict(sql)
        if not status:
            return internal_server_error(errormsg=acl)

        BaseTableView._set_privileges_for_properties(data, acl)

        # We will add Auto vacuum defaults with out result for grid
        data['vacuum_table'] = copy.deepcopy(
            self.parse_vacuum_data(self.conn, data, 'table'))
        data['vacuum_toast'] = copy.deepcopy(
            self.parse_vacuum_data(self.conn, data, 'toast'))

        # Fetch columns for the table logic
        #
        # 1) Check if of_type and inherited tables are present?
        # 2) If yes then Fetch all the columns for of_type and inherited tables
        # 3) Add columns in columns collection
        # 4) Find all the columns for tables and filter out columns which are
        #   not inherited from any table & format them one by one

        other_columns = []
        table_or_type = ''
        # Get of_type table columns and add it into columns dict
        if data['typoid']:
            sql = render_template("/".join([self.table_template_path,
                                            'get_columns_for_table.sql']),
                                  tid=data['typoid'])

            status, res = self.conn.execute_dict(sql)
            if not status:
                return internal_server_error(errormsg=res)
            other_columns = res['rows']
            table_or_type = 'type'
        # Get inherited table(s) columns and add it into columns dict
        elif data['coll_inherits'] and len(data['coll_inherits']) > 0:
            is_error, errmsg = self._get_inherited_tables(scid, data,
                                                          other_columns)
            if is_error:
                return internal_server_error(errormsg=errmsg)

            table_or_type = 'table'

        # We will fetch all the columns for the table using
        # columns properties.sql, so we need to set template path
        data = column_utils.get_formatted_columns(self.conn, tid,
                                                  data, other_columns,
                                                  table_or_type)

        self._add_constrints_to_output(data, did, tid)

        return data

    def _get_inherited_tables(self, scid, data, other_columns):
        # Return all tables which can be inherited & do not show
        # system columns
        sql = render_template("/".join([self.table_template_path,
                                        'get_inherits.sql']),
                              show_system_objects=False,
                              scid=scid
                              )
        status, rset = self.conn.execute_2darray(sql)
        if not status:
            return True, rset

        for row in rset['rows']:
            if row['inherits'] in data['coll_inherits']:
                # Fetch columns using inherited table OID
                sql = render_template("/".join(
                    [self.table_template_path,
                     'get_columns_for_table.sql']),
                    tid=row['oid']
                )
                status, res = self.conn.execute_dict(sql)
                if not status:
                    return True, res
                other_columns.extend(res['rows'][:])

        return False, ''

    @staticmethod
    def _set_privileges_for_properties(data, acl):
        # We will set get privileges from acl sql so we don't need
        # it from properties sql
        for row in acl['rows']:
            priv = parse_priv_from_db(row)
            if row['deftype'] in data:
                data[row['deftype']].append(priv)
            else:
                data[row['deftype']] = [priv]

    def _add_constrints_to_output(self, data, did, tid):
        # Here we will add constraint in our output
        index_constraints = {
            'p': 'primary_key', 'u': 'unique_constraint'
        }
        for ctype in index_constraints.keys():
            data[index_constraints[ctype]] = []
            status, constraints = \
                idxcons_utils.get_index_constraints(self.conn, did, tid, ctype)
            if status:
                for cons in constraints:
                    data.setdefault(
                        index_constraints[ctype], []).append(cons)

        # Add Foreign Keys
        status, foreign_keys = fkey_utils.get_foreign_keys(self.conn, tid)
        if status:
            for fk in foreign_keys:
                data.setdefault('foreign_key', []).append(fk)

        # Add Check Constraints
        status, check_constraints = \
            check_utils.get_check_constraints(self.conn, tid)
        if status:
            data['check_constraint'] = check_constraints

        # Add Exclusion Constraint
        status, exclusion_constraints = \
            exclusion_utils.get_exclusion_constraints(self.conn, did, tid)
        if status:
            for ex in exclusion_constraints:
                data.setdefault('exclude_constraint', []).append(ex)

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
        sql = render_template("/".join([self.table_template_path,
                                        'depend.sql']), where=where)

        status, res = self.conn.execute_dict(sql)
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

    def _format_column_list(self, data):
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
                        column_utils.type_formatter(c['cltype'])

    def _get_resql_for_table(self, did, scid, tid, data, json_resp, main_sql):
        """
        #####################################
        # Reverse engineered sql for TABLE
        #####################################
        """
        data = self._formatter(did, scid, tid, data)

        # Format column list
        self._format_column_list(data)

        if json_resp:
            sql_header = u"-- Table: {0}.{1}\n\n-- ".format(
                data['schema'], data['name'])

            sql_header += render_template("/".join([self.table_template_path,
                                                    self._DELETE_SQL]),
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
                                                  self._CREATE_SQL]),
                                        data=data, conn=self.conn)
        else:
            table_sql = render_template("/".join([self.table_template_path,
                                                  self._CREATE_SQL]),
                                        data=data, conn=self.conn, is_sql=True)

        # Add into main sql
        table_sql = re.sub('\n{2,}', '\n\n', table_sql)
        main_sql.append(table_sql.strip('\n'))

    def _get_resql_for_index(self, did, tid, main_sql, json_resp, schema,
                             table):
        """
        ######################################
        # Reverse engineered sql for INDEX
        ######################################
        """

        sql = render_template("/".join([self.index_template_path,
                                        self._NODES_SQL]), tid=tid)
        status, rset = self.conn.execute_2darray(sql)
        if not status:
            return internal_server_error(errormsg=rset)

        # Dynamically load index utils to avoid circular dependency.
        from pgadmin.browser.server_groups.servers.databases.schemas. \
            tables.indexes import utils as index_utils
        for row in rset['rows']:
            index_sql = index_utils.get_reverse_engineered_sql(
                self.conn, schema=schema, table=table, did=did, tid=tid,
                idx=row['oid'], datlastsysoid=self.datlastsysoid,
                template_path=None, with_header=json_resp)
            index_sql = u"\n" + index_sql

            # Add into main sql
            index_sql = re.sub('\n{2,}', '\n\n', index_sql)

            main_sql.append(index_sql.strip('\n'))

    def _get_resql_for_row_security_policy(self, scid, tid, json_resp,
                                           main_sql, schema, table):
        """
        ########################################################
        # Reverse engineered sql for ROW SECURITY POLICY
        ########################################################
                """
        if self.manager.version >= 90500:
            sql = \
                render_template(
                    "/".join([self.row_security_policies_template_path,
                              self._NODES_SQL]), tid=tid)
            status, rset = self.conn.execute_2darray(sql)
            if not status:
                return internal_server_error(errormsg=rset)

            for row in rset['rows']:
                policy_sql = row_security_policies_utils. \
                    get_reverse_engineered_sql(
                        self.conn, schema=schema, table=table, scid=scid,
                        plid=row['oid'], datlastsysoid=self.datlastsysoid,
                        template_path=None, with_header=json_resp)
                policy_sql = u"\n" + policy_sql

                # Add into main sql
                policy_sql = re.sub('\n{2,}', '\n\n', policy_sql)

                main_sql.append(policy_sql.strip('\n'))

    def _get_resql_for_triggers(self, tid, json_resp, main_sql, schema,
                                table):
        """
        ########################################
        # Reverse engineered sql for TRIGGERS
        ########################################
        """
        sql = render_template("/".join([self.trigger_template_path,
                                        self._NODES_SQL]), tid=tid)
        status, rset = self.conn.execute_2darray(sql)
        if not status:
            return internal_server_error(errormsg=rset)

        for row in rset['rows']:
            trigger_sql = trigger_utils.get_reverse_engineered_sql(
                self.conn, schema=schema, table=table, tid=tid,
                trid=row['oid'], datlastsysoid=self.datlastsysoid,
                show_system_objects=self.blueprint.show_system_objects,
                template_path=None, with_header=json_resp)
            trigger_sql = u"\n" + trigger_sql

            # Add into main sql
            trigger_sql = re.sub('\n{2,}', '\n\n', trigger_sql)
            main_sql.append(trigger_sql)

    def _get_resql_for_compound_triggers(self, tid, main_sql, schema, table):
        """
        #################################################
        # Reverse engineered sql for COMPOUND TRIGGERS
        #################################################
        """

        if self.manager.server_type == 'ppas' \
                and self.manager.version >= 120000:
            sql = render_template("/".join(
                [self.compound_trigger_template_path, self._NODES_SQL]),
                tid=tid)

            status, rset = self.conn.execute_2darray(sql)
            if not status:
                return internal_server_error(errormsg=rset)

            for row in rset['rows']:
                compound_trigger_sql = \
                    compound_trigger_utils.get_reverse_engineered_sql(
                        self.conn, schema=schema, table=table, tid=tid,
                        trid=row['oid'], datlastsysoid=self.datlastsysoid)
                compound_trigger_sql = u"\n" + compound_trigger_sql

                # Add into main sql
                compound_trigger_sql = \
                    re.sub('\n{2,}', '\n\n', compound_trigger_sql)
                main_sql.append(compound_trigger_sql)

    def _get_resql_for_rules(self, tid, main_sql, table, json_resp):
        """
        #####################################
        # Reverse engineered sql for RULES
        #####################################
        """

        sql = render_template("/".join(
            [self.rules_template_path, self._NODES_SQL]), tid=tid)

        status, rset = self.conn.execute_2darray(sql)
        if not status:
            return internal_server_error(errormsg=rset)

        for row in rset['rows']:
            rules_sql = '\n'
            sql = render_template("/".join(
                [self.rules_template_path, self._PROPERTIES_SQL]
            ), rid=row['oid'], datlastsysoid=self.datlastsysoid)

            status, res = self.conn.execute_dict(sql)
            if not status:
                return internal_server_error(errormsg=res)

            display_comments = True
            if not json_resp:
                display_comments = False
            res_data = parse_rule_definition(res)
            # Update the correct table name for rules
            if 'view' in res_data:
                res_data['view'] = table

            rules_sql += render_template("/".join(
                [self.rules_template_path, self._CREATE_SQL]),
                data=res_data, display_comments=display_comments)

            # Add into main sql
            rules_sql = re.sub('\n{2,}', '\n\n', rules_sql)
            main_sql.append(rules_sql)

    def _get_resql_for_partitions(self, data, rset, json_resp,
                                  diff_partition_sql, main_sql):
        """
        ##########################################
        # Reverse engineered sql for PARTITIONS
        ##########################################
        """

        sql_header = ''
        if len(rset['rows']):
            if json_resp:
                sql_header = u"\n-- Partitions SQL"
            partition_sql = ''
            for row in rset['rows']:
                part_data = dict()
                part_data['partitioned_table_name'] = data['name']
                part_data['parent_schema'] = data['schema']
                if not json_resp:
                    part_data['schema'] = data['schema']
                else:
                    part_data['schema'] = row['schema_name']
                part_data['relispartition'] = True
                part_data['name'] = row['name']
                part_data['partition_value'] = row['partition_value']
                part_data['is_partitioned'] = row['is_partitioned']
                part_data['partition_scheme'] = row['partition_scheme']
                part_data['description'] = row['description']
                part_data['relowner'] = row['relowner']

                self.update_autovacuum_properties(row)

                part_data['fillfactor'] = row['fillfactor']
                part_data['autovacuum_custom'] = row['autovacuum_custom']
                part_data['autovacuum_enabled'] = row['autovacuum_enabled']
                part_data['autovacuum_vacuum_threshold'] = \
                    row['autovacuum_vacuum_threshold']
                part_data['autovacuum_vacuum_scale_factor'] = \
                    row['autovacuum_vacuum_scale_factor']
                part_data['autovacuum_analyze_threshold'] = \
                    row['autovacuum_analyze_threshold']
                part_data['autovacuum_analyze_scale_factor'] = \
                    row['autovacuum_analyze_scale_factor']
                part_data['autovacuum_vacuum_cost_delay'] = \
                    row['autovacuum_vacuum_cost_delay']
                part_data['autovacuum_vacuum_cost_limit'] = \
                    row['autovacuum_vacuum_cost_limit']
                part_data['autovacuum_freeze_min_age'] = \
                    row['autovacuum_freeze_min_age']
                part_data['autovacuum_freeze_max_age'] = \
                    row['autovacuum_freeze_max_age']
                part_data['autovacuum_freeze_table_age'] = \
                    row['autovacuum_freeze_table_age']
                part_data['toast_autovacuum'] = row['toast_autovacuum']
                part_data['toast_autovacuum_enabled'] = \
                    row['toast_autovacuum_enabled']
                part_data['toast_autovacuum_vacuum_threshold'] = \
                    row['toast_autovacuum_vacuum_threshold']
                part_data['toast_autovacuum_vacuum_scale_factor'] = \
                    row['toast_autovacuum_vacuum_scale_factor']
                part_data['toast_autovacuum_analyze_threshold'] = \
                    row['toast_autovacuum_analyze_threshold']
                part_data['toast_autovacuum_analyze_scale_factor'] = \
                    row['toast_autovacuum_analyze_scale_factor']
                part_data['toast_autovacuum_vacuum_cost_delay'] = \
                    row['toast_autovacuum_vacuum_cost_delay']
                part_data['toast_autovacuum_vacuum_cost_limit'] = \
                    row['toast_autovacuum_vacuum_cost_limit']
                part_data['toast_autovacuum_freeze_min_age'] = \
                    row['toast_autovacuum_freeze_min_age']
                part_data['toast_autovacuum_freeze_max_age'] = \
                    row['toast_autovacuum_freeze_max_age']
                part_data['toast_autovacuum_freeze_table_age'] = \
                    row['toast_autovacuum_freeze_table_age']

                # We will add Auto vacuum defaults with out result for grid
                part_data['vacuum_table'] = \
                    copy.deepcopy(self.parse_vacuum_data(
                        self.conn, row, 'table'))
                part_data['vacuum_toast'] = \
                    copy.deepcopy(self.parse_vacuum_data(
                        self.conn, row, 'toast'))
                partition_sql += render_template("/".join(
                    [self.partition_template_path, self._CREATE_SQL]),
                    data=part_data, conn=self.conn) + '\n'

            # Add into main sql
            partition_sql = re.sub('\n{2,}', '\n\n', partition_sql
                                   ).strip('\n')
            partition_main_sql = partition_sql.strip('\n')
            if not diff_partition_sql:
                main_sql.append(
                    sql_header + '\n\n' + partition_main_sql
                )

    def get_reverse_engineered_sql(self, **kwargs):
        """
        This function will creates reverse engineered sql for
        the table object

         Args:
           kwargs
        """
        did = kwargs.get('did')
        scid = kwargs.get('scid')
        tid = kwargs.get('tid')
        main_sql = kwargs.get('main_sql')
        data = kwargs.get('data')
        json_resp = kwargs.get('json_resp', True)
        diff_partition_sql = kwargs.get('diff_partition_sql', False)

        # Table & Schema declaration so that we can use them in child nodes
        schema = data['schema']
        table = data['name']
        is_partitioned = 'is_partitioned' in data and data['is_partitioned']

        # Get Reverse engineered sql for Table
        self._get_resql_for_table(did, scid, tid, data, json_resp, main_sql)
        # Get Reverse engineered sql for Table
        self._get_resql_for_index(did, tid, main_sql, json_resp, schema,
                                  table)

        # Get Reverse engineered sql for ROW SECURITY POLICY
        self._get_resql_for_row_security_policy(scid, tid, json_resp,
                                                main_sql, schema, table)

        # Get Reverse engineered sql for Triggers
        self._get_resql_for_triggers(tid, json_resp, main_sql, schema, table)

        # Get Reverse engineered sql for Compound Triggers
        self._get_resql_for_compound_triggers(tid, main_sql, schema, table)

        # Get Reverse engineered sql for Rules
        self._get_resql_for_rules(tid, main_sql, table, json_resp)

        # Get Reverse engineered sql for Partitions
        partition_main_sql = ""
        if is_partitioned:
            sql = render_template("/".join([self.partition_template_path,
                                            self._NODES_SQL]),
                                  scid=scid, tid=tid)
            status, rset = self.conn.execute_2darray(sql)
            if not status:
                return internal_server_error(errormsg=rset)

            self._get_resql_for_partitions(data, rset, json_resp,
                                           diff_partition_sql, main_sql)

        sql = '\n'.join(main_sql)

        if not json_resp:
            return sql, partition_main_sql
        return ajax_response(response=sql.strip('\n'))

    def reset_statistics(self, scid, tid):
        """
        This function will reset statistics of table

         Args:
           scid: Schema ID
           tid: Table ID
        """
        # checking the table existence using the function of the same class
        schema_name, table_name = self.get_schema_and_table_name(tid)

        if table_name is None:
            return gone(gettext("The specified table could not be found."))

        # table exist
        try:
            sql = render_template("/".join([self.table_template_path,
                                            'reset_stats.sql']),
                                  tid=tid)
            status, res = self.conn.execute_scalar(sql)
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
        part_type = 'sub_partition_type' if 'sub_partition_type' in data \
            else 'partition_type'
        part_keys = 'sub_partition_keys' if 'sub_partition_keys' in data \
            else 'partition_keys'

        if part_type in data and data[part_type] == 'range':
            partition_scheme = 'RANGE ('
        elif part_type in data and data[part_type] == 'list':
            partition_scheme = 'LIST ('
        elif part_type in data and data[part_type] == 'hash':
            partition_scheme = 'HASH ('

        for row in data[part_keys]:
            if row['key_type'] == 'column':
                partition_scheme += self.qtIdent(
                    self.conn, row['pt_column']) + ', '
            elif row['key_type'] == 'expression':
                partition_scheme += row['expression'] + ', '

        # Remove extra space and comma
        if len(data[part_keys]) > 0:
            partition_scheme = partition_scheme[:-2]
        partition_scheme += ')'

        return partition_scheme

    @staticmethod
    def validate_constrains(key, data):
        """
        This function is used to validate the constraints.
        :param key:
        :param data:
        :return:
        """
        if key == 'primary_key' or key == 'unique_constraint':
            if 'columns' in data and len(data['columns']) > 0:
                return True
            else:
                return False
        elif key == 'foreign_key':
            return BaseTableView._check_foreign_key(data)
        elif key == 'check_constraint':
            return BaseTableView._check_constraint(data)

        return True

    @staticmethod
    def _check_foreign_key(data):
        if 'oid' not in data:
            for arg in ['columns']:
                if arg not in data or \
                    (isinstance(data[arg], list) and
                     len(data[arg]) < 1):
                    return False

            if 'autoindex' in data and \
                data['autoindex'] and \
                ('coveringindex' not in data or
                 data['coveringindex'] == ''):
                return False

        return True

    @staticmethod
    def _check_constraint(data):
        for arg in ['consrc']:
            if arg not in data or data[arg] == '':
                return False
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
        if isinstance(data['name'], (int, float)):
            data['name'] = str(data['name'])

        return data

    def _get_privileges_from_client(self, data):
        # We will convert privileges coming from client required
        if 'relacl' in data:
            for mode in ['added', 'changed', 'deleted']:
                if mode in data['relacl']:
                    data['relacl'][mode] = parse_priv_to_db(
                        data['relacl'][mode], self.acl
                    )

    @staticmethod
    def _filter_new_tables(data, old_data):
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

    def _check_for_column_delete(self, columns, data, column_sql):
        # If column(s) is/are deleted
        if 'deleted' in columns:
            for c in columns['deleted']:
                c['schema'] = data['schema']
                c['table'] = data['name']
                # Sql for drop column
                if 'inheritedfrom' not in c:
                    column_sql += render_template("/".join(
                        [self.column_template_path, self._DELETE_SQL]),
                        data=c, conn=self.conn).strip('\n') + '\n\n'
        return column_sql

    def _check_for_column_update(self, columns, data, column_sql, tid):
        # Here we will be needing previous properties of column
        # so that we can compare & update it
        if 'changed' in columns:
            for c in columns['changed']:
                c['schema'] = data['schema']
                c['table'] = data['name']

                properties_sql = render_template(
                    "/".join([self.column_template_path,
                              self._PROPERTIES_SQL]),
                    tid=tid,
                    clid=c['attnum'],
                    show_sys_objects=self.blueprint.show_system_objects
                )

                status, res = self.conn.execute_dict(properties_sql)
                if not status:
                    return internal_server_error(errormsg=res)
                old_col_data = res['rows'][0]

                old_col_data['cltype'], \
                    old_col_data['hasSqrBracket'] = \
                    column_utils.type_formatter(old_col_data['cltype'])
                old_col_data = \
                    column_utils.convert_length_precision_to_string(
                        old_col_data)
                old_col_data = column_utils.fetch_length_precision(
                    old_col_data)

                old_col_data['cltype'] = \
                    DataTypeReader.parse_type_name(
                        old_col_data['cltype'])

                # Sql for alter column
                if 'inheritedfrom' not in c and \
                        'inheritedfromtable' not in c:
                    column_sql += render_template("/".join(
                        [self.column_template_path, self._UPDATE_SQL]),
                        data=c, o_data=old_col_data, conn=self.conn
                    ).strip('\n') + '\n\n'
        return column_sql

    def _check_for_column_add(self, columns, data, column_sql):
        # If column(s) is/are added
        if 'added' in columns:
            for c in columns['added']:
                c['schema'] = data['schema']
                c['table'] = data['name']

                c = column_utils.convert_length_precision_to_string(c)

                if 'inheritedfrom' not in c and \
                        'inheritedfromtable' not in c:
                    column_sql += render_template("/".join(
                        [self.column_template_path, self._CREATE_SQL]),
                        data=c, conn=self.conn).strip('\n') + '\n\n'
        return column_sql

    def _check_for_partitions_in_sql(self, data, old_data, sql):
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
            if 'added' in partitions and 'partition_scheme' in old_data \
                    and old_data['partition_scheme'] != '':
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
            sql += '\n' + partitions_sql.strip('\n')
        return sql

    def _check_for_constraints(self, index_constraint_sql, data, did,
                               tid, sql):
        # If we have index constraint sql then ad it in main sql
        if index_constraint_sql is not None:
            sql += '\n' + index_constraint_sql

        # Check if foreign key(s) is/are added/changed/deleted
        foreign_key_sql = fkey_utils.get_foreign_key_sql(
            self.conn, tid, data)
        # If we have foreign key sql then ad it in main sql
        if foreign_key_sql is not None:
            sql += '\n' + foreign_key_sql

        # Check if check constraint(s) is/are added/changed/deleted
        check_constraint_sql = check_utils.get_check_constraint_sql(
            self.conn, tid, data)
        # If we have check constraint sql then ad it in main sql
        if check_constraint_sql is not None:
            sql += '\n' + check_constraint_sql

        # Check if exclusion constraint(s) is/are added/changed/deleted
        exclusion_constraint_sql = \
            exclusion_utils.get_exclusion_constraint_sql(
                self.conn, did, tid, data)
        # If we have check constraint sql then ad it in main sql
        if exclusion_constraint_sql is not None:
            sql += '\n' + exclusion_constraint_sql
        return sql

    def _check_for_foreign_key(self, data):
        if 'foreign_key' in data:
            for c in data['foreign_key']:
                schema, table = fkey_utils.get_parent(
                    self.conn, c['columns'][0]['references'])
                c['remote_schema'] = schema
                c['remote_table'] = table

    def _check_for_partitioned(self, data):
        partitions_sql = ''
        if 'is_partitioned' in data and data['is_partitioned']:
            data['relkind'] = 'p'
            # create partition scheme
            data['partition_scheme'] = self.get_partition_scheme(data)
            partitions_sql = self.get_partitions_sql(data)
        return partitions_sql

    def _validate_constraint_data(self, data):
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

    @staticmethod
    def _check_for_create_sql(data):
        required_args = [
            'name'
        ]
        for arg in required_args:
            if arg not in data:
                return True, '-- definition incomplete'
        return False, ''

    def _convert_privilege_to_server_format(self, data):
        # We will convert privileges coming from client required
        # in server side format
        if 'relacl' in data:
            data['relacl'] = parse_priv_to_db(data['relacl'], self.acl)

    def get_sql(self, did, scid, tid, data, res):
        """
        This function will generate create/update sql from model data
        coming from client
        """
        if tid is not None:
            old_data = res['rows'][0]
            old_data = self._formatter(did, scid, tid, old_data)

            self._get_privileges_from_client(data)

            # If name is not present in request data
            if 'name' not in data:
                data['name'] = old_data['name']

            data = BaseTableView.check_and_convert_name_to_string(data)

            # If name if not present
            if 'schema' not in data:
                data['schema'] = old_data['schema']

            self._filter_new_tables(data, old_data)

            # Update the vacuum table settings.
            self.update_vacuum_settings('vacuum_table', old_data, data)
            # Update the vacuum toast table settings.
            self.update_vacuum_settings('vacuum_toast', old_data, data)

            sql = render_template(
                "/".join([self.table_template_path, self._UPDATE_SQL]),
                o_data=old_data, data=data, conn=self.conn
            )
            # Removes training new lines
            sql = sql.strip('\n') + '\n\n'

            # Parse/Format columns & create sql
            if 'columns' in data:
                # Parse the data coming from client
                data = column_utils.parse_format_columns(data, mode='edit')

                columns = data['columns']
                column_sql = '\n'

                # If column(s) is/are deleted
                column_sql = self._check_for_column_delete(columns, data,
                                                           column_sql)

                # If column(s) is/are changed
                column_sql = self._check_for_column_update(columns, data,
                                                           column_sql, tid)

                # If column(s) is/are added
                column_sql = self._check_for_column_add(columns, data,
                                                        column_sql)

                # Combine all the SQL together
                sql += column_sql.strip('\n')

            # Check for partitions
            sql = self._check_for_partitions_in_sql(data, old_data, sql)

            data['columns_to_be_dropped'] = []
            if 'columns' in data and 'deleted' in data['columns']:
                data['columns_to_be_dropped'] = list(map(
                    lambda d: d['name'], data['columns']['deleted']))

            # Check if index constraints are added/changed/deleted
            index_constraint_sql = \
                idxcons_utils.get_index_constraint_sql(
                    self.conn, did, tid, data)

            sql = self._check_for_constraints(index_constraint_sql, data, did,
                                              tid, sql)
        else:
            error, errmsg = BaseTableView._check_for_create_sql(data)
            if error:
                return gettext('-- definition incomplete')

            # validate constraint data.
            self._validate_constraint_data(data)
            # We will convert privileges coming from client required
            # in server side format
            self._convert_privilege_to_server_format(data)

            # Parse & format columns
            data = column_utils.parse_format_columns(data)
            data = BaseTableView.check_and_convert_name_to_string(data)

            self._check_foreign_key(data)

            partitions_sql = self._check_for_partitioned(data)

            # Update the vacuum table settings.
            self.update_vacuum_settings('vacuum_table', data)
            # Update the vacuum toast table settings.
            self.update_vacuum_settings('vacuum_toast', data)

            sql = render_template("/".join([self.table_template_path,
                                            self._CREATE_SQL]),
                                  data=data, conn=self.conn)

            # Append SQL for partitions
            sql += '\n' + partitions_sql

        sql = re.sub('\n{2,}', '\n\n', sql)
        sql = sql.strip('\n')

        return sql, data['name'] if 'name' in data else old_data['name']

    def update(self, gid, sid, did, scid, tid, **kwargs):
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
        data = kwargs.get('data')
        res = kwargs.get('res')
        parent_id = kwargs.get('parent_id', None)

        # checking the table existence using the function of the same class
        schema_name, table_name = self.get_schema_and_table_name(tid)

        if table_name is None:
            return gone(gettext("The specified table could not be found."))

        # table exists
        try:
            sql, name = self.get_sql(did, scid, tid, data, res)

            sql = sql.strip('\n').strip(' ')
            status, rest = self.conn.execute_scalar(sql)
            if not status:
                return internal_server_error(errormsg=rest)

            sql = render_template("/".join([self.table_template_path,
                                  'get_schema_oid.sql']), tid=tid)
            status, rest = self.conn.execute_2darray(sql)
            if not status:
                return internal_server_error(errormsg=rest)

            if not parent_id:
                parent_id = scid

            # Check for partitions
            partitions_oid = dict()
            is_partitioned = self._check_for_partitions(data, partitions_oid,
                                                        res, scid)

            # If partitioned_table_name in result set then get partition
            # icon css class else table icon.
            if 'partitioned_table_name' in res['rows'][0]:
                res['rows'][0]['is_sub_partitioned'] = is_partitioned
                icon = self.get_partition_icon_css_class(res['rows'][0])
            else:
                icon = self.get_icon_css_class(res['rows'][0])

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

    def _check_for_partitions(self, data, partitions_oid, res, scid):
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

            self._fetch_oid_schema_iod(data, scid, partitions_oid)

        if 'is_partitioned' in res['rows'][0]:
            is_partitioned = res['rows'][0]['is_partitioned']
        else:
            is_partitioned = False

        return is_partitioned

    def _fetch_oid_schema_iod(self, data, scid, partitions_oid):
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
                    sql = render_template(
                        "/".join([
                            self.table_template_path, self._OID_SQL
                        ]),
                        scid=scid, data=tmp_data
                    )

                    status, ptid = self.conn.execute_scalar(sql)
                    if not status:
                        return internal_server_error(errormsg=ptid)

                    created.append({
                        'oid': ptid,
                        'schema_id': scid
                    })

            partitions_oid['created'] = created
            partitions_oid['attached'] = attached

    def properties(self, gid, sid, did, scid, tid, **kwargs):
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
        res = kwargs.get('res')
        return_ajax_response = kwargs.get('return_ajax_response', True)

        data = res['rows'][0]

        data['vacuum_settings_str'] = ''

        if data['reloptions'] is not None:
            data['vacuum_settings_str'] += '\n'.join(data['reloptions'])

        if data['toast_reloptions'] is not None:
            data['vacuum_settings_str'] += '\n' \
                if data['vacuum_settings_str'] != '' else ''
            data['vacuum_settings_str'] += '\n'.\
                join(map(lambda o: 'toast.' + o, data['toast_reloptions']))

        data['vacuum_settings_str'] = data[
            'vacuum_settings_str'
        ].replace('=', ' = ')

        data = self._formatter(did, scid, tid, data)

        # Fetch partition of this table if it is partitioned table.
        if 'is_partitioned' in data and data['is_partitioned']:
            # get the partition type
            data['partition_type'] = \
                data['partition_scheme'].split()[0].lower()

            partitions = []
            sql = render_template("/".join([self.partition_template_path,
                                            self._NODES_SQL]),
                                  scid=scid, tid=tid)
            status, rset = self.conn.execute_2darray(sql)
            if not status:
                return internal_server_error(errormsg=rset)

            for row in rset['rows']:
                partition_name = row['name']
                # if schema name is different then display schema
                # qualified name on UI.
                if data['schema'] != row['schema_name']:
                    partition_name = row['schema_name'] + '.' + row['name']

                BaseTableView._partition_type_check(data, row, partitions,
                                                    partition_name)

            data['partitions'] = partitions

        if not return_ajax_response:
            return data

        return ajax_response(
            response=data,
            status=200
        )

    @staticmethod
    def _partition_type_check(data, row, partitions, partition_name):
        if data['partition_type'] == 'range':
            if row['partition_value'] == 'DEFAULT':
                is_default = True
                range_from = None
                range_to = None
            else:
                range_part = row['partition_value'].split(
                    'FOR VALUES FROM (')[1].split(') TO')
                range_from = range_part[0]
                range_to = range_part[1][2:-1]
                is_default = False

            partitions.append({
                'oid': row['oid'],
                'partition_name': partition_name,
                'values_from': range_from,
                'values_to': range_to,
                'is_default': is_default,
                'is_sub_partitioned': row['is_sub_partitioned'],
                'sub_partition_scheme': row['sub_partition_scheme']
            })
        elif data['partition_type'] == 'list':
            if row['partition_value'] == 'DEFAULT':
                is_default = True
                range_in = None
            else:
                range_part = row['partition_value'].split(
                    'FOR VALUES IN (')[1]
                range_in = range_part[:-1]
                is_default = False

            partitions.append({
                'oid': row['oid'],
                'partition_name': partition_name,
                'values_in': range_in,
                'is_default': is_default,
                'is_sub_partitioned': row['is_sub_partitioned'],
                'sub_partition_scheme': row['sub_partition_scheme']
            })
        else:
            range_part = row['partition_value'].split(
                'FOR VALUES WITH (')[1].split(",")
            range_modulus = range_part[0].strip().strip(
                "modulus").strip()
            range_remainder = range_part[1].strip(). \
                strip(" remainder").strip(")").strip()

            partitions.append({
                'oid': row['oid'],
                'partition_name': partition_name,
                'values_modulus': range_modulus,
                'values_remainder': range_remainder,
                'is_sub_partitioned': row['is_sub_partitioned'],
                'sub_partition_scheme': row['sub_partition_scheme']
            })

    def get_partitions_sql(self, partitions, schema_diff=False):
        """
        This function will iterate all the partitions and create SQL.

        :param partitions: List of partitions
        :param schema_diff: If true then create sql accordingly.
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

            if 'is_default' in row and row['is_default'] and (
                    partitions['partition_type'] == 'range' or
                    partitions['partition_type'] == 'list'):
                part_data['partition_value'] = 'DEFAULT'
            elif partitions['partition_type'] == 'range':
                range_from = row['values_from'].split(',')
                range_to = row['values_to'].split(',')

                from_str = ', '.join("{0}".format(item) for
                                     item in range_from)
                to_str = ', '.join("{0}".format(item) for
                                   item in range_to)

                part_data['partition_value'] = 'FOR VALUES FROM (' +\
                                               from_str + ') TO (' +\
                                               to_str + ')'

            elif partitions['partition_type'] == 'list':
                range_in = row['values_in'].split(',')
                in_str = ', '.join("{0}".format(item) for item in range_in)
                part_data['partition_value'] = 'FOR VALUES IN (' + in_str\
                                               + ')'

            else:
                range_modulus = row['values_modulus'].split(',')
                range_remainder = row['values_remainder'].split(',')

                modulus_str = ', '.join("{0}".format(item) for item in
                                        range_modulus)
                remainder_str = ', '.join("{0}".format(item) for item in
                                          range_remainder)

                part_data['partition_value'] = 'FOR VALUES WITH (MODULUS '\
                                               + modulus_str \
                                               + ', REMAINDER ' +\
                                               remainder_str + ')'

            partition_sql = self._check_for_partitioned_table(row, part_data,
                                                              schema_diff)

            sql += partition_sql

        return sql

    def _check_for_partitioned_table(self, row, part_data, schema_diff):
        # Check if partition is again declare as partitioned table.
        if 'is_sub_partitioned' in row and row['is_sub_partitioned']:
            part_data['partition_scheme'] = row['sub_partition_scheme'] \
                if 'sub_partition_scheme' in row else \
                self.get_partition_scheme(row)

            part_data['is_partitioned'] = True

        if 'is_attach' in row and row['is_attach']:
            partition_sql = render_template(
                "/".join([self.partition_template_path, 'attach.sql']),
                data=part_data, conn=self.conn
            )
        else:
            # For schema diff we create temporary partitions to copy the
            # data from original table to temporary table.
            if schema_diff:
                part_data['name'] = row['temp_partition_name']

            partition_sql = render_template(
                "/".join([self.partition_template_path, self._CREATE_SQL]),
                data=part_data, conn=self.conn
            )

        return partition_sql

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

        sql = render_template("/".join([self.table_template_path,
                                        'truncate.sql']),
                              data=data, cascade=is_cascade)
        status, res = self.conn.execute_scalar(sql)
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

    def get_delete_sql(self, res):
        # Below will decide if it's simple drop or drop with cascade call
        if self.cmd == 'delete':
            # This is a cascade operation
            cascade = True
        else:
            cascade = False

        data = res['rows'][0]

        return render_template(
            "/".join([self.table_template_path, self._DELETE_SQL]),
            data=data, cascade=cascade,
            conn=self.conn
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

        sql = self.get_delete_sql(res)

        status, res = self.conn.execute_scalar(sql)
        if not status:
            return status, res

        return True, {
            'id': tid,
            'scid': scid
        }

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
        if scid is None:
            return None, None

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

    def update_vacuum_settings(self, vacuum_key, old_data, data=None):
        """
        This function iterate the vacuum and vacuum toast table and create
        two new dictionaries. One for set parameter and another for reset.

        :param vacuum_key: Key to be checked.
        :param old_data: Old data
        :param data: New data
        :return:
        """

        # When creating a table old_data is the actual data
        if data is None:
            if vacuum_key in old_data:
                for opt in old_data[vacuum_key]:
                    if 'value' in opt and opt['value'] is None:
                        opt.pop('value')
        # Iterate vacuum table
        elif vacuum_key in data and 'changed' in data[vacuum_key] \
                and vacuum_key in old_data:
            set_values = []
            reset_values = []
            self._iterate_vacuume_table(data, old_data, set_values,
                                        reset_values, vacuum_key)

    def _iterate_vacuume_table(self, data, old_data, set_values, reset_values,
                               vacuum_key):
        for data_row in data[vacuum_key]['changed']:
            for old_data_row in old_data[vacuum_key]:
                if data_row['name'] == old_data_row['name'] and \
                        'value' in data_row:
                    if data_row['value'] is not None:
                        set_values.append(data_row)
                    elif data_row['value'] is None and \
                            'value' in old_data_row:
                        reset_values.append(data_row)

        if len(set_values) > 0:
            data[vacuum_key]['set_values'] = set_values

        if len(reset_values) > 0:
            data[vacuum_key]['reset_values'] = reset_values

    def update_autovacuum_properties(self, res):
        """
        This function sets the appropriate value for autovacuum_enabled and
        autovacuum_custom for table & toast table both.
        :param res:
        :return:
        """
        # Set value based on
        # x: No set, t: true, f: false
        if res is not None:
            res['autovacuum_enabled'] = 'x' \
                if res['autovacuum_enabled'] is None else \
                {True: 't', False: 'f'}[res['autovacuum_enabled']]
            res['toast_autovacuum_enabled'] = 'x' \
                if res['toast_autovacuum_enabled'] is None else \
                {True: 't', False: 'f'}[
                    res['toast_autovacuum_enabled']]
            # Enable custom autovaccum only if one of the options is set
            # or autovacuum is set
            res['autovacuum_custom'] = any([
                res['autovacuum_vacuum_threshold'],
                res['autovacuum_vacuum_scale_factor'],
                res['autovacuum_analyze_threshold'],
                res['autovacuum_analyze_scale_factor'],
                res['autovacuum_vacuum_cost_delay'],
                res['autovacuum_vacuum_cost_limit'],
                res['autovacuum_freeze_min_age'],
                res['autovacuum_freeze_max_age'],
                res['autovacuum_freeze_table_age']]) or \
                res['autovacuum_enabled'] in ('t', 'f')

            res['toast_autovacuum'] = any([
                res['toast_autovacuum_vacuum_threshold'],
                res['toast_autovacuum_vacuum_scale_factor'],
                res['toast_autovacuum_analyze_threshold'],
                res['toast_autovacuum_analyze_scale_factor'],
                res['toast_autovacuum_vacuum_cost_delay'],
                res['toast_autovacuum_vacuum_cost_limit'],
                res['toast_autovacuum_freeze_min_age'],
                res['toast_autovacuum_freeze_max_age'],
                res['toast_autovacuum_freeze_table_age']]) or \
                res['toast_autovacuum_enabled'] in ('t', 'f')
