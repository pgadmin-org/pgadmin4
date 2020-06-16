##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

""" Implements Utility class for Exclusion Constraint. """

from flask import render_template
from flask_babelex import gettext as _
from pgadmin.utils.ajax import internal_server_error
from pgadmin.utils.exception import ObjectGone
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
            kwargs['template_path'] = 'exclusion_constraint/sql/#{0}#'.format(
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
        raise Exception(rset)

    schema = ''
    table = ''
    if 'rows' in rset and len(rset['rows']) > 0:
        schema = rset['rows'][0]['schema']
        table = rset['rows'][0]['table']

    return schema, table


@get_template_path
def get_exclusion_constraints(conn, did, tid, exid=None, template_path=None):
    """
    This function is used to fetch information of the
    exclusion constraint(s) for the given table.
    :param conn: Connection Object
    :param did: Database ID
    :param tid: Table ID
    :param exid: Exclusion Constraint ID
    :param template_path: Template Path
    :return:
    """
    sql = render_template("/".join([template_path, 'properties.sql']),
                          did=did, tid=tid, cid=exid)

    status, result = conn.execute_dict(sql)
    if not status:
        return status, internal_server_error(errormsg=result)

    for ex in result['rows']:
        sql = render_template("/".join([template_path,
                                        'get_constraint_cols.sql']),
                              cid=ex['oid'], colcnt=ex['col_count'])

        status, res = conn.execute_dict(sql)
        if not status:
            return status, internal_server_error(errormsg=res)

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
        if conn.manager.version >= 110000:
            sql = render_template("/".join([template_path,
                                            'get_constraint_include.sql']),
                                  cid=ex['oid'])
            status, res = conn.execute_dict(sql)
            if not status:
                return status, internal_server_error(errormsg=res)

            ex['include'] = [col['colname'] for col in res['rows']]

    return True, result['rows']


@get_template_path
def get_exclusion_constraint_sql(conn, did, tid, data, template_path=None):
    """
    This function will return sql for exclusion constraints.
    :param conn: Connection Object
    :param did: Database ID
    :param tid: Table ID
    :param data: Data
    :param template_path: Template Path
    :return:
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
                        [template_path, 'delete.sql']),
                        data=c, conn=conn).strip("\n")
                )

        if 'changed' in constraint:
            for c in constraint['changed']:
                c['schema'] = data['schema']
                c['table'] = data['name']

                modified_sql, name = get_sql(conn, c, did, tid, c['oid'])
                sql.append(modified_sql.strip('\n'))

        if 'added' in constraint:
            for c in constraint['added']:
                c['schema'] = data['schema']
                c['table'] = data['name']

                add_sql, name = get_sql(conn, c, did, tid)
                sql.append(add_sql.strip("\n"))

    if len(sql) > 0:
        # Join all the sql(s) as single string
        return '\n\n'.join(sql)
    else:
        return None


@get_template_path
def get_sql(conn, data, did, tid, exid=None, template_path=None):
    """
    This function will generate sql from model data.
    :param conn: Connection Object
    :param data: data
    :param did: Database ID
    :param tid: Table id
    :param exid: Exclusion Constraint ID
    :param template_path: Template Path
    :return:
    """
    name = data['name'] if 'name' in data else None
    if exid is not None:
        sql = render_template("/".join([template_path, 'properties.sql']),
                              did=did, tid=tid, cid=exid)
        status, res = conn.execute_dict(sql)
        if not status:
            raise Exception(res)

        if len(res['rows']) == 0:
            raise ObjectGone(
                _('Could not find the exclusion constraint in the table.'))

        old_data = res['rows'][0]
        if 'name' not in data:
            name = data['name'] = old_data['name']

        sql = render_template("/".join([template_path, 'update.sql']),
                              data=data, o_data=old_data)
    else:
        if 'columns' not in data or \
                (isinstance(data['columns'], list) and
                 len(data['columns']) < 1):
            return _('-- definition incomplete'), name

        sql = render_template("/".join([template_path, 'create.sql']),
                              data=data, conn=conn)

    return sql, name


@get_template_path
def get_access_methods(conn, template_path=None):
    """
    This function is used to get the access methods.

    :param conn:
    :param template_path:
    :return:
    """
    res = [{'label': '', 'value': ''}]
    sql = render_template("/".join([template_path, 'get_access_methods.sql']))

    status, rest = conn.execute_2darray(sql)
    if not status:
        return internal_server_error(errormsg=rest)

    for row in rest['rows']:
        res.append(
            {'label': row['amname'], 'value': row['amname']}
        )

    return res


@get_template_path
def get_oper_class(conn, indextype, template_path=None):
    """
    This function is used to get the operator class methods.

    :param conn:
    :param indextype:
    :param template_path:
    :return:
    """
    SQL = render_template("/".join([template_path, 'get_oper_class.sql']),
                          indextype=indextype)

    status, res = conn.execute_2darray(SQL)
    if not status:
        return internal_server_error(errormsg=res)

    result = []
    for row in res['rows']:
        result.append([row['opcname'], row['opcname']])

    return result


@get_template_path
def get_operator(conn, coltype, show_sysobj, template_path=None):
    """
    This function is used to get the operator.

    :param conn:
    :param coltype:
    :param show_sysobj:
    :param template_path:
    :return:
    """
    SQL = render_template("/".join([template_path, 'get_operator.sql']),
                          type=coltype, show_sysobj=show_sysobj)

    status, res = conn.execute_2darray(SQL)
    if not status:
        return internal_server_error(errormsg=res)

    result = []
    for row in res['rows']:
        result.append([row['oprname'], row['oprname']])

    return result
