##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Implements Constraint Node"""

from functools import wraps
from pgadmin.utils.driver import get_driver
import pgadmin.browser.server_groups.servers.databases as database
from flask import render_template, make_response
from flask_babel import gettext
from pgadmin.browser.collection import CollectionNodeModule
from pgadmin.utils.ajax import make_json_response, \
    make_response as ajax_response, internal_server_error

from config import PG_DEFAULT_DRIVER
from .type import ConstraintRegistry


class ConstraintsModule(CollectionNodeModule):
    """
    class ConstraintsModule(CollectionNodeModule)

        A module class for Constraint node derived from CollectionNodeModule.

    Methods:
    -------
    * __init__(*args, **kwargs)
      - Method is used to initialize the ConstraintsModule and it's base module.

    * get_nodes(gid, sid, did)
      - Method is used to generate the browser collection node.

    * node_inode()
      - Method is overridden from its base class to make the node as leaf node.

    * script_load()
      - Load the module script for constraint node, when any of the database node is
        initialized.
    """

    NODE_TYPE = 'constraints'
    COLLECTION_LABEL = gettext("Constraints")

    def __init__(self, *args, **kwargs):
        self.min_ver = None
        self.max_ver = None
        super(ConstraintsModule, self).__init__(*args, **kwargs)

    def get_nodes(self, gid, sid, did, scid, tid):
        """
        Generate the collection node
        """
        nodes = []
        for name in ConstraintRegistry.registry:
            view = (ConstraintRegistry.registry[name])['nodeview']
            nodes.append(view.node_type)
        node = self.generate_browser_collection_node(tid)
        node['nodes'] = nodes
        yield node

    @property
    def script_load(self):
        """
        Load the module script for constraints, when any of the table node is
        initialized.
        """
        return database.DatabaseModule.NODE_TYPE


blueprint = ConstraintsModule(__name__)


@blueprint.route('/nodes/<int:gid>/<int:sid>/<int:did>/<int:scid>/<int:tid>/')
def nodes(**kwargs):
    """
    Returns all constraint as a tree node.

    Args:
      **kwargs:

    Returns:

    """

    cmd = {"cmd": "nodes"}
    res = []
    for name in ConstraintRegistry.registry:
        module = (ConstraintRegistry.registry[name])['nodeview']
        view = module(**cmd)
        res = res + view.get_nodes(**kwargs)

    return make_json_response(
        data=res,
        status=200
    )

@blueprint.route('/obj/<int:gid>/<int:sid>/<int:did>/<int:scid>/<int:tid>/')
def proplist(**kwargs):
    """
    Returns all constraint with properties.
    Args:
      **kwargs:

    Returns:

    """

    cmd = {"cmd": "obj"}
    res = []
    for name in ConstraintRegistry.registry:
        module = (ConstraintRegistry.registry[name])['nodeview']
        view = module(**cmd)
        res = res + view.get_node_list(**kwargs)

    return ajax_response(
        response=res,
        status=200
    )


@blueprint.route('/module.js')
def module_js():
    """
      This property defines whether javascript exists for this node.

    """
    return make_response(
        render_template(
            "constraints/js/constraints.js",
            _=gettext,
            constraints=[
                (ConstraintRegistry.registry[n])['blueprint'].NODE_TYPE \
                for n in ConstraintRegistry.registry
                ]
        ),
        200, {'Content-Type': 'application/x-javascript'}
    )
