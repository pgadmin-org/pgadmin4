##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
"""
    Get the column types for QueryToolCommand or TableCommand when
    the result-set is editable.
"""

from flask import render_template
from pgadmin.utils.exception import ExecuteError


def get_columns_types(is_query_tool, columns_info, table_oid, conn, has_oids):
    nodes_sqlpath = 'columns/sql/#{0}#'.format(conn.manager.version)
    query = render_template(
        "/".join([nodes_sqlpath, 'nodes.sql']),
        tid=table_oid,
        has_oids=has_oids
    )

    colst, rset = conn.execute_2darray(query)
    if not colst:
        raise ExecuteError(rset)

    column_types = dict()
    for key, col in enumerate(columns_info):
        col_type = dict()
        col_type['type_code'] = col['type_code']
        col_type['type_name'] = None
        col_type['internal_size'] = col['internal_size']
        column_types[col['name']] = col_type

        if not is_query_tool:
            col_type['not_null'] = col['not_null'] = \
                rset['rows'][key]['not_null']

            col_type['has_default_val'] = \
                col['has_default_val'] = \
                rset['rows'][key]['has_default_val']

        else:
            for row in rset['rows']:
                if row['oid'] == col['table_column']:
                    col_type['not_null'] = col['not_null'] = row['not_null']

                    col_type['has_default_val'] = \
                        col['has_default_val'] = row['has_default_val']
                    break

                else:
                    col_type['not_null'] = col['not_null'] = None
                    col_type['has_default_val'] = col['has_default_val'] = None

    return column_types
