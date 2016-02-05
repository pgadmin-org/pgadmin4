##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
import json
from flask import render_template, make_response, request, jsonify
from flask.ext.babel import gettext
from pgadmin.utils.ajax import make_json_response, \
    make_response as ajax_response, internal_server_error
from pgadmin.browser.utils import NodeView
from pgadmin.browser.collection import CollectionNodeModule
import pgadmin.browser.server_groups.servers as servers
from pgadmin.utils.ajax import precondition_required
from pgadmin.utils.driver import get_driver
from config import PG_DEFAULT_DRIVER
from pgadmin.browser.server_groups.servers.utils import parse_priv_from_db, \
    parse_priv_to_db
from functools import wraps


class TablespaceModule(CollectionNodeModule):
    NODE_TYPE = 'tablespace'
    COLLECTION_LABEL = gettext("Tablespaces")

    def __init__(self, *args, **kwargs):
        self.min_ver = None
        self.max_ver = None

        super(TablespaceModule, self).__init__(*args, **kwargs)

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


class TablespaceView(NodeView):
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
        'children': [{'get': 'children'}],
        'sql': [{'get': 'sql'}],
        'msql': [{'get': 'msql'}, {'get': 'msql'}],
        'stats': [{'get': 'statistics'}],
        'dependency': [{'get': 'dependencies'}],
        'dependent': [{'get': 'dependents'}],
        'module.js': [{}, {}, {'get': 'module_js'}],
        'vopts': [{}, {'get': 'variable_options'}]
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
            # Here args[0] will hold self & kwargs will hold gid,sid,did
            self = args[0]
            self.manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(kwargs['sid'])
            self.conn = self.manager.connection()

            # If DB not connected then return error to browser
            if not self.conn.connected():
                return precondition_required(
                    gettext(
                            "Connection to the server has been lost!"
                    )
                )

            ver = self.manager.version
            if ver >= 90200:
                self.template_path = 'tablespaces/sql/9.2_plus'
            elif 90100 >= ver < 90200:
                self.template_path = 'tablespaces/sql/9.1_plus'
            else:
                self.template_path = 'tablespaces/sql/pre_9.1'

            return f(*args, **kwargs)
        return wrap

    @check_precondition
    def list(self, gid, sid):
        SQL = render_template("/".join([self.template_path, 'properties.sql']))
        status, res = self.conn.execute_dict(SQL)

        if not status:
            return internal_server_error(errormsg=res)
        return ajax_response(
                response=res['rows'],
                status=200
                )

    @check_precondition
    def nodes(self, gid, sid):
        res = []
        SQL = render_template("/".join([self.template_path, 'properties.sql']))
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

    def _formatter(self, data, did=None):
        """
        Args:
            data: dict of query result
            did: tablespace oid

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
                seclabels.append({'provider': k, 'security_label': v})

            data['seclabels'] = seclabels

        # We need to parse & convert ACL coming from database to json format
        SQL = render_template("/".join([self.template_path, 'acl.sql']),
                              did=did)
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
    def properties(self, gid, sid, did):
        SQL = render_template("/".join([self.template_path, 'properties.sql']),
                              did=did, conn=self.conn)
        status, res = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=res)

        # Making copy of output for future use
        copy_data = dict(res['rows'][0])
        copy_data = self._formatter(copy_data, did)

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

        data = request.form if request.form else json.loads(request.data.decode())

        for arg in required_args:
            if arg not in data:
                return make_json_response(
                    status=410,
                    success=0,
                    errormsg=gettext(
                        "Couldn't find the required parameter (%s)." %
                        required_args[arg]
                    )
                )

        # To format privileges coming from client
        if 'spcacl' in data:
            data['spcacl'] = parse_priv_to_db(data['spcacl'], 'TABLESPACE')

        try:
            SQL = render_template("/".join([self.template_path, 'create.sql']),
                                  data=data, conn=self.conn)
            status, res = self.conn.execute_scalar(SQL)
            if not status:
                return internal_server_error(errormsg=res)
            SQL = render_template("/".join([self.template_path, 'alter.sql']),
                                  data=data, conn=self.conn)
            # Checking if we are not executing empty query
            if SQL and SQL.strip('\n') and SQL.strip(' '):
                status, res = self.conn.execute_scalar(SQL)
                if not status:
                    return internal_server_error(errormsg=res)
            # To fetch the oid of newly created tablespace
            SQL = render_template("/".join([self.template_path, 'alter.sql']),
                                  tablespace=data['name'], conn=self.conn)
            status, did = self.conn.execute_scalar(SQL)
            if not status:

                return internal_server_error(errormsg=did)

            return jsonify(
                node=self.blueprint.generate_browser_node(
                    did,
                    sid,
                    data['name'],
                    icon="icon-tablespace"
                )
            )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def update(self, gid, sid, did):
        """
        This function will update tablespace object
        """
        data = request.form if request.form else json.loads(request.data.decode())

        try:
            SQL = self.getSQL(gid, sid, data, did)
            if SQL and SQL.strip('\n') and SQL.strip(' '):
                status, res = self.conn.execute_scalar(SQL)
                if not status:
                    return internal_server_error(errormsg=res)

                return make_json_response(
                    success=1,
                    info="Tablespace updated",
                    data={
                        'id': did,
                        'sid': sid,
                        'gid': gid
                    }
                )
            else:
                return make_json_response(
                    success=1,
                    info="Nothing to update",
                    data={
                        'id': did,
                        'sid': sid,
                        'gid': gid
                    }
                )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def delete(self, gid, sid, did):
        """
        This function will drop the tablespace object
        """
        try:
            # Get name for tablespace from did
            SQL = render_template("/".join([self.template_path, 'delete.sql']),
                                  did=did, conn=self.conn)
            status, tsname = self.conn.execute_scalar(SQL)
            if not status:
                return internal_server_error(errormsg=tsname)
            # drop tablespace
            SQL = render_template("/".join([self.template_path, 'delete.sql']),
                                  tsname=tsname, conn=self.conn)
            status, res = self.conn.execute_scalar(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            return make_json_response(
                success=1,
                info=gettext("Tablespace dropped"),
                data={
                    'id': did,
                    'sid': sid,
                    'gid': gid,
                }
            )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def msql(self, gid, sid, did=None):
        """
        This function to return modified SQL
        """
        data = dict()
        for k, v in request.args.items():
            try:
                data[k] = json.loads(v)
            except ValueError:
                data[k] = v
        try:
            SQL = self.getSQL(gid, sid, data, did)

            if SQL and SQL.strip('\n') and SQL.strip(' '):
                return make_json_response(
                        data=SQL,
                        status=200
                        )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    def getSQL(self, gid, sid, data, did=None):
        """
        This function will genrate sql from model/properties data
        """
        required_args = [
            'name'
        ]

        if did is not None:
            SQL = render_template("/".join([self.template_path, 'properties.sql']),
                                  did=did, conn=self.conn)
            status, res = self.conn.execute_dict(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            # Making copy of output for further processing
            old_data = dict(res['rows'][0])
            old_data = self._formatter(old_data, did)

            # To format privileges data coming from client
            for key in ['spcacl']:
                if key in data and data[key] is not None:
                    if 'added' in data[key]:
                      data[key]['added'] = parse_priv_to_db(data[key]['added'], 'TABLESPACE')
                    if 'changed' in data[key]:
                      data[key]['changed'] = parse_priv_to_db(data[key]['changed'], 'TABLESPACE')
                    if 'deleted' in data[key]:
                      data[key]['deleted'] = parse_priv_to_db(data[key]['deleted'], 'TABLESPACE')

            # If name is not present with in update data then copy it
            # from old data
            for arg in required_args:
                if arg not in data:
                    data[arg] = old_data[arg]

            SQL = render_template("/".join([self.template_path, 'update.sql']),
                                  data=data, o_data=old_data)
        else:
            # To format privileges coming from client
            if 'spcacl' in data:
                data['spcacl'] = parse_priv_to_db(data['spcacl'], 'TABLESPACE')
            # If the request for new object which do not have did
            SQL = render_template("/".join([self.template_path, 'create.sql']),
                                  data=data)
            SQL += "\n"
            SQL += render_template("/".join([self.template_path, 'alter.sql']),
                                   data=data)

        return SQL

    @check_precondition
    def sql(self, gid, sid, did):
        """
        This function will generate sql for sql panel
        """
        SQL = render_template("/".join([self.template_path, 'properties.sql']),
                              did=did, conn=self.conn)
        status, res = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=res)

        # Making copy of output for future use
        old_data = dict(res['rows'][0])

        old_data = self._formatter(old_data, did)

        # To format privileges
        if 'spcacl' in old_data:
            old_data['spcacl'] = parse_priv_to_db(old_data['spcacl'], 'TABLESPACE')

        SQL = ''
        # We are not showing create sql for system tablespace
        if not old_data['name'].startswith('pg_'):
            SQL = render_template("/".join([self.template_path, 'create.sql']),
                                  data=old_data)
            SQL += "\n"
        SQL += render_template("/".join([self.template_path, 'alter.sql']),
                               data=old_data)

        sql_header = """
-- Tablespace: {0}

-- DROP TABLESPACE {0}

""".format(old_data['name'])

        SQL = sql_header + SQL

        return ajax_response(response=SQL)


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
        res = []
        SQL = render_template("/".join([self.template_path, 'variables.sql']))
        status, rset = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=rset)

        return make_json_response(
                data=rset['rows'],
                status=200
                )

    @check_precondition
    def stats(self, gid, sid, did):
        """
        This function will return data for statistics panel
        """
        SQL = render_template("/".join([self.template_path, 'stats.sql']),
                              did=did)
        status, res = self.conn.execute_scalar(SQL)
        if not status:
            return internal_server_error(errormsg=res)

        # TODO:// Format & return output of stats call accordingly
        # TODO:// for now it's hardcoded as below
        result = 'Tablespace Size: {0}'.format(res)
        return ajax_response(response=result)


TablespaceView.register_node_view(blueprint)
