##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2015, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import six
from abc import ABCMeta, abstractmethod
from flask import url_for, render_template
from flask.ext.babel import gettext
from pgadmin.browser.utils import PgAdminModule, PGChildModule
from pgadmin.browser import BrowserPluginModule
from pgadmin.browser.utils import PGChildNodeView

@six.add_metaclass(ABCMeta)
class CollectionNodeModule(PgAdminModule, PGChildModule):
    """
    Base class for collection node submodules.
    """
    browser_url_prefix = BrowserPluginModule.browser_url_prefix

    def __init__(self, import_name, **kwargs):
        kwargs.setdefault("url_prefix", self.node_path)
        kwargs.setdefault("static_url_path", '/static')
        super(CollectionNodeModule, self).__init__(
                                            "NODE-%s" % self.node_type,
                                            import_name,
                                            **kwargs
                                            )

    @property
    def jssnippets(self):
        """
        Returns a snippet of javascript to include in the page
        """
        return []

    def get_own_javascripts(self):
        scripts = []

        scripts.extend([{
            'name': 'pgadmin.node.%s' % self.node_type,
            'path': url_for('browser.index') + '%s/module' % self.node_type,
            'when': self.script_load
            }])

        for module in self.submodules:
            scripts.extend(module.get_own_javascripts())

        return scripts

    def generate_browser_node(
            self, node_id, label, icon, **kwargs
            ):
        obj = {
                "id": "%s/%s" % (self.node_type, node_id),
                "label": label,
                "icon": self.node_icon if not icon else icon,
                "inode": self.node_inode,
                "_type": self.node_type,
                "_id": node_id,
                "module": 'pgadmin.node.%s' % self.node_type
                }
        for key in kwargs:
            obj.setdefault(key, kwargs[key])
        return obj

    def generate_browser_collection_node(self, sid, **kwargs):
        obj = {
                "id": "coll-%s/%d" % (self.node_type, sid),
                "label": self.collection_label,
                "icon": self.collection_icon,
                "inode": True,
                "_type": 'coll-%s' % (self.node_type),
                "_id": sid,
                "module": 'pgadmin.node.%s' % self.node_type
                }

        for key in kwargs:
            obj.setdefault(key, kwargs[key])

        return obj

    @property
    def node_type(self):
        return '%s' % (self.NODE_TYPE)

    @property
    def csssnippets(self):
        """
        Returns a snippet of css to include in the page
        """
        snippets = [
                render_template(
                    "browser/css/collection.css",
                    node_type=self.node_type,
                    _=gettext
                    ),
                render_template(
                    "browser/css/node.css",
                    node_type=self.node_type,
                    _=gettext
                    )
                ]

        for submodule in self.submodules:
            snippets.extend(submodule.csssnippets)

        return snippets

    @property
    def collection_label(self):
        """
        Label to be shown for the collection node, do not forget to set the
        class level variable COLLECTION_LABEL.
        """
        return self.COLLECTION_LABEL

    @property
    def collection_icon(self):
        """
        icon to be displayed for the browser collection node
        """
        return 'icon-coll-%s'  % (self.node_type)

    @property
    def node_icon(self):
        """
        icon to be displayed for the browser nodes
        """
        return 'icon-%s'  % (self.node_type)

    @property
    def node_inode(self):
        """
        Override this property to make the node as leaf node.
        """
        return True

    @abstractmethod
    def get_nodes(self, sid, *args, **kwargs):
        """
        Generate the collection node
        You need to override this method because every node will have different
        url pattern for the parent.
        """
        pass

    @property
    def script_load(self):
        """
        This property defines, when to load this script.
        In order to allow creation of an object, we need to load script for any
        node at the parent level.

        i.e.
        - In order to allow creating a server object, it should be loaded at
          server-group node.
        """
        pass

    @property
    def node_path(self):
        return self.browser_url_prefix + self.node_type

    @property
    def javascripts(self):
        return []
