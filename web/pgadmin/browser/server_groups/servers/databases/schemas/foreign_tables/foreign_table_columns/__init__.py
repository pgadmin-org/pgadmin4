##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

""" Implements Column Node for foreign table """
import pgadmin.browser.server_groups.servers.databases as database
from flask_babel import gettext
from pgadmin.browser.collection import CollectionNodeModule

from pgadmin.browser.server_groups.servers.databases.schemas.tables.columns \
    import ColumnsView


class ForeignTableColumnsModule(CollectionNodeModule):
    """
     class ColumnsModule(CollectionNodeModule)

        A module class for Column node derived from CollectionNodeModule.

    Methods:
    -------
    * __init__(*args, **kwargs)
      - Method is used to initialize the Column and it's base module.

    * get_nodes(gid, sid, did, scid, tid)
      - Method is used to generate the browser collection node.

    * node_inode()
      - Method is overridden from its base class to make the node as leaf node.

    * script_load()
      - Load the module script for schema, when any of the server node is
        initialized.
    """

    _NODE_TYPE = 'foreign_table_column'
    _COLLECTION_LABEL = gettext("Columns")

    def __init__(self, *args, **kwargs):
        """
        Method is used to initialize the ColumnModule and it's base module.

        Args:
            *args:
            **kwargs:
        """
        self.min_ver = None
        self.max_ver = None
        super().__init__(*args, **kwargs)

    def get_nodes(self, gid, sid, did, scid, foid, **kwargs):
        """
        Generate the collection node
        """
        if self.has_nodes(
                sid, did, scid=scid, tid=foid,
                base_template_path=ForeignTableColumnsView.BASE_TEMPLATE_PATH):
            yield self.generate_browser_collection_node(foid)

    @property
    def script_load(self):
        """
        Load the module script for server, when any of the server-group node is
        initialized.
        """
        return database.DatabaseModule.node_type

    @property
    def node_inode(self):
        """
        Load the module node as a leaf node
        """
        return False

    @property
    def module_use_template_javascript(self):
        """
        Returns whether Jinja2 template is used for generating the javascript
        module.
        """
        return False


foreign_table_column_blueprint = ForeignTableColumnsModule(__name__)


class ForeignTableColumnsView(ColumnsView):
    node_type = foreign_table_column_blueprint.node_type
    node_label = "Column"


ForeignTableColumnsView.register_node_view(foreign_table_column_blueprint)
