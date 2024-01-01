##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

""" Implements Utility class for Check Constraint. """

from flask import render_template
from flask_babel import gettext as _
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
            kwargs['template_path'] = 'check_constraint/sql/#{0}#'.format(
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
def get_check_constraints(conn, tid, cid=None, template_path=None):
    """
    This function is used to fetch information of the
    check constraint(s) for the given table.
    :param conn: Connection Object
    :param tid: Table ID
    :param cid: Check Constraint ID
    :param template_path: Template Path
    :return:
    """

    sql = render_template("/".join(
        [template_path, 'properties.sql']), tid=tid, cid=cid)

    status, result = conn.execute_dict(sql)
    if not status:
        return status, internal_server_error(errormsg=result)

    return True, result['rows']


def _check_delete_constraint(constraint, data, template_path, conn, sql):
    """
    This function if user deleted any constraint.
    :param constraint: Constraint list in data.
    :param data: Data.
    :param template_path: sql template path for delete.
    :param conn: connection.
    :param sql: list for append delete constraint sql.
    """
    if 'deleted' in constraint:
        for c in constraint['deleted']:
            c['schema'] = data['schema']
            c['nspname'] = data['schema']
            c['table'] = data['name']

            # Sql for drop
            sql.append(
                render_template("/".join(
                    [template_path, 'delete.sql']),
                    data=c, conn=conn).strip("\n")
            )


@get_template_path
def get_check_constraint_sql(conn, tid, data, template_path=None):
    """
    This function will return sql for check constraints.
    :param conn: Connection Object
    :param tid: Table ID
    :param data: Data
    :param template_path: Template Path
    :return:
    """

    sql = []
    # Check if constraint is in data
    # If yes then we need to check for add/change/delete
    if 'check_constraint' in data:
        constraint = data['check_constraint']
        # If constraint(s) is/are deleted
        _check_delete_constraint(constraint, data, template_path, conn, sql)

        if 'changed' in constraint:
            for c in constraint['changed']:
                c['schema'] = data['schema']
                c['table'] = data['name']

                modified_sql, name = get_sql(conn, c, tid, c['oid'])
                sql.append(modified_sql.strip('\n'))

        if 'added' in constraint:
            for c in constraint['added']:
                c['schema'] = data['schema']
                c['table'] = data['name']

                add_sql, name = get_sql(conn, c, tid)
                sql.append(add_sql.strip("\n"))

    if len(sql) > 0:
        # Join all the sql(s) as single string
        return '\n\n'.join(sql)
    else:
        return None


@get_template_path
def get_sql(conn, data, tid, cid=None, template_path=None):
    """
    This function will generate sql from model data.
    :param conn: Connection Object
    :param data: data
    :param tid: Table id
    :param cid: Check Constraint ID
    :param template_path: Template Path
    :return:
    """
    name = data['name'] if 'name' in data else None
    if cid is not None:
        sql = render_template("/".join([template_path, 'properties.sql']),
                              tid=tid, cid=cid)
        status, res = conn.execute_dict(sql)
        if not status:
            raise ExecuteError(res)

        if len(res['rows']) == 0:
            raise ObjectGone(
                _('Could not find the check constraint in the table.'))

        old_data = res['rows'][0]
        if 'name' not in data:
            name = data['name'] = old_data['name']

        sql = render_template("/".join([template_path, 'update.sql']),
                              data=data, o_data=old_data, conn=conn)
    else:
        if 'consrc' not in data or \
                (isinstance(data['consrc'], list) and len(data['consrc']) < 1):
            return _('-- definition incomplete'), name

        sql = render_template("/".join([template_path, 'create.sql']),
                              data=data, conn=conn)

    return sql, name
