##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

""" Implements Utility class for Compound Triggers. """

from flask import render_template
from flask_babel import gettext as _
from pgadmin.utils.ajax import internal_server_error
from pgadmin.utils.exception import ExecuteError
from pgadmin.browser.server_groups.servers.databases.schemas.utils \
    import DataTypeReader
from pgadmin.browser.server_groups.servers.utils import parse_priv_from_db, \
    parse_priv_to_db
from pgadmin.browser.server_groups.servers.databases.utils \
    import make_object_name
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
            kwargs['template_path'] = 'columns/sql/#{0}#'.format(
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
        raise ExecuteError(rset)

    schema = ''
    table = ''
    if 'rows' in rset and len(rset['rows']) > 0:
        schema = rset['rows'][0]['schema']
        table = rset['rows'][0]['table']

    return schema, table


def _check_primary_column(data):
    """
    To check if column is primary key
    :param data: Data.
    """
    if 'attnum' in data and 'indkey' in data:
        # Current column
        attnum = str(data['attnum'])

        # Single/List of primary key column(s)
        indkey = str(data['indkey'])

        # We will check if column is in primary column(s)
        if attnum in indkey.split(" "):
            data['is_pk'] = True
            data['is_primary_key'] = True
        else:
            data['is_pk'] = False
            data['is_primary_key'] = False


def _fetch_inherited_tables(tid, data, fetch_inherited_tables, template_path,
                            conn):
    """
    This function will check for fetch inherited tables, and return inherited
    tables.
    :param tid: Table Id.
    :param data: Data.
    :param fetch_inherited_tables: flag to fetch inherited tables.
    :param template_path: Template path.
    :param conn: Connection.
    """
    if fetch_inherited_tables:
        SQL = render_template("/".join(
            [template_path, 'get_inherited_tables.sql']), tid=tid)
        status, inh_res = conn.execute_dict(SQL)
        if not status:
            return True, internal_server_error(errormsg=inh_res)
        for row in inh_res['rows']:
            if row['attrname'] == data['name']:
                data['is_inherited'] = True
                data['tbls_inherited'] = row['inhrelname']
    return False, ''


@get_template_path
def column_formatter(conn, tid, clid, data, edit_types_list=None,
                     fetch_inherited_tables=True, template_path=None):
    """
    This function will return formatted output of query result
    as per client model format for column node
    :param conn: Connection Object
    :param tid: Table ID
    :param clid: Column ID
    :param data: Data
    :param edit_types_list:
    :param fetch_inherited_tables:
    :param template_path: Optional template path
    :return:
    """

    # To check if column is primary key
    _check_primary_column(data)

    # Fetch length and precision
    data = fetch_length_precision(data)

    # We need to fetch inherited tables for each table
    is_error, errmsg = _fetch_inherited_tables(
        tid, data, fetch_inherited_tables, template_path, conn)

    if is_error:
        return errmsg

    # We need to format variables according to client js collection
    if 'attoptions' in data and data['attoptions'] is not None:
        data['attoptions'] = parse_column_variables(data['attoptions'])

    # Need to format security labels according to client js collection
    if 'seclabels' in data and data['seclabels'] is not None:
        seclabels = []
        for seclbls in data['seclabels']:
            k, v = seclbls.split('=')
            seclabels.append({'provider': k, 'label': v})

        data['seclabels'] = seclabels

    # Get formatted Column Options
    if 'attfdwoptions' in data and data['attfdwoptions'] != '':
        data['coloptions'] = parse_options_for_column(data['attfdwoptions'])

    # We need to parse & convert ACL coming from database to json format
    SQL = render_template("/".join([template_path, 'acl.sql']),
                          tid=tid, clid=clid)
    status, acl = conn.execute_dict(SQL)

    if not status:
        return internal_server_error(errormsg=acl)

    # We will set get privileges from acl sql so we don't need
    # it from properties sql
    data['attacl'] = []

    for row in acl['rows']:
        priv = parse_priv_from_db(row)
        data.setdefault(row['deftype'], []).append(priv)

    # we are receiving request when in edit mode
    # we will send filtered types related to current type
    type_id = data['atttypid']

    if edit_types_list is None:
        edit_types_list = []
        SQL = render_template("/".join([template_path,
                                        'edit_mode_types.sql']),
                              type_id=type_id)
        status, rset = conn.execute_2darray(SQL)
        edit_types_list = [row['typname'] for row in rset['rows']]

    # We will need present type in edit mode
    edit_types_list.append(data['typname'])
    data['edit_types'] = sorted(edit_types_list)
    data['cltype'] = DataTypeReader.parse_type_name(data['cltype'])
    return data


def parse_options_for_column(db_variables):
    """
        Function to format the output for variables.

        Args:
            db_variables: Variable object

                Expected Object Format:
                    ['option1=value1', ..]
                where:
                    user_name and database are optional
        Returns:
            Variable Object in below format:
                {
                'variables': [
                    {'name': 'var_name', 'value': 'var_value',
                    'user_name': 'user_name', 'database': 'database_name'},
                    ...]
                }
                where:
                    user_name and database are optional
        """
    variables_lst = []

    if db_variables is not None:
        for row in db_variables:
            # The value may contain equals in string, split on
            # first equals only
            var_name, var_value = row.split("=", 1)
            var_dict = {'option': var_name, 'value': var_value}
            variables_lst.append(var_dict)
    return variables_lst


@get_template_path
def get_formatted_columns(conn, tid, data, other_columns,
                          table_or_type, template_path=None,
                          with_serial=False):
    """
    This function will iterate and return formatted data for all
    the columns.
    :param conn: Connection Object
    :param tid: Table ID
    :param data: Data
    :param other_columns:
    :param table_or_type:
    :param template_path: Optional template path
    :return:
    """
    SQL = render_template("/".join([template_path, 'properties.sql']),
                          tid=tid, show_sys_objects=False)

    status, res = conn.execute_dict(SQL)
    if not status:
        raise ExecuteError(res)

    all_columns = res['rows']
    edit_types = {}
    # Add inherited from details from other columns - type, table
    for col in all_columns:
        edit_types[col['atttypid']] = []
        for other_col in other_columns:
            if col['name'] == other_col['name']:
                col['inheritedfrom' + table_or_type] = \
                    other_col['inheritedfrom']

        if with_serial:
            # Here we assume if a column is serial
            serial_seq_name = make_object_name(
                data['name'], col['name'], 'seq')
            # replace the escaped quotes for comparison
            defval = (col.get('defval', '') or '').replace("''", "'").\
                replace('""', '"')

            if serial_seq_name in defval and defval.startswith("nextval('")\
                    and col['typname'] in ('integer', 'smallint', 'bigint'):

                serial_type = {
                    'integer': 'serial',
                    'smallint': 'smallserial',
                    'bigint': 'bigserial'
                }[col['typname']]

                col['displaytypname'] = serial_type
                col['cltype'] = serial_type
                col['typname'] = serial_type
                col['defval'] = ''

    data['columns'] = all_columns

    if 'columns' in data and len(data['columns']) > 0:
        SQL = render_template("/".join([template_path,
                                        'edit_mode_types_multi.sql']),
                              type_ids=",".join(map(lambda x: str(x),
                                                    edit_types.keys())))
        status, res = conn.execute_2darray(SQL)
        for row in res['rows']:
            edit_types[row['main_oid']] = sorted(row['edit_types'])

        for column in data['columns']:
            column_formatter(conn, tid, column['attnum'], column,
                             edit_types[column['atttypid']], False)

    return data


def _parse_column_actions(final_columns, column_acl):
    """
    Check action and access for it.
    :param final_columns: final column list
    :param column_acl: Column access.
    """
    for c in final_columns:
        if 'attacl' in c:
            if 'added' in c['attacl']:
                c['attacl']['added'] = parse_priv_to_db(
                    c['attacl']['added'], column_acl
                )
            elif 'changed' in c['attacl']:
                c['attacl']['changed'] = parse_priv_to_db(
                    c['attacl']['changed'], column_acl
                )
            elif 'deleted' in c['attacl']:
                c['attacl']['deleted'] = parse_priv_to_db(
                    c['attacl']['deleted'], column_acl
                )
        if 'cltype' in c:
            # check type for '[]' in it
            c['cltype'], c['hasSqrBracket'] = \
                type_formatter(c['cltype'])

        c = convert_length_precision_to_string(c)


def _parse_format_col_for_edit(data, columns, column_acl):
    """
    This function parser columns for edit mode.
    :param data: Data from req.
    :param columns: Columns list from data
    :param column_acl: Column access.
    """
    for action in ['added', 'changed']:
        if action in columns:
            final_columns = []
            for c in columns[action]:
                if c.get('inheritedfrom', None) is None:
                    final_columns.append(c)

            _parse_column_actions(final_columns, column_acl)

            data['columns'][action] = final_columns


def parse_format_columns(data, mode=None):
    """
    This function will parse and return formatted list of columns
    added by user.

    :param data:
    :param mode:
    :return:
    """
    column_acl = ['a', 'r', 'w', 'x']
    columns = data['columns']
    # 'EDIT' mode
    if mode is not None:
        _parse_format_col_for_edit(data, columns, column_acl)
    else:
        # We need to exclude all the columns which are inherited from other
        # tables 'CREATE' mode
        final_columns = []

        for c in columns:
            if c.get('inheritedfrom', None) is None:
                final_columns.append(c)

        # Now we have all lis of columns which we need
        # to include in our create definition, Let's format them
        for c in final_columns:
            if 'attacl' in c:
                c['attacl'] = parse_priv_to_db(
                    c['attacl'], column_acl
                )

            if 'cltype' in c:
                # check type for '[]' in it
                c['cltype'], c['hasSqrBracket'] = type_formatter(c['cltype'])

            c = convert_length_precision_to_string(c)

        data['columns'] = final_columns

    return data


def convert_length_precision_to_string(data):
    """
    This function is used to convert length & precision to string
    to handle case like when user gives 0 as length.

    :param data:
    :return:
    """

    if 'attlen' in data and data['attlen'] == '':
        data['attlen'] = None
    elif 'attlen' in data and data['attlen'] is not None:
        data['attlen'] = str(data['attlen'])

    if 'attprecision' in data and data['attprecision'] == '':
        data['attprecision'] = None
    elif 'attprecision' in data and data['attprecision'] is not None:
        data['attprecision'] = str(data['attprecision'])

    return data


def type_formatter(data_type):
    """
    We need to remove [] from type and append it
    after length/precision so we will set flag for
    sql template.

    :param data_type:
    :param template_path: Optional template path
    :return:
    """

    if '[]' in data_type:
        return data_type[:-2], True
    else:
        return data_type, False


def fetch_length_precision(data):
    """
    This function is used to fetch the length and precision.

    :param data:
    :return:
    """
    # Find length & precision of column data type
    fulltype = DataTypeReader.get_full_type(
        data['typnspname'], data['typname'],
        data['isdup'], data['attndims'], data['atttypmod'])

    length = False
    precision = False
    if 'elemoid' in data:
        length, precision, _ = \
            DataTypeReader.get_length_precision(data['elemoid'])

    # Set length and precision to None
    data['attlen'] = None
    data['attprecision'] = None

    import re

    # If we have length & precision both
    if length and precision:
        match_obj = re.search(r'(\d+),(\d+)', fulltype)
        if match_obj:
            data['attlen'] = match_obj.group(1)
            data['attprecision'] = match_obj.group(2)
    elif length:
        # If we have length only
        match_obj = re.search(r'(\d+)', fulltype)
        if match_obj:
            data['attlen'] = match_obj.group(1)
            data['attprecision'] = None

    return data


def parse_column_variables(col_variables):
    # We need to format variables according to client js collection
    spcoptions = []
    if col_variables is not None:
        for spcoption in col_variables:
            k, v = spcoption.split('=')
            spcoptions.append({'name': k, 'value': v})
    return spcoptions
