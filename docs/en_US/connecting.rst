.. _connecting:

*******************************
`Connecting to a Server`:index:
*******************************

Before you can use the pgAdmin client to manage the objects that reside on your Postgres server, you must define a connection to the server.  You can (optionally) use the *Server Group* dialog to create server groups to organize the server connections within the tree control for easier management. To open the *Server Group* dialog, right-click on the *Servers* node of the tree control, and select *Server Group* from the *Create* menu.

Contents:

.. toctree::

   server_group_dialog

Use the fields on the *Server* dialog to define the connection properties for each new server that you wish to manage with pgAdmin.  To open the *Server* dialog, right-click on the *Servers* node of the tree control, and select *Server* from the *Create* menu. 

Contents:

.. toctree::

   server_dialog

After defining a server connection, right-click on the server name, and select *Connect to server* to authenticate with the server, and start using pgAdmin to manage objects that reside on the server.

Contents:

.. toctree::

   connect_to_server   
   connect_error