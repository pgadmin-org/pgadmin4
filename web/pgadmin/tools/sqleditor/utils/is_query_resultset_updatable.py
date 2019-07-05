##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2019, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""
    Check if the result-set of a query is updatable, A resultset is
    updatable (as of this version) if:
        - All columns belong to the same table.
        - All the primary key columns of the table are present in the resultset
        - No duplicate columns
"""
from flask import render_template
try:
    from collections import OrderedDict
except ImportError:
    from ordereddict import OrderedDict


def is_query_resultset_updatable(conn, sql_path):
    """
        This function is used to check whether the last successful query
        produced updatable results.

        Args:
            conn: Connection object.
            sql_path: the path to the sql templates.
    """
    columns_info = conn.get_column_info()

    if columns_info is None or len(columns_info) < 1:
        return return_not_updatable()

    table_oid = _check_single_table(columns_info)
    if not table_oid:
        return return_not_updatable()

    if not _check_duplicate_columns(columns_info):
        return return_not_updatable()

    if conn.connected():
        primary_keys, primary_keys_columns, pk_names = \
            _get_primary_keys(conn=conn,
                              table_oid=table_oid,
                              sql_path=sql_path)

        if not _check_primary_keys_uniquely_exist(primary_keys_columns,
                                                  columns_info):
            return return_not_updatable()

        return True, primary_keys, pk_names, table_oid
    else:
        return return_not_updatable()


def _check_single_table(columns_info):
    table_oid = columns_info[0]['table_oid']
    for column in columns_info:
        if column['table_oid'] != table_oid:
            return None
    return table_oid


def _check_duplicate_columns(columns_info):
    column_numbers = \
        [col['table_column'] for col in columns_info]
    is_duplicate_columns = len(column_numbers) != len(set(column_numbers))
    if is_duplicate_columns:
        return False
    return True


def _check_primary_keys_uniquely_exist(primary_keys_columns, columns_info):
    for pk in primary_keys_columns:
        pk_exists = False
        for col in columns_info:
            if col['table_column'] == pk['column_number']:
                pk_exists = True
                # If the primary key column is renamed
                if col['display_name'] != pk['name']:
                    return False
            # If a normal column is renamed to a primary key column name
            elif col['display_name'] == pk['name']:
                return False

        if not pk_exists:
            return False
    return True


def _get_primary_keys(sql_path, table_oid, conn):
    query = render_template(
        "/".join([sql_path, 'primary_keys.sql']),
        obj_id=table_oid
    )
    status, result = conn.execute_dict(query)
    if not status:
        return return_not_updatable()

    primary_keys_columns = []
    primary_keys = OrderedDict()
    pk_names = []

    for row in result['rows']:
        primary_keys[row['attname']] = row['typname']
        primary_keys_columns.append({
            'name': row['attname'],
            'column_number': row['attnum']
        })
        pk_names.append(row['attname'])

    return primary_keys, primary_keys_columns, pk_names


def return_not_updatable():
    return False, None, None, None
