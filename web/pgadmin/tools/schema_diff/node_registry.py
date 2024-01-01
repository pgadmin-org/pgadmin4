##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################


class SchemaDiffRegistry():
    """
    SchemaDiffRegistry

    It is more of a registry for different type of nodes for schema diff.
    """
    _registered_nodes = dict()

    def __init__(self, node_name, node_view, parent_node='schema'):
        if node_name not in SchemaDiffRegistry._registered_nodes:
            SchemaDiffRegistry._registered_nodes[node_name] = {
                'view': node_view,
                'parent': parent_node
            }

    @classmethod
    def get_registered_nodes(cls, node_name=None, parent_node='schema'):
        """
        This function will return the node's view object if node name
        is specified or return the complete list of registered nodes.

        :param node_name: Name of the node ex: Database, Schema, etc..
        :return:
        """
        if node_name is not None:
            if node_name in cls._registered_nodes:
                return cls._registered_nodes[node_name]['view']
            else:
                return None

        registered_nodes = {}
        for key, value in cls._registered_nodes.items():
            if value['parent'] == parent_node:
                registered_nodes[key] = value['view']

        return registered_nodes

    @classmethod
    def get_node_view(cls, node_name):
        """
        This function will return the view object for the "nodes"
        command as per the specified node name.

        :param node_name: Name of the node ex: Database, Schema, etc..
        :return:
        """
        cmd = {"cmd": "nodes, compare, ddl_compare"}
        module = SchemaDiffRegistry.get_registered_nodes(node_name)
        if not module:
            return None
        return module(**cmd)
