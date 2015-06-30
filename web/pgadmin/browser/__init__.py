##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2015, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
from abc import ABCMeta, abstractmethod, abstractproperty
from pgadmin import current_blueprint
from pgadmin.utils import PgAdminModule
from pgadmin.utils.ajax import make_json_response
from pgadmin.settings import get_setting
from flask import current_app, render_template, url_for, make_response
from flask.ext.security import login_required
from flask.ext.login import current_user
from flaskext.gravatar import Gravatar

MODULE_NAME = 'browser'

class BrowserModule(PgAdminModule):


    def get_own_stylesheets(self):
        stylesheets = []
        # Add browser stylesheets
        for (endpoint, filename) in [
            ('static', 'css/codemirror/codemirror.css'),
            ('static', 'css/jQuery-contextMenu/jquery.contextMenu.css'),
            ('static', 'css/wcDocker/wcDockerSkeleton.css' if \
                    current_app.debug else \
                       'css/wcDocker/wcDockerSkeleton.min.css'),
            ('static', 'css/wcDocker/theme.css'),
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
            'path': url_for('static', filename='js/alertifyjs/alertify' if current_app.debug \
                    else 'js/alertifyjs/alertify.min'),
            'exports': 'alertify',
            'preloaded': True
            })
        scripts.append({
            'name': 'codemirror',
            'path': url_for('static', filename='js/codemirror/codemirror'),
            'exports': 'CodeMirror',
            'preloaded': True
            })
        scripts.append({
            'name': 'codemirror.sql',
            'path': url_for('static', filename='js/codemirror/mode/sql'),
            'deps': ['codemirror'],
            'exports': 'CodeMirror.modes.sql',
            'preloaded': True
            })
        scripts.append({
            'name': 'jqueryui.position',
            'path': url_for('static',
                filename='js/jQuery-contextMenu/jquery.ui.position'),
            'deps': ['jquery'],
            'exports': 'jQuery.ui.position',
            'preloaded': True

            })
        scripts.append({
            'name': 'jquery.contextmenu',
            'path': url_for('static',
                filename='js/jQuery-contextMenu/jquery.contextMenu'),
            'deps': ['jquery', 'jqueryui.position'],
            'exports': 'jQuery.contextMenu',
            'preloaded': True
            })
        scripts.append({
            'name': 'jquery.aciplugin',
            'path': url_for('browser.static',
                filename='js/aciTree/jquery.aciPlugin.min'),
            'deps': ['jquery'],
            'exports': 'aciPluginClass',
            'preloaded': True
            })
        scripts.append({
            'name': 'jquery.acitree',
            'path': url_for('browser.static',
                filename='js/aciTree/jquery.aciTree' \
                        if current_app.debug else \
                        'js/aciTree/jquery.aciTree.min'),
            'deps': ['jquery', 'jquery.aciplugin'],
            'exports': 'aciPluginClass.plugins.aciTree',
            'preloaded': True
            })
        scripts.append({
            'name': 'wcdocker',
            'path': url_for('static',
                filename='js/wcDocker/wcDocker' if current_app.debug else \
                        'js/wcDocker/wcDocker.min'),
            'deps': ['jquery.contextmenu'],
            'exports': '',
            'preloaded': True
            })

        for name, script in [
                ['pgadmin.browser',       'js/browser'],
                ['pgadmin.browser.error', 'js/error'],
                ['pgadmin.browser.node',  'js/node']]:
            scripts.append({ 'name': name,
                'path': url_for('browser.index') + script, 'preloaded': True })

        for name, end in [
                ['pgadmin.browser.menu', 'js/menu'],
                ['pgadmin.browser.panel', 'js/panel'],
                ['pgadmin.browser.frame', 'js/frame']]:
            scripts.append({
                'name': name, 'path': url_for('browser.static', filename=end),
                'preloaded': True})

        for module in self.submodules:
            scripts.extend(module.get_own_javascripts())

        return scripts


blueprint = BrowserModule(MODULE_NAME, __name__)

class BrowserPluginModule(PgAdminModule):
    """
    Base class for browser submodules.
    """

    browser_url_prefix = blueprint.url_prefix + '/'
    __metaclass__ = ABCMeta

    def __init__(self, import_name, **kwargs):
        kwargs.setdefault("url_prefix", self.node_path)
        kwargs.setdefault("static_url_path", '/static')
        super(BrowserPluginModule, self).__init__("NODE-%s" % self.node_type,
                                            import_name,
                                            **kwargs)


    @property
    @abstractmethod
    def jssnippets(self):
        """
        Returns a snippet of javascript to include in the page
        """
        # TODO: move those methods to BrowserModule subclass ?
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


    def generate_browser_node(self, node_id, parent_id, label, icon, inode):
        obj = {
            "id": "%s/%s" % (self.node_type, node_id),
            "label": label,
            "icon": icon,
            "inode": inode,
            "_type": self.node_type,
            "_id": node_id,
            "refid": parent_id
            }
        return obj


    @property
    def csssnippets(self):
        """
        Returns a snippet of css to include in the page
        """
        snippets = [render_template("browser/css/node.css",
                               node_type=self.node_type)]

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
        return url_for('browser.index') + 'nodes/' + self.node_type


    @property
    def javascripts(self):
        return []


@blueprint.route("/")
@login_required
def index():
    """Render and process the main browser window."""
    # Get the Gravatar
    gravatar = Gravatar(current_app,
                        size=100,
                        rating='g',
                        default='retro',
                        force_default=False,
                        use_ssl=False,
                        base_url=None)
    return render_template(MODULE_NAME + "/index.html",
                           username=current_user.email)

@blueprint.route("/js/browser.js")
@login_required
def browser_js():
    layout = get_setting('Browser/Layout', default='')
    snippets = []
    for submodule in current_blueprint.submodules:
        snippets.extend(submodule.jssnippets)
    return make_response(
            render_template(
                'browser/js/browser.js',
                layout=layout,
                jssnippets=snippets),
            200, {'Content-Type': 'application/x-javascript'})

@blueprint.route("/js/error.js")
@login_required
def error_js():
    return make_response(
            render_template('browser/js/error.js'),
            200, {'Content-Type': 'application/x-javascript'})

@blueprint.route("/js/node.js")
@login_required
def node_js():
    return make_response(
            render_template('browser/js/node.js'),
            200, {'Content-Type': 'application/x-javascript'})


@blueprint.route("/browser.css")
@login_required
def browser_css():
    """Render and return CSS snippets from the nodes and modules."""
    snippets = []
    for submodule in blueprint.submodules:
        snippets.extend(submodule.csssnippets)
    return make_response(
            render_template('browser/css/browser.css', snippets=snippets),
            200, {'Content-Type': 'text/css'})


@blueprint.route("/nodes/")
@login_required
def get_nodes():
    """Build a list of treeview nodes from the child nodes."""
    nodes = []
    for submodule in current_blueprint.submodules:
        nodes.extend(submodule.get_nodes())
    return make_json_response(data=nodes)
