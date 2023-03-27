.. _code_overview:

**********************
`Code Overview`:index:
**********************

The bulk of pgAdmin is a Python web application written using the Flask framework
on the backend, and HTML5 with CSS3, Bootstrap and jQuery on the front end. A
desktop runtime is also included for users that prefer a desktop application to
a web application, which is written using NWjs (Node Webkit).

Runtime
*******

The runtime is based on NWjs which integrates a browser and the Python server
creating a standalone application. The source code can be found in the
**/runtime** directory in the source tree.

Web Application
***************

The web application forms the bulk of pgAdmin and can be found in the **/web**
directory in the source tree. The main file is **pgAdmin4.py** which can be used
to run the built-in standalone web server, or as a WSGI application for production
use.

Configuration
=============

The core application configuration is found in **config.py**. This file includes
all configurable settings for the application, along with descriptions of their
use. It is essential that various settings are configured prior to deployment on
a web server; these can be overridden in **config_local.py** or
**config_system.py** (see the :ref:`config.py <config_py>` documentation) to
avoid modifying the main configuration file.

User Settings
=============

When running in desktop mode, pgAdmin has a single, default user account that is
used for the desktop user. When running in server mode, there may be unlimited
users who are required to login prior to using the application. pgAdmin utilised
the **Flask-Security** module to manage application security and users, and
provides options for self-service password reset and password changes etc.

Whether in desktop or server mode, each user's settings are stored in a SQLite
OR external database which is also used to store the user accounts. This is initially
created using the **setup.py** script which will create the database file and
schema within it, and add the first user account (with administrative
privileges) and a default server group for them. A **settings** table is also
used to store user configuration settings in a key-value fashion. Although not
required, setting keys (or names) are typically formatted using forward slashes
to artificially namespace values, much like the pgAdmin 3 settings files on Linux
or Mac.

Note that the local configuration must be setup prior to **setup.py** being run.
The local configuration will determine how the script sets up the database,
particularly with regard to desktop vs. server mode.

pgAdmin Core
************

The heart of pgAdmin is the **pgadmin** package. This contains the globally
available HTML templates used by the Jinja engine, as well as any global static
files such as images, Javascript and CSS files that are used in multiple modules.

The work of the package is handled in it's constructor, **__init__.py**. This
is responsible for setting up logging and authentication, dynamically loading
other modules, and a few other tasks.

Modules
*******

Units of functionality are added to pgAdmin through the addition of modules.
Theses are Python object instance of classes, inherits the
PgAdminModule class (a Flask Blueprint implementation), found in
**web/pgadmin/utils.py**. It provide various hook points for other modules
to utilise (primarily the default module - the browser).

To be recognised as a module, a Python package must be created. This must:

1) Be placed within the **web/pgadmin/** directory, and
2) Implements pgadmin.utils.PgAdminModule class
3) An instance variable (generally - named **blueprint**) representing that
   particular class in that package.

Each module may define a **template** and **static** directory for the Blueprint
that it implements. To avoid name collisions, templates should be stored under
a directory within the specified template directory, named after the module itself.
For example, the **browser** module stores it's templates in
**web/pgadmin/browser/templates/browser/**. This does not apply to static files
which may omit the second module name.

In addition to defining the Blueprint, the **views** module is typically
responsible for defining all the views that will be rendered in response to
client requests, we must provide a REST API url(s) for these views. These must
include appropriate route and security decorators. Take a look at the NodeView
class, which uses the same approach as Flask's MethodView, it can be found in
**web/pgadmin/browser/utils.py**. This specific class is used by browser nodes
for creating REST API url(s) for different operation on them. i.e. list, create,
update, delete, fetch children, get
statistics/reversed SQL/dependencies/dependents list for that node, etc. We can
use the same class for other purpose too. You just need to inherit that class,
and overload the member variables operations, parent_ids, ids, node_type, and
then register it as node view with PgAdminModule instance.

Most pgAdmin modules will also implement the **hooks** provided by the
PgAdminModule class. This is responsible for providing hook points to integrate
the module into the rest of the application - for example, a hook might tell
the caller what CSS files need to be included on the rendered page, or what menu
options to include and what they should do. Hook points need not exist if they
are not required. It is the responsibility of the caller to ensure they are
present before attempting to utilise them.

Hooks currently implemented are:

.. code-block:: python

    class MyModule(PgAdminModule):
        """
        This is class implements the pgadmin.utils.PgAdminModule, and
        implements the hooks
        """

        ...

        def get_own_stylesheets(self):
            """
            Returns:
                list: the stylesheets used by this module, not including any
                      stylesheet needed by the submodules.
            """
            return [url_for('static', 'css/mymodule.css')]

        def get_own_javascripts(self):
            """
            Returns:
                list of dict:
                - contains the name (representation for this javascript
                  module), path (url for it without .js suffix), deps (array of
                  dependents), exports window object by the javascript module,
                  and when (would you like to load this javascript), etc
                  information for this module, not including any script needed
                  by submodules.
            """
            return [
                {
                    'name': 'pgadmin.extension.mymodule',
                    'path': url_for('static', filename='js/mymodule'),
                    'exports': None,
                    'when': 'server'
                    }
                ]

        def get_own_menuitems(self):
            """
            Returns:
                dict: the menuitems for this module, not including
                      any needed from the submodules.
            """
            return {
                'help_items': [
                    MenuItem(
                        name='mnu_mymodule_help',
                        priority=999,
                        # We need to create javascript, which registers itself
                        # as module
                        module="pgAdmin.MyModule",
                        callback='about_show',
                        icon='fa fa-info-circle',
                        label=gettext('About MyModule'
                        )
                    ]
                }
        def get_panels(self):
            """
            Returns:
                list: a list of panel objects to add implemented in javascript
                      module
            """
            return []
        ...



    blueprint = MyModule('mymodule', __name__, static_url_path='/static')

pgAdmin Modules may include any additional Python modules that are required to
fulfill their purpose, as required. They may also reference other dynamically
loaded modules, but must use the defined hook points and fail gracefully in the
event that a particular module is not present.

Nodes
*****

Nodes are very similar to modules, it represents an individual node or,
collection object on the object explorer treeview. To recognised as a node module, a
Python package (along with javascript modules) must be created. This must:

1) Be placed within the **web/pgadmin/browser/** directory, and
2) Implements the BrowserPluginModule, and registers the node view, which
   exposes required the REST APIs
3) An instance of the class object

Front End
*********

pgAdmin uses javascript extensively for the front-end implementation. It uses
require.js to allow the lazy loading (or, say load only when required),
bootstrap and MaterialUI for UI look and feel, React for generating
properties/create dialog for selected node. We have
divided each module in small chunks as much as possible. Not all javascript
modules are required to be loaded (i.e. loading a javascript module for
database will make sense only when a server node is loaded completely.) Please
look at the javascript files node.js, browser.js, menu.js, panel.js, etc for
better understanding of the code.
