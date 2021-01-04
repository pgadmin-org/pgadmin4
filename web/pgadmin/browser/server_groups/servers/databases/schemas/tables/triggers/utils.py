##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

""" Implements Utility class for Triggers. """

from flask import render_template
from flask_babelex import gettext as _
from pgadmin.utils.ajax import internal_server_error
from pgadmin.utils.exception import ObjectGone, ExecuteError
from pgadmin.browser.server_groups.servers.databases.schemas.utils \
    import trigger_definition
from config import PG_DEFAULT_DRIVER
from pgadmin.utils.driver import get_driver
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
            kwargs['template_path'] = 'triggers/sql/{0}/#{1}#'.format(
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
def get_trigger_function_and_columns(conn, data, tid,
                                     show_system_objects, template_path=None):
    """
    This function will return trigger function with schema name.
    :param conn: Connection Object
    :param data: Data
    :param tid: Table ID
    :param show_system_objects: show system object
    :param template_path: Optional Template Path
    :return:
    """
    # If language is 'edbspl' then trigger function should be
    # 'Inline EDB-SPL' else we will find the trigger function
    # with schema name.
    if data['lanname'] == 'edbspl':
        data['tfunction'] = 'Inline EDB-SPL'
        data['tgargs'] = None
    else:
        SQL = render_template("/".join(
            [template_path, 'get_triggerfunctions.sql']),
            tgfoid=data['tgfoid'],
            show_system_objects=show_system_objects
        )

        status, result = conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=result)

        # Update the trigger function which we have fetched with
        # schema name
        if 'rows' in result and len(result['rows']) > 0 and \
                'tfunctions' in result['rows'][0]:
            data['tfunction'] = result['rows'][0]['tfunctions']

        if len(data['custom_tgargs']) > 0:
            driver = get_driver(PG_DEFAULT_DRIVER)
            # We know that trigger has more than 1 argument, let's join them
            # and convert it to string
            formatted_args = [driver.qtLiteral(arg)
                              for arg in data['custom_tgargs']]
            formatted_args = ', '.join(formatted_args)

            data['tgargs'] = formatted_args
        else:
            data['tgargs'] = None

        if len(data['tgattr']) >= 1:
            columns = ', '.join(data['tgattr'].split(' '))
            data['columns'] = get_column_details(conn, tid, columns)

    return data


@get_template_path
def get_sql(conn, **kwargs):
    """
    This function will generate sql from model data.

    :param conn: Connection Object
    :param kwargs
    :return:
    """
    data = kwargs.get('data')
    tid = kwargs.get('tid')
    trid = kwargs.get('trid')
    datlastsysoid = kwargs.get('datlastsysoid')
    show_system_objects = kwargs.get('show_system_objects')
    is_schema_diff = kwargs.get('is_schema_diff', False)
    template_path = kwargs.get('template_path', None)

    name = data['name'] if 'name' in data else None
    if trid is not None:
        sql = render_template("/".join([template_path, 'properties.sql']),
                              tid=tid, trid=trid,
                              datlastsysoid=datlastsysoid)

        status, res = conn.execute_dict(sql)
        if not status:
            raise ExecuteError(res)
        elif len(res['rows']) == 0:
            raise ObjectGone(_('Could not find the trigger in the table.'))

        old_data = dict(res['rows'][0])
        # If name is not present in data then
        # we will fetch it from old data, we also need schema & table name
        if 'name' not in data:
            name = data['name'] = old_data['name']

        drop_sql = _check_schema_diff_sql(is_schema_diff, data, old_data,
                                          template_path, conn)

        old_data = get_trigger_function_and_columns(
            conn, old_data, tid, show_system_objects)

        old_data = trigger_definition(old_data)

        sql = render_template(
            "/".join([template_path, 'update.sql']),
            data=data, o_data=old_data, conn=conn
        )

        if is_schema_diff:
            sql = drop_sql + '\n' + sql
    else:
        required_args = {
            'name': 'Name',
            'tfunction': 'Trigger function'
        }

        for arg in required_args:
            if arg not in data:
                return _('-- definition incomplete')

        # If the request for new object which do not have did
        sql = render_template("/".join([template_path, 'create.sql']),
                              data=data, conn=conn)
    return sql, name


def _check_schema_diff_sql(is_schema_diff, data, old_data, template_path,
                           conn):
    """
    Check for schema diff and perform required actions.
    is_schema_diff: flag for check req for schema diff.
    data: Data.
    old_data: properties sql data.
    template_path: template path for get correct template location.
    conn: Connection.
    return: return deleted sql statement if any.
    """
    drop_sql = ''
    if is_schema_diff:
        if 'table' not in data:
            data['table'] = old_data['relname']
        if 'schema' not in data:
            data['schema'] = old_data['nspname']

        # If any of the below key is present in data then we need to drop
        # trigger and re-create it.
        key_array = ['prosrc', 'is_row_trigger', 'evnt_insert',
                     'evnt_delete', 'evnt_update', 'fires', 'tgdeferrable',
                     'whenclause', 'tfunction', 'tgargs', 'columns',
                     'is_constraint_trigger', 'tginitdeferred']

        is_drop_trigger = False
        for key in key_array:
            if key in data:
                is_drop_trigger = True
                break

        if is_drop_trigger:
            tmp_data = dict()
            tmp_data['name'] = data['name']
            tmp_data['nspname'] = old_data['nspname']
            tmp_data['relname'] = old_data['relname']
            drop_sql = render_template("/".join([template_path,
                                                 'delete.sql']),
                                       data=tmp_data, conn=conn)
    return drop_sql


@get_template_path
def get_reverse_engineered_sql(conn, **kwargs):
    """
    This function will return reverse engineered sql for specified trigger.

    :param conn: Connection Object
    :param kwargs:
    :return:
    """
    schema = kwargs.get('schema')
    table = kwargs.get('table')
    tid = kwargs.get('tid')
    trid = kwargs.get('trid')
    datlastsysoid = kwargs.get('datlastsysoid')
    show_system_objects = kwargs.get('show_system_objects')
    template_path = kwargs.get('template_path', None)
    with_header = kwargs.get('with_header', True)

    SQL = render_template("/".join([template_path, 'properties.sql']),
                          tid=tid, trid=trid,
                          datlastsysoid=datlastsysoid)

    status, res = conn.execute_dict(SQL)
    if not status:
        raise ExecuteError(res)

    if len(res['rows']) == 0:
        raise ObjectGone(_('Could not find the trigger in the table.'))

    data = dict(res['rows'][0])

    # Adding parent into data dict, will be using it while creating sql
    data['schema'] = schema
    data['table'] = table

    data = \
        get_trigger_function_and_columns(conn, data, tid, show_system_objects)

    data = trigger_definition(data)

    SQL, name = get_sql(conn, data=data, tid=tid, trid=None,
                        datlastsysoid=datlastsysoid,
                        show_system_objects=show_system_objects)

    if with_header:
        sql_header = "-- Trigger: {0}\n\n-- ".format(data['name'])

        sql_header += render_template("/".join([template_path, 'delete.sql']),
                                      data=data, conn=conn)

        SQL = sql_header + '\n\n' + SQL.strip('\n')
    else:
        SQL = SQL.strip('\n')

    # If trigger is disabled then add sql code for the same
    if data['is_enable_trigger'] != 'O':
        SQL += '\n\n'
        SQL += render_template("/".join([template_path,
                                         'enable_disable_trigger.sql']),
                               data=data, conn=conn)
    return SQL
