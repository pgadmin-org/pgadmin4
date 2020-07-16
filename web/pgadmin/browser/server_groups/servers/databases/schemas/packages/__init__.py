##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Implements Package Node"""
import re
from functools import wraps

import simplejson as json
from flask import render_template, request, jsonify
from flask_babelex import gettext as _

import pgadmin.browser.server_groups.servers.databases as database
from config import PG_DEFAULT_DRIVER
from pgadmin.browser.server_groups.servers.databases.schemas.utils \
    import SchemaChildModule
from pgadmin.browser.server_groups.servers.utils import parse_priv_from_db, \
    parse_priv_to_db
from pgadmin.browser.utils import PGChildNodeView
from pgadmin.tools.schema_diff.compare import SchemaDiffObjectCompare
from pgadmin.tools.schema_diff.node_registry import SchemaDiffRegistry
from pgadmin.utils.ajax import make_json_response, \
    make_response as ajax_response, internal_server_error, \
    precondition_required, gone
from pgadmin.utils.driver import get_driver


class PackageModule(SchemaChildModule):
    """
    class PackageModule(CollectionNodeModule)

        A module class for Package node derived from CollectionNodeModule.

    Methods:
    -------
    * __init__(*args, **kwargs)
      - Method is used to initialize the PackageModule and it's base module.

    * get_nodes(gid, sid, did)
      - Method is used to generate the browser collection node.

    * script_load()
      - Load the module script for package, when any of the database node is
        initialized.

    * node_inode()
      - Method is overridden from its base class to make the node as leaf node.

    """

    _NODE_TYPE = 'package'
    _COLLECTION_LABEL = _("Packages")

    def __init__(self, *args, **kwargs):
        super(PackageModule, self).__init__(*args, **kwargs)
        self.min_ver = 90100
        self.max_ver = None
        self.server_type = ['ppas']

    def get_nodes(self, gid, sid, did, scid):
        """
        Generate the package node
        """
        yield self.generate_browser_collection_node(scid)

    @property
    def script_load(self):
        """
        Load the module script for schema, when any of the database node is
        initialized.
        """
        return database.DatabaseModule.node_type


blueprint = PackageModule(__name__)


class PackageView(PGChildNodeView, SchemaDiffObjectCompare):
    node_type = blueprint.node_type

    parent_ids = [
        {'type': 'int', 'id': 'gid'},
        {'type': 'int', 'id': 'sid'},
        {'type': 'int', 'id': 'did'},
        {'type': 'int', 'id': 'scid'}
    ]
    ids = [
        {'type': 'int', 'id': 'pkgid'}
    ]

    operations = dict({
        'obj': [
            {'get': 'properties', 'delete': 'delete', 'put': 'update'},
            {'get': 'list', 'post': 'create', 'delete': 'delete'}
        ],
        'delete': [{'delete': 'delete'}, {'delete': 'delete'}],
        'children': [{'get': 'children'}],
        'nodes': [{'get': 'nodes'}, {'get': 'nodes'}],
        'sql': [{'get': 'sql'}],
        'msql': [{'get': 'msql'}, {'get': 'msql'}],
        'stats': [{'get': 'statistics'}, {'get': 'statistics'}],
        'dependency': [{'get': 'dependencies'}],
        'dependent': [{'get': 'dependents'}]
    })

    keys_to_ignore = ['oid', 'schema', 'xmin', 'oid-2', 'acl']

    def check_precondition(action=None):
        """
        This function will behave as a decorator which will checks
        database connection before running view, it will also attaches
        manager,conn & template_path properties to self
        """

        def wrap(f):
            @wraps(f)
            def wrapped(self, *args, **kwargs):

                driver = get_driver(PG_DEFAULT_DRIVER)
                self.manager = driver.connection_manager(kwargs['sid'])
                self.qtIdent = driver.qtIdent

                if 'did' in kwargs:
                    self.conn = self.manager.connection(did=kwargs['did'])
                else:
                    self.conn = self.manager.connection()
                # If DB not connected then return error to browser
                if not self.conn.connected():
                    return precondition_required(
                        _(
                            "Connection to the server has been lost."
                        )
                    )
                self.template_path = 'packages/ppas/#{0}#'.format(
                    self.manager.version)

                sql = render_template(
                    "/".join([self.template_path, 'get_schema.sql']),
                    scid=kwargs['scid']
                )
                status, rset = self.conn.execute_scalar(sql)
                if not status:
                    return internal_server_error(errormsg=rset)

                self.schema = rset
                # Allowed ACL on package
                self.acl = ['X']

                return f(self, *args, **kwargs)

            return wrapped

        return wrap

    @check_precondition(action='list')
    def list(self, gid, sid, did, scid):
        """
        This function is used to list all the package nodes within the
        collection.

        Args:
          gid: Server Group ID
          sid: Server ID
          did: Database ID
          scid: Schema ID

        Returns:

        """
        SQL = render_template("/".join([self.template_path,
                                        self._PROPERTIES_SQL]),
                              scid=scid)
        status, res = self.conn.execute_dict(SQL)

        if not status:
            return internal_server_error(errormsg=res)
        return ajax_response(
            response=res['rows'],
            status=200
        )

    @check_precondition(action='nodes')
    def nodes(self, gid, sid, did, scid, pkgid=None):
        """
        This function is used to create all the child nodes within the
        collection.
        Here it will create all the package nodes.

        Args:
          gid: Server Group ID
          sid: Server ID
          did: Database ID
          scid: Schema ID

        Returns:

        """
        res = []
        sql = render_template(
            "/".join([self.template_path, self._NODES_SQL]),
            scid=scid,
            pkgid=pkgid
        )
        status, rset = self.conn.execute_dict(sql)
        if not status:
            return internal_server_error(errormsg=rset)

        if pkgid is not None:
            if len(rset['rows']) == 0:
                return gone(
                    errormsg=_("Could not find the package.")
                )

            row = rset['rows'][0]
            return make_json_response(
                data=self.blueprint.generate_browser_node(
                    row['oid'],
                    scid,
                    row['name'],
                    icon="icon-%s" % self.node_type
                )
            )

        for row in rset['rows']:
            res.append(
                self.blueprint.generate_browser_node(
                    row['oid'],
                    scid,
                    row['name'],
                    icon="icon-%s" % self.node_type
                ))

        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition(action='node')
    def node(self, gid, sid, did, scid, pkgid):
        """
        This function will show the selected package node.

        Args:
          gid: Server Group ID
          sid: Server ID
          did: Database ID
          scid: Schema ID
          pkgid: Package ID

        Returns:

        """
        res = []
        sql = render_template(
            "/".join([self.template_path, self._PROPERTIES_SQL]),
            scid=scid, pkgid=pkgid
        )
        status, rset = self.conn.execute_dict(sql)

        if not status:
            return internal_server_error(errormsg=rset)

        if len(rset['rows']) == 0:
            return gone(
                errormsg=_("Could not find the package in the database.")
            )

        for row in rset['rows']:
            res.append(
                self.blueprint.generate_browser_node(
                    row['oid'],
                    scid,
                    row['name'],
                    icon="icon-%s" % self.node_type
                ))

        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition(action='properties')
    def properties(self, gid, sid, did, scid, pkgid):
        """
        This function will show the properties of the selected package node.

        Args:
          gid: Server Group ID
          sid: Server ID
          did: Database ID
          scid: Schema ID
          pkgid: Package ID

        Returns:

        """
        status, res = self._fetch_properties(scid, pkgid)
        if not status:
            return res

        return ajax_response(
            response=res,
            status=200
        )

    def _fetch_properties(self, scid, pkgid):
        """
        This function is used to fetch the properties of specified object.
        :param scid:
        :param pkgid:
        :return:
        """
        sql = render_template("/".join([self.template_path,
                                        self._PROPERTIES_SQL]),
                              scid=scid, pkgid=pkgid)
        status, res = self.conn.execute_dict(sql)

        if not status:
            return False, internal_server_error(errormsg=res)

        if len(res['rows']) == 0:
            return False, gone(
                errormsg=_("Could not find the package in the database.")
            )

        res['rows'][0]['pkgheadsrc'] = self.get_inner(
            res['rows'][0]['pkgheadsrc'])
        res['rows'][0]['pkgbodysrc'] = self.get_inner(
            res['rows'][0]['pkgbodysrc'])

        sql = render_template("/".join([self.template_path, self._ACL_SQL]),
                              scid=scid,
                              pkgid=pkgid)
        status, rset1 = self.conn.execute_dict(sql)

        if not status:
            return False, internal_server_error(errormsg=rset1)

        for row in rset1['rows']:
            priv = parse_priv_from_db(row)
            res['rows'][0].setdefault(row['deftype'], []).append(priv)

        res['rows'][0]['schema'] = self.schema

        return True, res['rows'][0]

    @check_precondition(action="create")
    def create(self, gid, sid, did, scid):
        """
        Create the package.

        Args:
          gid: Server Group ID
          sid: Server ID
          did: Database ID
          scid: Schema ID

        Returns:

        """
        required_args = [
            u'name',
            u'pkgheadsrc'
        ]

        data = request.form if request.form else json.loads(
            request.data, encoding='utf-8'
        )

        for arg in required_args:
            if arg not in data:
                return make_json_response(
                    status=400,
                    success=0,
                    errormsg=_(
                        "Could not find the required parameter ({})."
                    ).format(arg)
                )
        data['schema'] = self.schema

        sql, name = self.getSQL(data=data, scid=scid, pkgid=None)

        status, msg = self.conn.execute_scalar(sql)
        if not status:
            return internal_server_error(errormsg=msg)

        # We need oid of newly created package.
        sql = render_template(
            "/".join([
                self.template_path, self._OID_SQL
            ]),
            name=data['name'], scid=scid
        )

        sql = sql.strip('\n').strip(' ')
        if sql and sql != "":
            status, pkgid = self.conn.execute_scalar(sql)
            if not status:
                return internal_server_error(errormsg=pkgid)

        return jsonify(
            node=self.blueprint.generate_browser_node(
                pkgid,
                scid,
                data['name'],
                icon="icon-%s" % self.node_type
            )
        )

    @check_precondition(action='delete')
    def delete(self, gid, sid, did, scid, pkgid=None, only_sql=False):
        """
        This function will drop the object

        Args:
          gid: Server Group ID
          sid: Server ID
          did: Database ID
          scid: Schema ID
          pkgid: Package ID
          only_sql: Return SQL only if True

        Returns:

        """

        if pkgid is None:
            data = request.form if request.form else json.loads(
                request.data, encoding='utf-8'
            )
        else:
            data = {'ids': [pkgid]}

        # Below will decide if it's simple drop or drop with cascade call
        if self.cmd == 'delete':
            # This is a cascade operation
            cascade = True
        else:
            cascade = False

        try:
            for pkgid in data['ids']:
                sql = render_template(
                    "/".join([self.template_path, self._PROPERTIES_SQL]),
                    scid=scid,
                    pkgid=pkgid)
                status, res = self.conn.execute_dict(sql)
                if not status:
                    return internal_server_error(errormsg=res)

                elif not res['rows']:
                    return make_json_response(
                        success=0,
                        errormsg=_(
                            'Error: Object not found.'
                        ),
                        info=_(
                            'The specified package could not be found.\n'
                        )
                    )

                res['rows'][0]['schema'] = self.schema

                sql = render_template("/".join([self.template_path,
                                                self._DELETE_SQL]),
                                      data=res['rows'][0],
                                      cascade=cascade)

                if only_sql:
                    return sql

                status, res = self.conn.execute_scalar(sql)
                if not status:
                    return internal_server_error(errormsg=res)

            return make_json_response(
                success=1,
                info=_("Package dropped")
            )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition(action='update')
    def update(self, gid, sid, did, scid, pkgid):
        """
        This function will update the object

        Args:
          gid: Server Group ID
          sid: Server ID
          did: Database ID
          scid: Schema ID
          pkgid: Package ID

        Returns:

        """
        data = request.form if request.form else json.loads(
            request.data, encoding='utf-8'
        )

        sql, name = self.getSQL(data=data, scid=scid, pkgid=pkgid)
        # Most probably this is due to error
        if not isinstance(sql, str):
            return sql

        sql = sql.strip('\n').strip(' ')
        status, res = self.conn.execute_scalar(sql)
        if not status:
            return internal_server_error(errormsg=res)

        return jsonify(
            node=self.blueprint.generate_browser_node(
                pkgid,
                scid,
                name,
                icon="icon-%s" % self.node_type
            )
        )

    @check_precondition(action='msql')
    def msql(self, gid, sid, did, scid, pkgid=None):
        """
        This function to return modified SQL.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID
            pkgid: Package ID
        """

        data = {}
        for k, v in request.args.items():
            try:
                data[k] = json.loads(v, encoding='utf-8')
            except (ValueError, TypeError, KeyError):
                data[k] = v

        if pkgid is None:
            required_args = [
                'name',
                'pkgheadsrc'
            ]

            for arg in required_args:
                if arg not in data:
                    return make_json_response(
                        status=400,
                        success=0,
                        errormsg=_(
                            "Could not find the required parameter ({})."
                        ).format(arg)
                    )

        sql, name = self.getSQL(data=data, scid=scid, pkgid=pkgid)
        # Most probably this is due to error
        if not isinstance(sql, str):
            return sql

        sql = sql.strip('\n').strip(' ')
        if sql == '':
            sql = "--modified SQL"
        return make_json_response(
            data=sql,
            status=200
        )

    def getSQL(self, **kwargs):
        """
        This function will generate sql from model data.
        :param kwargs
        :return:
        """

        scid = kwargs.get('scid')
        data = kwargs.get('data')
        pkgid = kwargs.get('pkgid', None)
        sqltab = kwargs.get('sqltab', False)
        diff_schema = kwargs.get('diff_schema', None)

        if diff_schema:
            data['schema'] = diff_schema
        else:
            data['schema'] = self.schema

        if pkgid is not None and not sqltab:
            return self.get_sql_with_pkgid(scid, pkgid, data, diff_schema)
        else:
            # To format privileges coming from client
            if 'pkgacl' in data:
                data['pkgacl'] = parse_priv_to_db(data['pkgacl'], self.acl)

            sql = render_template("/".join([self.template_path,
                                            self._CREATE_SQL]),
                                  data=data, conn=self.conn)

            return sql, data['name']

    def format_privilege_data(self, data):
        # To format privileges data coming from client
        for key in ['pkgacl']:
            if key in data and data[key] is not None:
                if 'added' in data[key]:
                    data[key]['added'] = parse_priv_to_db(
                        data[key]['added'], self.acl)
                if 'changed' in data[key]:
                    data[key]['changed'] = parse_priv_to_db(
                        data[key]['changed'], self.acl)
                if 'deleted' in data[key]:
                    data[key]['deleted'] = parse_priv_to_db(
                        data[key]['deleted'], self.acl)

    def get_sql_with_pkgid(self, scid, pkgid, data, diff_schema):
        required_args = [
            u'name'
        ]
        sql = render_template(
            "/".join([self.template_path, self._PROPERTIES_SQL]), scid=scid,
            pkgid=pkgid)
        status, res = self.conn.execute_dict(sql)
        if not status:
            return internal_server_error(errormsg=res)
        elif len(res['rows']) == 0:
            return gone(
                errormsg=_("Could not find the package in the database.")
            )

        res['rows'][0]['pkgheadsrc'] = self.get_inner(
            res['rows'][0]['pkgheadsrc'])
        res['rows'][0]['pkgbodysrc'] = self.get_inner(
            res['rows'][0]['pkgbodysrc'])

        sql = render_template("/".join([self.template_path, self._ACL_SQL]),
                              scid=scid,
                              pkgid=pkgid)

        status, rset1 = self.conn.execute_dict(sql)

        if not status:
            return internal_server_error(errormsg=rset1)

        for row in rset1['rows']:
            priv = parse_priv_from_db(row)
            res['rows'][0].setdefault(row['deftype'], []).append(priv)

        # Making copy of output for further processing
        old_data = dict(res['rows'][0])

        # To format privileges data coming from client
        self.format_privilege_data(data)

        # If name is not present with in update data then copy it
        # from old data
        for arg in required_args:
            if arg not in data:
                data[arg] = old_data[arg]

        sql = render_template("/".join([self.template_path,
                                        self._UPDATE_SQL]),
                              data=data, o_data=old_data, conn=self.conn,
                              is_schema_diff=diff_schema)
        return sql, data['name'] if 'name' in data else old_data['name']

    @check_precondition(action="sql")
    def sql(self, gid, sid, did, scid, pkgid, **kwargs):
        """
        This function will generate sql for sql panel

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID
            pkgid: Package ID
            diff_schema:  Schema diff target schema name
            json_resp: json response or plain text response
        """
        diff_schema = kwargs.get('diff_schema', None)
        json_resp = kwargs.get('json_resp', True)

        try:
            sql = render_template(
                "/".join([self.template_path, self._PROPERTIES_SQL]),
                scid=scid, pkgid=pkgid)
            status, res = self.conn.execute_dict(sql)
            if not status:
                return internal_server_error(errormsg=res)
            if len(res['rows']) == 0:
                return gone(
                    errormsg=_("Could not find the package in the database.")
                )

            res['rows'][0]['pkgheadsrc'] = self.get_inner(
                res['rows'][0]['pkgheadsrc'])
            res['rows'][0]['pkgbodysrc'] = self.get_inner(
                res['rows'][0]['pkgbodysrc'])

            sql = render_template("/".join([self.template_path,
                                            self._ACL_SQL]),
                                  scid=scid,
                                  pkgid=pkgid)
            status, rset1 = self.conn.execute_dict(sql)

            if not status:
                return internal_server_error(errormsg=rset1)

            for row in rset1['rows']:
                priv = parse_priv_from_db(row)
                res['rows'][0].setdefault(row['deftype'], []).append(priv)

            result = res['rows'][0]
            sql, name = self.getSQL(data=result, scid=scid, pkgid=pkgid,
                                    sqltab=True, diff_schema=diff_schema)
            # Most probably this is due to error
            if not isinstance(sql, str):
                return sql

            sql = sql.strip('\n').strip(' ')

            # Return sql for schema diff
            if not json_resp:
                return sql

            sql_header = u"-- Package: {0}.{1}\n\n-- ".format(
                self.schema, result['name'])

            sql_header += render_template(
                "/".join([self.template_path, self._DELETE_SQL]),
                data=result)
            sql_header += "\n\n"

            sql = sql_header + sql

            return ajax_response(response=sql)

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition(action="dependents")
    def dependents(self, gid, sid, did, scid, pkgid):
        """
        This function gets the dependents and returns an ajax response
        for the package node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID
            pkgid: Package ID
        """
        dependents_result = self.get_dependents(self.conn, pkgid)
        return ajax_response(
            response=dependents_result,
            status=200
        )

    @check_precondition(action="dependencies")
    def dependencies(self, gid, sid, did, scid, pkgid):
        """
        This function gets the dependencies and returns an ajax response
        for the package node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID
            pkgid: Package ID
        """
        dependencies_result = self.get_dependencies(self.conn, pkgid)

        return ajax_response(
            response=dependencies_result,
            status=200
        )

    @staticmethod
    def get_inner(sql):
        if sql is None:
            return None
        start = 0
        start_position = re.search("\\s+[is|as]+\\s+", sql, flags=re.I)

        if start_position:
            start = start_position.start() + 4

        try:
            end_position = [i for i in re.finditer("end", sql, flags=re.I)][-1]
            end = end_position.start()
        except IndexError:
            return sql[start:].strip("\n")

        return sql[start:end].strip("\n")

    @check_precondition(action="fetch_objects_to_compare")
    def fetch_objects_to_compare(self, sid, did, scid):
        """
        This function will fetch the list of all the packages for
        specified schema id.

        :param sid: Server Id
        :param did: Database Id
        :param scid: Schema Id
        :return:
        """
        res = dict()
        if self.manager.server_type != 'ppas':
            return res

        sql = render_template("/".join([self.template_path,
                                        self._NODES_SQL]), scid=scid)
        status, rset = self.conn.execute_2darray(sql)
        if not status:
            return internal_server_error(errormsg=res)

        for row in rset['rows']:
            status, data = self._fetch_properties(scid, row['oid'])
            if status:
                res[row['name']] = data

        return res

    def get_sql_from_diff(self, **kwargs):
        """
        This function is used to get the DDL/DML statements.
        :param kwargs
        :return:
        """
        gid = kwargs.get('gid')
        sid = kwargs.get('sid')
        did = kwargs.get('did')
        scid = kwargs.get('scid')
        oid = kwargs.get('oid')
        data = kwargs.get('data', None)
        diff_schema = kwargs.get('diff_schema', None)
        drop_sql = kwargs.get('drop_sql', False)

        if data:
            if diff_schema:
                data['schema'] = diff_schema
            sql, name = self.getSQL(data=data, scid=scid, pkgid=oid)
        else:
            if drop_sql:
                sql = self.delete(gid=gid, sid=sid, did=did,
                                  scid=scid, pkgid=oid, only_sql=True)
            elif diff_schema:
                sql = self.sql(gid=gid, sid=sid, did=did, scid=scid, pkgid=oid,
                               diff_schema=diff_schema, json_resp=False)
            else:
                sql = self.sql(gid=gid, sid=sid, did=did, scid=scid, pkgid=oid,
                               json_resp=False)
        return sql


SchemaDiffRegistry(blueprint.node_type, PackageView)
PackageView.register_node_view(blueprint)
