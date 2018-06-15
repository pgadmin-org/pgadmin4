.. _connect_to_server:

**************************
`Connect to server`:index:
**************************

Use the *Connect to Server* dialog to authenticate with a defined server and access the objects stored on the server through the pgAdmin tree control. To access the dialog, right click on the server name in the *pgAdmin* tree control, and select *Connect Server...* from the context menu.

.. image:: images/connect_to_server.png
    :alt: Connect to server dialog

Provide authentication information for the selected server:

 * Use the *Password* field to provide the password of the user that is associated with the defined server.
 * Check the box next to *Save Password* to instruct the server to save the password for future connections; if you save the password, you will not be prompted when reconnecting to the database server with this server definition.

The pgAdmin client displays a message in a green status bar in the lower right corner when the server connects successfully.

If you receive an error message while attempting a connection, verify that your network is allowing the pgAdmin host and the host of the database server to communicate. For detailed information about a specific error message, please see the :ref:`Connection Error <connect_error>` help page.

To review or modify connection details, right-click on the name of the server, and select *Properties...* from the context menu.
