.. _connecting:

*******************************
`Connecting To A Server`:index:
*******************************

Before you can use the pgAdmin client to manage the objects that reside on your
Postgres server, you must define a connection to the server.  You can
(optionally) use the *Server Group* dialog to create server groups to organize
the server connections within the tree control for easier management. To open
the *Server Group* dialog, right-click on the *Servers* node of the tree
control, and select *Server Group* from the *Create* menu.

.. toctree::

   server_group_dialog

Use the fields on the *Server* dialog to define the connection properties for
each new server that you wish to manage with pgAdmin.  To open the *Server*
dialog, right-click on the *Servers* node of the tree control, and select
*Server* from the *Create* menu.

.. toctree::

   server_dialog

A master password is required to secure and later unlock saved server passwords.
It is set by the user and can be disabled using config.

.. toctree::

    master_password

After defining a server connection, right-click on the server name, and select
*Connect to server* to authenticate with the server, and start using pgAdmin to
manage objects that reside on the server.

.. toctree::

   connect_to_server   
   connect_error

Server definitions (and their groups) can be exported to a JSON file and
re-imported to the same or a different system to enable easy pre-configuration
of pgAdmin.

.. toctree::

   import_export_servers