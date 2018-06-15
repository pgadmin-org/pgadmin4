##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2018, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Implements Package Node"""
import re
from functools import wraps

import simplejson as json
from flask import render_template, make_response, request, jsonify
from flask_babelex import gettext as _

import pgadmin.browser.server_groups.servers.databases as database
from config import PG_DEFAULT_DRIVER
from pgadmin.browser.server_groups.servers.databases.schemas.utils \
    import SchemaChildModule
from pgadmin.browser.server_groups.servers.utils import parse_priv_from_db, \
    parse_priv_to_db
from pgadmin.browser.utils import PGChildNodeView
from pgadmin.utils import IS_PY2
from pgadmin.utils.ajax import make_json_response, \
    make_response as ajax_response, internal_server_error, \
    precondition_required, gone
from pgadmin.utils.driver import get_driver

# If we are in Python3
if not IS_PY2:
    unicode = str


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

    NODE_TYPE = 'package'
    COLLECTION_LABEL = _("Packages")

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
        return database.DatabaseModule.NODE_TYPE


blueprint = PackageModule(__name__)


class PackageView(PGChildNodeView):
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
            {'get': 'list', 'post': 'create'}
        ],
        'delete': [{'delete': 'delete'}],
        'children': [{'get': 'children'}],
        'nodes': [{'get': 'nodes'}, {'get': 'nodes'}],
        'sql': [{'get': 'sql'}],
        'msql': [{'get': 'msql'}, {'get': 'msql'}],
        'stats': [{'get': 'statistics'}, {'get': 'statistics'}],
        'dependency': [{'get': 'dependencies'}],
        'dependent': [{'get': 'dependents'}],
        'module.js': [{}, {}, {'get': 'module_js'}]
    })

    def module_js(self):
        """
        This property defines whether javascript exists for this node.
        """
        return make_response(
            render_template(
                "package/js/package.js",
                _=_
            ),
            200, {'Content-Type': 'application/x-javascript'}
        )

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
                self.template_path = 'package/ppas/#{0}#'.format(
                    self.manager.version)

                SQL = render_template(
                    "/".join([self.template_path, 'get_schema.sql']),
                    scid=kwargs['scid']
                )
                status, rset = self.conn.execute_scalar(SQL)
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
        SQL = render_template("/".join([self.template_path, 'properties.sql']),
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
        SQL = render_template(
            "/".join([self.template_path, 'nodes.sql']),
            scid=scid,
            pkgid=pkgid
        )
        status, rset = self.conn.execute_dict(SQL)
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
        SQL = render_template(
            "/".join([self.template_path, 'properties.sql']),
            scid=scid, pkgid=pkgid
        )
        status, rset = self.conn.execute_dict(SQL)

        if not status:
            return internal_server_error(errormsg=res)

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
        SQL = render_template("/".join([self.template_path, 'properties.sql']),
                              scid=scid, pkgid=pkgid)
        status, res = self.conn.execute_dict(SQL)

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

        SQL = render_template("/".join([self.template_path, 'acl.sql']),
                              scid=scid,
                              pkgid=pkgid)
        status, rset1 = self.conn.execute_dict(SQL)

        if not status:
            return internal_server_error(errormsg=rset1)

        for row in rset1['rows']:
            priv = parse_priv_from_db(row)
            res['rows'][0].setdefault(row['deftype'], []).append(priv)

        return ajax_response(
            response=res['rows'][0],
            status=200
        )

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
                        "Could not find the required parameter (%s)." % arg
                    )
                )
        data['schema'] = self.schema
        # The SQL below will execute CREATE DDL only
        SQL = render_template(
            "/".join([self.template_path, 'create.sql']),
            data=data, conn=self.conn
        )

        status, msg = self.conn.execute_scalar(SQL)
        if not status:
            return internal_server_error(errormsg=msg)

        # We need oid of newly created package.
        SQL = render_template(
            "/".join([
                self.template_path, 'get_oid.sql'
            ]),
            name=data['name'], scid=scid
        )

        SQL = SQL.strip('\n').strip(' ')
        if SQL and SQL != "":
            status, pkgid = self.conn.execute_scalar(SQL)
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
    def delete(self, gid, sid, did, scid, pkgid):
        """
        This function will drop the object

        Args:
          gid: Server Group ID
          sid: Server ID
          did: Database ID
          scid: Schema ID
          pkgid: Package ID

        Returns:

        """
        # Below will decide if it's simple drop or drop with cascade call
        if self.cmd == 'delete':
            # This is a cascade operation
            cascade = True
        else:
            cascade = False

        try:
            SQL = render_template(
                "/".join([self.template_path, 'properties.sql']), scid=scid,
                pkgid=pkgid)
            status, res = self.conn.execute_dict(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            if not res['rows']:
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

            SQL = render_template("/".join([self.template_path, 'delete.sql']),
                                  data=res['rows'][0],
                                  cascade=cascade)

            status, res = self.conn.execute_scalar(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            return make_json_response(
                success=1,
                info=_("Package dropped"),
                data={
                    'id': pkgid,
                    'scid': scid,
                    'sid': sid,
                    'gid': gid,
                    'did': did
                }
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

        SQL, name = self.getSQL(gid, sid, did, data, scid, pkgid)
        # Most probably this is due to error
        if not isinstance(SQL, (str, unicode)):
            return SQL

        SQL = SQL.strip('\n').strip(' ')
        status, res = self.conn.execute_scalar(SQL)
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
                            "Could not find the required parameter (%s)." % arg
                        )
                    )

        SQL, name = self.getSQL(gid, sid, did, data, scid, pkgid)
        # Most probably this is due to error
        if not isinstance(SQL, (str, unicode)):
            return SQL

        SQL = SQL.strip('\n').strip(' ')
        if SQL == '':
            SQL = "--modified SQL"
        return make_json_response(
            data=SQL,
            status=200
        )

    def getSQL(self, gid, sid, did, data, scid, pkgid=None):
        """
        This function will generate sql from model data.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID
            pkgid: Package ID
        """

        required_args = [
            u'name'
        ]

        if pkgid is not None:
            data['schema'] = self.schema
            SQL = render_template(
                "/".join([self.template_path, 'properties.sql']), scid=scid,
                pkgid=pkgid)
            status, res = self.conn.execute_dict(SQL)
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

            SQL = render_template("/".join([self.template_path, 'acl.sql']),
                                  scid=scid,
                                  pkgid=pkgid)

            status, rset1 = self.conn.execute_dict(SQL)

            if not status:
                return internal_server_error(errormsg=rset1)

            for row in rset1['rows']:
                priv = parse_priv_from_db(row)
                res['rows'][0].setdefault(row['deftype'], []).append(priv)

            # Making copy of output for further processing
            old_data = dict(res['rows'][0])

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

            # If name is not present with in update data then copy it
            # from old data
            for arg in required_args:
                if arg not in data:
                    data[arg] = old_data[arg]

            SQL = render_template("/".join([self.template_path, 'update.sql']),
                                  data=data, o_data=old_data, conn=self.conn)
            return SQL, data['name'] if 'name' in data else old_data['name']
        else:
            # To format privileges coming from client
            if 'pkgacl' in data:
                data['pkgacl'] = parse_priv_to_db(data['pkgacl'], self.acl)

            SQL = render_template("/".join([self.template_path, 'create.sql']),
                                  data=data, conn=self.conn)

            return SQL, data['name']

    @check_precondition(action="sql")
    def sql(self, gid, sid, did, scid, pkgid):
        """
        This function will generate sql for sql panel

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID
            pkgid: Package ID
        """
        try:
            SQL = render_template(
                "/".join([self.template_path, 'properties.sql']), scid=scid,
                pkgid=pkgid)
            status, res = self.conn.execute_dict(SQL)
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

            SQL = render_template("/".join([self.template_path, 'acl.sql']),
                                  scid=scid,
                                  pkgid=pkgid)
            status, rset1 = self.conn.execute_dict(SQL)

            if not status:
                return internal_server_error(errormsg=rset1)

            for row in rset1['rows']:
                priv = parse_priv_from_db(row)
                res['rows'][0].setdefault(row['deftype'], []).append(priv)

            result = res['rows'][0]
            sql, name = self.getSQL(gid, sid, did, result, scid, pkgid)
            # Most probably this is due to error
            if not isinstance(sql, (str, unicode)):
                return sql

            sql = sql.strip('\n').strip(' ')

            sql_header = u"-- Package: {}\n\n-- ".format(
                self.qtIdent(self.conn, self.schema, result['name'])
            )

            sql_header += render_template(
                "/".join([self.template_path, 'delete.sql']),
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
        start_position = re.search("\s+[is|as]+\s+", sql, flags=re.I)

        if start_position:
            start = start_position.start() + 4

        try:
            end_position = [i for i in re.finditer("end", sql, flags=re.I)][-1]
            end = end_position.start()
        except IndexError:
            return sql[start:].strip("\n")

        return sql[start:end].strip("\n")


PackageView.register_node_view(blueprint)
