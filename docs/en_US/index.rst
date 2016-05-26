*********
pgAdmin 4
*********

.. image:: images/logo-right-128.png
    :align: right
    :alt: pgAdmin Logo
    
Welcome to pgAdmin 4. pgAdmin is the leading Open Source management tool for Postgres, the world's most advanced Open Source database.  pgAdmin 4 is designed to meet the needs of both novice and experienced Postgres users alike, providing a powerful graphical interface that simplifies the creation, maintenance and use of database objects.

Client Features
===============

pgAdmin 4 has a highly-customizable display that features drag-and-drop panels that you can arrange to make the best use of your desktop environment.  The client features a tree control that provides an elegant overview of the managed servers, and the objects that reside on each server.  Tabbed dialogs provide quick access to statistical information about each object in the tree control.

Use the *Preferences* dialog to customize the content and colors of the pgAdmin display.  To open the *Preferences* dialog, select *Preferences* from the *File* menu.

*Help* buttons in the lower-left corner of each dialog will open the online help for the dialog.  You can access additional Postgres help by navigating through the *Help* menu, and selecting the name of the resource that you wish to open. 

Contents:

.. toctree::
   :maxdepth: 2

   pgadmin_index
   using
   browser
   pgadmin_menu_bar
   preferences
   help


Getting Started
===============

Before you can use the pgAdmin client to manage your Postgres installation, you must define a connection to the server.    

Contents:

.. toctree::
   :maxdepth: 1

   server_group_dialog
   server_dialog
   connecting   
   error_messages


Creating Cluster Level Objects  
==============================
   
Some object definitions reside at the cluster level; pgAdmin 4 provides dialogs that allow you to create these objects, manage them, and control their relationships to each other.  To access a dialog that allows you to create a database object, right-click on the object type in the pgAdmin tree control, and select the *Create* option for that object.  For example, to create a new database, right-click on the *Databases* node, and select *Create Database...*    
   
Contents:

.. toctree::
   :maxdepth: 2

   database_dialog
   resource_group_dialog
   role_dialog
   tablespace_dialog
  
   
Creating Database Objects
=========================

pgAdmin 4 provides simple but powerful dialogs that you can use to design and create database objects.  Each dialog contains a series of tabs that you use to describe the object that will be created by the dialog; the SQL tab displays the SQL command that the server will execute when creating the object.

To access a dialog that allows you to create a database object, right-click on the object type in the pgAdmin tree control, and select the *Create* option for that object.  For example, to create a new database, right-click on the *Casts* node, and select *Create Cast...*

Contents:

.. toctree::
   :maxdepth: 2
   
   cast_dialog
   collation_dialog
   domain_dialog
   domain_constraint_dialog
   event_trigger_dialog
   extension_dialog
   foreign_data_wrapper_dialog
   foreign_server_dialog
   foreign_table_dialog
   fts_configuration_dialog
   fts_dictionary_dialog
   fts_parser_dialog
   fts_template_dialog
   function_dialog
   materialized_view_dialog
   procedure_dialog
   schema_dialog
   sequence_dialog
   type_dialog
   user_mapping_dialog
   view_dialog


Creating or Modifying a Table  
=============================

pgAdmin 4 provides dialogs that allow you to modify all table properties and attributes.

To access a dialog that allows you to create a database object, right-click on the object type in the pgAdmin tree control, and select the *Create* option for that object.  For example, to create a new database, right-click on the *Casts* node, and select *Create Cast...*

Contents:

.. toctree::
   :maxdepth: 2
   
   table_dialog
   column_dialog
   constraint_dialog
   index_dialog
   rule_dialog
   trigger_dialog


Management Basics      
=================

pgAdmin provides a graphical interface that you can use to manage security issues related to your Postgres servers.  Point and click dialogs allow you to create login or group roles, administer object privileges, and control access to the server.  

The configuration editor provides a graphical interface that allows a sufficiently-privileged user to set configuration parameters in the postgresql.conf, pg_hba.conf, and .pgpass.conf files:  

* The postgresql.conf file contains parameters that you can use to control the server and server behaviors.
* The pg_hba.conf file contains settings that specify client authentication behavior enforced by the server.
* The .pgpass.conf file specifies passwords that can be used to satisfy authentication requirements.

To modify the postgresql.conf or pg_hba.conf file, you must have sufficient privileges to modify and save files in the Postgres *data* directory.  Please note that incorrect configuration can slow performance, or prevent the server from restarting without reverting your changes.  Please consult the PostgreSQL core documentation for detailed information about configuring your server.

Contents:

.. toctree::
   :maxdepth: 2
   
   managing_server
   configuration_editor
   maintenance


Backup and Restore
==================

A powerful, but user-friendly Backup and Restore tool provides an easy way to use pg_dump, pg_dumpall, and pg_restore to take backups and create copies of databases or database objects for use in a development environment.

Contents:

.. toctree::
   :maxdepth: 2
   
   backup
   restore
  
   
Developer Tools
===============

The pgAdmin *Tools* menu displays a list of powerful developer tools that you can use to execute and analyze complex SQL commands, manage data, and debug PL/SQL code.

Contents:

.. toctree::
   :maxdepth: 2
   
   query_tool
   data_editor
   data_filter
   debugger
   
   
pgAdmin Deployment
==================

Pre-compiled and configured installation packages for pgAdmin 4 are available for a number of desktop environments; we recommend using an installer whenever possible.  If you are interested in learning more about the project, or if a pgAdmin installer is not available for your environment, the pages listed below will provide detailed information about creating a custom deployment.  

Contents:

.. toctree::
   :maxdepth: 2
   
   desktop_deployment
   server_deployment


pgAdmin Project Contributions
=============================

pgAdmin is an open-source project that invites you to get involved in the development process.  For more information about contributing to the pgAdmin project, contact the developers on the pgAdmin mailing list <mailto:pgadmin-hackers@postgresql.org> to discuss any ideas you might have for enhancements or bug fixes.

In the sections listed below, you'll find detailed information about the development process used to develop, improve, and maintain the pgAdmin client.

Contents:

.. toctree::
   :maxdepth: 2
   
   submitting_patches
   code_overview
   coding_standards
   code_snippets
   code_review
   translations


Licence
=======

pgAdmin is released under the 
`PostgreSQL Licence <http://www.postgresql.org/about/licence>`_, which is a 
liberal Open Source licence similar to BSD or MIT, and approved by the Open 
Source Initiative. The copyright for the project source code, website and 
documentation is attributed to the 
`pgAdmin Development Team <https://www.pgadmin.org/development/team.php>`_.
