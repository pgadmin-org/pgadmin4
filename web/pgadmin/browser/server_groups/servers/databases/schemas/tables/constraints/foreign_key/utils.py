##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

""" Implements Utility class for Foreign Keys. """

from flask import render_template
from flask_babel import gettext as _
from pgadmin.utils.ajax import internal_server_error
from pgadmin.utils.exception import ObjectGone, ExecuteError
from functools import wraps

FKEY_PROPERTIES_SQL = 'properties.sql'


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
            kwargs['template_path'] = 'foreign_key/sql/#{0}#'.format(
                conn_obj.manager.version)

        return f(*args, **kwargs)
    return wrap


@get_template_path
def get_foreign_keys(conn, tid, fkid=None, template_path=None):
    """
    This function is used to fetch information of the
    foreign key(s) for the given table.
    :param conn: Connection Object
    :param tid: Table ID
    :param fkid: Foreign Key ID
    :param template_path: Template Path
    :return:
    """

    sql = render_template("/".join(
        [template_path, FKEY_PROPERTIES_SQL]), tid=tid, cid=fkid)

    status, result = conn.execute_dict(sql)
    if not status:
        return status, internal_server_error(errormsg=result)

    for fk in result['rows']:
        sql = render_template("/".join([template_path,
                                        'get_constraint_cols.sql']),
                              tid=tid,
                              keys=zip(fk['confkey'], fk['conkey']),
                              confrelid=fk['confrelid'])

        status, res = conn.execute_dict(sql)
        if not status:
            return status, internal_server_error(errormsg=res)

        columns = []
        cols = []
        for row in res['rows']:
            columns.append({"local_column": row['conattname'],
                            "references": fk['confrelid'],
                            "referenced": row['confattname'],
                            "references_table_name":
                                fk['refnsp'] + '.' + fk['reftab']})
            cols.append(row['conattname'])

        fk['columns'] = columns

        if not fkid:
            schema, table = get_parent(conn, fk['columns'][0]['references'])
            fk['remote_schema'] = schema
            fk['remote_table'] = table

        coveringindex = search_coveringindex(conn, tid, cols)
        fk['coveringindex'] = coveringindex
        if coveringindex:
            fk['autoindex'] = False
            fk['hasindex'] = True
        else:
            fk['autoindex'] = True
            fk['hasindex'] = False

    return True, result['rows']


@get_template_path
def search_coveringindex(conn, tid, cols, template_path=None):
    """
    This function is used to search the covering index
    :param conn: Connection Object
    :param tid: Table id
    :param cols: Columns
    :param template_path: Template Path
    :return:
    """

    cols = set(cols)
    SQL = render_template("/".join([template_path,
                                    'get_constraints.sql']),
                          tid=tid)
    status, constraints = conn.execute_dict(SQL)
    if not status:
        raise ExecuteError(constraints)

    for constraint in constraints['rows']:
        sql = render_template(
            "/".join([template_path, 'get_cols.sql']),
            cid=constraint['oid'],
            colcnt=constraint['col_count'])
        status, rest = conn.execute_dict(sql)

        if not status:
            raise ExecuteError(rest)

        index_cols = set()
        for r in rest['rows']:
            index_cols.add(r['column'].strip('"'))

        if len(cols - index_cols) == len(index_cols - cols) == 0:
            return constraint["idxname"]

    return None


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


def _get_sql_for_delete_fk_constraint(data, constraint, sql, template_path,
                                      conn):
    """
    Get sql for delete foreign key constraints.
    :param data:
    :param constraint:
    :param sql: sql for append
    :param template_path: template path for sql.
    :param conn:
    :return:
    """
    if 'deleted' in constraint:
        for c in constraint['deleted']:
            c['schema'] = data['schema']
            c['table'] = data['name']

            # Sql for drop
            sql.append(
                render_template("/".join(
                    [template_path,
                     'delete.sql']),
                    data=c, conn=conn).strip('\n')
            )


@get_template_path
def get_foreign_key_sql(conn, tid, data, template_path=None):
    """
    This function will return sql for foreign keys.
    :param conn: Connection Object
    :param tid: Table ID
    :param data: Data
    :param template_path: Template Path
    :return:
    """

    sql = []
    # Check if constraint is in data
    # If yes then we need to check for add/change/delete
    if 'foreign_key' in data:
        constraint = data['foreign_key']
        # If constraint(s) is/are deleted
        _get_sql_for_delete_fk_constraint(data, constraint, sql, template_path,
                                          conn)

        if 'changed' in constraint:
            for c in constraint['changed']:
                c['schema'] = data['schema']
                c['table'] = data['name']

                modified_sql, name = get_sql(conn, c, tid, c['oid'])
                sql.append(modified_sql.strip("\n"))

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
def get_sql(conn, data, tid, fkid=None, template_path=None):
    """
    This function will generate sql from model data.
    :param conn: Connection Object
    :param data: data
    :param tid: Table id
    :param fkid: Foreign Key
    :param template_path: Template Path
    :return:
    """
    if fkid is not None:
        old_data, name = _get_properties_for_fk_const(tid, fkid, data,
                                                      template_path, conn)

        sql = render_template("/".join([template_path, 'update.sql']),
                              data=data, o_data=old_data, conn=conn)

        if 'autoindex' in data and data['autoindex'] and \
                ('coveringindex' in data and data['coveringindex'] != ''):
            col_sql = render_template(
                "/".join([template_path, 'get_constraint_cols.sql']),
                tid=tid,
                keys=zip(old_data['confkey'], old_data['conkey']),
                confrelid=old_data['confrelid']
            )

            status, res = conn.execute_dict(col_sql)
            if not status:
                raise ExecuteError(res)

            columns = []
            for row in res['rows']:
                columns.append({"local_column": row['conattname'],
                                "references": old_data['confrelid'],
                                "referenced": row['confattname']})

            data['columns'] = columns

            sql += render_template(
                "/".join([template_path, 'create_index.sql']),
                data=data, conn=conn)
    else:
        is_error, errmsg, name, sql = _get_sql_for_create_fk_const(
            data, conn, template_path)
        if is_error:
            return _(errmsg), name

    return sql, name


def _get_properties_for_fk_const(tid, fkid, data, template_path, conn):
    """
    Get property data for fk constraint.
    tid: table Id
    fkid: Foreign key constraint ID.
    data: Data.
    template_path: template path for get sql.
    conn: Connection.
    """
    name = data['name'] if 'name' in data else None
    sql = render_template("/".join([template_path, FKEY_PROPERTIES_SQL]),
                          tid=tid, cid=fkid)
    status, res = conn.execute_dict(sql)
    if not status:
        raise ExecuteError(res)

    if len(res['rows']) == 0:
        raise ObjectGone(
            _('Could not find the foreign key constraint in the table.'))

    old_data = res['rows'][0]
    if 'name' not in data:
        name = data['name'] = old_data['name']

    return old_data, name


def _get_sql_for_create_fk_const(data, conn, template_path):
    """
    Get SQL for create new foreign key constrains.
    data: Data.
    conn: Connection
    template_path: template path for get template.
    """
    name = data['name'] if 'name' in data else None
    if 'columns' not in data or \
        (isinstance(data['columns'], list) and
         len(data['columns']) < 1):
        return True, '-- definition incomplete', name, ''

    if data.get('autoindex', False) and \
            ('coveringindex' not in data or data['coveringindex'] == ''):
        return True, '-- definition incomplete', name, ''

    if 'references' in data['columns'][0]:
        # Get the parent schema and table.
        schema, table = get_parent(conn,
                                   data['columns'][0]['references'])

        # Below handling will be used in Schema diff in case
        # of different database comparison
        _checks_for_schema_diff(table, schema, data)

    sql = render_template("/".join([template_path, 'create.sql']),
                          data=data, conn=conn)

    if data.get('autoindex', False):
        sql += render_template(
            "/".join([template_path, 'create_index.sql']),
            data=data, conn=conn)

    return False, '', '', sql


def _checks_for_schema_diff(table, schema, data):
    """
    Check for schema diff in case of different database comparisons.
    table: table data
    schema: schema data
    data:Data
    """
    if schema and table:
        data['remote_schema'] = schema
        data['remote_table'] = table

    if 'remote_schema' not in data:
        data['remote_schema'] = None
        if 'schema' in data and (schema is None or schema == ''):
            data['remote_schema'] = data['schema']

    if 'remote_table' not in data:
        data['remote_table'] = None


@get_template_path
def get_fkey_dependencies(conn, tid, template_path=None):
    """
    This function is used to get the references table of all the foreign
    keys of the given table.

    :param conn:
    :param tid:
    :param template_path:
    :return:
    """
    deps = []
    sql = render_template("/".join(
        [template_path, FKEY_PROPERTIES_SQL]), tid=tid)

    status, result = conn.execute_dict(sql)
    if not status:
        return status, internal_server_error(errormsg=result)

    for fk in result['rows']:
        ref_name = fk['refnsp'] + '.' + fk['reftab']
        deps.append({'type': 'table', 'name': ref_name})

    return True, deps
