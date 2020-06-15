##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

""" Implements Utility class for row level security. """

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
        if 'template_path' not in kwargs or kwargs['template_path'] is None:
            kwargs['template_path'] = 'row_security_policies/sql/#{0}#'.format(
                conn_obj.manager.version)

        return f(*args, **kwargs)

    return wrap


@get_template_path
def get_parent(conn, tid, template_path=None):
    """
    This function will return the parent of the given table.
    :param conn: Connection Object
    :param tid: Table oid
    :param template_path: Optional template path
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
def get_sql(conn, data, did, tid, plid, datlastsysoid, schema, table,
            mode=None, template_path=None):
    """
    This function will generate sql from model data
    """

    if plid is not None:
        sql = render_template("/".join(
            [template_path, 'properties.sql']), plid=plid)
        status, res = conn.execute_dict(sql)
        if not status:
            return internal_server_error(errormsg=res)
        if len(res['rows']) == 0:
            raise ObjectGone(_('Could not find the index in the table.'))
        res_data = dict(res['rows'][0])

        res = res_data

        old_data = res
        old_data['schema'] = schema
        old_data['table'] = table
        sql = render_template(
            "/".join([template_path, 'update.sql']),
            data=data, o_data=old_data
        )
    else:
        data['schema'] = schema
        data['table'] = table
        sql = render_template("/".join(
            [template_path, 'create.sql']), data=data)
    return sql, data['name'] if 'name' in data else old_data['name']


@get_template_path
def get_reverse_engineered_sql(conn, schema, table, did, tid, plid,
                               datlastsysoid,
                               template_path=None, with_header=True):
    """
    This function will return reverse engineered sql for specified trigger.

    :param conn: Connection Object
    :param schema: Schema
    :param table: Table
    :param did: DB ID
    :param tid: Table ID
    :param plid: Policy ID
    :param datlastsysoid:
    :param template_path: Optional template path
    :param with_header: Optional parameter to decide whether the SQL will be
     returned with header or not
    :return:
    """
    SQL = render_template("/".join(
        [template_path, 'properties.sql']), plid=plid)

    status, res = conn.execute_dict(SQL)
    if not status:
        raise Exception(res)

    if len(res['rows']) == 0:
        raise ObjectGone(_('Could not find the index in the table.'))

    data = dict(res['rows'][0])
    # Adding parent into data dict, will be using it while creating sql
    data['schema'] = schema
    data['table'] = table

    SQL, name = get_sql(conn, data, did, tid, None, datlastsysoid, schema,
                        table)

    if with_header:
        sql_header = u"-- POLICY: {0}\n\n-- ".format(data['name'])

        sql_header += render_template("/".join([template_path,
                                                'delete.sql']),
                                      policy_name=data['name'],
                                      result=data
                                      )

        SQL = sql_header + '\n\n' + SQL

    return SQL
