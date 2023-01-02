##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from flask import render_template
from collections import OrderedDict

from pgadmin.tools.sqleditor.utils.constant_definition import TX_STATUS_IDLE

ignore_type_cast_list = ['character', 'character[]', 'bit', 'bit[]']


def save_changed_data(changed_data, columns_info, conn, command_obj,
                      client_primary_key, auto_commit=True):
    """
    This function is used to save the data into the database.
    Depending on condition it will either update or insert the
    new row into the database.

    Args:
        changed_data: Contains data to be saved
        command_obj: The transaction object (command_obj or trans_obj)
        conn: The connection object
        columns_info: session_obj['columns_info']
        client_primary_key: session_obj['client_primary_key']
        auto_commit: If the changes should be commited automatically.
    """
    status = False
    res = None
    query_results = []
    operations = ('added', 'updated', 'deleted')
    list_of_sql = {}
    _rowid = None

    pgadmin_alias = {
        col_name: col_info['pgadmin_alias']
        for col_name, col_info in columns_info.items()
    }

    is_savepoint = False
    # Start the transaction if the session is idle
    if conn.transaction_status() == TX_STATUS_IDLE:
        sql = 'BEGIN;'
    else:
        sql = 'SAVEPOINT save_data;'
        is_savepoint = True

    status, res = execute_void_wrapper(conn, sql, query_results)
    if not status:
        return status, res, query_results, None

    # Iterate total number of records to be updated/inserted
    for of_type in changed_data:
        # No need to go further if its not add/update/delete operation
        if of_type not in operations:
            continue
        # if no data to be save then continue
        if len(changed_data[of_type]) < 1:
            continue

        column_type = {}
        column_data = {}
        type_cast_required = {}
        for each_col in columns_info:
            if (
                columns_info[each_col]['not_null'] and
                not columns_info[each_col]['has_default_val']
            ):
                column_data[each_col] = None
                column_type[each_col] = \
                    columns_info[each_col]['type_name']
            else:
                column_type[each_col] = \
                    columns_info[each_col]['type_name']

            type_cast_required[each_col] = \
                True if column_type[each_col] not in ignore_type_cast_list \
                else False

        # For newly added rows
        if of_type == 'added':
            # Python dict does not honour the inserted item order
            # So to insert data in the order, we need to make ordered
            # list of added index We don't need this mechanism in
            # updated/deleted rows as it does not matter in
            # those operations
            added_index = OrderedDict(
                sorted(
                    changed_data['added_index'].items(),
                    key=lambda x: int(x[0])
                )
            )
            list_of_sql[of_type] = []

            # When new rows are added, only changed columns data is
            # sent from client side. But if column is not_null and has
            # no_default_value, set column to blank, instead
            # of not null which is set by default.
            column_data = {}
            pk_names, primary_keys = command_obj.get_primary_keys()

            for each_row in added_index:
                # Get the row index to match with the added rows
                # dict key
                tmp_row_index = added_index[each_row]
                data = changed_data[of_type][tmp_row_index]['data']
                # Remove our unique tracking key
                data.pop(client_primary_key, None)
                data.pop('is_row_copied', None)

                # Remove oid col
                if command_obj.has_oids():
                    data.pop('oid', None)

                # Update columns value with columns having
                # not_null=False and has no default value
                column_data.update(data)

                sql = render_template(
                    "/".join([command_obj.sql_path, 'insert.sql']),
                    data_to_be_saved=column_data,
                    pgadmin_alias=pgadmin_alias,
                    primary_keys=None,
                    object_name=command_obj.object_name,
                    nsp_name=command_obj.nsp_name,
                    data_type=column_type,
                    pk_names=pk_names,
                    has_oids=command_obj.has_oids(),
                    type_cast_required=type_cast_required
                )

                select_sql = render_template(
                    "/".join([command_obj.sql_path, 'select.sql']),
                    object_name=command_obj.object_name,
                    nsp_name=command_obj.nsp_name,
                    pgadmin_alias=pgadmin_alias,
                    primary_keys=primary_keys,
                    has_oids=command_obj.has_oids()
                )

                list_of_sql[of_type].append({
                    'sql': sql, 'data': data,
                    'client_row': tmp_row_index,
                    'select_sql': select_sql,
                    'row_id': data.get(client_primary_key)
                })
                # Reset column data
                column_data = {}

        # For updated rows
        elif of_type == 'updated':
            list_of_sql[of_type] = []
            for each_row in changed_data[of_type]:
                data = changed_data[of_type][each_row]['data']
                pk_escaped = {
                    pk: pk_val.replace('%', '%%') if hasattr(
                        pk_val, 'replace') else pk_val
                    for pk, pk_val in
                    changed_data[of_type][each_row]['primary_keys'].items()
                }
                sql = render_template(
                    "/".join([command_obj.sql_path, 'update.sql']),
                    data_to_be_saved=data,
                    pgadmin_alias=pgadmin_alias,
                    primary_keys=pk_escaped,
                    object_name=command_obj.object_name,
                    nsp_name=command_obj.nsp_name,
                    data_type=column_type,
                    type_cast_required=type_cast_required
                )
                list_of_sql[of_type].append({'sql': sql,
                                             'data': data,
                                             'row_id':
                                                 data.get(client_primary_key)})

        # For deleted rows
        elif of_type == 'deleted':
            list_of_sql[of_type] = []
            is_first = True
            rows_to_delete = []
            keys = None
            no_of_keys = None
            for each_row in changed_data[of_type]:
                rows_to_delete.append(changed_data[of_type][each_row])
                # Fetch the keys for SQL generation
                if is_first:
                    # We need to covert dict_keys to normal list in
                    # Python3
                    # In Python2, it's already a list & We will also
                    # fetch column names using index
                    keys = list(
                        changed_data[of_type][each_row].keys()
                    )
                    no_of_keys = len(keys)
                    is_first = False
            # Map index with column name for each row
            for row in rows_to_delete:
                for k, v in row.items():
                    # Set primary key with label & delete index based
                    # mapped key
                    try:
                        row[changed_data['columns']
                                        [int(k)]['name']] = v
                    except ValueError:
                        continue
                    del row[k]

            sql = render_template(
                "/".join([command_obj.sql_path, 'delete.sql']),
                data=rows_to_delete,
                primary_key_labels=keys,
                no_of_keys=no_of_keys,
                object_name=command_obj.object_name,
                nsp_name=command_obj.nsp_name
            )
            list_of_sql[of_type].append({'sql': sql, 'data': {}})

    def failure_handle(res, row_id):
        mogrified_sql = conn.mogrify(item['sql'], item['data'])
        mogrified_sql = mogrified_sql if mogrified_sql is not None \
            else item['sql']
        query_results.append({
            'status': False,
            'result': res,
            'sql': mogrified_sql,
            'rows_affected': 0,
            'row_added': None
        })

        if is_savepoint:
            sql = 'ROLLBACK TO SAVEPOINT save_data;'
            msg = 'A ROLLBACK was done for the save operation only. ' \
                  'The active transaction is not affected.'
        else:
            sql = 'ROLLBACK;'
            msg = 'A ROLLBACK was done for the save transaction.'

        rollback_status, rollback_result = \
            execute_void_wrapper(conn, sql, query_results)
        if not rollback_status:
            return rollback_status, rollback_result, query_results, None

        # If we roll backed every thing then update the
        # message for each sql query.
        for query in query_results:
            if query['status']:
                query['result'] = msg

        return False, res, query_results, row_id

    for opr, sqls in list_of_sql.items():
        for item in sqls:
            if item['sql']:
                item['data'] = {
                    pgadmin_alias[k] if k in pgadmin_alias else k: v
                    for k, v in item['data'].items()
                }

                row_added = None

                try:
                    # Fetch oids/primary keys
                    if 'select_sql' in item and item['select_sql']:
                        status, res = conn.execute_dict(
                            item['sql'], item['data'])
                    else:
                        status, res = conn.execute_void(
                            item['sql'], item['data'])
                except Exception:
                    failure_handle(res, item.get('row_id', 0))
                    raise

                if not status:
                    return failure_handle(res, item.get('row_id', 0))

                # Select added row from the table
                if 'select_sql' in item:
                    params = {
                        pgadmin_alias[k] if k in pgadmin_alias else k: v
                        for k, v in res['rows'][0].items()
                    }
                    status, sel_res = conn.execute_dict(
                        item['select_sql'], params)

                    if not status:
                        return failure_handle(sel_res, item.get('row_id', 0))

                    if 'rows' in sel_res and len(sel_res['rows']) > 0:
                        row_added = {
                            item['client_row']: sel_res['rows'][0]}

                rows_affected = conn.rows_affected()
                mogrified_sql = conn.mogrify(item['sql'], item['data'])
                mogrified_sql = mogrified_sql if mogrified_sql is not None \
                    else item['sql']
                # store the result of each query in dictionary
                query_results.append({
                    'status': status,
                    'result': None if row_added else res,
                    'sql': mogrified_sql,
                    'rows_affected': rows_affected,
                    'row_added': row_added
                })

    # Commit the transaction if no error is found & autocommit is activated
    if auto_commit:
        sql = 'COMMIT;'
        status, res = execute_void_wrapper(conn, sql, query_results)
        if not status:
            return status, res, query_results, None

    return status, res, query_results, _rowid


def execute_void_wrapper(conn, sql, query_results):
    """
    Executes a sql query with no return and adds it to query_results
    :param sql: Sql query
    :param query_results: A list of query results in the save operation
    :return: status, result
    """
    status, res = conn.execute_void(sql)
    if status:
        query_results.append({
            'status': status,
            'result': res,
            'sql': sql, 'rows_affected': 0,
            'row_added': None
        })
    return status, res
