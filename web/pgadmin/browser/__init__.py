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
            ('static', 'css/wcDocker/theme.css'),
            ('static', 'css/jQuery-contextMenu/jquery.contextMenu.css'),
            ('browser.static', 'css/browser.css'),
            ('browser.static', 'css/aciTree/css/aciTree.css')
            ]:
            stylesheets.append(url_for(endpoint, filename=filename))
        stylesheets.append(url_for('browser.browser_css'))
        if current_app.debug:
            stylesheets.append(url_for('static', filename='css/wcDocker/wcDockerSkeleton.css'))
        else:
            stylesheets.append(url_for('static', filename='css/wcDocker/wcDockerSkeleton.min.css'))
        return stylesheets

    def get_own_javascripts(self):
        scripts = []
        for (endpoint, filename) in [
            ('static', 'js/codemirror/codemirror.js'),
            ('static', 'js/codemirror/mode/sql.js'),
            ('static', 'js/jQuery-contextMenu/jquery.ui.position.js'),
            ('static', 'js/jQuery-contextMenu/jquery.contextMenu.js'),
            ('browser.static', 'js/aciTree/jquery.aciPlugin.min.js'),
            ('browser.static', 'js/aciTree/jquery.aciTree.dom.js'),
            ('browser.static', 'js/aciTree/jquery.aciTree.min.js')]:
            scripts.append(url_for(endpoint, filename=filename))
        scripts.append(url_for('browser.browser_js'))
        if current_app.debug:
            scripts.append(url_for(
                'static',
                filename='js/wcDocker/wcDocker.js'))
        else:
            scripts.append(url_for(
                'static',
                filename='js/wcDocker/wcDocker.min.js'))
        return scripts


blueprint = BrowserModule(MODULE_NAME, __name__)

class BrowserPluginModule(PgAdminModule):
    """
    Base class for browser submodules.
    """

    __metaclass__ = ABCMeta

    def __init__(self, import_name, **kwargs):
        kwargs.setdefault("url_prefix", self.node_path)
        kwargs.setdefault("static_url_path", '')
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

    @property
    def csssnippets(self):
        """
        Returns a snippet of css to include in the page
        """
        # TODO: move those methods to BrowserModule subclass ?
        return render_template("browser/css/node.css",
                               node_type=self.node_type)

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

    @property
    def node_path(self):
        return '/browser/nodes/' + self.node_type


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

@blueprint.route("/browser.js")
@login_required
def browser_js():
    layout = get_setting('Browser/Layout', default='')
    snippets = []
    for submodule in current_blueprint.submodules:
        snippets.extend(submodule.jssnippets)
    return make_response(render_template(
        'browser/js/browser.js',
        layout=layout,
        jssnippets=snippets),
        200, {'Content-Type': 'application/x-javascript'})

@blueprint.route("/browser.css")
@login_required
def browser_css():
    """Render and return CSS snippets from the nodes and modules."""
    snippets = []
    for submodule in current_blueprint.submodules:
        snippets.extend(submodule.csssnippets)
    return make_response(render_template('browser/css/browser.css',
                           snippets=snippets),
                         200, {'Content-Type': 'text/css'})


@blueprint.route("/nodes/")
@login_required
def get_nodes():
    """Build a list of treeview nodes from the child nodes."""
    nodes = []
    for submodule in current_blueprint.submodules:
        nodes.extend(submodule.get_nodes())
    return make_json_response(data=nodes)
