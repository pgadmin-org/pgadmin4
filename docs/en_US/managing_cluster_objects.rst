.. _managing_cluster_objects:

*********************************
`Managing Cluster Objects`:index:
*********************************

Some object definitions reside at the cluster level; pgAdmin 4 provides dialogs
that allow you to create these objects, manage them, and control their
relationships to each other.  To access a dialog that allows you to create a
database object, right-click on the object type in the pgAdmin tree control,
and select the *Create* option for that object.  For example, to create a new
database, right-click on the *Databases* node, and select *Create Database...*

.. toctree::
   :maxdepth: 3

   database_dialog
   resource_group_dialog
   role_dialog
   tablespace_dialog
   replica_nodes_dialog
   pgd_replication_group_dialog
   role_reassign_dialog
   directory_dialog