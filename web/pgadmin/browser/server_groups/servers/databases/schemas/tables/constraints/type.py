##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from flask import Blueprint
from pgadmin.browser.collection import CollectionNodeModule


class ConstraintRegistry(object):
    """
    ConstraintTypeRegistry

    It is more of a registry for difference type of constraints for the tables.
    Its job is to initialize to different type of constraint blueprint and
    register it with its respective NodeView.
    """
    registry = dict()

    def __init__(self, name, con_blueprint, con_nodeview):
        if name not in ConstraintRegistry.registry:
            blueprint = con_blueprint(name)

            # TODO:: register the view with the blueprint
            con_nodeview.register_node_view(blueprint)

            ConstraintRegistry.registry[name] = {
                'blueprint': blueprint,
                'nodeview': con_nodeview
            }


class ConstraintTypeModule(CollectionNodeModule):
    register = Blueprint.register

    def __init__(self, *args, **kwargs):
        super(ConstraintTypeModule, self).__init__(*args, **kwargs)
