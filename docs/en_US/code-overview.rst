Code Overview
=============

The bulk of pgAdmin is a Python web application written using the Flask framework
on the backend, and HTML5 with CSS3, Bootstrap and jQuery on the front end. A
desktop runtime is also included for users that prefer a desktop application to
a web application, which is written in C++ using the QT framework.

Runtime
-------

The runtime is essentially a Python webserver and browser in a box. Found in the 
**/runtime** directory in the source tree, it is a relatively simple QT 
application that is most easily modified using the **QT Creator** application.

Web Application
---------------

The web application forms the bulk of pgAdmin and can be found in the **/web**
directory in the source tree. The main file is **pgAdmin4.py** which can be used
to run the built-in standalone web server, or as a WSGI application for production
use.

Configuration
*************

The core application configuration is found in **config.py**. This file includes
all configurable settings for the application, along with descriptions of their
use. It is essential that various settings are configured prior to deployent on
a web server; these can be overriden in **config_local.py** to avoid modifying 
the main configuration file.

User Settings
*************

When running in desktop mode, pgAdmin has a single, default user account that is
used for the desktop user. When running in server mode, there may be unlimited 
users who are required to login prior to using the application. pgAdmin utilised
the **Flask-Security** module to manage application security and users, and 
provides options for self-service password reset and password changes etc.

Whether in desktop or server mode, each user's settings are stored in a SQLite
database which is also used to store the user accounts. This is initially 
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

Units of functionality are added to pgAdmin through the addition of modules. Theses
are Python packages that implement Flask Blueprints, and provide various hook 
points for other modules to utilise (primarily the default module - the browser).

To be recognised as a module, a Python package must be created. This must:

1) Be placed within the **web/pgadmin/** directory, and
2) Contain a Python module called **views**, and
3) Contain within the views module, a **blueprint** variable representing the 
   Flask Blueprint
   
Each module may define a **template** and **static** directory for the Blueprint
that it implements. To avoid name collisions, templates should be stored under
a directory within the specified template directory, named after the module itself.
For example, the **browser** module stores it's templates in 
**web/pgadmin/browser/templates/browser/**. This does not apply to static files
which may omit the second module name.

In addition to defining the Blueprint, the **views** module is typically 
responsible for defining all the views that will be rendered in response to 
client requests. These must include appropriate route and security decorators.

Most pgAdmin modules will also implement a **hooks** Python module. This is 
responsible for providing hook points to integrate the module into the rest of 
the application - for example, a hook might tell the caller what CSS files need 
to be included on the rendered page, or what menu options to include and what
they should do. Hook points need not exist if they are not required. It is the 
responsiblity of the caller to ensure they are present before attempting to 
utilise them.

Hooks currently implemented are:

.. code-block:: python

    def register_submodules(app):
        """Register any child module or node blueprints"""
    
    def get_file_menu_items():
    def get_edit_menu_items():
    def get_tools_menu_items():
    def get_management_menu_items():
    def get_help_menu_items():
        """Return a (set) of dicts of menu items, with name, priority, URL, target and onclick code."""
    
    def get_scripts():
        """Return a list of script URLs to include in the rendered page header"""

    def get_stylesheets():
        """Return a list of stylesheet URLs to include in the rendered page header"""    
    
pgAdmin Modules may include any additional Python modules that are required to
fulfill their purpose, as required. They may also reference other dynamically
loaded modules, but must use the defined hook points and fail gracefully in the
event that a particular module is not present.

Nodes
*****

Nodes are very similar to modules, but implement individual nodes on the browser
treeview. To be recognised as a module, a Python package must be created. This 
must:

1) Be placed within the **web/pgadmin/browser/** directory, and
2) Contain a Python module called **views**, and
3) Contain within the views module, a **blueprint** variable representing the 
   Flask Blueprint
   
The hook points currently defined for nodes are:

.. code-block:: python

    def register_submodules(app):
        """Register any child node blueprints"""

    def get_file_menu_items():
        """Return a (set) of dicts of menu items, with name, priority, URL, target and onclick code."""
    
    def get_context_menu_items():
        """Return a (set) of dicts of content menu items with name, label, priority and JS"""
    
    def get_script_snippets():
        """Return the script snippets needed to handle treeview node operations."""
        
    def get_css_snippets():
        """Return the CSS needed to display the treeview node image."""