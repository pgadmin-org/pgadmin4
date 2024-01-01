##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Implements Constraint Node"""

import json
from flask import request
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
      - Method is used to initialize the ConstraintsModule and it's base
      module.

    * get_nodes(gid, sid, did)
      - Method is used to generate the browser collection node.

    * node_inode()
      - Method is overridden from its base class to make the node as leaf node.

    * script_load()
      - Load the module script for constraint node, when any of the database
      node is initialized.
    """

    _NODE_TYPE = 'constraints'
    _COLLECTION_LABEL = gettext("Constraints")

    def __init__(self, *args, **kwargs):
        self.min_ver = None
        self.max_ver = None
        super().__init__(*args, **kwargs)

    def get_nodes(self, gid, sid, did, scid, **kwargs):
        """
        Generate the collection node
        """
        assert ('tid' in kwargs or 'vid' in kwargs or 'foid' in kwargs)
        tid = kwargs.get('tid', kwargs.get('vid', kwargs.get('foid', None)))
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
        return database.DatabaseModule.node_type

    @property
    def module_use_template_javascript(self):
        """
        Returns whether Jinja2 template is used for generating the javascript
        module.
        """
        return False

    def register(self, app, options):
        """
        Override the default register function to automagically register
        sub-modules at once.
        """
        from .check_constraint import blueprint as module
        self.submodules.append(module)

        from .exclusion_constraint import blueprint as module
        self.submodules.append(module)

        from .foreign_key import blueprint as module
        self.submodules.append(module)

        from .index_constraint import primary_key_blueprint as module
        self.submodules.append(module)

        from .index_constraint import unique_constraint_blueprint as module
        self.submodules.append(module)

        super().register(app, options)


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


@blueprint.route('/obj/<int:gid>/<int:sid>/<int:did>/<int:scid>/<int:tid>/',
                 methods=['DELETE'])
@blueprint.route('/delete/<int:gid>/<int:sid>/<int:did>/<int:scid>/<int:tid>/',
                 methods=['DELETE'])
def delete(**kwargs):
    """
    Delete multiple constraints under the table.
    Args:
      **kwargs:

    Returns:

    """
    data = request.form if request.form else json.loads(
        request.data)

    if 'delete' in request.base_url:
        cmd = {"cmd": "delete"}
    else:
        cmd = {"cmd": "obj"}
    res = []
    module_wise_data = {}

    for d in data['ids']:
        if d['_type'] in module_wise_data:
            module_wise_data[d['_type']].append(d['id'])
        else:
            module_wise_data[d['_type']] = [d['id']]

    for name in ConstraintRegistry.registry:
        if name in module_wise_data:
            module = (ConstraintRegistry.registry[name])['nodeview']
            view = module(**cmd)
            request.data = json.dumps({'ids': module_wise_data[name]})
            response = view.delete(**kwargs)
            res = json.loads(response.data.decode('utf-8'))
            if not res['success']:
                return response

    return make_json_response(
        success=1,
        info=gettext("Constraints dropped.")
    )
