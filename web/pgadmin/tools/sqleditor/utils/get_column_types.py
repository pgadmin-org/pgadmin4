##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
"""
    Get the column types for QueryToolCommand or TableCommand when
    the result-set is editable.
"""

from flask import render_template
from flask_babel import gettext
from pgadmin.utils.exception import ExecuteError, ObjectGone


def get_columns_types(is_query_tool, columns_info, table_oid, conn, has_oids,
                      table_name=None, table_nspname=None):
    nodes_sqlpath = 'columns/sql/#{0}#'.format(conn.manager.version)
    param = {
        'has_oids': has_oids,
    }
    if table_name and table_nspname:
        param.update({
            'table_name': table_name,
            'table_nspname': table_nspname,
        })
    else:
        param.update({
            'tid': table_oid
        })

    query = render_template(
        "/".join([nodes_sqlpath, 'nodes.sql']),
        conn=conn,
        **param
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
        col_type['display_size'] = col['display_size']
        column_types[col['name']] = col_type

        if rset['rows']:
            if not is_query_tool:
                col_type['not_null'] = col['not_null'] = \
                    rset['rows'][key]['not_null']

                col_type['has_default_val'] = \
                    col['has_default_val'] = \
                    rset['rows'][key]['has_default_val']

                col_type['seqtypid'] = col['seqtypid'] = \
                    rset['rows'][key]['seqtypid']

                # Check if column is a generated column (PostgreSQL 12+).
                # Generated columns must be excluded from INSERT/UPDATE.
                col_type['is_generated'] = col['is_generated'] = \
                    rset['rows'][key].get('is_generated', False)

            else:
                for row in rset['rows']:
                    if row['oid'] == col['table_column']:
                        col_type['not_null'] = col['not_null'] = \
                            row['not_null']

                        col_type['has_default_val'] = \
                            col['has_default_val'] = \
                            row['has_default_val']

                        col_type['seqtypid'] = col['seqtypid'] = \
                            row['seqtypid']

                        # Check if column is a generated column (PG 12+).
                        col_type['is_generated'] = col['is_generated'] = \
                            row.get('is_generated', False)
                        break

                    else:
                        col_type['not_null'] = col['not_null'] = None
                        col_type['has_default_val'] = \
                            col['has_default_val'] = None
                        col_type['seqtypid'] = col['seqtypid'] = None
                        col_type['is_generated'] = col['is_generated'] = False

    return column_types
