.. _getting_started:

************************
`Getting Started`:index:
************************

Pre-compiled and configured installation packages for pgAdmin 4 are available
for a number of desktop environments; we recommend using an installer
whenever possible.

In a *Server Deployment*, the pgAdmin application is deployed behind a webserver
or with the WSGI interface.
If you install pgAdmin in server mode, you will be prompted to provide a role
name and pgAdmin password when you initially connect to pgAdmin.  The first
role registered with pgAdmin will be an administrative user; the
administrative role can use the pgAdmin *User Management* dialog to create
and manage additional pgAdmin user accounts.  When a user authenticates
with pgAdmin, the pgAdmin tree control displays the server definitions
associated with that login role.

In a *Desktop Deployment*, the pgAdmin application is configured to use the
desktop runtime environment to host the program on a supported platform.
Typically, users will install a pre-built package to run pgAdmin in desktop
mode, but a manual desktop deployment can be installed and though it is more
difficult to setup, it may be useful for developers interested in understanding
how pgAdmin works.

It is also possible to use a *Container Deployment* of pgAdmin, in which Server
Mode is pre-configured for security.

.. toctree::
   :maxdepth: 2

   deployment
   login
   mfa
   user_management
   change_ownership
   change_user_password
   restore_locked_user
   ldap
   kerberos
   oauth2
   webserver


.. note:: Pre-compiled and configured installation packages are available for
     a number of platforms. These packages should be used by end-users whereever
     possible - the following information is useful for the maintainers of those
     packages and users interested in understanding how pgAdmin works.

The pgAdmin 4 client features a highly-customizable display that features
drag-and-drop panels that you can arrange to make the best use of your desktop
environment.

The tree control provides an elegant overview of the managed servers, and the
objects that reside on each server. Right-click on a node within the tree control
to access context-sensitive menus that provide quick access to management tasks
for the selected object.

The tabbed browser provide quick access to statistical information about each
object in the tree control, and pgAdmin tools and utilities (such as the Query
tool and the debugger). pgAdmin opens additional feature tabs each time you
access the extended functionality offered by pgAdmin tools; you can open, close,
and re-arrange feature tabs as needed.

Use the *Preferences* dialog to customize the content and behaviour of the pgAdmin
display.  To open the *Preferences* dialog, select *Preferences* from the *File* menu.

*Help* buttons in the lower-left corner of each dialog will open the online help
for the dialog.  You can access additional Postgres help by navigating through
the *Help* menu, and selecting the name of the resource that you wish to open.

You can search for objects in the database using the :ref:`Search objects <search_objects>`

.. toctree::
   :maxdepth: 2

   user_interface
   menu_bar
   toolbar
   tabbed_browser
   tree_control
   preferences
   keyboard_shortcuts
   search_objects

Before using pgAdmin to manage objects that reside on a server, you must define a
connection to the server; for more information please see *Connecting to a Server*
in the next section.
