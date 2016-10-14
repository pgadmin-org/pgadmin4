##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

""" Implements Collation Node """

import simplejson as json
from functools import wraps

import pgadmin.browser.server_groups.servers.databases as database
from flask import render_template, request, jsonify
from flask_babel import gettext
from pgadmin.browser.server_groups.servers.databases.schemas.utils \
    import SchemaChildModule
from pgadmin.browser.utils import PGChildNodeView
from pgadmin.utils.ajax import make_json_response, internal_server_error, \
    make_response as ajax_response
from pgadmin.utils.driver import get_driver
from pgadmin.utils.ajax import gone

from config import PG_DEFAULT_DRIVER


class CollationModule(SchemaChildModule):
    """
     class CollationModule(CollectionNodeModule)

        A module class for Collation node derived from CollectionNodeModule.

    Methods:
    -------
    * __init__(*args, **kwargs)
      - Method is used to initialize the Collation and it's base module.

    * get_nodes(gid, sid, did, scid, coid)
      - Method is used to generate the browser collection node.

    * node_inode()
      - Method is overridden from its base class to make the node as leaf node.

    * script_load()
      - Load the module script for schema, when any of the server node is
        initialized.
    """

    NODE_TYPE = 'collation'
    COLLECTION_LABEL = gettext("Collations")

    def __init__(self, *args, **kwargs):
        """
        Method is used to initialize the CollationModule and it's base module.

        Args:
            *args:
            **kwargs:
        """

        super(CollationModule, self).__init__(*args, **kwargs)
        self.min_ver = 90100
        self.max_ver = None

    def get_nodes(self, gid, sid, did, scid):
        """
        Generate the collection node
        """
        yield self.generate_browser_collection_node(scid)

    @property
    def script_load(self):
        """
        Load the module script for database, when any of the database node is
        initialized.
        """
        return database.DatabaseModule.NODE_TYPE

    @property
    def node_inode(self):
        return False


blueprint = CollationModule(__name__)


class CollationView(PGChildNodeView):
    """
    This class is responsible for generating routes for Collation node

    Methods:
    -------
    * __init__(**kwargs)
      - Method is used to initialize the CollationView and it's base view.

    * check_precondition()
      - This function will behave as a decorator which will checks
        database connection before running view, it will also attaches
        manager,conn & template_path properties to self

    * list()
      - This function is used to list all the Collation nodes within that
      collection.

    * nodes()
      - This function will used to create all the child node within that
        collection, Here it will create all the Collation node.

    * properties(gid, sid, did, scid, coid)
      - This function will show the properties of the selected Collation node

    * create(gid, sid, did, scid)
      - This function will create the new Collation object

    * update(gid, sid, did, scid, coid)
      - This function will update the data for the selected Collation node

    * delete(self, gid, sid, scid, coid):
      - This function will drop the Collation object

    * msql(gid, sid, did, scid, coid)
      - This function is used to return modified SQL for the selected
        Collation node

    * get_sql(data, scid, coid)
      - This function will generate sql from model data

    * sql(gid, sid, did, scid):
      - This function will generate sql to show it in sql pane for the
        selected Collation node.

    * dependency(gid, sid, did, scid):
      - This function will generate dependency list show it in dependency
        pane for the selected Collation node.

    * dependent(gid, sid, did, scid):
      - This function will generate dependent list to show it in dependent
        pane for the selected Collation node.
    """

    node_type = blueprint.node_type

    parent_ids = [
        {'type': 'int', 'id': 'gid'},
        {'type': 'int', 'id': 'sid'},
        {'type': 'int', 'id': 'did'},
        {'type': 'int', 'id': 'scid'}
    ]
    ids = [
        {'type': 'int', 'id': 'coid'}
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
        'get_collations': [{'get': 'get_collation'},
                           {'get': 'get_collation'}]
    })

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
            self.manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(
                kwargs['sid']
            )
            self.conn = self.manager.connection(did=kwargs['did'])
            # Set the template path for the SQL scripts
            self.template_path = 'collation/sql/9.1_plus'

            return f(*args, **kwargs)
        return wrap

    @check_precondition
    def list(self, gid, sid, did, scid):
        """
        This function is used to list all the collation nodes within that collection.

        Args:
            gid: Server group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID

        Returns:
            JSON of available collation nodes
        """

        SQL = render_template("/".join([self.template_path,
                                        'properties.sql']), scid=scid)
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
        This function will used to create all the child node within that collection.
        Here it will create all the collation node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID

        Returns:
            JSON of available collation child nodes
        """

        res = []
        SQL = render_template("/".join([self.template_path,
                                        'nodes.sql']), scid=scid)
        status, rset = self.conn.execute_2darray(SQL)
        if not status:
            return internal_server_error(errormsg=rset)

        for row in rset['rows']:
            res.append(
                self.blueprint.generate_browser_node(
                    row['oid'],
                    scid,
                    row['name'],
                    icon="icon-collation"
                ))

        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition
    def node(self, gid, sid, did, scid, coid):
        """
        This function will fetch properties of the collation node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID
            coid: Collation ID

        Returns:
            JSON of given collation node
        """

        SQL = render_template("/".join([self.template_path,
                                        'nodes.sql']), coid=coid)
        status, rset = self.conn.execute_2darray(SQL)
        if not status:
            return internal_server_error(errormsg=rset)

        for row in rset['rows']:
            return make_json_response(
                data=self.blueprint.generate_browser_node(
                    row['oid'],
                    scid,
                    row['name'],
                    icon="icon-collation"
                ),
                status=200
            )

        return gone(gettext("Could not find the specified collation."))

    @check_precondition
    def properties(self, gid, sid, did, scid, coid):
        """
        This function will show the properties of the selected collation node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did:  Database ID
            scid: Schema ID
            scid: Schema ID
            coid: Collation ID

        Returns:
            JSON of selected collation node
        """

        SQL = render_template("/".join([self.template_path,
                                        'properties.sql']),
                              scid=scid, coid=coid)
        status, res = self.conn.execute_dict(SQL)

        if not status:
            return internal_server_error(errormsg=res)

        if len(res['rows']) == 0:
            return gone(gettext("""Could not find the collation object in the database. It may have been removed by another user."""))

        return ajax_response(
            response=res['rows'][0],
            status=200
        )

    @check_precondition
    def get_collation(self, gid, sid, did, scid, coid=None):
        """
        This function will return list of collation available
        as AJAX response.
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

    def _check_definition(self, data):
        """
        Args:
            data: request data received from client

        Returns:
            True if defination is missing, False otherwise
        """
        definition_args = [
            'locale',
            'copy_collation',
            'lc_collate',
            'lc_type'
        ]

        # Additional server side validation to check if
        # definition is sent properly from client side
        missing_definition_flag = False

        for arg in definition_args:
            if arg == 'locale' and \
                    (arg not in data or data[arg] == ''):
                if 'copy_collation' not in data and (
                                'lc_collate' not in data and 'lc_type' not in data
                ):
                    missing_definition_flag = True

            if arg == 'copy_collation' and \
                    (arg not in data or data[arg] == ''):
                if 'locale' not in data and (
                                'lc_collate' not in data and 'lc_type' not in data
                ):
                    missing_definition_flag = True

            if (arg == 'lc_collate' or arg == 'lc_type') and \
                    (arg not in data or data[arg] == ''):
                if 'copy_collation' not in data and 'locale' not in data:
                    missing_definition_flag = True

        return missing_definition_flag

    @check_precondition
    def create(self, gid, sid, did, scid):
        """
        This function will creates new the collation object

         Args:
           gid: Server Group ID
           sid: Server ID
           did: Database ID
           scid: Schema ID
        """

        data = request.form if request.form else json.loads(
            request.data, encoding='utf-8'
        )

        required_args = [
            'name'
        ]

        for arg in required_args:
            if arg not in data:
                return make_json_response(
                    status=410,
                    success=0,
                    errormsg=gettext(
                        "Could not find the required parameter (%s)." % arg
                    )
                )
        if self._check_definition(data):
            return make_json_response(
                status=410,
                success=0,
                errormsg=gettext(
                    "Incomplete definition. Please provide Locale OR Copy Collation OR LC_TYPE/LC_COLLATE"
                )
            )

        SQL = render_template("/".join([self.template_path,
                                        'create.sql']),
                              data=data, conn=self.conn)
        status, res = self.conn.execute_scalar(SQL)
        if not status:
            return internal_server_error(errormsg=res)

        # We need oid to to add object in tree at browser
        SQL = render_template("/".join([self.template_path,
                                        'get_oid.sql']), data=data)
        status, coid = self.conn.execute_scalar(SQL)
        if not status:
            return internal_server_error(errormsg=coid)

        # Get updated schema oid
        SQL = render_template("/".join([self.template_path,
                                        'get_oid.sql']), coid=coid)
        status, scid = self.conn.execute_scalar(SQL)
        if not status:
            return internal_server_error(errormsg=coid)

        return jsonify(
            node=self.blueprint.generate_browser_node(
                coid,
                scid,
                data['name'],
                icon="icon-collation"
            )
        )

    @check_precondition
    def delete(self, gid, sid, did, scid, coid):
        """
        This function will delete existing the collation object

         Args:
           gid: Server Group ID
           sid: Server ID
           did: Database ID
           scid: Schema ID
           coid: Collation ID
        """

        # Below will decide if it's simple drop or drop with cascade call
        if self.cmd == 'delete':
            # This is a cascade operation
            cascade = True
        else:
            cascade = False

        try:
            SQL = render_template("/".join([self.template_path,
                                            'get_name.sql']),
                                  scid=scid, coid=coid)
            status, name = self.conn.execute_scalar(SQL)
            if not status:
                return internal_server_error(errormsg=name)

            if name is None:
                return make_json_response(
                    success=0,
                    errormsg=gettext(
                        'Error: Object not found.'
                    ),
                    info=gettext(
                        'The specified collation could not be found.\n'
                    )
                )

            SQL = render_template("/".join([self.template_path,
                                            'delete.sql']),
                                  name=name, cascade=cascade,
                                  conn=self.conn)
            status, res = self.conn.execute_scalar(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            return make_json_response(
                success=1,
                info=gettext("Collation dropped"),
                data={
                    'id': coid,
                    'scid': scid,
                    'did': did
                }
            )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def update(self, gid, sid, did, scid, coid):
        """
        This function will updates existing the collation object

         Args:
           gid: Server Group ID
           sid: Server ID
           did: Database ID
           scid: Schema ID
           coid: Collation ID
        """
        data = request.form if request.form else json.loads(
            request.data, encoding='utf-8'
        )
        SQL, name = self.get_sql(gid, sid, data, scid, coid)
        SQL = SQL.strip('\n').strip(' ')
        status, res = self.conn.execute_scalar(SQL)

        if not status:
            return internal_server_error(errormsg=res)

        # We need oid to to add object in tree at browser
        SQL = render_template("/".join([self.template_path,
                                        'get_oid.sql']), coid=coid)

        status, res = self.conn.execute_2darray(SQL)
        if not status:
            return internal_server_error(errormsg=res)

        scid = res['rows'][0]['scid']

        return jsonify(
            node=self.blueprint.generate_browser_node(
                coid,
                scid,
                name,
                icon="icon-%s" % self.node_type
            )
        )

    @check_precondition
    def msql(self, gid, sid, did, scid, coid=None):
        """
        This function will generates modified sql for collation object

         Args:
           gid: Server Group ID
           sid: Server ID
           did: Database ID
           scid: Schema ID
           coid: Collation ID
        """
        data = dict()
        for k, v in request.args.items():
            try:
                data[k] = json.loads(v, encoding='utf-8')
            except ValueError:
                data[k] = v

        try:
            SQL, name = self.get_sql(gid, sid, data, scid, coid)
            if SQL == '':
                SQL = "--modified SQL"

            return make_json_response(
                data=SQL,
                status=200
                )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    def get_sql(self, gid, sid, data, scid, coid=None):
        """
        This function will genrate sql from model data
        """
        if coid is not None:
            SQL = render_template("/".join([self.template_path,
                                            'properties.sql']),
                                  scid=scid, coid=coid)
            status, res = self.conn.execute_dict(SQL)
            if not status:
                return internal_server_error(errormsg=res)
            old_data = res['rows'][0]
            SQL = render_template(
                "/".join([self.template_path, 'update.sql']),
                data=data, o_data=old_data, conn=self.conn
            )
            return SQL.strip('\n'), data['name'] if 'name' in data else old_data['name']
        else:
            required_args = [
                'name'
            ]

            for arg in required_args:
                if arg not in data:
                    return "-- missing definition"

            if self._check_definition(data):
                return "-- missing definition"

            SQL = render_template("/".join([self.template_path,
                                            'create.sql']),
                                  data=data, conn=self.conn)
            return SQL.strip('\n'), data['name']

    @check_precondition
    def sql(self, gid, sid, did, scid, coid):
        """
        This function will generates reverse engineered sql for collation object

         Args:
           gid: Server Group ID
           sid: Server ID
           did: Database ID
           scid: Schema ID
           coid: Collation ID
        """
        SQL = render_template("/".join([self.template_path,
                                        'properties.sql']),
                              scid=scid, coid=coid)
        status, res = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=res)

        data = res['rows'][0]

        SQL = render_template("/".join([self.template_path,
                                        'create.sql']),
                              data=data, conn=self.conn)

        sql_header = "-- Collation: {0};\n\n-- ".format(data['name'])
        if hasattr(str, 'decode'):
            sql_header = sql_header.decode('utf-8')
        sql_header += render_template("/".join([self.template_path,
                                                'delete.sql']),
                                      name=data['name'])
        SQL = sql_header + '\n\n' + SQL.strip('\n')

        return ajax_response(response=SQL)

    @check_precondition
    def dependents(self, gid, sid, did, scid, coid):
        """
        This function get the dependents and return ajax response
        for the Collation node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID
            coid: Collation ID
        """
        dependents_result = self.get_dependents(
            self.conn, coid
        )

        return ajax_response(
            response=dependents_result,
            status=200
        )

    @check_precondition
    def dependencies(self, gid, sid, did, scid, coid):
        """
        This function get the dependencies and return ajax response
        for the Collation node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID
            coid: Collation ID
        """
        dependencies_result = self.get_dependencies(
            self.conn, coid
        )

        return ajax_response(
            response=dependencies_result,
            status=200
        )


CollationView.register_node_view(blueprint)
