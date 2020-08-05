##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

""" Implements Utility class for Compound Triggers. """

from flask import render_template
from flask_babelex import gettext as _
from pgadmin.utils.ajax import internal_server_error
from pgadmin.utils.exception import ObjectGone, ExecuteError
from pgadmin.browser.server_groups.servers.databases.schemas.utils \
    import trigger_definition
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
            kwargs['template_path'] = 'compound_triggers/sql/{0}/#{1}#'.format(
                conn_obj.manager.server_type, conn_obj.manager.version)

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
        raise ExecuteError(rset)

    schema = ''
    table = ''
    if 'rows' in rset and len(rset['rows']) > 0:
        schema = rset['rows'][0]['schema']
        table = rset['rows'][0]['table']

    return schema, table


@get_template_path
def get_column_details(conn, tid, clist, template_path=None):
    """
    This functional will fetch list of column for trigger.
    :param conn:
    :param tid:
    :param clist:
    :param template_path:
    :return:
    """

    SQL = render_template("/".join([template_path,
                                    'get_columns.sql']),
                          tid=tid, clist=clist)
    status, rset = conn.execute_2darray(SQL)
    if not status:
        return internal_server_error(errormsg=rset)
    columns = []
    for row in rset['rows']:
        columns.append(row['name'])

    return columns


@get_template_path
def get_sql(conn, data, tid, trid, datlastsysoid, template_path=None):
    """
    This function will generate sql from model data
    :param conn: Connection Object
    :param data: Data
    :param tid: Table ID
    :param trid: Trigger ID
    :param datlastsysoid:
    :param template_path: Optional template path
    :return:
    """
    name = data['name'] if 'name' in data else None
    if trid is not None:
        sql = render_template("/".join([template_path, 'properties.sql']),
                              tid=tid, trid=trid,
                              datlastsysoid=datlastsysoid)

        status, res = conn.execute_dict(sql)
        if not status:
            raise ExecuteError(res)
        elif len(res['rows']) == 0:
            raise ObjectGone(
                _('Could not find the compound trigger in the table.'))

        old_data = dict(res['rows'][0])
        # If name is not present in data then
        # we will fetch it from old data, we also need schema & table name
        if 'name' not in data:
            name = data['name'] = old_data['name']

        if len(old_data['tgattr']) > 1:
            columns = ', '.join(old_data['tgattr'].split(' '))
            old_data['columns'] = get_column_details(conn, tid, columns)

        old_data = trigger_definition(old_data)

        SQL = render_template(
            "/".join([template_path, 'update.sql']),
            data=data, o_data=old_data, conn=conn
        )
    else:
        required_args = {
            'name': 'Name'
        }

        for arg in required_args:
            if arg not in data:
                return _('-- definition incomplete')

        # If the request for new object which do not have did
        SQL = render_template("/".join([template_path, 'create.sql']),
                              data=data, conn=conn)
    return SQL, name


@get_template_path
def get_reverse_engineered_sql(conn, **kwargs):
    """
    This function will return reverse engineered sql for trigger(s).
    :param conn: Connection Object
    :param kwargs
    :return:
    """
    schema = kwargs.get('schema')
    table = kwargs.get('table')
    tid = kwargs.get('tid')
    trid = kwargs.get('trid')
    datlastsysoid = kwargs.get('datlastsysoid')
    template_path = kwargs.get('template_path', None)

    SQL = render_template("/".join([template_path, 'properties.sql']),
                          tid=tid, trid=trid,
                          datlastsysoid=datlastsysoid)

    status, res = conn.execute_dict(SQL)
    if not status:
        raise ExecuteError(res)

    if len(res['rows']) == 0:
        raise ObjectGone(
            _('Could not find the compound trigger in the table.'))

    data = dict(res['rows'][0])
    # Adding parent into data dict, will be using it while creating sql
    data['schema'] = schema
    data['table'] = table

    if len(data['tgattr']) >= 1:
        columns = ', '.join(data['tgattr'].split(' '))
        data['columns'] = get_column_details(conn, tid, columns)

    data = trigger_definition(data)

    SQL, name = get_sql(conn, data, tid, None, datlastsysoid)

    sql_header = u"-- Compound Trigger: {0}\n\n-- ".format(data['name'])

    sql_header += render_template("/".join([template_path, 'delete.sql']),
                                  data=data, conn=conn)

    SQL = sql_header + '\n\n' + SQL.strip('\n')

    # If trigger is disabled then add sql code for the same
    if data['is_enable_trigger'] != 'O':
        SQL += '\n\n'
        SQL += render_template("/".join([template_path,
                                         'enable_disable_trigger.sql']),
                               data=data, conn=conn)
    return SQL
