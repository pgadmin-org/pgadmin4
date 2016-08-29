##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Implements the Foreign Table Module."""

import simplejson as json
import sys
import traceback
from functools import wraps

import pgadmin.browser.server_groups.servers.databases as databases
from flask import render_template, make_response, request, jsonify, \
    current_app
from flask_babel import gettext
from pgadmin.browser.server_groups.servers.databases.schemas.utils import \
    SchemaChildModule, DataTypeReader
from pgadmin.browser.server_groups.servers.databases.utils import \
    parse_sec_labels_from_db
from pgadmin.browser.server_groups.servers.utils import parse_priv_from_db, \
    parse_priv_to_db
from pgadmin.browser.utils import PGChildNodeView
from pgadmin.utils.ajax import make_json_response, internal_server_error, \
    make_response as ajax_response, gone
from pgadmin.utils.driver import get_driver

from config import PG_DEFAULT_DRIVER


class ForeignTableModule(SchemaChildModule):
    """
    class ForeignTableModule(CollectionNodeModule):

        This class represents The Foreign Table Module.

    Methods:
    -------
    * __init__(*args, **kwargs)
      - Initialize the Foreign Table Module.

    * get_nodes(gid, sid, did, scid)
      - Generate the Foreign Table collection node.

    * node_inode():
      - Override this property to make the Foreign Table node as leaf node.

    * script_load()
      - Load the module script for Foreign Table, when schema node is
        initialized.
    """
    NODE_TYPE = 'foreign-table'
    COLLECTION_LABEL = gettext("Foreign Tables")

    def __init__(self, *args, **kwargs):
        super(ForeignTableModule, self).__init__(*args, **kwargs)
        self.min_ver = None
        self.max_ver = None

    def get_nodes(self, gid, sid, did, scid):
        """
        Generate the Foreign Table collection node.
        """
        yield self.generate_browser_collection_node(scid)

    @property
    def node_inode(self):
        """
        Make the node as leaf node.
        """
        return False

    @property
    def script_load(self):
        """
        Load the module script for foreign table, when the
        schema node is initialized.
        """
        return databases.DatabaseModule.NODE_TYPE


blueprint = ForeignTableModule(__name__)


class ForeignTableView(PGChildNodeView, DataTypeReader):
    """
    class ForeignTableView(PGChildNodeView)

    This class inherits PGChildNodeView to get the different routes for
    the module.

    The class is responsible to Create, Read, Update and Delete operations for
    the Foreign Table.

    Methods:
    -------
    * validate_request(f):
      - Works as a decorator.
        Validating request on the request of create, update and modified SQL.

    * module_js():
      - Overrides this property to define javascript for Foreign Table node.

    * check_precondition(f):
      - Works as a decorator.
      - Checks database connection status.
      - Attach connection object and template path.

    * list(gid, sid, did, scid):
      - List the Foreign Table.

    * nodes(gid, sid, did, scid):
      - Returns all the Foreign Table to generate Nodes in the browser.

    * properties(gid, sid, did, scid, foid):
      - Returns the Foreign Table properties.

    * get_collations(gid, sid, did, scid, foid=None):
      - Returns Collations.

    * get_types(gid, sid, did, scid, foid=None):
      - Returns Data Types.

    * get_foreign_servers(gid, sid, did, scid, foid=None):
      - Returns the Foreign Servers.

    * get_tables(gid, sid, did, scid, foid=None):
      - Returns the Foreign Tables as well as Plain Tables.

    * get_columns(gid, sid, did, scid, foid=None):
      - Returns the Table Columns.

    * create(gid, sid, did, scid):
      - Creates a new Foreign Table object.

    * update(gid, sid, did, scid, foid):
      - Updates the Foreign Table object.

    * delete(gid, sid, did, scid, foid):
      - Drops the Foreign Table object.

    * sql(gid, sid, did, scid, foid):
      - Returns the SQL for the Foreign Table object.

    * msql(gid, sid, did, scid, foid=None):
      - Returns the modified SQL.

    * get_sql(gid, sid, data, scid, foid=None):
      - Generates the SQL statements to create/update the Foreign Table object.

    * dependents(gid, sid, did, scid, foid):
      - Returns the dependents for the Foreign Table object.

    * dependencies(gid, sid, did, scid, foid):
      - Returns the dependencies for the Foreign Table object.

    * select_sql(gid, sid, did, scid, foid):
      - Returns sql for Script

    * insert_sql(gid, sid, did, scid, foid):
      - Returns sql for Script

    * update_sql(gid, sid, did, scid, foid):
      - Returns sql for Script

    * delete_sql(gid, sid, did, scid, foid):
      - Returns sql for Script

    """

    node_type = blueprint.node_type

    parent_ids = [
        {'type': 'int', 'id': 'gid'},
        {'type': 'int', 'id': 'sid'},
        {'type': 'int', 'id': 'did'},
        {'type': 'int', 'id': 'scid'}
    ]
    ids = [
        {'type': 'int', 'id': 'foid'}
    ]

    operations = dict({
        'obj': [
            {'get': 'properties', 'delete': 'delete', 'put': 'update'},
            {'get': 'list', 'post': 'create'}
        ],
        'delete': [{'delete': 'delete'}],
        'children': [{'get': 'children'}],
        'nodes': [{'get': 'node'}, {'get': 'nodes'}],
        'sql': [{'get': 'sql'}],
        'msql': [{'get': 'msql'}, {'get': 'msql'}],
        'stats': [{'get': 'statistics'}],
        'dependency': [{'get': 'dependencies'}],
        'dependent': [{'get': 'dependents'}],
        'module.js': [{}, {}, {'get': 'module_js'}],
        'get_collations': [
            {'get': 'get_collations'},
            {'get': 'get_collations'}
        ],
        'get_types': [{'get': 'types'}, {'get': 'types'}],
        'get_foreign_servers': [{'get': 'get_foreign_servers'},
                                {'get': 'get_foreign_servers'}],
        'get_tables': [{'get': 'get_tables'}, {'get': 'get_tables'}],
        'get_columns': [{'get': 'get_columns'}, {'get': 'get_columns'}],
        'select_sql': [{'get': 'select_sql'}],
        'insert_sql': [{'get': 'insert_sql'}],
        'update_sql': [{'get': 'update_sql'}],
        'delete_sql': [{'get': 'delete_sql'}]
    })

    def validate_request(f):
        """
        Works as a decorator.
        Validating request on the request of create, update and modified SQL.

        Required Args:
                    name: Name of the Foreign Table
                    ftsrvname: Foreign Server Name

        Above both the arguments will not be validated in the update action.
        """

        @wraps(f)
        def wrap(self, **kwargs):

            data = {}

            if request.data:
                req = json.loads(request.data, encoding='utf-8')
            else:
                req = request.args or request.form

            if 'foid' not in kwargs:
                required_args = [
                    'name',
                    'ftsrvname'
                ]

                for arg in required_args:
                    if arg not in req or req[arg] == '':
                        return make_json_response(
                            status=410,
                            success=0,
                            errormsg=gettext(
                                "Couldn't find the required parameter \
                                (%s)." % arg
                            )
                        )

            try:
                list_params = []
                if request.method == 'GET':
                    list_params = ['constraints', 'columns', 'ftoptions',
                                   'seclabels', 'inherits', 'acl']
                else:
                    list_params = ['inherits']

                for key in req:
                    if key in list_params and req[key] != '' \
                            and req[key] is not None:
                        # Coverts string into python list as expected.
                        data[key] = [] if \
                            type(req[key]) == list and len(req[key]) == 0 else \
                            json.loads(req[key], encoding='utf-8')

                        if key == 'inherits':
                            # Convert Table ids from unicode/string to int
                            # and make tuple for 'IN' query.
                            inherits = tuple([int(x) for x in data[key]])

                            if len(inherits) == 1:
                                # Python tupple has , after the first param
                                # in case of single parameter.
                                # So, we need to make it tuple explicitly.
                                inherits = "(" + str(inherits[0]) + ")"
                            if inherits:
                                # Fetch Table Names from their respective Ids,
                                # as we need Table names to generate the SQL.
                                SQL = render_template(
                                    "/".join([self.template_path,
                                              'get_tables.sql']),
                                    attrelid=inherits)
                                status, res = self.conn.execute_dict(SQL)

                                if not status:
                                    return internal_server_error(errormsg=res)

                                if 'inherits' in res['rows'][0]:
                                    data[key] = res['rows'][0]['inherits']
                                else:
                                    data[key] = []

                    elif key == 'typnotnull':
                        data[key] = True if (req[key] == 'true' or req[key]
                                             is True) else False if \
                            (req[key] == 'false' or req[key]) is False else ''
                    else:
                        data[key] = req[key]

            except Exception as e:
                return internal_server_error(errormsg=str(e))

            self.request = data
            return f(self, **kwargs)

        return wrap

    def module_js(self):
        """
        Load JS file (foreign_tables.js) for this module.
        """
        return make_response(
            render_template(
                "foreign_tables/js/foreign_tables.js",
                _=gettext
            ),
            200, {'Content-Type': 'application/x-javascript'}
        )

    def check_precondition(f):
        """
        Works as a decorator.
        Checks the database connection status.
        Attaches the connection object and template path to the class object.
        """

        @wraps(f)
        def wrap(*args, **kwargs):
            self = args[0]
            driver = get_driver(PG_DEFAULT_DRIVER)
            self.manager = driver.connection_manager(kwargs['sid'])

            # Get database connection
            self.conn = self.manager.connection(did=kwargs['did'])
            self.qtIdent = driver.qtIdent

            ver = self.manager.version
            # Set template path for sql scripts depending
            # on the server version.

            if ver >= 90500:
                self.template_path = 'foreign_tables/sql/9.5_plus'
            elif ver >= 90200:
                self.template_path = 'foreign_tables/sql/9.2_plus'
            else:
                self.template_path = 'foreign_tables/sql/9.1_plus'

            return f(*args, **kwargs)
        return wrap

    @check_precondition
    def list(self, gid, sid, did, scid):
        """
        List all the Foreign Tables.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
        """
        SQL = render_template("/".join([self.template_path, 'node.sql']),
                              scid=scid)
        status, res = self.conn.execute_dict(SQL)

        if not status:
            return internal_server_error(errormsg=res)
        return ajax_response(
            response=res['rows'],
            status=200
        )

    @check_precondition
    def nodes(self, gid, sid, did, scid):
        """
        Returns the Foreign Tables to generate the Nodes.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
        """

        res = []
        SQL = render_template("/".join([self.template_path,
                                        'node.sql']), scid=scid)
        status, rset = self.conn.execute_2darray(SQL)

        if not status:
            return internal_server_error(errormsg=rset)

        for row in rset['rows']:
            res.append(
                self.blueprint.generate_browser_node(
                    row['oid'],
                    scid,
                    row['name'],
                    icon="icon-foreign-table"
                ))

        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition
    def node(self, gid, sid, did, scid, foid):
        """
        Returns the Foreign Tables to generate the Nodes.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            foid: Foreign Table Id
        """

        SQL = render_template("/".join([self.template_path,
                                        'node.sql']), foid=foid)
        status, rset = self.conn.execute_2darray(SQL)

        if not status:
            return internal_server_error(errormsg=rset)

        for row in rset['rows']:
            return make_json_response(
                data=self.blueprint.generate_browser_node(
                    row['oid'],
                    scid,
                    row['name'],
                    icon="icon-foreign-table"
                ),
                status=200
            )

        return gone(gettext(
                    'Could not find the specified foreign table.'
                    ))

    @check_precondition
    def properties(self, gid, sid, did, scid, foid):
        """
        Returns the Foreign Table properties.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            foid: Foreign Table Id
        """
        data = self._fetch_properties(gid, sid, did, scid, foid)

        if not data:
            return gone(gettext("""
Could not find the foreign table in the database.
It may have been removed by another user or
shifted to the another schema.
"""))

        return ajax_response(
            response=data,
            status=200
        )

    @check_precondition
    def get_collations(self, gid, sid, did, scid, foid=None):
        """
        Returns the Collations.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            foid: Foreign Table Id
        """

        res = [{'label': '', 'value': ''}]
        try:
            SQL = render_template("/".join([self.template_path,
                                            'get_collations.sql']))
            status, rset = self.conn.execute_2darray(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            for row in rset['rows']:
                res.append(
                    {'label': row['copy_collation'],
                     'value': row['copy_collation']}
                )

            return make_json_response(
                data=res,
                status=200
            )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def types(self, gid, sid, did, scid, foid=None):
        """
        Returns the Data Types.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            foid: Foreign Table Id
        """

        condition = render_template("/".join(
            [self.template_path, 'types_condition.sql']),
            server_type=self.manager.server_type,
            show_sys_objects=self.blueprint.show_system_objects)

        # Get Types
        status, types = self.get_types(self.conn, condition)

        if not status:
            return internal_server_error(errormsg=types)

        return make_json_response(
            data=types,
            status=200
        )

    @check_precondition
    def get_foreign_servers(self, gid, sid, did, scid, foid=None):
        """
        Returns the Foreign Servers.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            foid: Foreign Table Id
        """
        res = [{'label': '', 'value': ''}]
        try:
            SQL = render_template("/".join([self.template_path,
                                            'get_foreign_servers.sql']))
            status, rset = self.conn.execute_2darray(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            for row in rset['rows']:
                res.append(
                    {'label': row['srvname'], 'value': row['srvname']}
                )
            return make_json_response(
                data=res,
                status=200
            )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def get_tables(self, gid, sid, did, scid, foid=None):
        """
        Returns the Foreign Tables as well as Plain Tables.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            foid: Foreign Table Id
        """
        res = []
        try:
            SQL = render_template("/".join(
                [self.template_path,'get_tables.sql']),
                foid=foid, server_type=self.manager.server_type,
                show_sys_objects=self.blueprint.show_system_objects)
            status, rset = self.conn.execute_dict(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            return make_json_response(
                data=rset['rows'],
                status=200
            )

        except:
            exc_type, exc_value, exc_traceback = sys.exc_info()
            current_app.logger.error(
                traceback.print_exception(exc_type,
                                          exc_value, exc_traceback, limit=2))

            return internal_server_error(errormsg=str(exc_value))

    @check_precondition
    def get_columns(self, gid, sid, did, scid, foid=None):
        """
        Returns the Table Columns.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            foid: Foreign Table Id
            attrelid: Table oid

        Returns:
              JSON Array with below parameters.
              attname: Column Name
              datatype: Column Data Type
              inherited_from: Parent Table from which the related column
                              is inheritted.
        """
        res = []
        data = request.args if request.args else None
        try:
            if data and 'attrelid' in data:
                SQL = render_template("/".join([self.template_path,
                                                'get_table_columns.sql']),
                                      attrelid=data['attrelid'])
                status, res = self.conn.execute_dict(SQL)

                if not status:
                    return internal_server_error(errormsg=res)
                return make_json_response(
                    data=res['rows'],
                    status=200
                )
        except:
            exc_type, exc_value, exc_traceback = sys.exc_info()
            current_app.logger.error(traceback.print_exception(
                exc_type,
                exc_value,
                exc_traceback,
                limit=2
            )
            )

            return internal_server_error(errormsg=str(exc_value))

    @check_precondition
    @validate_request
    def create(self, gid, sid, did, scid):
        """
        Creates a new Foreign Table object.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            foid: Foreign Table Id
            name: Foreign Table Name
            basensp: Schema Name
            ftsrvname: Foreign Server Name

        Returns:
            Foreign Table object in json format.
        """
        try:
            # Get SQL to create Foreign Table
            SQL, name = self.get_sql(gid, sid, did, scid, self.request)
            status, res = self.conn.execute_scalar(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            # Need oid to add object in the tree at browser.
            basensp = self.request['basensp'] if ('basensp' in self.request) \
                else None
            SQL = render_template("/".join([self.template_path,
                                            'get_oid.sql']),
                                  basensp=basensp,
                                  name=self.request['name'])
            status, res = self.conn.execute_2darray(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            foid = res['rows'][0]['oid']
            scid = res['rows'][0]['scid']

            return jsonify(
                node=self.blueprint.generate_browser_node(
                    foid,
                    scid,
                    self.request['name'],
                    icon="icon-foreign-table"
                )
            )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def delete(self, gid, sid, did, scid, foid):
        """
        Drops the Foreign Table.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            foid: Foreign Table Id
        """
        if self.cmd == 'delete':
            # This is a cascade operation
            cascade = True
        else:
            cascade = False

        try:
            # Fetch Name and Schema Name to delete the foreign table.
            SQL = render_template("/".join([self.template_path,
                                            'delete.sql']), scid=scid, foid=foid)
            status, res = self.conn.execute_2darray(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            if not res['rows']:
                return make_json_response(
                    success=0,
                    errormsg=gettext(
                        'Error: Object not found.'
                    ),
                    info=gettext(
                        'The specified foreign table could not be found.\n'
                    )
                )

            name =  res['rows'][0]['name']
            basensp = res['rows'][0]['basensp']

            SQL = render_template("/".join([self.template_path,
                                            'delete.sql']),
                                  name=name,
                                  basensp=basensp,
                                  cascade=cascade)
            status, res = self.conn.execute_scalar(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            return make_json_response(
                success=1,
                info=gettext("Foreign Table dropped"),
                data={
                    'id': foid,
                    'scid': scid,
                    'sid': sid,
                    'gid': gid,
                    'did': did
                }
            )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    @validate_request
    def update(self, gid, sid, did, scid, foid):
        """
        Updates the Foreign Table.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            foid: Foreign Table Id
        """

        try:
            SQL, name = self.get_sql(gid, sid, did, scid, self.request, foid)
            SQL = SQL.strip('\n').strip(' ')
            status, res = self.conn.execute_scalar(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            SQL = render_template("/".join([self.template_path,
                                            'get_oid.sql']),
                                  foid=foid)
            status, res = self.conn.execute_2darray(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            scid = res['rows'][0]['scid']

            return jsonify(
                node=self.blueprint.generate_browser_node(
                    foid,
                    scid,
                    name,
                    icon="icon-%s" % self.node_type
                )
            )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def sql(self, gid, sid, did, scid, foid=None):
        """
        Returns the SQL for the Foreign Table object.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            foid: Foreign Table Id
        """
        data = self._fetch_properties(gid, sid, did, scid, foid, inherits=True)

        col_data = []
        for c in data['columns']:
            if (not 'inheritedfrom' in c) or (c['inheritedfrom'] is None):
                col_data.append(c)

        data['columns'] = col_data

        SQL = render_template("/".join([self.template_path,
                                        'create.sql']), data=data)

        sql_header = """-- {0}: {1}

-- DROP {0} {1};

""".format('FOREIGN TABLE', data['basensp'] + "." + data['name'])
        if hasattr(str, 'decode'):
            sql_header = sql_header.decode('utf-8')

        SQL = sql_header + SQL

        return ajax_response(response=SQL.strip('\n'))

    @check_precondition
    @validate_request
    def msql(self, gid, sid, did, scid, foid=None):
        """
        Returns the modified SQL.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            foid: Foreign Table Id
            name: Foreign Table Name
            ftsrvname: Foreign Server Name

        Returns:
            SQL statements to create/update the Foreign Table.
        """
        try:
            SQL, name = self.get_sql(gid, sid, did, scid, self.request, foid)
            if SQL == '':
                SQL = "--modified SQL"

            return make_json_response(
                data=SQL,
                status=200
                )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    def get_sql(self, gid, sid, did, scid, data, foid=None):
        """
        Genrates the SQL statements to create/update the Foreign Table.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            foid: Foreign Table Id
        """
        if foid is not None:
            old_data = self._fetch_properties(gid, sid, did, scid, foid,
                                              inherits=True)

            if not old_data:
                return gone(gettext("""
    Could not find the foreign table in the database.
    It may have been removed by another user or
    shifted to the another schema.
    """))

            # Prepare dict of columns with key = column's attnum
            # Will use this in the update template when any column is
            # changed, to identify the columns.
            col_data = {}
            for c in old_data['columns']:
                col_data[c['attnum']] = c

            old_data['columns'] = col_data

            if 'columns' in data and 'added' in data['columns']:
                data['columns']['added'] = self._format_columns(
                    data['columns']['added'])

            if 'columns' in data and 'changed' in data['columns']:
                data['columns']['changed'] = self._format_columns(
                    data['columns']['changed'])

                # Parse Column Options
                for c in data['columns']['changed']:
                    old_col_options = c['attfdwoptions'] if ('attfdwoptions' in c and c['attfdwoptions']) else []
                    old_col_frmt_options = {}

                    for o in old_col_options:
                        col_opt = o.split("=")
                        old_col_frmt_options[col_opt[0]] = col_opt[1]

                    c['coloptions_updated'] = {'added': [],
                                               'changed': [],
                                               'deleted': []}

                    if 'coloptions' in c and len(c['coloptions']) > 0:
                        for o in c['coloptions']:
                            if o['option'] in old_col_frmt_options and \
                                            o['value'] != old_col_frmt_options[o['option']]:
                                c['coloptions_updated']['changed'].append(o)
                            elif o['option'] not in old_col_frmt_options:
                                c['coloptions_updated']['added'].append(o)
                            if o['option'] in old_col_frmt_options:
                                del old_col_frmt_options[o['option']]

                    for o in old_col_frmt_options:
                        c['coloptions_updated']['deleted'].append({'option': o})

            # Parse Privileges
            if 'acl' in data and 'added' in data['acl']:
                data['acl']['added'] = parse_priv_to_db(data['acl']['added'],
                                                        ["a", "r", "w", "x"])
            if 'acl' in data and 'changed' in data['acl']:
                data['acl']['changed'] = parse_priv_to_db(
                    data['acl']['changed'], ["a", "r", "w", "x"])
            if 'acl' in data and 'deleted' in data['acl']:
                data['acl']['deleted'] = parse_priv_to_db(
                    data['acl']['deleted'], ["a", "r", "w", "x"])

            SQL = render_template(
                "/".join([self.template_path, 'update.sql']),
                data=data, o_data=old_data
            )
            return SQL, data['name'] if 'name' in data else old_data['name']
        else:
            data['columns'] = self._format_columns(data['columns'])

            # Parse Privileges
            if 'acl' in data:
                data['acl'] = parse_priv_to_db(data['acl'],
                                               ["a", "r", "w", "x"])

            SQL = render_template("/".join([self.template_path,
                                            'create.sql']), data=data)
            return SQL, data['name']


    @check_precondition
    def dependents(self, gid, sid, did, scid, foid):
        """
        This function get the dependents and return ajax response
        for the Foreign Table object.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            foid: Foreign Table Id
        """
        dependents_result = self.get_dependents(self.conn, foid)
        return ajax_response(
            response=dependents_result,
            status=200
        )

    @check_precondition
    def dependencies(self, gid, sid, did, scid, foid):
        """
        This function get the dependencies and return ajax response
        for the  Foreign Table object.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            foid: Foreign Table Id
        """
        dependencies_result = self.get_dependencies(self.conn, foid)
        return ajax_response(
            response=dependencies_result,
            status=200
        )

    def _format_columns(self, columns):
        """
        Format Table Columns.
        """
        cols = []
        for c in columns:
            if len(c) > 0:
                if '[]' in c['datatype']:
                    c['datatype'] = c['datatype'].replace('[]', '')
                    c['isArrayType'] = True
                else:
                    c['isArrayType'] = False
                cols.append(c)

        return cols

    def _fetch_properties(self, gid, sid, did, scid, foid, inherits=False):
        """
        Returns the Foreign Table properties which will be used in
        properties, sql and get_sql functions.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            foid: Foreign Table Id
            inherits: If True then inherited table will be fetched from
                      database

        Returns:

        """
        SQL = render_template("/".join([self.template_path,
                                        'properties.sql']),
                              scid=scid, foid=foid)
        status, res = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=res)

        if len(res['rows']) == 0:
            return False

        data = res['rows'][0]

        if self.manager.version >= 90200:
            # Fetch privileges
            SQL = render_template("/".join([self.template_path, 'acl.sql']),
                                  foid=foid)
            status, aclres = self.conn.execute_dict(SQL)
            if not status:
                return internal_server_error(errormsg=aclres)

            # Get Formatted Privileges
            data.update(self._format_proacl_from_db(aclres['rows']))

        # Get formatted Security Labels
        if 'seclabels' in data:
            data.update(parse_sec_labels_from_db(data['seclabels']))

        # Get formatted Options
        if 'ftoptions' in data:
            data.update({'strftoptions': data['ftoptions']})
            data.update(self._parse_variables_from_db(data['ftoptions']))

        SQL = render_template("/".join([self.template_path,
                                        'get_constraints.sql']), foid=foid)
        status, cons = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=cons)

        if cons and 'rows' in cons:
            data['constraints'] = cons['rows']

        SQL = render_template("/".join([self.template_path,
                                        'get_columns.sql']), foid=foid)
        status, cols = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=cols)

        # The Length and the precision of the Datatype should be separated.
        # The Format we getting from database is: numeric(1,1)
        # So, we need to separate it as Length: 1, Precision: 1
        for c in cols['rows']:
            if c['fulltype'] != '' and c['fulltype'].find("(") > 0:
                substr = c['fulltype'][c['fulltype'].find("(") + 1:c['fulltype'].find(")")]
                typlen = substr.split(",")
                if len(typlen) > 1:
                    c['typlen'] = int(typlen[0])
                    c['precision'] = int(typlen[1])
                else:
                    c['typlen'] = int(typlen[0])
                    c['precision'] = None

            # Get formatted Column Options
            if 'attfdwoptions' in c and c['attfdwoptions'] != '':
                att_opt = self._parse_variables_from_db(c['attfdwoptions'])
                c['coloptions'] = att_opt['ftoptions']

        if cols and 'rows' in cols:
            data['columns'] = cols['rows']

        # Get Inherited table names from their OID
        if inherits:
            if 'inherits' in data and data['inherits']:
                inherits = tuple([int(x) for x in data['inherits']])
                if len(inherits) == 1:
                    inherits = "(" + str(inherits[0]) + ")"

                SQL = render_template("/".join([self.template_path,
                                                'get_tables.sql']),
                                      attrelid=inherits)
                status, res = self.conn.execute_dict(SQL)

                if not status:
                    return internal_server_error(errormsg=res)

                if 'inherits' in res['rows'][0]:
                    data['inherits'] = res['rows'][0]['inherits']

        return data

    def _format_proacl_from_db(self, proacl):
        """
        Returns privileges.
        Args:
            proacl: Privileges Dict
        """
        privileges = []
        for row in proacl:
            priv = parse_priv_from_db(row)
            privileges.append(priv)

        return {"acl": privileges}

    def _parse_variables_from_db(self, db_variables):
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
                var_name, var_value = row.split("=")
                # Because we save as boolean string in db so it needs
                # conversion
                if var_value == 'false' or var_value == 'off':
                    var_value = False

                var_dict = {'option': var_name, 'value': var_value}

                variables_lst.append(var_dict)

        return {"ftoptions": variables_lst}

    @check_precondition
    def select_sql(self, gid, sid, did, scid, foid):
        """
        SELECT script sql for the object

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            foid: Foreign Table Id

        Returns:
            SELECT Script sql for the object
        """
        data = self._fetch_properties(gid, sid, did, scid, foid)

        columns = []
        for c in data['columns']:
            columns.append(self.qtIdent(self.conn, c['attname']))

        if len(columns) > 0:
            columns = ", ".join(columns)
        else:
            columns = '*'

        sql = u"SELECT {0}\n\tFROM {1};".format(
            columns,
            self.qtIdent(self.conn, data['basensp'], data['name'])
        )

        return ajax_response(response=sql)

    @check_precondition
    def insert_sql(self, gid, sid, did, scid, foid):
        """
        INSERT script sql for the object

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            foid: Foreign Table Id

        Returns:
            INSERT Script sql for the object
        """
        data = self._fetch_properties(gid, sid, did, scid, foid)

        columns = []
        values = []

        # Now we have all list of columns which we need
        if 'columns' in data:
            for c in data['columns']:
                columns.append(self.qtIdent(self.conn, c['attname']))
                values.append('?')

        if len(columns) > 0:
            columns = ", ".join(columns)
            values = ", ".join(values)
            sql = u"INSERT INTO {0}(\n\t{1})\n\tVALUES ({2});".format(
                self.qtIdent(self.conn, data['basensp'], data['name']),
                columns, values
            )
        else:
            sql = gettext('-- Please create column(s) first...')

        return ajax_response(response=sql)

    @check_precondition
    def update_sql(self, gid, sid, did, scid, foid):
        """
        UPDATE script sql for the object

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            foid: Foreign Table Id

        Returns:
            UPDATE Script sql for the object
        """
        data = self._fetch_properties(gid, sid, did, scid, foid)

        columns = []

        # Now we have all list of columns which we need
        if 'columns' in data:
            for c in data['columns']:
                columns.append(self.qtIdent(self.conn, c['attname']))

        if len(columns) > 0:
            if len(columns) == 1:
                columns = columns[0]
                columns += "=?"
            else:
                columns = "=?, ".join(columns)
                columns += "=?"

            sql = u"UPDATE {0}\n\tSET {1}\n\tWHERE <condition>;".format(
                self.qtIdent(self.conn, data['basensp'], data['name']),
                columns
            )
        else:
            sql = gettext('-- Please create column(s) first...')

        return ajax_response(response=sql)

    @check_precondition
    def delete_sql(self, gid, sid, did, scid, foid):
        """
        DELETE script sql for the object

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            foid: Foreign Table Id

        Returns:
            DELETE Script sql for the object
        """
        data = self._fetch_properties(gid, sid, did, scid, foid)

        sql = u"DELETE FROM {0}\n\tWHERE <condition>;".format(
            self.qtIdent(self.conn, data['basensp'], data['name'])
        )

        return ajax_response(response=sql)


ForeignTableView.register_node_view(blueprint)
