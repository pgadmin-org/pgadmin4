##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Implements Replication Nodes for PG/PPAS 9.4 and above"""

from functools import wraps

from pgadmin.browser.server_groups import servers
from flask import render_template
from flask_babel import gettext
from pgadmin.browser.collection import CollectionNodeModule
from pgadmin.browser.utils import PGChildNodeView
from pgadmin.utils.ajax import make_json_response, \
    make_response as ajax_response, internal_server_error, gone
from pgadmin.utils.ajax import precondition_required
from pgadmin.utils.driver import get_driver
from config import PG_DEFAULT_DRIVER
from pgadmin.browser.server_groups.servers.utils import get_replication_type


class ReplicationNodesModule(CollectionNodeModule):
    """
     class ReplicationNodesModule(CollectionNodeModule)

        A module class for Replication Nodes node derived from
        CollectionNodeModule.

    Methods:
    -------
    * __init__(*args, **kwargs)
      - Method is used to initialize the ReplicationNodesModule and it's
      base module.

    * backend_supported(manager, **kwargs)
      - This function is used to check the database server type and version.
        Replication Nodes only supported in PG/PPAS 9.4 and above.

    * get_nodes(gid, sid, did)
      - Method is used to generate the browser collection node.

    * node_inode()
      - Method is overridden from its base class to make the node as leaf node.

    * script_load()
      - Load the module script for Replication Nodes, when any of the server
      node is initialized.
    """

    _NODE_TYPE = 'replica_nodes'
    _COLLECTION_LABEL = gettext("Replica Nodes")

    def __init__(self, *args, **kwargs):
        """
        Method is used to initialize the ReplicationNodesModule and
        it's base module.

        Args:
            *args:
            **kwargs:
        """
        super().__init__(*args, **kwargs)

    def get_nodes(self, gid, sid):
        """
        Method is used to generate the browser collection node

        Args:
            gid: Server Group ID
            sid: Server ID
        """
        yield self.generate_browser_collection_node(sid)

    @property
    def node_inode(self):
        """
        Override this property to make the node as leaf node.

        Returns: False as this is the leaf node
        """
        return False

    @property
    def collection_icon(self):
        return 'icon-server_group'

    @property
    def script_load(self):
        """
        Load the module script for Replication Nodes, when any of the server
        node is initialized.

        Returns: node type of the server module.
        """
        return servers.ServerModule.NODE_TYPE

    def backend_supported(self, manager, **kwargs):
        """
        Load this module if replication type exists
        """
        if super().backend_supported(manager, **kwargs):
            conn = manager.connection(sid=kwargs['sid'])

            replication_type = get_replication_type(conn, manager.version)
            return replication_type == 'log'


blueprint = ReplicationNodesModule(__name__)


class ReplicationNodesView(PGChildNodeView):
    """
    class ReplicationNodesView(NodeView)

        A view class for Replication Nodes node derived from NodeView.
        This class is responsible for all the stuff related to view like
        showing properties/list of Replication Nodes nodes

    Methods:
    -------
    * __init__(**kwargs)
      - Method is used to initialize the ReplicationNodesView,
      and it's base view.

    * check_precondition()
      - This function will behave as a decorator which will checks
        database connection before running view, it will also attaches
        manager,conn & template_path properties to self

    * list()
      - This function is used to list all the Replication Nodes within
      that collection.

    * nodes()
      - This function will used to create all the child node within that
      collection. Here it will create all the Replication Nodes node.

    * properties(gid, sid, did, pid)
      - This function will show the properties of the selected node
    """

    node_type = blueprint.node_type
    BASE_TEMPLATE_PATH = 'replica_nodes/sql/#{0}#'

    parent_ids = [
        {'type': 'int', 'id': 'gid'},
        {'type': 'int', 'id': 'sid'}
    ]
    ids = [
        {'type': 'int', 'id': 'pid'}
    ]

    operations = dict({
        'obj': [
            {'get': 'properties'},
            {'get': 'list'}
        ],
        'nodes': [{'get': 'nodes'}, {'get': 'nodes'}],
        'replication_slots': [{'get': 'replication_slots'},
                              {'get': 'replication_slots'}],
    })

    def __init__(self, **kwargs):
        """
        Method is used to initialize the ReplicationNodesView and,
        it's base view.
        Also initialize all the variables create/used dynamically like conn,
        template_path.

        Args:
            **kwargs:
        """
        self.conn = None
        self.template_path = None

        super().__init__(**kwargs)

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
            self.driver = get_driver(PG_DEFAULT_DRIVER)
            self.manager = self.driver.connection_manager(kwargs['sid'])
            self.conn = self.manager.connection()

            if not self.conn.connected():
                return precondition_required(
                    gettext(
                        "Connection to the server has been lost."
                    )
                )

            self.template_path = self.BASE_TEMPLATE_PATH.format(
                self.manager.version)

            return f(*args, **kwargs)

        return wrap

    @check_precondition
    def list(self, gid, sid):
        """
        This function is used to list all the Replication Nodes within
        that collection.

        Args:
            gid: Server Group ID
            sid: Server ID
        """
        sql = render_template(
            "/".join([self.template_path, self._PROPERTIES_SQL]))
        status, res = self.conn.execute_dict(sql)

        if not status:
            return internal_server_error(errormsg=res)
        return ajax_response(
            response=res['rows'],
            status=200
        )

    @check_precondition
    def nodes(self, gid, sid):
        """
        This function will used to create all the child node within that
        collection. Here it will create all the Replication Nodes node.

        Args:
            gid: Server Group ID
            sid: Server ID
        """
        res = []
        sql = render_template("/".join([self.template_path, self._NODES_SQL]))
        status, result = self.conn.execute_2darray(sql)
        if not status:
            return internal_server_error(errormsg=result)

        for row in result['rows']:
            res.append(
                self.blueprint.generate_browser_node(
                    row['pid'],
                    sid,
                    row['name'],
                ))

        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition
    def properties(self, gid, sid, pid):
        """
        This function will show the properties of the selected node.

        Args:
            gid: Server Group ID
            sid: Server ID
            pid: Replication Nodes ID
        """
        sql = render_template(
            "/".join([self.template_path, self._PROPERTIES_SQL]), pid=pid)
        status, res = self.conn.execute_dict(sql)

        if not status:
            return internal_server_error(errormsg=res)

        if len(res['rows']) == 0:
            return gone(gettext("""Could not find the Replication Node."""))

        return ajax_response(
            response=res['rows'][0],
            status=200
        )


ReplicationNodesView.register_node_view(blueprint)
