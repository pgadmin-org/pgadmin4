##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from abc import ABCMeta, abstractmethod

import six
from flask import url_for, render_template
from flask_babel import gettext
from pgadmin.browser import BrowserPluginModule
from pgadmin.browser.utils import PGChildModule
from pgadmin.utils import PgAdminModule
from pgadmin.utils.preferences import Preferences


@six.add_metaclass(ABCMeta)
class CollectionNodeModule(PgAdminModule, PGChildModule):
    """
    Base class for collection node submodules.
    """
    browser_url_prefix = BrowserPluginModule.browser_url_prefix
    SHOW_ON_BROWSER = True

    def __init__(self, import_name, **kwargs):
        kwargs.setdefault("url_prefix", self.node_path)
        kwargs.setdefault("static_url_path", '/static')

        PgAdminModule.__init__(
            self,
            "NODE-%s" % self.node_type,
            import_name,
            **kwargs
        )
        PGChildModule.__init__(self)

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
            self, node_id, parent_id, label, icon, **kwargs
    ):
        obj = {
            "id": "%s/%s" % (self.node_type, node_id),
            "label": label,
            "icon": self.node_icon if not icon else icon,
            "inode": self.node_inode,
            "_type": self.node_type,
            "_id": node_id,
            "_pid": parent_id,
            "module": 'pgadmin.node.%s' % self.node_type
        }
        for key in kwargs:
            obj.setdefault(key, kwargs[key])
        return obj

    def generate_browser_collection_node(self, parent_id, **kwargs):
        obj = {
            "id": "coll-%s/%d" % (self.node_type, parent_id),
            "label": self.collection_label,
            "icon": self.collection_icon,
            "inode": True,
            "_type": 'coll-%s' % (self.node_type),
            "_id": parent_id,
            "_pid": parent_id,
            "module": 'pgadmin.node.%s' % self.node_type,
            "nodes": [self.node_type]
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
                node_type=self.node_type
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
    def label(self):
        return self.COLLECTION_LABEL

    @property
    def collection_icon(self):
        """
        icon to be displayed for the browser collection node
        """
        return 'icon-coll-%s' % (self.node_type)

    @property
    def node_icon(self):
        """
        icon to be displayed for the browser nodes
        """
        return 'icon-%s' % (self.node_type)

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

    @property
    def show_node(self):
        """
        Property to check whether to show the node for this module on the
        browser tree or not.

        Relies on show_node preference object, otherwise on the SHOW_ON_BROWSER
        default value.
        """
        if self.pref_show_node:
            return self.pref_show_node.get()
        else:
            return self.SHOW_ON_BROWSER

    @property
    def show_system_objects(self):
        """
        Show/Hide the system objects in the database server.
        """
        if self.pref_show_system_objects:
            return self.pref_show_system_objects.get()
        else:
            return False

    def register_preferences(self):
        """
        register_preferences
        Register preferences for this module.

        Keep the browser preference object to be used by overriden submodule,
        along with that get two browser level preferences show_system_objects,
        and show_node will be registered to used by the submodules.
        """
        # Add the node informaton for browser, not in respective node preferences
        self.browser_preference = Preferences.module('browser')
        self.pref_show_system_objects = self.browser_preference.preference(
            'show_system_objects'
        )
        self.pref_show_node = self.browser_preference.register(
            'node', 'show_node_' + self.node_type,
            self.collection_label, 'node', self.SHOW_ON_BROWSER,
            category_label=gettext('Nodes')
        )
