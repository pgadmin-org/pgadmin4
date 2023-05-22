##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from abc import ABCMeta, abstractmethod

from flask import render_template
from flask_babel import gettext
from pgadmin.browser import BrowserPluginModule
from pgadmin.browser.utils import PGChildModule
from pgadmin.utils import PgAdminModule
from pgadmin.utils.preferences import Preferences
from pgadmin.utils.constants import PGADMIN_NODE
from pgadmin.utils.driver import get_driver
from config import PG_DEFAULT_DRIVER
from pgadmin.browser.utils import PGChildNodeView


class CollectionNodeModule(PgAdminModule, PGChildModule, metaclass=ABCMeta):
    """
    Base class for collection node submodules.
    """
    browser_url_prefix = BrowserPluginModule.browser_url_prefix
    SHOW_ON_BROWSER = True

    _BROWSER_CSS_PATH = 'browser/css'

    _NODE_CSS = "/".join([_BROWSER_CSS_PATH, 'node.css'])
    _COLLECTION_CSS = "/".join([_BROWSER_CSS_PATH, 'collection.css'])

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

    @property
    def module_use_template_javascript(self):
        """
        Returns whether Jinja2 template is used for generating the javascript
        module.
        """
        return True

    def generate_browser_node(
            self, node_id, parent_id, label, icon, **kwargs
    ):
        obj = {
            "id": "%s_%s" % (self.node_type, node_id),
            "label": label,
            "icon": self.node_icon if not icon else icon,
            "inode": self.node_inode
            if 'inode' not in kwargs
            else kwargs['inode'],
            "_type": self.node_type,
            "_id": node_id,
            "_pid": parent_id,
            "module": PGADMIN_NODE % self.node_type
        }
        for key in kwargs:
            obj.setdefault(key, kwargs[key])
        return obj

    def generate_browser_collection_node(self, parent_id, **kwargs):
        obj = {
            "id": "coll-%s_%d" % (self.node_type, parent_id),
            "label": self.collection_label,
            "icon": self.collection_icon,
            "inode": True,
            "_type": 'coll-%s' % (self.node_type),
            "_id": parent_id,
            "_pid": parent_id,
            "module": PGADMIN_NODE % self.node_type,
            "nodes": [self.node_type]
        }

        for key in kwargs:
            obj.setdefault(key, kwargs[key])

        return obj

    def has_nodes(self, sid, did, scid=None, tid=None, vid=None,
                  base_template_path=''):
        if self.pref_show_empty_coll_nodes.get():
            return True

        try:
            driver = get_driver(PG_DEFAULT_DRIVER)
            manager = driver.connection_manager(sid)
            conn = manager.connection(did=did)
            if '{1}' in base_template_path:
                template_base_path = base_template_path.format(
                    manager.server_type, manager.version)
            else:
                template_base_path = base_template_path.format(manager.version)

            last_system_oid = 0 if self.show_system_objects else \
                PGChildNodeView._DATABASE_LAST_SYSTEM_OID

            sql = render_template(
                "/".join([template_base_path, PGChildNodeView._COUNT_SQL]),
                did=did,
                scid=scid,
                tid=tid,
                vid=vid,
                datlastsysoid=last_system_oid,
                showsysobj=self.show_system_objects,
                conn=conn
            )

            status, res = conn.execute_dict(sql)

            return int(res['rows'][0]['count']) > 0 if status \
                else True
        except Exception as _:
            return True

    @property
    def node_type(self):
        return '%s' % (self._NODE_TYPE)

    @property
    def csssnippets(self):
        """
        Returns a snippet of css to include in the page
        """
        snippets = [
            render_template(
                self._COLLECTION_CSS,
                node_type=self.node_type
            ),
            render_template(
                self._NODE_CSS,
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
        class level variable _COLLECTION_LABEL.
        """
        return gettext(self._COLLECTION_LABEL)

    @property
    def label(self):
        return gettext(self._COLLECTION_LABEL)

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

    @property
    def show_database_template(self):
        """
        Show/Hide the user defined template in the database server.
        """
        if self.pref_show_user_defined_templates:
            return self.pref_show_user_defined_templates.get()
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
        # Add the node informaton for browser, not in respective node
        # preferences
        self.browser_preference = Preferences.module('browser')
        self.pref_show_system_objects = self.browser_preference.preference(
            'show_system_objects'
        )
        self.pref_show_user_defined_templates = \
            self.browser_preference.preference('show_user_defined_templates')
        self.pref_show_node = self.browser_preference.register(
            'node', 'show_node_' + self.node_type,
            self.collection_label, 'node', self.SHOW_ON_BROWSER,
            category_label=gettext('Nodes')
        )
        self.pref_show_empty_coll_nodes = self.browser_preference.preference(
            'show_empty_coll_nodes'
        )
