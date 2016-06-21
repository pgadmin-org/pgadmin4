.. _getting_started:

***************
Getting Started
***************

pgAdmin 4 features a highly-customizable display that features drag-and-drop panels that you can arrange to make the best use of your desktop environment.  

When you install pgAdmin in server mode, you will be prompted to provide a role name and pgAdmin password.  The first role registered with pgAdmin will be an administrative user.  When you authenticate with pgAdmin, pgAdmin displays the server definitions associated with that login role in the tree control. The tree control provides an elegant overview of the managed servers, and the objects that reside on each server. Right-click on a node within the tree control to access context-sensitive menus that provide quick access to management tasks for the selected object.

The tabbed browser provide quick access to statistical information about each object in the tree control, and pgAdmin tools and utilities (such as the Query tool and the debugger). pgAdmin opens additional feature tabs each time you access the extended functionality offered by pgAdmin tools; you can open, close, and re-arrange feature tabs as needed. 

Use the *Preferences* dialog to customize the content and colors of the pgAdmin display.  To open the *Preferences* dialog, select *Preferences* from the *File* menu.

*Help* buttons in the lower-left corner of each dialog will open the online help for the dialog.  You can access additional Postgres help by navigating through the *Help* menu, and selecting the name of the resource that you wish to open. 

An administrative role can use the pgAdmin User Management dialog to create and manage additional pgAdmin user accounts.

Contents:

.. toctree::

   pgadmin_login
   browser
   pgadmin_menu_bar
   pgadmin_tabbed_browser
   pgadmin_tree_control
   preferences
   pgadmin_user

