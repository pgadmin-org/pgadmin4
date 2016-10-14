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
from flask import render_template, request, jsonify, current_app
from flask_babel import gettext
from pgadmin.browser.collection import CollectionNodeModule, PGChildModule
from pgadmin.browser.server_groups.servers.utils import parse_priv_from_db, \
    parse_priv_to_db
from pgadmin.browser.utils import PGChildNodeView
from pgadmin.utils.ajax import make_json_response, internal_server_error, \
    make_response as ajax_response, gone, bad_request
from pgadmin.utils.driver import get_driver

from config import PG_DEFAULT_DRIVER

"""
    This module is responsible for generating two nodes
    1) Schema
    2) Catalog

    We have created single file because catalog & schema has same
    functionality, the only difference is we can not perform DDL/DML operations
    on catalog, also - it allows us to share the same submodules for both
    catalog, and schema modules.

    This modules uses separate template paths for each respective node
    - templates/catalog for Catalog node
    - templates/schema for Schema node

    [Each path contains node specific js files as well as sql template files.]
"""


class SchemaModule(CollectionNodeModule):
    """
     class SchemaModule(CollectionNodeModule)

        A module class for Schema node derived from CollectionNodeModule.

    Methods:
    -------
    * __init__(*args, **kwargs)
      - Method is used to initialize the Schema and it's base module.

    * get_nodes(gid, sid, did)
      - Method is used to generate the browser collection node.

    * node_inode()
      - Method is overridden from its base class to make the node as leaf node.

    * script_load()
      - Load the module script for schema, when any of the server node is
        initialized.
    """
    NODE_TYPE = 'schema'
    COLLECTION_LABEL = gettext("Schemas")

    def __init__(self, *args, **kwargs):
        """
        Method is used to initialize the SchemaModule and it's base module.

        Args:
            *args:
            **kwargs:
        """
        self.min_ver = None
        self.max_ver = None

        super(SchemaModule, self).__init__(*args, **kwargs)

    def get_nodes(self, gid, sid, did):
        """
        Generate the collection node
        """
        yield self.generate_browser_collection_node(did)

    @property
    def script_load(self):
        """
        Load the module script for server, when any of the server-group node is
        initialized.
        """
        return servers.ServerModule.NODE_TYPE


class CatalogModule(SchemaModule):
    """
     class CatalogModule(SchemaModule)

        A module class for the catalog schema node derived from SchemaModule.
    """

    NODE_TYPE = 'catalog'
    COLLECTION_LABEL = gettext("Catalogs")


schema_blueprint = SchemaModule(__name__)
catalog_blueprint = CatalogModule(__name__)


def check_precondition(f):
    """
    This function will behave as a decorator which will checks
    database connection before running view, it will also attaches
    manager,conn & template_path properties to instance of the method.

    Assumptions:
        This function will always be used as decorator of a class method.
    """

    @wraps(f)
    def wrap(*args, **kwargs):
        # Here args[0] will hold self & kwargs will hold gid,sid,did
        self = args[0]
        self.manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(
            kwargs['sid']
        )
        if not self.manager:
            return gone(errormsg="Couldn't find the server.")

        self.conn = self.manager.connection(did=kwargs['did'])
        # Set the template path for the SQL scripts
        self.template_path = self.template_initial + '/' + (
            self.ppas_template_path(self.manager.version)
            if self.manager.server_type == 'ppas' else
            self.pg_template_path(self.manager.version)
        )

        return f(*args, **kwargs)

    return wrap


class SchemaView(PGChildNodeView):
    """
    This class is responsible for generating routes for schema node.

    Methods:
    -------
    * __init__(**kwargs)
      - Method is used to initialize the SchemaView and it's base view.

    * module_js()
      - Request handler for module.js routes for the schema node module
      javascript, which returns javscript for this module.

    * list()
      - This function is used to list all the schema nodes within the
      collection.

    * nodes()
      - This function will used to create all the child node within the
        collection, Here it will create all the schema node.

    * properties(gid, sid, did, scid)
      - This function will show the properties of the selected schema node.

    * create(gid, sid, did, scid)
      - This function will create the new schema object.

    * update(gid, sid, did, scid)
      - This function will update the data for the selected schema node.

    * delete(self, gid, sid, scid):
      - This function will drop the schema object

    * msql(gid, sid, did, scid)
      - This function is used to return modified SQL for the selected schema
        node.

    * get_sql(data, scid)
      - This function will generate sql from model data

    * sql(gid, sid, did, scid):
      - This function will generate sql to show it in sql pane for the schema
        node.

    * dependency(gid, sid, did, scid):
      - This function will generate dependency list show it in dependency
        pane for the selected schema node.

    * dependent(gid, sid, did, scid):
      - This function will generate dependent list to show it in dependent
        pane for the selected schema node.
    """
    node_type = schema_blueprint.node_type

    parent_ids = [
        {'type': 'int', 'id': 'gid'},
        {'type': 'int', 'id': 'sid'},
        {'type': 'int', 'id': 'did'}
    ]
    ids = [
        {'type': 'int', 'id': 'scid'}
    ]

    operations = dict({
        'obj': [
            {'get': 'properties', 'delete': 'delete', 'put': 'update'},
            {'get': 'list', 'post': 'create'}
        ],
        'children': [{'get': 'children'}],
        'nodes': [{'get': 'nodes'}, {'get': 'nodes'}],
        'sql': [{'get': 'sql'}],
        'msql': [{'get': 'msql'}, {'get': 'msql'}],
        'stats': [{'get': 'statistics'}],
        'dependency': [{'get': 'dependencies'}],
        'dependent': [{'get': 'dependents'}],
        'module.js': [{}, {}, {'get': 'module_js'}],
        'delete': [{'delete': 'delete'}]
    })

    def __init__(self, *args, **kwargs):
        """
        Initialize the variables used by methods of SchemaView.
        """

        super(SchemaView, self).__init__(*args, **kwargs)

        self.manager = None
        self.conn = None
        self.template_path = None
        self.template_initial = 'schema'

    @staticmethod
    def ppas_template_path(ver):
        """
        Returns the template path for PPAS servers.
        """
        if ver >= 90200:
            return 'ppas/9.2_plus'
        return 'ppas/9.1_plus'

    @staticmethod
    def pg_template_path(ver):
        """
        Returns the template path for PostgreSQL servers.
        """
        if ver >= 90200:
            return 'pg/9.2_plus'
        return 'pg/9.1_plus'

    def format_request_acls(self, data, modified=False, specific=None):
        acls = {}
        try:
            acls = render_template(
                "/".join([self.template_path, 'allowed_privs.json'])
            )
            acls = json.loads(acls, encoding='utf-8')
        except Exception as e:
            current_app.logger.exception(e)

        # Privileges
        for aclcol in acls:
            if specific is not None:
                if aclcol not in specific:
                    continue
            if aclcol in data:
                allowedacl = acls[aclcol]
                if modified:
                    for modifier in ['added', 'changed', 'deleted']:
                        if modifier in data[aclcol]:
                            data[aclcol][modifier] = parse_priv_to_db(
                                data[aclcol][modifier], allowedacl['acl']
                            )
                else:
                    data[aclcol] = parse_priv_to_db(data[aclcol], allowedacl['acl'])

        return acls

    @staticmethod
    def formatdbacl(acl):
        """
        Args:
            acl: Privileges from ACL query

        Returns:
            Formatted output required for client side parsing
        """
        # Reset any data for that acl if its already present in result set
        data = dict()
        for row in acl['rows']:
            priv = parse_priv_from_db(row)

            if row['deftype'] in data:
                data[row['deftype']].append(priv)
            else:
                data[row['deftype']] = [priv]
        return data

    def _formatter_no_defacl(self, data, scid=None):
        """
        Args:
            data: Result of properties query
            scid: Schema OID

        Returns:
            It will return formatted output of collections like
            security lables, privileges
        """
        # Need to format security labels according to client js collection
        seclabels = []
        if 'seclabels' in data and data['seclabels'] is not None:
            for sec in data['seclabels']:
                sec = re.search(r'([^=]+)=(.*$)', sec)
                seclabels.append({
                    'provider': sec.group(1),
                    'label': sec.group(2)
                })

        data['seclabels'] = seclabels

        # We need to parse & convert ACL coming from database to json format
        SQL = render_template(
            "/".join([self.template_path, 'sql/acl.sql']),
            _=gettext,
            scid=scid
        )
        status, acl = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=acl)

        data.update(self.formatdbacl(acl))

        return data

    def _formatter(self, data, scid=None):

        self._formatter_no_defacl(data, scid)

        # We need to parse & convert DEFAULT ACL coming from
        # database to json format
        SQL = render_template(
            "/".join([self.template_path, 'sql/defacl.sql']),
            _=gettext,
            scid=scid
        )

        status, defacl = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=defacl)

        data.update(self.formatdbacl(defacl))

        return data

    @check_precondition
    def list(self, gid, sid, did):
        """
        This function is used to list all the schema nodes within the collection.

        Args:
            gid: Server group ID
            sid: Server ID
            did: Database ID

        Returns:
            JSON of available schema nodes
        """
        SQL = render_template(
            "/".join([self.template_path, 'sql/properties.sql']),
            _=gettext,
            show_sysobj=self.blueprint.show_system_objects
        )
        status, res = self.conn.execute_dict(SQL)

        if not status:
            return internal_server_error(errormsg=res)
        return ajax_response(
            response=res['rows'],
            status=200
        )

    @check_precondition
    def nodes(self, gid, sid, did, scid=None):
        """
        This function will create all the child nodes within the collection
        Here it will create all the schema node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID

        Returns:
            JSON of available schema child nodes
        """
        res = []
        SQL = render_template(
            "/".join([self.template_path, 'sql/nodes.sql']),
            show_sysobj=self.blueprint.show_system_objects,
            _=gettext,
            scid=scid
        )

        status, rset = self.conn.execute_2darray(SQL)
        if not status:
            return internal_server_error(errormsg=rset)

        icon = 'icon-{0}'.format(self.node_type)

        if scid is not None:
            if len(rset['rows']) == 0:
                return gone(gettext("""
Could not find the schema in the database.
It may have been removed by another user.
"""))
            row = rset['rows'][0]
            return make_json_response(
                data=self.blueprint.generate_browser_node(
                    row['oid'],
                    did,
                    row['name'],
                    icon=icon,
                    can_create=row['can_create'],
                    has_usage=row['has_usage']
                ),
                status=200
            )

        for row in rset['rows']:
            res.append(
                self.blueprint.generate_browser_node(
                    row['oid'],
                    did,
                    row['name'],
                    icon=icon,
                    can_create=row['can_create'],
                    has_usage=row['has_usage']
                )
            )

        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition
    def node(self, gid, sid, did, scid):
        """
        This function will fetch the properties of the schema node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID

        Returns:
            JSON of given schema child node
        """
        SQL = render_template(
            "/".join([self.template_path, 'sql/nodes.sql']),
            show_sysobj=self.blueprint.show_system_objects,
            _=gettext,
            scid=scid
        )

        status, rset = self.conn.execute_2darray(SQL)
        if not status:
            return internal_server_error(errormsg=rset)

        if scid is not None:
            if len(rset['rows']) == 0:
                return gone(gettext("""
Could not find the schema in the database.
It may have been removed by another user.
"""))

        icon = 'icon-{0}'.format(self.node_type)

        for row in rset['rows']:
            return make_json_response(
                data=self.blueprint.generate_browser_node(
                        row['oid'],
                        did,
                        row['name'],
                        icon=icon,
                        can_create=row['can_create'],
                        has_usage=row['has_usage']
                    ),
                status=200
            )

    @check_precondition
    def properties(self, gid, sid, did, scid):
        """
        This function will show the properties of the selected schema node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did:  Database ID
            scid: Schema ID

        Returns:
            JSON of selected schema node
        """
        SQL = render_template(
            "/".join([self.template_path, 'sql/properties.sql']),
            scid=scid,
            _=gettext,
            show_sysobj=self.blueprint.show_system_objects
        )

        status, res = self.conn.execute_dict(SQL)

        if not status:
            return internal_server_error(errormsg=res)

        if len(res['rows']) == 0:
            return gone(
                gettext("Could not find the schema in the database. It may have been removed by another user."
                ))

        # Making copy of output for future use
        copy_data = dict(res['rows'][0])
        copy_data = self._formatter(copy_data, scid)

        return ajax_response(
            response=copy_data,
            status=200
        )

    @check_precondition
    def create(self, gid, sid, did):
        """
        This function will create a schema object

         Args:
           gid: Server Group ID
           sid: Server ID
           did: Database ID
        """
        data = request.form if request.form else json.loads(
            request.data, encoding='utf-8'
        )

        required_args = {
            'name': 'Name'
        }

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
        try:
            self.format_request_acls(data)
            SQL = render_template(
                "/".join([self.template_path, 'sql/create.sql']),
                data=data, conn=self.conn, _=gettext
            )
            status, res = self.conn.execute_scalar(SQL)
            if not status:
                return make_json_response(
                    status=410,
                    success=0,
                    errormsg=res + '\n' +
                             'Operation failed while running create statement'
                )

            # we need oid to to add object in tree at browser,
            # below sql will gives the same
            SQL = render_template(
                "/".join([self.template_path, 'sql/oid.sql']),
                schema=data['name'], _=gettext
            )

            status, scid = self.conn.execute_scalar(SQL)
            if not status:
                return internal_server_error(errormsg=scid)

            icon = 'icon-{0}'.format(self.node_type)

            return jsonify(
                node=self.blueprint.generate_browser_node(
                    scid,
                    did,
                    data['name'],
                    icon=icon
                )
            )
        except Exception as e:
            current_app.logger.exception(e)
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def update(self, gid, sid, did, scid):
        """
        This function will update an existing schema object

         Args:
           gid: Server Group ID
           sid: Server ID
           did: Database ID
           scid: Schema ID
        """
        data = request.form if request.form else json.loads(
            request.data, encoding='utf-8'
        )
        try:
            SQL, name = self.get_sql(gid, sid, data, scid)

            SQL = SQL.strip('\n').strip(' ')
            status, res = self.conn.execute_scalar(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            return jsonify(
                node=self.blueprint.generate_browser_node(
                    scid,
                    did,
                    name,
                    icon="icon-%s" % self.node_type
                )
            )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def delete(self, gid, sid, did, scid):
        """
        This function will delete an existing schema object

         Args:
           gid: Server Group ID
           sid: Server ID
           did: Database ID
           scid: Schema ID
        """

        try:
            # Get name for schema from did
            SQL = render_template(
                "/".join([self.template_path, 'sql/get_name.sql']),
                _=gettext,
                scid=scid
            )

            status, name = self.conn.execute_scalar(SQL)
            if not status:
                return internal_server_error(errormsg=name)

            if name is None:
                return make_json_response(
                    status=410,
                    success=0,
                    errormsg=gettext(
                        'Error: Object not found.'
                    ),
                    info=gettext(
                        'The specified schema could not be found.\n'
                    )
                )

            # drop schema
            SQL = render_template(
                "/".join([self.template_path, 'sql/delete.sql']),
                _=gettext, name=name, conn=self.conn,
                cascade=True if self.cmd == 'delete' else False
            )
            status, res = self.conn.execute_scalar(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            return make_json_response(
                success=1,
                info=gettext("Schema dropped"),
                data={
                    'id': scid,
                    'sid': sid,
                    'gid': gid,
                    'did': did
                }
            )

        except Exception as e:
            current_app.logger.exception(e)
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def msql(self, gid, sid, did, scid=None):
        """
        This function will generate modified sql for schema object based on
        the input from the user. This route is used by the SQL tab in the
        edit/create dialog.

         Args:
           gid: Server Group ID
           sid: Server ID
           did: Database ID
           scid: Schema ID (When working with existing schema node)
        """
        data = dict()
        for k, v in request.args.items():
            try:
                data[k] = json.loads(v, encoding='utf-8')
            except ValueError:
                data[k] = v

        try:
            SQL = self.get_sql(gid, sid, data, scid)
            if SQL and SQL.strip('\n') and SQL.strip(' '):
                return make_json_response(
                    data=SQL.strip('\n'),
                    status=200
                )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    def get_sql(self, gid, sid, data, scid=None):
        """
        This function will generate sql from model data received from client
        """
        if scid is not None:
            SQL = render_template(
                "/".join([self.template_path, 'sql/properties.sql']),
                _=gettext, scid=scid,
                show_sysobj=self.blueprint.show_system_objects
            )

            status, res = self.conn.execute_dict(SQL)
            if not status:
                return internal_server_error(errormsg=res)
            old_data = res['rows'][0]
            # old_data contains all the existing data for requested schema
            old_data = self._formatter(old_data, scid)

            # if name is not present in request data then use old name
            if 'name' not in data:
                data['name'] = old_data['name']

            # Privileges and Default privileges
            self.format_request_acls(data, True)

            SQL = render_template(
                "/".join([self.template_path, 'sql/update.sql']),
                _=gettext, data=data, o_data=old_data, conn=self.conn
            )
            return SQL, data['name'] if 'name' in data else old_data['nam']
        else:
            required_args = ['name']

            for arg in required_args:
                if arg not in data:
                    return " -- " + gettext("Definition incomplete.")

            # Privileges
            self.format_request_acls(data)

            SQL = render_template(
                "/".join([self.template_path, 'sql/create.sql']),
                data=data, conn=self.conn, _=gettext
            )

            return SQL, data['name']

    @check_precondition
    def sql(self, gid, sid, did, scid):
        """
        This function will generate reverse engineered sql for the schema
        object.

         Args:
           gid: Server Group ID
           sid: Server ID
           did: Database ID
           scid: Schema ID
        """
        SQL = render_template(
            "/".join([self.template_path, 'sql/properties.sql']),
            scid=scid, _=gettext
        )

        status, res = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=res)

        if len(res['rows']) == 0:
            return gone(gettext("""Could not find the schema in the database. It may have been removed by another user."""))

        data = res['rows'][0]
        data = self._formatter(data, scid)

        # Privileges and Default privileges
        self.format_request_acls(data)

        # Render sql from create & alter sql using properties & acl data
        SQL = ''
        SQL = render_template(
            "/".join([self.template_path, 'sql/create.sql']),
            _=gettext, data=data, conn=self.conn
        )

        sql_header = "-- SCHEMA: {0}\n\n-- ".format(data['name'])
        if hasattr(str, 'decode'):
            sql_header = sql_header.decode('utf-8')

        # drop schema
        sql_header += render_template(
            "/".join([self.template_path, 'sql/delete.sql']),
            _=gettext, name=data['name'], conn=self.conn, cascade=False)

        SQL = sql_header + '\n\n' + SQL

        return ajax_response(response=SQL.strip("\n"))

    @check_precondition
    def dependents(self, gid, sid, did, scid):
        """
        This function gets the dependencies and returns an ajax response.
        for the schema node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID
        """
        dependents_result = self.get_dependents(self.conn, scid)
        return ajax_response(
            response=dependents_result,
            status=200
        )

    @check_precondition
    def dependencies(self, gid, sid, did, scid):
        """
        This function get the dependencies and return ajax response
        for the schema node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID
        """
        dependencies_result = self.get_dependencies(self.conn, scid)
        return ajax_response(
            response=dependencies_result,
            status=200
        )

    @check_precondition
    def children(self, **kwargs):
        """Build a list of treeview nodes from the child nodes."""

        SQL = render_template(
            "/".join([self.template_path, 'sql/is_catalog.sql']),
            scid=kwargs['scid'], _=gettext
        )

        status, res = self.conn.execute_dict(SQL)

        if not status:
            return internal_server_error(errormsg=res)

        if len(res['rows']) == 0:
            return gone(gettext("""
Could not find the schema in the database.
It may have been removed by another user.
"""))

        data = res['rows'][0]
        backend_support_keywords = kwargs.copy()
        backend_support_keywords['is_catalog'] = data['is_catalog']
        backend_support_keywords['db_support'] = data['db_support']
        backend_support_keywords['schema_name'] = data['schema_name']

        nodes = []
        for module in self.blueprint.submodules:
            if isinstance(module, PGChildModule):
                if self.manager is not None and \
                        module.BackendSupported(
                            self.manager, **backend_support_keywords
                        ):
                    nodes.extend(module.get_nodes(**kwargs))
            else:
                nodes.extend(module.get_nodes(**kwargs))

        return make_json_response(data=nodes)


class CatalogView(SchemaView):
    """
    This class is responsible for generating routes for catalog schema node.

    Methods:
    -------
    * __init__(**kwargs)
      - Method is used to initialize the CatalogView and it's base view.

    * module_js()
      - This property defines (if javascript) exists for this node.
        Override this property for your own logic

    * create(gid, sid, did, scid)
      - Raise an error - we can not create a catalog.

    * update(gid, sid, did, scid)
      - This function will update the data for the selected catalog node

    * delete(self, gid, sid, scid):
      - Raise an error - we can not delete a catalog.

    * get_sql(data, scid)
      - This function will generate sql from model data

    """

    node_type = catalog_blueprint.node_type

    def __init__(self, *args, **kwargs):
        """
        Initialize the variables used by methods of SchemaView.
        """

        super(CatalogView, self).__init__(*args, **kwargs)

        self.template_initial = 'catalog'

    def _formatter(self, data, scid=None):

        """
        Overriding _formatter, because - we won't show the Default
        privileges with the catalog schema.
        """

        self._formatter_no_defacl(data, scid)

        return data

    def get_sql(self, gid, sid, data, scid=None):
        """
        This function will generate sql from model data
        """
        if scid is None:
            return bad_request('Cannot create a catalog schema!')

        return super(CatalogView, self).get_sql(gid, sid, data, scid)

    @check_precondition
    def sql(self, gid, sid, did, scid):
        """
        This function will generate reverse engineered sql for schema object

         Args:
           gid: Server Group ID
           sid: Server ID
           did: Database ID
           scid: Schema ID
        """
        SQL = render_template(
            "/".join([self.template_path, 'sql/properties.sql']),
            scid=scid, _=gettext
        )

        status, res = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=res)

        if len(res['rows']) == 0:
            return gone(gettext("""
Could not find the schema in the database.
It may have been removed by another user.
"""))

        old_data = res['rows'][0]
        old_data = self._formatter(old_data, scid)

        # Privileges
        self.format_request_acls(old_data, specific=['nspacl'])

        # Render sql from create & alter sql using properties & acl data
        SQL = ''
        SQL = render_template(
            "/".join([self.template_path, 'sql/create.sql']),
            _=gettext, data=old_data, conn=self.conn
        )

        sql_header = """
-- CATALOG: {0}

-- DROP SCHEMA {0};(

""".format(old_data['name'])
        if hasattr(str, 'decode'):
            sql_header = sql_header.decode('utf-8')

        SQL = sql_header + SQL

        return ajax_response(response=SQL.strip("\n"))

SchemaView.register_node_view(schema_blueprint)
CatalogView.register_node_view(catalog_blueprint)
