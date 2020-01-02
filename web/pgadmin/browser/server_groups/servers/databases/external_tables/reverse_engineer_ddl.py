##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
from os import path

from pgadmin.browser.server_groups.servers.databases\
    .external_tables.mapping_utils import \
    map_column_from_database, map_table_information_from_database


class ReverseEngineerDDLException(Exception):
    pass


class ReverseEngineerDDL:
    def __init__(self, sql_template_paths,
                 render_template,
                 database_connection,
                 server_group_id, server_id, database_id):
        self.sql_template_path = sql_template_paths
        self.render_template = render_template
        self.database_connection = database_connection

    def execute(self, table_oid):
        reverse_engineer_data = self.table_information(table_oid)
        reverse_engineer_data['columns'] = self.find_columns(table_oid)
        return self.render_template(
            template_name_or_list=path.join(self.sql_template_path,
                                            'create.sql'),
            table=reverse_engineer_data
        )

    def find_columns(self, table_oid):
        columns_sql = self.render_template(
            template_name_or_list=path.join(self.sql_template_path,
                                            'get_columns.sql'),
            table_oid=table_oid
        )

        (status, column_result) = \
            self.database_connection.execute_2darray(columns_sql)
        if not status:
            raise ReverseEngineerDDLException(column_result)

        return list(map(map_column_from_database, column_result['rows']))

    def table_information(self, table_oid):
        table_information_sql = self.render_template(
            template_name_or_list=path.join(self.sql_template_path,
                                            'get_table_information.sql'),
            table_oid=table_oid
        )

        (status, table_information_result) = \
            self.database_connection.execute_2darray(table_information_sql)
        if not status:
            raise ReverseEngineerDDLException(table_information_result)
        elif 'rows' not in table_information_result.keys() or len(
            table_information_result['rows']
        ) == 0:
            raise ReverseEngineerDDLException('Table not found')

        return map_table_information_from_database(
            table_information_result['rows'][0])
