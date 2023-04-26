##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

""" Implements Operator Node """

from functools import wraps

from flask import render_template
from flask_babel import gettext

import pgadmin.browser.server_groups.servers.databases as database
from config import PG_DEFAULT_DRIVER
from pgadmin.browser.server_groups.servers.databases.schemas.utils \
    import SchemaChildModule
from pgadmin.browser.utils import PGChildNodeView
from pgadmin.utils.ajax import make_json_response, internal_server_error, \
    make_response as ajax_response, gone
from pgadmin.utils.compile_template_name import compile_template_path
from pgadmin.utils.driver import get_driver


class OperatorModule(SchemaChildModule):
    """
     class OperatorModule(SchemaChildModule)

        A module class for Operator node derived from SchemaChildModule.

    Methods:
    -------
    * __init__(*args, **kwargs)
      - Method is used to initialize the Operator and it's base module.

    * get_nodes(gid, sid, did, scid, opid)
      - Method is used to generate the browser collection node.

    * node_inode()
      - Method is overridden from its base class to make the node as leaf node.

    * script_load()
      - Load the module script for schema, when any of the server node is
        initialized.
    """

    _NODE_TYPE = 'operator'
    _COLLECTION_LABEL = gettext("Operators")

    def __init__(self, *args, **kwargs):
        """
        Method is used to initialize the OperatorModule and it's base module.

        Args:
            *args:
            **kwargs:
        """

        super().__init__(*args, **kwargs)
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
        return database.DatabaseModule.node_type

    @property
    def node_inode(self):
        return False


blueprint = OperatorModule(__name__)


class OperatorView(PGChildNodeView):
    """
    This class is responsible for generating routes for Operator node

    Methods:
    -------
    * __init__(**kwargs)
      - Method is used to initialize the OperatorView and it's base view.

    * check_precondition()
      - This function will behave as a decorator which will checks
        database connection before running view, it will also attaches
        manager,conn & template_path properties to self

    * list()
      - This function is used to list all the Operator nodes within that
      collection.

    * nodes()
      - This function will used to create all the child node within that
        collection, Here it will create all the Operator node.

    * properties(gid, sid, did, scid, opid)
      - This function will show the properties of the selected Operator node

    * sql(gid, sid, did, scid):
      - This function will generate sql to show it in sql pane for the
        selected Operator node.
    """

    node_type = blueprint.node_type
    node_label = "Operator"

    parent_ids = [
        {'type': 'int', 'id': 'gid'},
        {'type': 'int', 'id': 'sid'},
        {'type': 'int', 'id': 'did'},
        {'type': 'int', 'id': 'scid'}
    ]
    ids = [
        {'type': 'int', 'id': 'opid'}
    ]

    operations = dict({
        'obj': [
            {'get': 'properties', 'delete': 'delete', 'put': 'update'},
            {'get': 'list', 'post': 'create', 'delete': 'delete'}
        ],
        'delete': [{'delete': 'delete'}, {'delete': 'delete'}],
        'children': [{'get': 'children'}],
        'nodes': [{'get': 'node'}, {'get': 'nodes'}],
        'sql': [{'get': 'sql'}]
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
            self.datistemplate = False
            if (
                self.manager.db_info is not None and
                kwargs['did'] in self.manager.db_info and
                'datistemplate' in self.manager.db_info[kwargs['did']]
            ):
                self.datistemplate = self.manager.db_info[
                    kwargs['did']]['datistemplate']

            # Set the template path for the SQL scripts
            self.template_path = compile_template_path(
                'operators/sql/',
                self.manager.version
            )

            return f(*args, **kwargs)

        return wrap

    @check_precondition
    def list(self, gid, sid, did, scid):
        """
        This function is used to list all the operator nodes within that
        collection.

        Args:
            gid: Server group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID

        Returns:
            JSON of available operator nodes
        """

        SQL = render_template("/".join([self.template_path,
                                        self._NODES_SQL]), scid=scid)
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
        This function will used to create all the child node within that
        collection.
        Here it will create all the operator node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID

        Returns:
            JSON of available operator child nodes
        """

        res = []
        SQL = render_template("/".join([self.template_path,
                                        self._NODES_SQL]), scid=scid)
        status, rset = self.conn.execute_2darray(SQL)
        if not status:
            return internal_server_error(errormsg=rset)

        for row in rset['rows']:
            res.append(
                self.blueprint.generate_browser_node(
                    row['oid'],
                    scid,
                    row['name'],
                    icon="icon-operator",
                    description=row['description']
                ))

        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition
    def node(self, gid, sid, did, scid, opid):
        """
        This function will fetch properties of the operator node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID
            opid: Operator ID

        Returns:
            JSON of given operator node
        """

        SQL = render_template("/".join([self.template_path,
                                        self._NODES_SQL]), opid=opid)
        status, rset = self.conn.execute_2darray(SQL)
        if not status:
            return internal_server_error(errormsg=rset)

        for row in rset['rows']:
            return make_json_response(
                data=self.blueprint.generate_browser_node(
                    row['oid'],
                    scid,
                    row['name'],
                    icon="icon-operator"
                ),
                status=200
            )

        return gone(self.not_found_error_msg())

    @check_precondition
    def properties(self, gid, sid, did, scid, opid):
        """
        This function will show the properties of the selected operator node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did:  Database ID
            scid: Schema ID
            scid: Schema ID
            opid: Operator ID

        Returns:
            JSON of selected operator node
        """

        status, res = self._fetch_properties(scid, opid)
        if not status:
            return res

        return ajax_response(
            response=res,
            status=200
        )

    def _fetch_properties(self, scid, opid):
        """
        This function fetch the properties for the specified object.

        :param scid: Schema ID
        :param opid: Operator ID
        """

        SQL = render_template("/".join([self.template_path,
                                        self._PROPERTIES_SQL]),
                              scid=scid, opid=opid,
                              datlastsysoid=self._DATABASE_LAST_SYSTEM_OID)
        status, res = self.conn.execute_dict(SQL)

        if not status:
            return False, internal_server_error(errormsg=res)

        if len(res['rows']) == 0:
            return False, gone(self.not_found_error_msg())

        res['rows'][0]['is_sys_obj'] = (
            res['rows'][0]['oid'] <= self._DATABASE_LAST_SYSTEM_OID or
            self.datistemplate)

        return True, res['rows'][0]

    @check_precondition
    def sql(self, gid, sid, did, scid, opid):
        """
        This function will generates reverse engineered sql for operator
        object

         Args:
           gid: Server Group ID
           sid: Server ID
           did: Database ID
           scid: Schema ID
           opid: Operator ID
           json_resp: True then return json response
        """

        SQL = render_template("/".join([self.template_path,
                                        self._PROPERTIES_SQL]),
                              scid=scid, opid=opid)
        status, res = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=res)
        if len(res['rows']) == 0:
            return gone(self.not_found_error_msg())

        data = res['rows'][0]

        SQL = render_template("/".join([self.template_path,
                                        self._CREATE_SQL]),
                              data=data)

        sql_header = "-- Operator: {0};\n\n-- ".format(data['name'])

        sql_header += render_template("/".join([self.template_path,
                                                self._DELETE_SQL]),
                                      name=data['name'],
                                      oprnamespace=data['schema'],
                                      lefttype=data['lefttype'],
                                      righttype=data['righttype'],
                                      )
        SQL = sql_header + '\n' + SQL.strip('\n')

        return ajax_response(response=SQL)


OperatorView.register_node_view(blueprint)
