***********
Version 8.2
***********

Release date: 2024-01-11

This release contains a number of bug fixes and new features since the release of pgAdmin 4 v8.1.

Supported Database Servers
**************************
**PostgreSQL**: 12, 13, 14, 15, and 16

**EDB Advanced Server**: 12, 13, 14, 15, and 16

Bundled PostgreSQL Utilities
****************************
**psql**, **pg_dump**, **pg_dumpall**, **pg_restore**: 16.0


New features
************

  | `Issue #2483 <https://github.com/pgadmin-org/pgadmin4/issues/2483>`_ -  Administer pgAdmin Users and Preferences Using the Command Line Interface (CLI).
  | `Issue #5908 <https://github.com/pgadmin-org/pgadmin4/issues/5908>`_ -  Allow users to convert View/Edit table into a Query tool to enable editing the SQL generated.
  | `Issue #7016 <https://github.com/pgadmin-org/pgadmin4/issues/7016>`_ -  Added keep-alive support for SSH sessions when connecting to a PostgreSQL server via an SSH tunnel.

Housekeeping
************


Bug fixes
*********

  | `Issue #6193 <https://github.com/pgadmin-org/pgadmin4/issues/6193>`_ -  Fixed an issue where query tool title did not change after "Save As" until any new change is made.
  | `Issue #6781 <https://github.com/pgadmin-org/pgadmin4/issues/6781>`_ -  Fixed an issue where export servers was not adding extension if not specified.
  | `Issue #6815 <https://github.com/pgadmin-org/pgadmin4/issues/6815>`_ -  Fixed an issue where pgAdmin imports servers to the wrong accounts for the external authentication.
  | `Issue #7002 <https://github.com/pgadmin-org/pgadmin4/issues/7002>`_ -  Fixed an issue where an error occurred in the SQL tab when using an extended index(pgroonga).
  | `Issue #7041 <https://github.com/pgadmin-org/pgadmin4/issues/7041>`_ -  Fixed an issue where changes done to a node using edit dialog are not reflecting on the properties tab if the properties tab is active.
  | `Issue #7061 <https://github.com/pgadmin-org/pgadmin4/issues/7061>`_ -  Ensure that the 'Dbo' schema is displayed as a regular schema rather than a system catalog schema.
  | `Issue #7064 <https://github.com/pgadmin-org/pgadmin4/issues/7064>`_ -  Fixed an error-'amname' when generating ERD for database containing parition tables.
  | `Issue #7066 <https://github.com/pgadmin-org/pgadmin4/issues/7066>`_ -  Fixed an issue where object explorer last tree state was not saving.
  | `Issue #7070 <https://github.com/pgadmin-org/pgadmin4/issues/7070>`_ -  Fixed an issue where pgAgent job schedule dialog is not opening for edit.
