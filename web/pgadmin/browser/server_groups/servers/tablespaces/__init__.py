##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
import simplejson as json
import re
from functools import wraps

import pgadmin.browser.server_groups.servers as servers
from flask import render_template, make_response, request, jsonify, current_app
from flask_babel import gettext
from pgadmin.browser.collection import CollectionNodeModule
from pgadmin.browser.server_groups.servers.utils import parse_priv_from_db, \
    parse_priv_to_db
from pgadmin.browser.utils import PGChildNodeView
from pgadmin.utils.ajax import make_json_response, \
    make_response as ajax_response, internal_server_error, gone
from pgadmin.utils.ajax import precondition_required
from pgadmin.utils.driver import get_driver

from config import PG_DEFAULT_DRIVER


class TablespaceModule(CollectionNodeModule):
    NODE_TYPE = 'tablespace'
    COLLECTION_LABEL = gettext("Tablespaces")

    def get_nodes(self, gid, sid):
        """
        Generate the collection node
        """
        yield self.generate_browser_collection_node(sid)

    @property
    def script_load(self):
        """
        Load the module script for server, when any of the server-group node is
        initialized.
        """
        return servers.ServerModule.NODE_TYPE

    @property
    def node_inode(self):
        return False


blueprint = TablespaceModule(__name__)


class TablespaceView(PGChildNodeView):
    node_type = blueprint.node_type

    parent_ids = [
        {'type': 'int', 'id': 'gid'},
        {'type': 'int', 'id': 'sid'}
    ]
    ids = [
        {'type': 'int', 'id': 'tsid'}
    ]

    operations = dict({
        'obj': [
            {'get': 'properties', 'delete': 'delete', 'put': 'update'},
            {'get': 'list', 'post': 'create'}
        ],
        'nodes': [{'get': 'node'}, {'get': 'nodes'}],
        'children': [{'get': 'children'}],
        'sql': [{'get': 'sql'}],
        'msql': [{'get': 'msql'}, {'get': 'msql'}],
        'stats': [{'get': 'statistics'}, {'get': 'statistics'}],
        'dependency': [{'get': 'dependencies'}],
        'dependent': [{'get': 'dependents'}],
        'module.js': [{}, {}, {'get': 'module_js'}],
        'vopts': [{}, {'get': 'variable_options'}],
        'move_objects': [{'put': 'move_objects'}],
        'move_objects_sql': [{'get': 'move_objects_sql'}],
    })

    def module_js(self):
        """
        This property defines (if javascript) exists for this node.
        Override this property for your own logic.
        """
        return make_response(
            render_template(
                "tablespaces/js/tablespaces.js",
                _=gettext
            ),
            200, {'Content-Type': 'application/x-javascript'}
        )

    def check_precondition(f):
        """
        This function will behave as a decorator which will checks
        database connection before running view, it will also attaches
        manager,conn & template_path properties to self
        """

        @wraps(f)
        def wrap(*args, **kwargs):
            # Here args[0] will hold self & kwargs will hold gid,sid,tsid
            self = args[0]
            self.manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(kwargs['sid'])
            self.conn = self.manager.connection()

            # If DB not connected then return error to browser
            if not self.conn.connected():
                current_app.logger.warning(
                    "Connection to the server has been lost!"
                )
                return precondition_required(
                    gettext(
                        "Connection to the server has been lost!"
                    )
                )

            ver = self.manager.version
            if ver >= 90200:
                self.template_path = 'tablespaces/sql/9.2_plus'
            else:
                self.template_path = 'tablespaces/sql/9.1_plus'
            current_app.logger.debug(
                "Using the template path: %s", self.template_path
            )
            # Allowed ACL on tablespace
            self.acl = ['C']

            return f(*args, **kwargs)

        return wrap

    @check_precondition
    def list(self, gid, sid):
        SQL = render_template(
            "/".join([self.template_path, 'properties.sql']),
            conn=self.conn
        )
        status, res = self.conn.execute_dict(SQL)

        if not status:
            return internal_server_error(errormsg=res)
        return ajax_response(
            response=res['rows'],
            status=200
        )

    @check_precondition
    def node(self, gid, sid, tsid):
        SQL = render_template(
            "/".join([self.template_path, 'nodes.sql']),
            tsid=tsid, conn=self.conn
        )
        status, rset = self.conn.execute_2darray(SQL)
        if not status:
            return internal_server_error(errormsg=rset)

        if len(rset['rows']) == 0:
            return gone(gettext("""Could not find the tablespace."""))

        res = self.blueprint.generate_browser_node(
                rset['rows'][0]['oid'],
                sid,
                rset['rows'][0]['name'],
                icon="icon-tablespace"
            )

        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition
    def nodes(self, gid, sid, tsid=None):
        res = []
        SQL = render_template(
            "/".join([self.template_path, 'nodes.sql']),
            tsid=tsid, conn=self.conn
        )
        status, rset = self.conn.execute_2darray(SQL)
        if not status:
            return internal_server_error(errormsg=rset)

        for row in rset['rows']:
            res.append(
                self.blueprint.generate_browser_node(
                    row['oid'],
                    sid,
                    row['name'],
                    icon="icon-tablespace"
                ))

        return make_json_response(
            data=res,
            status=200
        )

    def _formatter(self, data, tsid=None):
        """
        Args:
            data: dict of query result
            tsid: tablespace oid

        Returns:
            It will return formatted output of collections
        """
        # We need to format variables according to client js collection
        if 'spcoptions' in data and data['spcoptions'] is not None:
            spcoptions = []
            for spcoption in data['spcoptions']:
                k, v = spcoption.split('=')
                spcoptions.append({'name': k, 'value': v})

            data['spcoptions'] = spcoptions

        # Need to format security labels according to client js collection
        if 'seclabels' in data and data['seclabels'] is not None:
            seclabels = []
            for seclbls in data['seclabels']:
                k, v = seclbls.split('=')
                seclabels.append({'provider': k, 'label': v})

            data['seclabels'] = seclabels

        # We need to parse & convert ACL coming from database to json format
        SQL = render_template(
            "/".join([self.template_path, 'acl.sql']),
            tsid=tsid, conn=self.conn
        )
        status, acl = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=acl)

        # We will set get privileges from acl sql so we don't need
        # it from properties sql
        data['spcacl'] = []

        for row in acl['rows']:
            priv = parse_priv_from_db(row)
            if row['deftype'] in data:
                data[row['deftype']].append(priv)
            else:
                data[row['deftype']] = [priv]

        return data

    @check_precondition
    def properties(self, gid, sid, tsid):
        SQL = render_template(
            "/".join([self.template_path, 'properties.sql']),
            tsid=tsid, conn=self.conn
        )
        status, res = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=res)

        if len(res['rows']) == 0:
            return gone(gettext("""Could not find the tablespace information."""))

        # Making copy of output for future use
        copy_data = dict(res['rows'][0])
        copy_data = self._formatter(copy_data, tsid)

        return ajax_response(
            response=copy_data,
            status=200
        )

    @check_precondition
    def create(self, gid, sid):
        """
        This function will creates new the tablespace object
        """

        required_args = {
            'name': 'Name',
            'spclocation': 'Location'
        }

        data = request.form if request.form else json.loads(
            request.data, encoding='utf-8'
        )

        for arg in required_args:
            if arg not in data:
                return make_json_response(
                    status=410,
                    success=0,
                    errormsg=gettext(
                        "Could not find the required parameter (%s)." %
                        required_args[arg]
                    )
                )

        # To format privileges coming from client
        if 'spcacl' in data:
            data['spcacl'] = parse_priv_to_db(data['spcacl'], ['C'])

        try:
            SQL = render_template(
                "/".join([self.template_path, 'create.sql']),
                data=data, conn=self.conn
            )

            status, res = self.conn.execute_scalar(SQL)

            if not status:
                return internal_server_error(errormsg=res)
            SQL = render_template(
                "/".join([self.template_path, 'alter.sql']),
                data=data, conn=self.conn
            )

            # Checking if we are not executing empty query
            if SQL and SQL.strip('\n') and SQL.strip(' '):
                status, res = self.conn.execute_scalar(SQL)
                if not status:
                    return internal_server_error(errormsg=res)

            # To fetch the oid of newly created tablespace
            SQL = render_template(
                "/".join([self.template_path, 'alter.sql']),
                tablespace=data['name'], conn=self.conn
            )

            status, tsid = self.conn.execute_scalar(SQL)

            if not status:
                return internal_server_error(errormsg=tsid)

            return jsonify(
                node=self.blueprint.generate_browser_node(
                    tsid,
                    sid,
                    data['name'],
                    icon="icon-tablespace"
                )
            )
        except Exception as e:
            current_app.logger.exception(e)
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def update(self, gid, sid, tsid):
        """
        This function will update tablespace object
        """
        data = request.form if request.form else json.loads(
            request.data, encoding='utf-8'
        )

        try:
            SQL, name = self.get_sql(gid, sid, data, tsid)
            SQL = SQL.strip('\n').strip(' ')
            status, res = self.conn.execute_scalar(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            return jsonify(
                node=self.blueprint.generate_browser_node(
                    tsid,
                    sid,
                    name,
                    icon="icon-%s" % self.node_type
                )
            )
        except Exception as e:
            current_app.logger.exception(e)
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def delete(self, gid, sid, tsid):
        """
        This function will drop the tablespace object
        """
        try:
            # Get name for tablespace from tsid
            status, rset = self.conn.execute_dict(
                render_template(
                    "/".join([self.template_path, 'nodes.sql']),
                    tsid=tsid, conn=self.conn
                )
            )

            if not status:
                return internal_server_error(errormsg=rset)

            if not rset['rows']:
                return make_json_response(
                    success=0,
                    errormsg=gettext(
                        'Error: Object not found.'
                    ),
                    info=gettext(
                        'The specified tablespace could not be found.\n'
                    )
                )

            # drop tablespace
            SQL = render_template(
                "/".join([self.template_path, 'delete.sql']),
                tsname=(rset['rows'][0])['name'], conn=self.conn
            )

            status, res = self.conn.execute_scalar(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            return make_json_response(
                success=1,
                info=gettext("Tablespace dropped"),
                data={
                    'id': tsid,
                    'sid': sid,
                    'gid': gid,
                }
            )

        except Exception as e:
            current_app.logger.exception(e)
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def msql(self, gid, sid, tsid=None):
        """
        This function to return modified SQL
        """
        data = dict()
        for k, v in request.args.items():
            try:
                data[k] = json.loads(v, encoding='utf-8')
            except ValueError as ve:
                current_app.logger.exception(ve)
                data[k] = v

        sql, name = self.get_sql(gid, sid, data, tsid)
        sql = sql.strip('\n').strip(' ')
        if sql == '':
            sql = "--modified SQL"
        return make_json_response(
            data=sql,
            status=200
        )

    def get_sql(self, gid, sid, data, tsid=None):
        """
        This function will genrate sql from model/properties data
        """
        required_args = [
            'name'
        ]

        if tsid is not None:
            SQL = render_template(
                "/".join([self.template_path, 'properties.sql']),
                tsid=tsid, conn=self.conn
            )
            status, res = self.conn.execute_dict(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            # Making copy of output for further processing
            old_data = dict(res['rows'][0])
            old_data = self._formatter(old_data, tsid)

            # To format privileges data coming from client
            for key in ['spcacl']:
                if key in data and data[key] is not None:
                    if 'added' in data[key]:
                        data[key]['added'] = parse_priv_to_db(data[key]['added'], self.acl)
                    if 'changed' in data[key]:
                        data[key]['changed'] = parse_priv_to_db(data[key]['changed'], self.acl)
                    if 'deleted' in data[key]:
                        data[key]['deleted'] = parse_priv_to_db(data[key]['deleted'], self.acl)

            # If name is not present with in update data then copy it
            # from old data
            for arg in required_args:
                if arg not in data:
                    data[arg] = old_data[arg]

            SQL = render_template(
                "/".join([self.template_path, 'update.sql']),
                data=data, o_data=old_data
            )
        else:
            # To format privileges coming from client
            if 'spcacl' in data:
                data['spcacl'] = parse_priv_to_db(data['spcacl'], self.acl)
            # If the request for new object which do not have tsid
            SQL = render_template(
                "/".join([self.template_path, 'create.sql']),
                data=data
            )
            SQL += "\n"
            SQL += render_template(
                "/".join([self.template_path, 'alter.sql']),
                data=data, conn=self.conn
            )
        SQL = re.sub('\n{2,}', '\n\n', SQL)
        return SQL, data['name'] if 'name' in data else old_data['name']

    @check_precondition
    def sql(self, gid, sid, tsid):
        """
        This function will generate sql for sql panel
        """
        SQL = render_template(
            "/".join([self.template_path, 'properties.sql']),
            tsid=tsid, conn=self.conn
        )
        status, res = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=res)

        # Making copy of output for future use
        old_data = dict(res['rows'][0])

        old_data = self._formatter(old_data, tsid)

        # To format privileges
        if 'spcacl' in old_data:
            old_data['spcacl'] = parse_priv_to_db(old_data['spcacl'], self.acl)

        SQL = ''
        # We are not showing create sql for system tablespace
        if not old_data['name'].startswith('pg_'):
            SQL = render_template(
                "/".join([self.template_path, 'create.sql']),
                data=old_data
            )
            SQL += "\n"
        SQL += render_template(
            "/".join([self.template_path, 'alter.sql']),
            data=old_data, conn=self.conn
        )

        sql_header = """
-- Tablespace: {0}

-- DROP TABLESPACE {0};

""".format(old_data['name'])

        if hasattr(str, 'decode'):
            sql_header = sql_header.decode('utf-8')

        SQL = sql_header + SQL
        SQL = re.sub('\n{2,}', '\n\n', SQL)
        return ajax_response(response=SQL.strip('\n'))

    @check_precondition
    def variable_options(self, gid, sid):
        """
        Args:
            gid:
            sid:

        Returns:
            This function will return list of variables available for
            table spaces.
        """
        SQL = render_template(
            "/".join([self.template_path, 'variables.sql'])
        )
        status, rset = self.conn.execute_dict(SQL)

        if not status:
            return internal_server_error(errormsg=rset)

        return make_json_response(
            data=rset['rows'],
            status=200
        )

    @check_precondition
    def statistics(self, gid, sid, tsid=None):
        """
        This function will return data for statistics panel
        """
        SQL = render_template(
            "/".join([self.template_path, 'stats.sql']),
            tsid=tsid, conn=self.conn
        )
        status, res = self.conn.execute_dict(SQL)

        if not status:
            return internal_server_error(errormsg=res)

        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition
    def dependencies(self, gid, sid, tsid):
        """
        This function gets the dependencies and returns an ajax response
        for the tablespace.

        Args:
            gid: Server Group ID
            sid: Server ID
            tsid: Tablespace ID
        """
        dependencies_result = self.get_dependencies(self.conn, tsid)
        return ajax_response(
            response=dependencies_result,
            status=200
        )

    @check_precondition
    def dependents(self, gid, sid, tsid):
        """
        This function gets the dependents and returns an ajax response
        for the tablespace.

        Args:
            gid: Server Group ID
            sid: Server ID
            tsid: Tablespace ID
        """
        dependents_result = self.get_dependents(self.conn, sid, tsid)
        return ajax_response(
            response=dependents_result,
            status=200
        )

    def get_dependents(self, conn, sid, tsid):
        """
        This function is used to fetch the dependents for the selected node.

        Args:
            conn: Connection object
            sid: Server Id
            tsid: Tablespace ID

        Returns: Dictionary of dependents for the selected node.
        """
        # Dictionary for the object types
        types = {
            # None specified special handling for this type
            'r': 'table',
            'i': None,
            'S': 'sequence',
            'v': 'view',
            'x': 'external_table',
            'p': 'function',
            'n': 'schema',
            'y': 'type',
            'd': 'domain',
            'T': 'trigger_function',
            'C': 'conversion',
            'o': None
        }

        # Fetching databases with CONNECT privileges status.
        query = render_template("/".join([self.template_path, 'dependents.sql']), fetch_database=True)
        status, db_result = self.conn.execute_dict(query)
        if not status:
            current_app.logger.error(db_result)

        dependents = list()

        # Get the server manager
        manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(sid)

        for db_row in db_result['rows']:
            oid = db_row['dattablespace']

            # Append all the databases to the dependents list if oid is same
            if tsid == oid:
                dependents.append({
                    'type': 'database', 'name': '', 'field': db_row['datname']
                })

            # If connection to the database is not allowed then continue
            # with the next database
            if not db_row['datallowconn']:
                continue

            # Get the connection from the manager for the specified database.
            # Check the connect status and if it is not connected then create
            # a new connection to run the query and fetch the dependents.
            is_connected = True
            try:
                temp_conn = manager.connection(db_row['datname'])
                is_connected = temp_conn.connected()
                if not is_connected:
                    temp_conn.connect()
            except Exception as e:
                current_app.logger.exception(e)

            if temp_conn.connected():
                query = render_template("/".join([self.template_path, 'dependents.sql']),
                                        fetch_dependents=True, tsid=tsid)
                status, result = temp_conn.execute_dict(query)
                if not status:
                    current_app.logger.error(result)

                for row in result['rows']:
                    rel_name = row['nspname']
                    if rel_name is not None:
                        rel_name += '.'

                    if rel_name is None:
                        rel_name = row['relname']
                    else:
                        rel_name += row['relname']

                    type_name = ''
                    type_str = row['relkind']
                    # Fetch the type name from the dictionary
                    # if type is not present in the types dictionary then
                    # we will continue and not going to add it.
                    if type_str[0] in types:

                        # if type is present in the types dictionary, but it's
                        # value is None then it requires special handling.
                        if types[type_str[0]] is None:
                            if type_str[0] == 'i':
                                type_name = 'index'
                                rel_name = row['indname'] + ' ON ' + rel_name
                            elif type_str[0] == 'o':
                                type_name = 'operator'
                                rel_name = row['relname']
                        else:
                            type_name = types[type_str[0]]
                    else:
                        continue

                    dependents.append({'type': type_name, 'name': rel_name, 'field': db_row['datname']})

                # Release only those connections which we have created above.
                if not is_connected:
                    manager.release(db_row['datname'])

        return dependents

    @check_precondition
    def move_objects(self, gid, sid, tsid):
        """
        This function moves objects from current tablespace to another

        Args:
            gid: Server Group ID
            sid: Server ID
            tsid: Tablespace ID
        """
        data = json.loads(request.form['data'], encoding='utf-8')

        try:
            SQL = render_template("/".join(
                [self.template_path, 'move_objects.sql']),
                data=data, conn=self.conn
            )
            status, res = self.conn.execute_scalar(SQL.strip('\n'))
            if not status:
                return internal_server_error(errormsg=res)

            return make_json_response(
                success=1,
                info="Tablespace updated",
                data={
                    'id': tsid,
                    'sid': sid,
                    'gid': gid
                }
            )
        except Exception as e:
            current_app.logger.exception(e)
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def move_objects_sql(self, gid, sid, tsid):
        """
        This function returns sql for Move Objects.. dialog

        Args:
            gid: Server Group ID
            sid: Server ID
            tsid: Tablespace ID
        """
        required_args = ['old_tblspc', 'tblspc', 'obj_type']

        data = dict()
        for k, v in request.args.items():
            try:
                data[k] = json.loads(v, encoding='utf-8')
            except ValueError as ve:
                current_app.logger.exception(ve)
                data[k] = v

        for arg in required_args:
            if arg not in data:
                return make_json_response(
                    data=gettext("-- Incomplete definition"),
                    status=200
                )

        sql = render_template("/".join(
            [self.template_path, 'move_objects.sql']),
            data=data, conn=self.conn
        )

        return make_json_response(
            data=sql.strip('\n'),
            status=200
        )


TablespaceView.register_node_view(blueprint)
