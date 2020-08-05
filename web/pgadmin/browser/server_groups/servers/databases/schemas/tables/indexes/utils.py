##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

""" Implements Utility class for Indexes. """

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
        if 'template_path' not in kwargs or kwargs['template_path'] is None:
            kwargs['template_path'] = \
                'indexes/sql/#{0}#'.format(conn_obj.manager.version)

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


def _get_column_property_display_data(row, col_str, data):
    """
    This function is used to get the columns data.
    :param row:
    :param col_str:
    :param data:
    :return:
    """
    if row['collnspname']:
        col_str += ' COLLATE ' + row['collnspname']
    if row['opcname']:
        col_str += ' ' + row['opcname']

    # ASC/DESC and NULLS works only with btree indexes
    if 'amname' in data and data['amname'] == 'btree':
        # Append sort order
        col_str += ' ' + row['options'][0]
        # Append nulls value
        col_str += ' ' + row['options'][1]

    return col_str


@get_template_path
def get_column_details(conn, idx, data, mode='properties', template_path=None):
    """
    This functional will fetch list of column for index.

    :param conn: Connection Object
    :param idx: Index ID
    :param data: Data
    :param mode: 'create' or 'properties'
    :param template_path: Optional template path
    :return:
    """

    SQL = render_template(
        "/".join([template_path, 'column_details.sql']), idx=idx
    )
    status, rset = conn.execute_2darray(SQL)
    if not status:
        return internal_server_error(errormsg=rset)

    # 'attdef' comes with quotes from query so we need to strip them
    # 'options' we need true/false to render switch ASC(false)/DESC(true)
    columns = []
    cols = []
    for row in rset['rows']:
        # We need all data as collection for ColumnsModel
        # we will not strip down colname when using in SQL to display
        cols_data = {
            'colname': row['attdef'] if mode == 'create' else
            row['attdef'].strip('"'),
            'collspcname': row['collnspname'],
            'op_class': row['opcname'],
        }

        # ASC/DESC and NULLS works only with btree indexes
        if 'amname' in data and data['amname'] == 'btree':
            cols_data['sort_order'] = False
            if row['options'][0] == 'DESC':
                cols_data['sort_order'] = True

            cols_data['nulls'] = False
            if row['options'][1].split(" ")[1] == 'FIRST':
                cols_data['nulls'] = True

        columns.append(cols_data)

        # We need same data as string to display in properties window
        # If multiple column then separate it by colon
        cols_str = row['attdef']
        cols_str += _get_column_property_display_data(row, cols_str, data)

        cols.append(cols_str)

    # Push as collection
    data['columns'] = columns
    # Push as string
    data['columns_csv'] = ', '.join(cols)

    return data


@get_template_path
def get_include_details(conn, idx, data, template_path=None):
    """
    This functional will fetch list of include details for index
    supported with Postgres 11+

    :param conn: Connection object
    :param idx: Index ID
    :param data: data
    :param template_path: Optional template path
    :return:
    """

    SQL = render_template(
        "/".join([template_path, 'include_details.sql']), idx=idx
    )
    status, rset = conn.execute_2darray(SQL)
    if not status:
        return internal_server_error(errormsg=rset)

    # Push as collection
    data['include'] = [col['colname'] for col in rset['rows']]

    return data


def _get_create_sql(data, template_path, conn, mode, name):
    """
    This function is used to get the sql where index is None
    :param data:
    :param template_path:
    :param conn:
    :param mode:
    :param name:
    :return:
    """
    required_args = {
        'name': 'Name',
        'columns': 'Columns'
    }
    for arg in required_args:
        err = False
        if arg == 'columns' and len(data['columns']) < 1:
            err = True

        if arg not in data:
            err = True
            # Check if we have at least one column
        if err:
            return _('-- definition incomplete'), name

    # If the request for new object which do not have did
    sql = render_template(
        "/".join([template_path, 'create.sql']),
        data=data, conn=conn, mode=mode
    )
    sql += "\n"

    sql += render_template(
        "/".join([template_path, 'alter.sql']),
        data=data, conn=conn
    )
    return sql


@get_template_path
def get_sql(conn, **kwargs):
    """
    This function will generate sql from model data.

    :param conn: Connection Object
    :param kwargs:
    :return:
    """

    data = kwargs.get('data')
    did = kwargs.get('did')
    tid = kwargs.get('tid')
    idx = kwargs.get('idx')
    datlastsysoid = kwargs.get('datlastsysoid')
    mode = kwargs.get('mode', None)
    template_path = kwargs.get('template_path', None)

    name = data['name'] if 'name' in data else None
    if idx is not None:
        sql = render_template("/".join([template_path, 'properties.sql']),
                              did=did, tid=tid, idx=idx,
                              datlastsysoid=datlastsysoid)

        status, res = conn.execute_dict(sql)
        if not status:
            return internal_server_error(errormsg=res)

        if len(res['rows']) == 0:
            raise ObjectGone(_('Could not find the index in the table.'))

        old_data = dict(res['rows'][0])
        # Remove opening and closing bracket as we already have in jinja
        # template.
        if 'using' in old_data and old_data['using'] is not None and \
            old_data['using'].startswith('(') and \
                old_data['using'].endswith(')'):
            old_data['using'] = old_data['using'][1:-1]
        if 'withcheck' in old_data and old_data['withcheck'] is not None and \
            old_data['withcheck'].startswith('(') and \
                old_data['withcheck'].endswith(')'):
            old_data['withcheck'] = old_data['withcheck'][1:-1]

        # If name is not present in data then
        # we will fetch it from old data, we also need schema & table name
        if 'name' not in data:
            name = data['name'] = old_data['name']

        sql = render_template(
            "/".join([template_path, 'update.sql']),
            data=data, o_data=old_data, conn=conn
        )
    else:
        sql = _get_create_sql(data, template_path, conn, mode, name)

    return sql, name


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
    did = kwargs.get('did')
    tid = kwargs.get('tid')
    idx = kwargs.get('idx')
    datlastsysoid = kwargs.get('datlastsysoid')
    template_path = kwargs.get('template_path', None)
    with_header = kwargs.get('with_header', True)

    SQL = render_template("/".join([template_path, 'properties.sql']),
                          did=did, tid=tid, idx=idx,
                          datlastsysoid=datlastsysoid)

    status, res = conn.execute_dict(SQL)
    if not status:
        raise ExecuteError(res)

    if len(res['rows']) == 0:
        raise ObjectGone(_('Could not find the index in the table.'))

    data = dict(res['rows'][0])
    # Adding parent into data dict, will be using it while creating sql
    data['schema'] = schema
    data['table'] = table

    # Add column details for current index
    data = get_column_details(conn, idx, data, 'create')

    # Add Include details of the index
    if conn.manager.version >= 110000:
        data = get_include_details(conn, idx, data)

    SQL, name = get_sql(conn, data=data, did=did, tid=tid, idx=None,
                        datlastsysoid=datlastsysoid)

    if with_header:
        sql_header = u"-- Index: {0}\n\n-- ".format(data['name'])

        sql_header += render_template("/".join([template_path, 'delete.sql']),
                                      data=data, conn=conn)

        SQL = sql_header + '\n\n' + SQL

    return SQL
