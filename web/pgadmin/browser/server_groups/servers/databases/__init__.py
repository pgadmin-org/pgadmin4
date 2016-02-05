##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
import json
from flask import render_template, make_response, current_app, request, jsonify
from flask.ext.babel import gettext as _
from pgadmin.utils.ajax import make_json_response, \
    make_response as ajax_response, internal_server_error
from pgadmin.browser.utils import NodeView
from pgadmin.browser.server_groups.servers.utils import parse_priv_from_db, \
    parse_priv_to_db
from pgadmin.browser.collection import CollectionNodeModule
import pgadmin.browser.server_groups.servers as servers
from pgadmin.utils.ajax import precondition_required
from pgadmin.utils.driver import get_driver
from config import PG_DEFAULT_DRIVER
from functools import wraps

class DatabaseModule(CollectionNodeModule):
    NODE_TYPE = 'database'
    COLLECTION_LABEL = _("Databases")

    def __init__(self, *args, **kwargs):
        self.min_ver = None
        self.max_ver = None

        super(DatabaseModule, self).__init__(*args, **kwargs)

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
    def csssnippets(self):
        """
        Returns a snippet of css to include in the page
        """
        snippets = [
                render_template(
                    "browser/css/collection.css",
                    node_type=self.node_type,
                    _=_
                    ),
                render_template(
                    "databases/css/database.css",
                    node_type=self.node_type,
                    _=_
                    )
                ]

        for submodule in self.submodules:
            snippets.extend(submodule.csssnippets)

        return snippets


blueprint = DatabaseModule(__name__)


class DatabaseView(NodeView):
    node_type = blueprint.node_type

    parent_ids = [
            {'type': 'int', 'id': 'gid'},
            {'type': 'int', 'id': 'sid'}
            ]
    ids = [
            {'type': 'int', 'id': 'did'}
            ]

    operations = dict({
        'obj': [
            {'get': 'properties', 'delete': 'delete', 'put': 'update'},
            {'get': 'list', 'post': 'create'}
        ],
        'nodes': [{'get': 'node'}, {'get': 'nodes'}],
        'sql': [{'get': 'sql'}],
        'msql': [{'get': 'msql'}, {'get': 'msql'}],
        'stats': [{'get': 'statistics'}],
        'dependency': [{'get': 'dependencies'}],
        'dependent': [{'get': 'dependents'}],
        'children': [{'get': 'children'}],
        'module.js': [{}, {}, {'get': 'module_js'}],
        'connect': [{
            'get': 'connect_status', 'post': 'connect', 'delete': 'disconnect'
            }],
        'get_encodings': [{'get': 'getEncodings'}, {'get': 'getEncodings'}],
        'get_ctypes': [{'get': 'getCtypes'}, {'get': 'getCtypes'}],
        'vopts': [{}, {'get': 'variable_options'}]
    })

    def check_precondition(action=None):
        """
        This function will behave as a decorator which will checks
        database connection before running view, it will also attaches
        manager,conn & template_path properties to self
        """
        def wrap(f):
            @wraps(f)
            def wrapped(self, *args, **kwargs):

                self.manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(kwargs['sid'])
                if action and action in ["drop"]:
                    self.conn = self.manager.connection()
                elif 'did' in kwargs:
                    self.conn = self.manager.connection(did=kwargs['did'])
                else:
                    self.conn = self.manager.connection()
                # If DB not connected then return error to browser
                if not self.conn.connected():
                    return precondition_required(
                        _(
                                "Connection to the server has been lost!"
                        )
                    )

                ver = self.manager.version
                # we will set template path for sql scripts
                if ver >= 90300:
                    self.template_path = 'databases/sql/9.3_plus'
                elif ver >= 90200:
                    self.template_path = 'databases/sql/9.2_plus'
                else:
                    self.template_path = 'databases/sql/9.1_plus'
                return f(self, *args, **kwargs)
            return wrapped
        return wrap

    @check_precondition(action="list")
    def list(self, gid, sid):
        SQL = render_template("/".join([self.template_path, 'properties.sql']))
        status, res = self.conn.execute_dict(SQL)

        if not status:
            return internal_server_error(errormsg=res)

        return ajax_response(
                response=res['rows'],
                status=200
                )

    @check_precondition(action="nodes")
    def nodes(self, gid, sid):
        res = []
        SQL = render_template("/".join([self.template_path, 'get_nodes.sql']))
        status, rset = self.conn.execute_2darray(SQL)

        if not status:
            return internal_server_error(errormsg=rset)

        for row in rset['rows']:
            if self.manager.db == row['name']:
                connected=True
                canDisConn=False
            else:
                conn=self.manager.connection(row['name'])
                connected=conn.connected()
                canDisConn=True

            res.append(
                    self.blueprint.generate_browser_node(
                        row['did'],
                        sid,
                        row['name'],
                        icon="icon-database-not-connected" if not connected \
                                else "pg-icon-database",
                        connected=connected,
                        tablespace=row['spcname'],
                        allowConn=row['datallowconn'],
                        canCreate=row['cancreate'],
                        canDisconn=canDisConn
                        )
                    )

        return make_json_response(
                data=res,
                status=200
                )

    @check_precondition(action="node")
    def node(self, gid, sid, did):
        SQL = render_template("/".join([self.template_path, 'get_nodes.sql']), did=did)
        status, rset = self.conn.execute_2darray(SQL)

        if not status:
            return internal_server_error(errormsg=rset)

        for row in rset['rows']:
            if self.manager.db == row['name']:
                connected=True
            else:
                conn=self.manager.connection(row['name'])
                connected=self.conn.connected()
            return make_json_response(
                    data=self.blueprint.generate_browser_node(
                        row['did'],
                        sid,
                        row['name'],
                        icon="icon-database-not-connected" if not connected \
                                else "pg-icon-database",
                        connected=connected,
                        spcname=row['spcname'],
                        allowConn=row['datallowconn'],
                        canCreate=row['cancreate']
                    ),
                    status=200
                    )
    @check_precondition(action="properties")
    def properties(self, gid, sid, did):
        SQL = render_template("/".join([self.template_path, 'properties.sql']), did=did)
        status, res = self.conn.execute_dict(SQL)

        if not status:
            return internal_server_error(errormsg=res)

        SQL = render_template("/".join([self.template_path, 'acl.sql']), did=did)
        status, dataclres = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=res)

        res = self.formatdbacl(res, dataclres['rows'])

        SQL = render_template("/".join([self.template_path, 'defacl.sql']), did=did)
        status, defaclres = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=res)

        res = self.formatdbacl(res, defaclres['rows'])

        result = res['rows'][0]
        # Fetching variable for database
        SQL = render_template("/".join([self.template_path, 'get_variables.sql']), did=did)

        status, res1 = self.conn.execute_dict(SQL)

        if not status:
            return internal_server_error(errormsg=res1)
        # sending result to formtter
        frmtd_reslt = self.formatter(result, res1)
        # mergeing formated result with main result again
        result.update(frmtd_reslt)
        return ajax_response(
                response=result,
                status=200
                )

    @staticmethod
    def formatter(result, varibles_rset):
        """ We will use this function to format our output for
        security label & variables"""
        frmtd_result = dict()
        sec_lbls = []
        if 'seclabels' in result and result['seclabels'] is not None:
            for sec in result['seclabels']:
                sec = re.search(r'([^=]+)=(.*$)', sec)
                sec_lbls.append({
                    'provider': sec.group(1),
                    'security_label': sec.group(2)
                    })
        frmtd_result.update({"seclabels" :sec_lbls})

        variablesLst = []
        for row in varibles_rset['rows']:
            for d in row['setconfig']:
                var_name, var_value = d.split("=")
                # Because we save as boolean string in db so it needs conversion
                if var_value == 'false' or var_value == 'off':
                    var_value = False
                variablesLst.append({'role': row['user_name'], 'name': var_name, 'value': var_value, 'database': row['db_name']})
        frmtd_result.update({"variables" : variablesLst})
        # returning final result
        return frmtd_result

    @staticmethod
    def formatdbacl(res, dbacl):
        for row in dbacl:
            priv = parse_priv_from_db(row)
            if row['deftype'] in res['rows'][0]:
                res['rows'][0][row['deftype']].append(priv)
            else:
                res['rows'][0][row['deftype']] = [priv]
        return res

    def module_js(self):
        """
        This property defines (if javascript) exists for this node.
        Override this property for your own logic.
        """
        return make_response(
                render_template(
                    "databases/js/databases.js",
                    _=_
                    ),
                200, {'Content-Type': 'application/x-javascript'}
                )

    def connect(self, gid, sid, did):
        """Connect the Database."""
        from pgadmin.utils.driver import get_driver
        manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(sid)
        conn = manager.connection(did=did, auto_reconnect=True)
        status, errmsg = conn.connect()

        if not status:
            current_app.logger.error(
                "Could not connected to database(#{0}).\nError: {1}".format(
                  did, errmsg
                  )
                )

            return internal_server_error(errmsg)
        else:
            current_app.logger.info('Connection Established for Database Id: \
                %s' % (did))

            return make_json_response(
                        success=1,
                        info=_("Database Connected."),
                        data={
                            'icon': 'pg-icon-database',
                            'connected': True
                            }
                        )

    def disconnect(self, gid, sid, did):
        """Disconnect the database."""

        # Release Connection
        from pgadmin.utils.driver import get_driver
        manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(sid)

        status = manager.release(did=did)

        if not status:
            return unauthorized(_("Database Could Not Disconnect."))
        else:
            return make_json_response(
                    success=1,
                    info=_("Database Disconnected."),
                    data={
                        'icon': 'icon-database-not-connected',
                        'connected': False
                        }
                    )

    @check_precondition(action="getEncodings")
    def getEncodings(self, gid, sid, did=None):
        """
        This function to return list of avialable encodings
        """
        res = [{ 'label': '', 'value': '' }]
        try:
            SQL = render_template("/".join([self.template_path, 'get_encodings.sql']))
            status, rset = self.conn.execute_2darray(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            for row in rset['rows']:
                res.append(
                            { 'label': row['encoding'], 'value': row['encoding'] }
                        )

            return make_json_response(
                    data=res,
                    status=200
                    )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition(action="getCtypes")
    def getCtypes(self, gid, sid, did=None):
        """
        This function to return list of available collation/character types
        """
        res = [{ 'label': '', 'value': '' }]
        default_list = ['C', 'POSIX']
        for val in default_list:
            res.append(
                        {'label': val, 'value': val}
                    )
        try:
            SQL = render_template("/".join([self.template_path, 'get_ctypes.sql']))
            status, rset = self.conn.execute_2darray(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            for row in rset['rows']:
                if row['cname'] not in default_list:
                    res.append(
                                { 'label': row['cname'], 'value': row['cname'] }
                            )

            return make_json_response(
                    data=res,
                    status=200
                    )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition(action="create")
    def create(self, gid, sid):
        """Create the database."""
        required_args = [
            u'name'
        ]

        data = request.form if request.form else json.loads(request.data.decode())

        for arg in required_args:
            if arg not in data:
                return make_json_response(
                    status=410,
                    success=0,
                    errormsg=_(
                        "Couldn't find the required parameter (%s)." % arg
                    )
                )
        try:
            # The below SQL will execute CREATE DDL only
            SQL = render_template("/".join([self.template_path, 'create.sql']), data=data, conn=self.conn)
            status, msg = self.conn.execute_scalar(SQL)
            if not status:
                return internal_server_error(errormsg=msg)

            if 'datacl' in data:
                data['datacl'] = parse_priv_to_db(data['datacl'], 'DATABASE')

            # The below SQL will execute rest DMLs because we can not execute CREATE with any other
            SQL = render_template("/".join([self.template_path, 'grant.sql']), data=data, conn=self.conn)
            SQL = SQL.strip('\n').strip(' ')
            if SQL and SQL != "":
                status, msg = self.conn.execute_scalar(SQL)
                if not status:
                    return internal_server_error(errormsg=msg)

            # We need oid of newly created database
            SQL = render_template("/".join([self.template_path, 'properties.sql']), name=data['name'])
            SQL = SQL.strip('\n').strip(' ')
            if SQL and SQL != "":
                status, res = self.conn.execute_dict(SQL)
                if not status:
                    return internal_server_error(errormsg=res)

            response = res['rows'][0]

            return jsonify(
                node=self.blueprint.generate_browser_node(
                    response['did'],
                    sid,
                    response['name'],
                    icon="icon-database-not-connected",
                    connected=False,
                    tablespace=response['default_tablespace'],
                    allowConn=True,
                    canCreate=response['cancreate'],
                    canDisconn=True
                    )
                )

        except Exception as e:
            return make_json_response(
                status=410,
                success=0,
                errormsg=e.message
            )

    @check_precondition(action="update")
    def update(self, gid, sid, did):
        """Update the database."""

        data = request.form if request.form else json.loads(request.data.decode())
        info = "nothing to update."

        if did is not None:
            # Fetch the name of database for comparison
            SQL = render_template("/".join([self.template_path, 'get_name.sql']), did=did)
            status, name = self.conn.execute_scalar(SQL)
            if not status:
                return internal_server_error(errormsg=name)

            data['old_name'] = name
            if 'name' not in data:
                data['name'] = name

        try:
            for action in ["rename_database", "tablespace"]:
                SQL = self.getOfflineSQL(gid, sid, data, did, action)
                SQL = SQL.strip('\n').strip(' ')
                if SQL and SQL != "":
                    status = self.manager.release(did=did)

                    conn = self.manager.connection()
                    status, msg = conn.execute_scalar(SQL)

                    if not status:
                        return internal_server_error(errormsg=msg)

                    self.conn = self.manager.connection(database=data['name'], auto_reconnect=True)
                    status, errmsg = self.conn.connect()
                    info = "Database updated."

            SQL = self.getOnlineSQL(gid, sid, data, did)
            SQL = SQL.strip('\n').strip(' ')
            if SQL and SQL != "":
                status, msg = self.conn.execute_scalar(SQL)
                if not status:
                    return internal_server_error(errormsg=msg)

                info = "Database updated."

            return make_json_response(
                success=1,
                info = info,
                data={
                    'id': did,
                    'sid': sid,
                    'gid': gid,
                }
            )

        except Exception as e:
            return make_json_response(
                status=410,
                success=0,
                errormsg=str(e)
            )

    @check_precondition(action="drop")
    def delete(self, gid, sid, did):
        """Delete the database."""
        try:
            default_conn = self.manager.connection()
            SQL = render_template("/".join([self.template_path, 'delete.sql']), did=did)
            status, res = default_conn.execute_scalar(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            if res is None:
                return make_json_response(
                    success=0,
                    errormsg=_(
                        'The specified database could not be found.\n'
                    )
                )
            else:

                status = self.manager.release(did=did)

                SQL = render_template("/".join([self.template_path, 'delete.sql']), datname=res, conn=self.conn)

                status, msg = default_conn.execute_scalar(SQL)
                if not status:
                    # reconnect if database drop failed.
                    conn = self.manager.connection(did=did, auto_reconnect=True)
                    status, errmsg = conn.connect()
                    return internal_server_error(errormsg=msg)

        except Exception as e:
            return make_json_response(
                success=0,
                errormsg=str(e))

        return make_json_response(success=1)

    @check_precondition(action="msql")
    def msql(self, gid, sid, did=None):
        """
        This function to return modified SQL.
        """
        data = {}
        for k, v in request.args.items():
            try:
                data[k] = json.loads(v)
            except ValueError:
                data[k] = v
        try:
            SQL = self.getSQL(gid, sid, data, did)
            SQL = SQL.strip('\n').strip(' ')
            return make_json_response(
                    data=SQL,
                    status=200
                    )
        except Exception as e:
            return make_json_response(
                    data="-- modified SQL",
                    status=200
                    )

    def getSQL(self, gid, sid, data, did=None):
        SQL = ''
        if did is not None:
            # Fetch the name of database for comparison
            SQL = render_template("/".join([self.template_path, 'get_name.sql']), did=did)
            status, name = self.conn.execute_scalar(SQL)
            if not status:
                return internal_server_error(errormsg=name)

            data['old_name'] = name
            if 'name' not in data:
                data['name'] = name
            SQL = ''
            for action in ["rename_database", "tablespace"]:
                SQL += self.getOfflineSQL(gid, sid, data, did, action)

            SQL += self.getOnlineSQL(gid, sid, data, did)
        else:
            SQL += self.getNewSQL(gid, sid, data, did)
        return SQL

    def getNewSQL(self, gid, sid, data, did=None):
        """
        Generates sql for creating new database.
        """
        required_args = [
                u'name'
            ]

        for arg in required_args:
            if arg not in data:
                return " -- definition incomplete"
        # Privileges
        data['datacl'] = parse_priv_to_db(data['datacl'], 'DATABASE')

        # Default privileges
        for key in ['deftblacl', 'defseqacl', 'deffuncacl', 'deftypeacl']:
            if key in data and data[key] is not None:
                data[key] = parse_priv_to_db(data[key])

        SQL = render_template("/".join([self.template_path, 'create.sql']), data=data)
        SQL += "\n"
        SQL += render_template("/".join([self.template_path, 'grant.sql']), data=data)
        return SQL

    def getOnlineSQL(self, gid, sid, data, did=None):
        """
        Generates sql for altering database which don not require
        database to be disconnected before applying.
        """

        for key in ['datacl', 'deftblacl', 'defseqacl', 'deffuncacl', 'deftypeacl']:
            if key in data and data[key] is not None:
                if 'added' in data[key]:
                  data[key]['added'] = parse_priv_to_db(data[key]['added'])
                if 'changed' in data[key]:
                  data[key]['changed'] = parse_priv_to_db(data[key]['changed'])
                if 'deleted' in data[key]:
                  data[key]['deleted'] = parse_priv_to_db(data[key]['deleted'])

        return render_template("/".join([self.template_path, 'alter_online.sql']), data=data, conn=self.conn)

    def getOfflineSQL(self, gid, sid, data, did=None, action=None):
        """
        Generates sql for altering database which require
        database to be disconnected before applying.
        """

        return render_template("/".join([self.template_path, 'alter_offline.sql']),
                               data=data, conn=self.conn, action=action)

    @check_precondition(action="variable_options")
    def variable_options(self, gid, sid):
        res = []
        SQL = render_template("/".join([self.template_path, 'variables.sql']))
        status, rset = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=rset)

        return make_json_response(
                data=rset['rows'],
                status=200
                )

    @check_precondition(action="sql")
    def sql(self, gid, sid, did):
        """
        This function will generate sql for sql panel
        """
        try:
            SQL = render_template("/".join([self.template_path, 'properties.sql']), did=did)
            status, res = self.conn.execute_dict(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            SQL = render_template("/".join([self.template_path, 'acl.sql']), did=did)
            status, dataclres = self.conn.execute_dict(SQL)
            if not status:
                return internal_server_error(errormsg=res)
            res = self.formatdbacl(res, dataclres['rows'])

            SQL = render_template("/".join([self.template_path, 'defacl.sql']), did=did)
            status, defaclres = self.conn.execute_dict(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            res = self.formatdbacl(res, defaclres['rows'])

            result = res['rows'][0]

            SQL = render_template("/".join([self.template_path, 'get_variables.sql']), did=did)
            status, res1 = self.conn.execute_dict(SQL)
            if not status:
                return internal_server_error(errormsg=res1)

            frmtd_reslt = self.formatter(result, res1)
            result.update(frmtd_reslt)

            SQL = self.getNewSQL(gid, sid, result, did)
            return ajax_response(response=SQL)

        except Exception as e:
            return ajax_response(response=str(e))

DatabaseView.register_node_view(blueprint)
