***********
Version 7.2
***********

Release date: 2023-06-01

This release contains a number of bug fixes and new features since the release of pgAdmin 4 v7.1.

Supported Database Servers
**************************
**PostgreSQL**: 11, 12, 13, 14 and 15

**EDB Advanced Server**: 11, 12, 13, 14 and 15

Bundled PostgreSQL Utilities
****************************
**psql**, **pg_dump**, **pg_dumpall**, **pg_restore**: 15.2


New features
************

  | `Issue #3831 <https://github.com/pgadmin-org/pgadmin4/issues/3831>`_ -  Add Option to only show active connections on Dashboard.
  | `Issue #4769 <https://github.com/pgadmin-org/pgadmin4/issues/4769>`_ -  Allow pgAdmin to retrive master password from external script/program.
  | `Issue #5048 <https://github.com/pgadmin-org/pgadmin4/issues/5048>`_ -  Add an option to hide/show empty object collection nodes.
  | `Issue #5123 <https://github.com/pgadmin-org/pgadmin4/issues/5123>`_ -  Added support to use standard OS secret store to save server/ssh tunnel passwords instead of master password in pgAdmin desktop mode.
  | `Issue #5868 <https://github.com/pgadmin-org/pgadmin4/issues/5868>`_ -  Implement new PostgreSQL 15 features in publication dialog and SQL.


Housekeeping
************


Bug fixes
*********

  | `Issue #5789 <https://github.com/pgadmin-org/pgadmin4/issues/5789>`_ -  Fixed an issue where Foreign Key columns are shown in the wrong order in SQL and Properties.
  | `Issue #5817 <https://github.com/pgadmin-org/pgadmin4/issues/5817>`_ -  Ensure that a new row should be added on top in the User Management dialog.
  | `Issue #5926 <https://github.com/pgadmin-org/pgadmin4/issues/5926>`_ -  Fixed an issue where REVOKE ALL DDL in table SQL was added only for one role.
  | `Issue #6003 <https://github.com/pgadmin-org/pgadmin4/issues/6003>`_ -  Indicate the user if all the server's children nodes are hidden from the preferences setting.
  | `Issue #6026 <https://github.com/pgadmin-org/pgadmin4/issues/6026>`_ -  Tools menu should be toggled for "pause replay of wal" and "resume replay of wal".
  | `Issue #6043 <https://github.com/pgadmin-org/pgadmin4/issues/6043>`_ -  Make the 'Connect to server' dialog a modal dialog.
  | `Issue #6080 <https://github.com/pgadmin-org/pgadmin4/issues/6080>`_ -  pgAdmin icon not showing on taskbar on Windows 10.
  | `Issue #6127 <https://github.com/pgadmin-org/pgadmin4/issues/6127>`_ -  Fixed an issue where properties were not visible for FTS Parsers, FTS Templates, MViews, and Rules in Catalog objects.
  | `Issue #6147 <https://github.com/pgadmin-org/pgadmin4/issues/6147>`_ -  Heartbeat is getting logged, though no server is connected in pgAdmin.
  | `Issue #6204 <https://github.com/pgadmin-org/pgadmin4/issues/6204>`_ -  Ensure that name can't be empty in edit mode for Primary Key and Index.
  | `Issue #6221 <https://github.com/pgadmin-org/pgadmin4/issues/6221>`_ -  Fix circular reference error for the multirange data types in the query tool.
  | `Issue #6247 <https://github.com/pgadmin-org/pgadmin4/issues/6247>`_ -  Fixed an issue where PSQL tool prompts for password if using password exec command.
  | `Issue #6253 <https://github.com/pgadmin-org/pgadmin4/issues/6253>`_ -  Fix an issue in the register server when setting the role, an arbitrary SQL query can be fired.
  | `Issue #6267 <https://github.com/pgadmin-org/pgadmin4/issues/6267>`_ -  Ensure the user is able to log in if the specified OAUTH2_USERNAME_CLAIM is present in the OAuth2 profile.
  | `Issue #6278 <https://github.com/pgadmin-org/pgadmin4/issues/6278>`_ -  Use dependent instead of dependant in the message.
  | `Issue #6279 <https://github.com/pgadmin-org/pgadmin4/issues/6279>`_ -  Fix incorrect number of foreign tables displayed. Show column comments in RE-SQL.
  | `Issue #6280 <https://github.com/pgadmin-org/pgadmin4/issues/6280>`_ -  View SQL tab not quoting column comments.
  | `Issue #6281 <https://github.com/pgadmin-org/pgadmin4/issues/6281>`_ -  VarChar Field Sizes are missing from Query's Grid header.
  | `Issue #6331 <https://github.com/pgadmin-org/pgadmin4/issues/6331>`_ -  Separate multiple Blocking PIDs with delimiter on Dashboard.
