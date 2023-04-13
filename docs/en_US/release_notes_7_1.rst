***********
Version 7.1
***********

Release date: 2023-05-01

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


Housekeeping
************


Bug fixes
*********

  | `Issue #3275 <https://github.com/pgadmin-org/pgadmin4/issues/3275>`_ -  Allow on demand record count setting to be changed per user using preferences.
  | `Issue #5777 <https://github.com/pgadmin-org/pgadmin4/issues/5777>`_ -  Fixed an issue where the browser tree state is not remembered when reopening pgAdmin.
  | `Issue #5820 <https://github.com/pgadmin-org/pgadmin4/issues/5820>`_ -  Fixed an issue where collation was set to none if we remove it while creating partitioned table.
  | `Issue #6075 <https://github.com/pgadmin-org/pgadmin4/issues/6075>`_ -  Ensure that the save button is enabled when registering a new server fails due to an API error.
