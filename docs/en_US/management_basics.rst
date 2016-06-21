.. _management_basics:

*****************
Management Basics      
*****************

pgAdmin provides a graphical interface that you can use to manage security issues related to your Postgres servers.  Point and click dialogs allow you to create login or group roles, administer object privileges, and control access to the server.  

The configuration editor provides a graphical interface that allows a sufficiently-privileged user to set configuration parameters in the postgresql.conf, pg_hba.conf, and .pgpass.conf files:  

* The postgresql.conf file contains parameters that you can use to control the server and server behaviors.
* The pg_hba.conf file contains settings that specify client authentication behavior enforced by the server.
* The .pgpass.conf file specifies passwords that can be used to satisfy authentication requirements.

To modify the postgresql.conf or pg_hba.conf file, you must have sufficient privileges to modify and save files in the Postgres *data* directory.  Please note that incorrect configuration can slow performance, or prevent the server from restarting without reverting your changes.  Please consult the PostgreSQL core documentation for detailed information about configuring your server.

Contents:

.. toctree::
   
   add_restore_point_dialog
   change_password_dialog
   grant_wizard
   import_export_data
   maintenance_dialog