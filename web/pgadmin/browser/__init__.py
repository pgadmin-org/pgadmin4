##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import json
from abc import ABCMeta, abstractmethod, abstractproperty

import six
from flask import current_app, render_template, url_for, make_response, flash
from flask_babel import gettext
from flask_login import current_user
from flask_security import login_required
from flask_gravatar import Gravatar
from pgadmin.settings import get_setting
from pgadmin.utils import PgAdminModule
from pgadmin.utils.ajax import make_json_response
from pgadmin.utils.preferences import Preferences

import config
from pgadmin import current_blueprint

try:
    import urllib.request as urlreq
except:
    import urllib2 as urlreq

MODULE_NAME = 'browser'


class BrowserModule(PgAdminModule):
    LABEL = gettext('Browser')

    def get_own_stylesheets(self):
        stylesheets = []
        # Add browser stylesheets
        for (endpoint, filename) in [
            ('static', 'css/codemirror/codemirror.css'),
            ('static', 'css/jQuery-contextMenu/jquery.contextMenu.css' if current_app.debug
            else 'css/jQuery-contextMenu/jquery.contextMenu.min.css'),
            ('static', 'css/wcDocker/wcDocker.css' if current_app.debug
            else 'css/wcDocker/wcDocker.min.css'),
            ('browser.static', 'css/browser.css'),
            ('browser.static', 'css/aciTree/css/aciTree.css')
        ]:
            stylesheets.append(url_for(endpoint, filename=filename))
        stylesheets.append(url_for('browser.browser_css'))
        return stylesheets

    def get_own_javascripts(self):
        scripts = list()
        scripts.append({
            'name': 'alertify',
            'path': url_for(
                'static',
                filename='js/alertifyjs/alertify' if current_app.debug
                else 'js/alertifyjs/alertify.min'
            ),
            'exports': 'alertify',
            'preloaded': True
        })
        scripts.append({
            'name': 'jqueryui.position',
            'path': url_for(
                'static',
                filename='js/jQuery-contextMenu/jquery.ui.position' if \
                    current_app.debug else \
                    'js/jQuery-contextMenu/jquery.ui.position.min'
            ),
            'deps': ['jquery'],
            'exports': 'jQuery.ui.position',
            'preloaded': True
        })
        scripts.append({
            'name': 'jquery.contextmenu',
            'path': url_for(
                'static',
                filename='js/jQuery-contextMenu/jquery.contextMenu' if \
                    current_app.debug else \
                    'js/jQuery-contextMenu/jquery.contextMenu.min'
            ),
            'deps': ['jquery', 'jqueryui.position'],
            'exports': 'jQuery.contextMenu',
            'preloaded': True
        })
        scripts.append({
            'name': 'jquery.aciplugin',
            'path': url_for(
                'browser.static',
                filename='js/aciTree/jquery.aciPlugin.min'
            ),
            'deps': ['jquery'],
            'exports': 'aciPluginClass',
            'preloaded': True
        })
        scripts.append({
            'name': 'jquery.acitree',
            'path': url_for(
                'browser.static',
                filename='js/aciTree/jquery.aciTree' if
                current_app.debug else 'js/aciTree/jquery.aciTree.min'
            ),
            'deps': ['jquery', 'jquery.aciplugin'],
            'exports': 'aciPluginClass.plugins.aciTree',
            'preloaded': True
        })
        scripts.append({
            'name': 'jquery.acisortable',
            'path': url_for(
                'browser.static',
                filename='js/aciTree/jquery.aciSortable.min'
            ),
            'deps': ['jquery', 'jquery.aciplugin'],
            'exports': 'aciPluginClass.plugins.aciSortable',
            'when': None,
            'preloaded': True
        })
        scripts.append({
            'name': 'jquery.acifragment',
            'path': url_for(
                'browser.static',
                filename='js/aciTree/jquery.aciFragment.min'
            ),
            'deps': ['jquery', 'jquery.aciplugin'],
            'exports': 'aciPluginClass.plugins.aciFragment',
            'when': None,
            'preloaded': True
        })
        scripts.append({
            'name': 'wcdocker',
            'path': url_for(
                'static',
                filename='js/wcDocker/wcDocker' if current_app.debug
                else 'js/wcDocker/wcDocker.min'
            ),
            'deps': ['jquery.contextmenu'],
            'exports': '',
            'preloaded': True
        })

        scripts.append({
            'name': 'pgadmin.browser.datamodel',
            'path': url_for('browser.static', filename='js/datamodel'),
            'preloaded': True
        })

        for name, script in [
            ['pgadmin.browser', 'js/browser'],
            ['pgadmin.browser.error', 'js/error']]:
            scripts.append({
                'name': name,
                'path': url_for('browser.index') + script,
                'preloaded': True
            })

        for name, script in [
            ['pgadmin.browser.node', 'js/node'],
            ['pgadmin.browser.messages', 'js/messages'],
            ['pgadmin.browser.collection', 'js/collection']]:
            scripts.append({
                'name': name,
                'path': url_for('browser.index') + script,
                'preloaded': True,
                'deps': ['pgadmin.browser.datamodel']
            })

        for name, end in [
            ['pgadmin.browser.menu', 'js/menu'],
            ['pgadmin.browser.panel', 'js/panel'],
            ['pgadmin.browser.frame', 'js/frame']]:
            scripts.append({
                'name': name, 'path': url_for('browser.static', filename=end),
                'preloaded': True})

        scripts.append({
            'name': 'pgadmin.browser.node.ui',
            'path': url_for('browser.static', filename='js/node.ui'),
            'when': 'server-group'
        })

        for module in self.submodules:
            scripts.extend(module.get_own_javascripts())
        return scripts

    def register_preferences(self):
        self.show_system_objects = self.preference.register(
            'display', 'show_system_objects',
            gettext("Show system objects?"), 'boolean', False,
            category_label=gettext('Display')
        )

blueprint = BrowserModule(MODULE_NAME, __name__)


@six.add_metaclass(ABCMeta)
class BrowserPluginModule(PgAdminModule):
    """
    Abstract base class for browser submodules.

    It helps to define the node for each and every node comes under the browser
    tree. It makes sure every module comes under browser will have prefix
    '/browser', and sets the 'url_prefix', 'static_url_path', etc.

    Also, creates some of the preferences to be used by the node.
    """

    browser_url_prefix = blueprint.url_prefix + '/'
    SHOW_ON_BROWSER = True

    def __init__(self, import_name, **kwargs):
        """
        Construct a new 'BrowserPluginModule' object.

        :param import_name: Name of the module
        :param **kwargs:    Extra parameters passed to the base class
                            pgAdminModule.

        :return: returns nothing

        It sets the url_prefix to based on the 'node_path'. And,
        static_url_path to relative path to '/static'.

        Every module extended from this will be identified as 'NODE-<type>'.

        Also, create a preference 'show_node_<type>' to fetch whether it
        can be shown in the browser or not. Also,  refer to the browser-preference.
        """
        kwargs.setdefault("url_prefix", self.node_path)
        kwargs.setdefault("static_url_path", '/static')

        self.browser_preference = None
        self.pref_show_system_objects = None
        self.pref_show_node = None

        super(BrowserPluginModule, self).__init__(
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
        """
        Returns the list of javascripts information used by the module.

        Each javascripts information must contain name, path of the script.

        The name must be unique for each module, hence - in order to refer them
        properly, we do use 'pgadmin.node.<type>' as norm.

        That can also refer to when to load the script.

        i.e.
        We may not need to load the javascript of table node, when we're
        not yet connected to a server, and no database is loaded. Hence - it
        make sense to load them when a database is loaded.

        We may also add 'deps', which also refers to the list of javascripts,
        it may depends on.
        """
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
            self, node_id, parent_id, label, icon, inode, node_type, **kwargs
    ):
        """
        Helper function to create a browser node for this particular subnode.

        :param node_id:   Unique Id for each node
        :param parent_id: Id of the parent.
        :param label:     Label for the node
        :param icon:      Icon for displaying along with this node on browser
                          tree. Icon refers to a class name, it refers to.
        :param inode:     True/False.
                          Used by the browser tree node to check, if the
                          current node will have children or not.
        :param node_type: String to refer to the node type.
        :param **kwargs:  A node can have extra information other than this
                          data, which can be passed as key-value pair as
                          argument here.
                          i.e. A database, server node can have extra
                          information like connected, or not.

        Returns a dictionary object representing this node object for the
        browser tree.
        """
        obj = {
            "id": "%s/%s" % (node_type, node_id),
            "label": label,
            "icon": icon,
            "inode": inode,
            "_type": node_type,
            "_id": node_id,
            "_pid": parent_id,
            "module": 'pgadmin.node.%s' % node_type
        }
        for key in kwargs:
            obj.setdefault(key, kwargs[key])
        return obj

    @property
    def csssnippets(self):
        """
        Returns a snippet of css to include in the page
        """
        snippets = [
            render_template(
                "browser/css/node.css",
                node_type=self.node_type,
                _=gettext
            )]

        for submodule in self.submodules:
            snippets.extend(submodule.csssnippets)
        return snippets

    @abstractmethod
    def get_nodes(self):
        """
        Each browser module is responsible for fetching
        its own tree subnodes.
        """
        return []

    @abstractproperty
    def node_type(self):
        pass

    @abstractproperty
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
        """
        Defines the url path prefix for this submodule.
        """
        return self.browser_url_prefix + self.node_type

    @property
    def javascripts(self):
        """
        Override the javascript of PgAdminModule, so that - we don't return
        javascripts from the get_own_javascripts itself.
        """
        return []

    @property
    def label(self):
        """
        Module label.
        """
        return self.LABEL

    @property
    def show_node(self):
        """
        A proper to check to show node for this module on the browser tree or not.

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
        Registers the preferences object for this module.

        Sets the browser_preference, show_system_objects, show_node preference
        objects for this submodule.
        """
        # Add the node informaton for browser, not in respective node preferences
        self.browser_preference = blueprint.preference
        self.pref_show_system_objects = blueprint.preference.preference(
            'display', 'show_system_objects'
        )
        self.pref_show_node = self.browser_preference.preference(
            'node', 'show_node_' + self.node_type,
            self.label, 'boolean', self.SHOW_ON_BROWSER, category_label=gettext('Nodes')
        )


@blueprint.route("/")
@login_required
def index():
    """Render and process the main browser window."""
    # Get the Gravatar
    Gravatar(
        current_app,
        size=100,
        rating='g',
        default='retro',
        force_default=False,
        use_ssl=True,
        base_url=None
    )

    msg = None
    # Get the current version info from the website, and flash a message if
    # the user is out of date, and the check is enabled.
    if config.UPGRADE_CHECK_ENABLED:
        data = None
        url = '%s?version=%s' % (config.UPGRADE_CHECK_URL, config.APP_VERSION)
        current_app.logger.debug('Checking version data at: %s' % url)

        try:
            # Do not wait for more than 5 seconds.
            # It stuck on rendering the browser.html, while working in the
            # broken network.
            response = urlreq.urlopen(url, data, 5)
            current_app.logger.debug(
                'Version check HTTP response code: %d' % response.getcode()
            )

            if response.getcode() == 200:
                data = json.load(response)
                current_app.logger.debug('Response data: %s' % data)
        except:
            pass

        if data is not None:
            if data['pgadmin4']['version_int'] > config.APP_VERSION_INT:
                msg = render_template(
                    MODULE_NAME + "/upgrade.html",
                    current_version=config.APP_VERSION,
                    upgrade_version=data['pgadmin4']['version'],
                    product_name=config.APP_NAME,
                    download_url=data['pgadmin4']['download_url']
                )

                flash(msg, 'warning')

    return render_template(
        MODULE_NAME + "/index.html",
        username=current_user.email,
        is_admin=current_user.has_role("Administrator"),
        _=gettext
    )


@blueprint.route("/js/browser.js")
@login_required
def browser_js():
    layout = get_setting('Browser/Layout', default='')
    snippets = []

    prefs = Preferences.module('paths')

    pg_help_path_pref = prefs.preference('pg_help_path')
    pg_help_path = pg_help_path_pref.get()

    edbas_help_path_pref = prefs.preference('edbas_help_path')
    edbas_help_path = edbas_help_path_pref.get()

    # Get sqleditor options
    prefs = Preferences.module('sqleditor')

    editor_tab_size_pref = prefs.preference('tab_size')
    editor_tab_size = editor_tab_size_pref.get()

    editor_use_spaces_pref = prefs.preference('use_spaces')
    editor_use_spaces = editor_use_spaces_pref.get()

    for submodule in current_blueprint.submodules:
        snippets.extend(submodule.jssnippets)
    return make_response(
        render_template(
            'browser/js/browser.js',
            layout=layout,
            jssnippets=snippets,
            pg_help_path=pg_help_path,
            edbas_help_path=edbas_help_path,
            editor_tab_size=editor_tab_size,
            editor_use_spaces=editor_use_spaces,
            _=gettext
        ),
        200, {'Content-Type': 'application/x-javascript'})


@blueprint.route("/js/error.js")
@login_required
def error_js():
    return make_response(
        render_template('browser/js/error.js', _=gettext),
        200, {'Content-Type': 'application/x-javascript'})


@blueprint.route("/js/node.js")
@login_required
def node_js():
    prefs = Preferences.module('paths')

    pg_help_path_pref = prefs.preference('pg_help_path')
    pg_help_path = pg_help_path_pref.get()

    edbas_help_path_pref = prefs.preference('edbas_help_path')
    edbas_help_path = edbas_help_path_pref.get()

    return make_response(
        render_template('browser/js/node.js',
                        pg_help_path=pg_help_path,
                        edbas_help_path=edbas_help_path,
                        _=gettext
                        ),
        200, {'Content-Type': 'application/x-javascript'})


@blueprint.route("/js/messages.js")
def messages_js():
    return make_response(
        render_template('browser/js/messages.js', _=gettext),
        200, {'Content-Type': 'application/x-javascript'})


@blueprint.route("/js/collection.js")
@login_required
def collection_js():
    return make_response(
        render_template('browser/js/collection.js', _=gettext),
        200, {'Content-Type': 'application/x-javascript'})


@blueprint.route("/browser.css")
@login_required
def browser_css():
    """Render and return CSS snippets from the nodes and modules."""
    snippets = []

    # Get configurable options
    prefs = Preferences.module('sqleditor')

    sql_font_size_pref = prefs.preference('sql_font_size')
    sql_font_size = round(float(sql_font_size_pref.get()), 2)

    if sql_font_size != 0:
        snippets.append('.CodeMirror { font-size: %sem; }' % str(sql_font_size))

    for submodule in blueprint.submodules:
        snippets.extend(submodule.csssnippets)
    return make_response(
        render_template(
            'browser/css/browser.css', snippets=snippets, _=gettext
        ),
        200, {'Content-Type': 'text/css'})


@blueprint.route("/nodes/")
@login_required
def get_nodes():
    """Build a list of treeview nodes from the child nodes."""
    nodes = []
    for submodule in current_blueprint.submodules:
        nodes.extend(submodule.get_nodes())
    return make_json_response(data=nodes)
