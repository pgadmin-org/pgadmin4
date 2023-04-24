***********
Version 7.1
***********

Release date: 2023-05-04

This release contains a number of bug fixes and new features since the release of pgAdmin 4 v7.0.

Supported Database Servers
**************************
**PostgreSQL**: 11, 12, 13, 14 and 15

**EDB Advanced Server**: 11, 12, 13, 14 and 15

Bundled PostgreSQL Utilities
****************************
**psql**, **pg_dump**, **pg_dumpall**, **pg_restore**: 15.2


New features
************

  | `Issue #3275 <https://github.com/pgadmin-org/pgadmin4/issues/3275>`_ -  Allow on demand record count setting to be changed per user using preferences.
  | `Issue #3316 <https://github.com/pgadmin-org/pgadmin4/issues/3316>`_ -  Added support to show statistics for materialized views.
  | `Issue #3318 <https://github.com/pgadmin-org/pgadmin4/issues/3318>`_ -  Added support to create an unnamed index.

Housekeeping
************


Bug fixes
*********

  | `Issue #5777 <https://github.com/pgadmin-org/pgadmin4/issues/5777>`_ -  Fixed an issue where the browser tree state is not remembered when reopening pgAdmin.
  | `Issue #5820 <https://github.com/pgadmin-org/pgadmin4/issues/5820>`_ -  Fixed an issue where collation was set to none if we remove it while creating partitioned table.
  | `Issue #6059 <https://github.com/pgadmin-org/pgadmin4/issues/6059>`_ -  Show proper message if the debugger is stopped by the user.
  | `Issue #6075 <https://github.com/pgadmin-org/pgadmin4/issues/6075>`_ -  Ensure that the save button is enabled when registering a new server fails due to an API error.
  | `Issue #6077 <https://github.com/pgadmin-org/pgadmin4/issues/6077>`_ -  The search object, query tool, and psql tool menu should not be displayed for pgAgent.
  | `Issue #6120 <https://github.com/pgadmin-org/pgadmin4/issues/6120>`_ -  Fixed error occurring while logging out from pgAdmin keeping a query tool opened.
  | `Issue #6128 <https://github.com/pgadmin-org/pgadmin4/issues/6128>`_ -  Fix a SQL error occurring on roles dependents SQL.
  | `Issue #6130 <https://github.com/pgadmin-org/pgadmin4/issues/6130>`_ -  Ensure to quote the primary key value if needed while deleting rows from the table.
  | `Issue #6137 <https://github.com/pgadmin-org/pgadmin4/issues/6137>`_ -  Fixed error occurring while dumping the servers from CLI.
  | `Issue #6138 <https://github.com/pgadmin-org/pgadmin4/issues/6138>`_ -  Throw an appropriate error when a table for which View/Edit data is open, is deleted, and query is executed.
  | `Issue #6151 <https://github.com/pgadmin-org/pgadmin4/issues/6151>`_ -  Ensure that internal users are able to login when auth sources are [ldap, internal].
  | `Issue #6158 <https://github.com/pgadmin-org/pgadmin4/issues/6158>`_ -  Fixed an issue with the properties tab not getting updated if the user updates the selected node.
  | `Issue #6159 <https://github.com/pgadmin-org/pgadmin4/issues/6159>`_ -  Ensure that the ERD tool should work with the external database after moving to psycopg3.
