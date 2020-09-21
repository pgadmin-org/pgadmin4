##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""
    Check if the result-set of a query is editable, A result-set is
    editable if:
        - All columns are either selected directly from a single table, or
          are not table columns at all (e.g. concatenation of 2 columns).
          Only columns that are selected directly from a the table are
          editable, other columns are read-only.
        - All the primary key columns or oids (if applicable) of the table are
          present in the result-set.

    Note:
        - Duplicate columns (selected twice) or renamed columns are also
          read-only.
"""
from flask import render_template
from flask_babelex import gettext
from collections import OrderedDict
from werkzeug.exceptions import InternalServerError

from pgadmin.tools.sqleditor.utils.get_column_types import get_columns_types
from pgadmin.utils.exception import ExecuteError
from pgadmin.utils.constants import SERVER_CONNECTION_CLOSED


def is_query_resultset_updatable(conn, sql_path):
    """
        This function is used to check whether the last successful query
        produced editable results.

        Args:
            conn: Connection object.
            sql_path: the path to the sql templates
                      primary_keys.sql & columns.sql.
    """
    columns_info = conn.get_column_info()

    if columns_info is None or len(columns_info) < 1:
        return return_not_updatable()

    table_oid = _check_single_table(columns_info)
    if table_oid is None:
        return return_not_updatable()

    if conn.connected():
        # Get all the table columns
        table_columns = _get_table_columns(conn=conn,
                                           table_oid=table_oid,
                                           sql_path=sql_path)

        # Editable column: A column selected directly from a table, that is
        # neither renamed nor is a duplicate of another selected column
        _check_editable_columns(table_columns=table_columns,
                                results_columns=columns_info)

        primary_keys, pk_names = \
            _check_primary_keys(conn=conn,
                                columns_info=columns_info,
                                table_oid=table_oid,
                                sql_path=sql_path)

        has_oids = _check_oids(conn=conn,
                               columns_info=columns_info,
                               table_oid=table_oid,
                               sql_path=sql_path)

        is_resultset_updatable = has_oids or (primary_keys is not None and
                                              len(primary_keys) != 0)

        if not is_resultset_updatable:
            _set_all_columns_not_editable(columns_info=columns_info)

        column_types = get_columns_types(columns_info=columns_info,
                                         table_oid=table_oid,
                                         conn=conn,
                                         has_oids=has_oids,
                                         is_query_tool=True)
        return is_resultset_updatable, has_oids, primary_keys, \
            pk_names, table_oid, column_types
    else:
        raise InternalServerError(SERVER_CONNECTION_CLOSED)


def _check_single_table(columns_info):
    table_oid = None
    for column in columns_info:
        # Skip columns that are not directly from tables
        if column['table_oid'] is None:
            continue
        # If we don't have a table_oid yet, store this one
        if table_oid is None:
            table_oid = column['table_oid']
        # If we already have one, check that all the columns have the same one
        elif column['table_oid'] != table_oid:
            return None
    return table_oid


def _check_editable_columns(table_columns, results_columns):
    table_columns_numbers = set()
    for results_column in results_columns:
        table_column_number = results_column['table_column']
        if table_column_number is None:  # Not a table column
            results_column['is_editable'] = False
        elif table_column_number in table_columns_numbers:  # Duplicate
            results_column['is_editable'] = False
        elif table_column_number not in table_columns:
            results_column['is_editable'] = False
        elif results_column['display_name'] \
                != table_columns[table_column_number]:
            results_column['is_editable'] = False
        else:
            results_column['is_editable'] = True
            table_columns_numbers.add(table_column_number)


def _check_oids(conn, sql_path, table_oid, columns_info):
    # Remove the special behavior of OID columns from
    # PostgreSQL 12 onwards, so returning False.
    if conn.manager.sversion >= 120000:
        return False

    # Check that the table has oids
    query = render_template(
        "/".join([sql_path, 'has_oids.sql']), obj_id=table_oid)

    status, has_oids = conn.execute_scalar(query)
    if not status:
        raise ExecuteError(has_oids)

    # Check that the oid column is selected in results columns
    oid_column_selected = False
    for col in columns_info:
        if col['table_column'] is None and col['display_name'] == 'oid':
            oid_column_selected = True
            break
    return has_oids and oid_column_selected


def _check_primary_keys(conn, columns_info, sql_path, table_oid):
    primary_keys, primary_keys_columns, pk_names = \
        _get_primary_keys(conn=conn,
                          table_oid=table_oid,
                          sql_path=sql_path)

    if not _check_all_primary_keys_exist(primary_keys_columns,
                                         columns_info):
        primary_keys = None
        pk_names = None
    return primary_keys, pk_names


def _check_all_primary_keys_exist(primary_keys_columns, columns_info):
    """
        Check that all primary keys exist.

        If another column is selected with the same name as the primary key
        before the primary key (e.g SELECT some_col as pk, pk from table) the
        name of the actual primary key column gets changed to pk-2.
        This is also reversed here.
    """
    for pk in primary_keys_columns:
        pk_exists = False
        for col in columns_info:
            if col['is_editable'] and \
               col['table_column'] == pk['column_number']:
                pk_exists = True
                # If the primary key is renamed, restore to its original name
                if col['name'] != pk['name']:
                    col['name'], _ = col['name'].split('-')
            # If another column is renamed to the primary key name, change it
            elif col['name'] == pk['name']:
                col['name'] += '-0'
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
        raise ExecuteError(result)

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


def _get_table_columns(sql_path, table_oid, conn):
    query = render_template(
        "/".join([sql_path, 'get_columns.sql']),
        obj_id=table_oid
    )
    status, result = conn.execute_dict(query)
    if not status:
        raise ExecuteError(result)

    columns = {}
    for row in result['rows']:
        columns[row['attnum']] = row['attname']

    return columns


def _set_all_columns_not_editable(columns_info):
    for col in columns_info:
        col['is_editable'] = False


def return_not_updatable():
    return False, False, None, None, None, None
