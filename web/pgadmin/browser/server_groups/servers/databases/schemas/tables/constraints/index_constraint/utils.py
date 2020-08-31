##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

""" Implements Utility class for Index Constraint. """

from flask import render_template
from flask_babelex import gettext as _
from pgadmin.utils.ajax import internal_server_error
from pgadmin.utils.exception import ObjectGone, ExecuteError
from functools import wraps


def get_template_path(f):
    """
    This function will behave as a decorator which will prepare
    the template path based on database server version.
    """

    @wraps(f)
    def wrap(*args, **kwargs):
        # Here args[0] will hold the connection object
        conn_obj = args[0]
        if 'template_path' not in kwargs:
            kwargs['template_path'] = 'index_constraint/sql/#{0}#'.format(
                conn_obj.manager.version)

        return f(*args, **kwargs)
    return wrap


@get_template_path
def get_parent(conn, tid, template_path=None):
    """
    This function will return the parent of the given table.
    :param conn: Connection Object
    :param tid: Table oid
    :param template_path:
    :return:
    """

    SQL = render_template("/".join([template_path,
                                    'get_parent.sql']), tid=tid)
    status, rset = conn.execute_2darray(SQL)
    if not status:
        raise ExecuteError(rset)

    schema = ''
    table = ''
    if 'rows' in rset and len(rset['rows']) > 0:
        schema = rset['rows'][0]['schema']
        table = rset['rows'][0]['table']

    return schema, table


@get_template_path
def get_index_constraints(conn, did, tid, ctype, cid=None, template_path=None):
    """
    This function is used to fetch information of the
    index constraint(s) for the given table.
    :param conn: Connection Object
    :param did: Database ID
    :param tid: Table ID
    :param ctype: Constraint Type
    :param cid: index Constraint ID
    :param template_path: Template Path
    :return:
    """

    sql = render_template("/".join([template_path, 'properties.sql']),
                          did=did, tid=tid, cid=cid, constraint_type=ctype)
    status, result = conn.execute_dict(sql)
    if not status:
        return status, internal_server_error(errormsg=result)

    for idx_cons in result['rows']:
        sql = render_template("/".join([template_path,
                                        'get_constraint_cols.sql']),
                              cid=idx_cons['oid'],
                              colcnt=idx_cons['col_count'])
        status, res = conn.execute_dict(sql)
        if not status:
            return status, internal_server_error(errormsg=res)

        columns = []
        for r in res['rows']:
            columns.append({"column": r['column'].strip('"')})

        idx_cons['columns'] = columns

        # INCLUDE clause in index is supported from PG-11+
        if conn.manager.version >= 110000:
            sql = render_template("/".join([template_path,
                                            'get_constraint_include.sql']),
                                  cid=idx_cons['oid'])
            status, res = conn.execute_dict(sql)
            if not status:
                return status, internal_server_error(errormsg=res)

            idx_cons['include'] = [col['colname'] for col in res['rows']]

    return True, result['rows']


def _get_sql_to_delete_constraints(data, constraint, sql, template_path, conn):
    """
    Check for delete constraints.
    :param data: data.
    :param constraint: constraint according to it's type from data.
    :param sql: sql list for all sql statements.
    :param template_path: Template path.
    :param conn: connection.
    :return:
    """
    if 'deleted' in constraint:
        for c in constraint['deleted']:
            del_cols = []
            if 'columns_to_be_dropped' in data:
                del_cols = list(map(lambda x, y: x['column'] in y,
                                    c['columns'],
                                    data['columns_to_be_dropped'])
                                )

            if len(del_cols) == 0:
                c['schema'] = data['schema']
                c['table'] = data['name']

                # Sql for drop
                sql.append(render_template("/".join([template_path,
                                                     'delete.sql']),
                                           data=c,
                                           conn=conn).strip('\n'))


def _get_sql_to_change_constraints(did, tid, ctype, data, constraint,
                                   sql, conn):
    """
    Check for chnage constraints.
    :param did: data base id.
    :param tid: table id.
    :param ctype: constraint type.
    :param data: data.
    :param constraint: constraint according to it's type from data.
    :param sql: sql list for all sql statements.
    :param conn: connection.
    :return:
    """
    if 'changed' in constraint:
        for c in constraint['changed']:
            c['schema'] = data['schema']
            c['table'] = data['name']

            modified_sql, name = get_sql(conn, c, did, tid, ctype,
                                         c['oid'])
            if modified_sql:
                sql.append(modified_sql.strip('\n'))


def _get_sql_to_add_constraints(did, tid, ctype, data, constraint,
                                sql, conn):
    """
    Check for add constraints.
    :param did: data base id.
    :param tid: table id.
    :param ctype: constraint type.
    :param data: data.
    :param constraint: constraint according to it's type from data.
    :param sql: sql list for all sql statements.
    :param conn: connection.
    :return:
    """
    if 'added' in constraint:
        for c in constraint['added']:
            c['schema'] = data['schema']
            c['table'] = data['name']

            add_sql, name = get_sql(conn, c, did, tid, ctype)
            sql.append(add_sql.strip("\n"))


@get_template_path
def get_index_constraint_sql(conn, did, tid, data, template_path=None):
    """
    This function will return sql for index constraints.
    :param conn: Connection Object
    :param did: Database ID
    :param tid: Table ID
    :param data: Data
    :param template_path: Template Path
    :return:
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
            _get_sql_to_delete_constraints(data, constraint, sql,
                                           template_path, conn)
            # Get SQL for change constraints.
            _get_sql_to_change_constraints(did, tid, ctype, data, constraint,
                                           sql, conn)
            # Get SQL for add constraints.
            _get_sql_to_add_constraints(did, tid, ctype, data, constraint,
                                        sql, conn)

    if len(sql) > 0:
        # Join all the sql(s) as single string
        return '\n\n'.join(sql)
    else:
        return None


def is_key_str(key, data):
    return isinstance(data[key], str) and data[key] != ""


def _check_required_args(data, name):
    """
    Check required arguments are present.
    :param data: Data for check.
    :param name: constraint name.
    :return: If any error return error.
    """
    required_args = [
        ['columns', 'index']  # Either of one should be there.
    ]

    def is_key_list(key, data):
        return isinstance(data[key], list) and len(data[param]) > 0

    for arg in required_args:
        if isinstance(arg, list):
            for param in arg:
                if param in data and \
                    (is_key_str(param, data) or
                     is_key_list(param, data)):
                    break
            else:
                return True, '-- definition incomplete', name

        elif arg not in data:
            return True, '-- definition incomplete', name

    return False, '', name


@get_template_path
def get_sql(conn, data, did, tid, ctype, cid=None, template_path=None):
    """
    This function will generate sql from model data.
    :param conn: Connection Object
    :param data: data
    :param did: Database ID
    :param tid: Table id
    :param ctype: Constraint Type
    :param cid: index Constraint ID
    :param template_path: Template Path
    :return:
    """
    name = data['name'] if 'name' in data else None
    sql = None
    if cid is not None:
        sql = render_template("/".join([template_path, 'properties.sql']),
                              did=did, tid=tid, cid=cid,
                              constraint_type=ctype)
        status, res = conn.execute_dict(sql)
        if not status:
            raise ExecuteError(res)

        elif len(res['rows']) == 0:
            raise ObjectGone(
                _('Could not find the constraint in the table.'))

        old_data = res['rows'][0]
        if 'name' not in data:
            name = data['name'] = old_data['name']

        sql = render_template("/".join([template_path, 'update.sql']),
                              data=data,
                              o_data=old_data)
    else:
        is_error, errmsg, name = _check_required_args(data, name)
        if is_error:
            return _(errmsg), name

        sql = render_template("/".join([template_path, 'create.sql']),
                              data=data,
                              conn=conn,
                              constraint_name='PRIMARY KEY'
                              if ctype == 'p' else 'UNIQUE')
    return sql, name
