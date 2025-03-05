***********
Version 9.2
***********

Release date: 2025-04-03

This release contains a number of bug fixes and new features since the release of pgAdmin 4 v9.1.

Supported Database Servers
**************************
**PostgreSQL**: 13, 14, 15, 16 and 17

**EDB Advanced Server**: 13, 14, 15, 16 and 17

Bundled PostgreSQL Utilities
****************************
**psql**, **pg_dump**, **pg_dumpall**, **pg_restore**: 17.2


New features
************

  | `Issue #4194 <https://github.com/pgadmin-org/pgadmin4/issues/4194>`_ -  Added support to automatically open a file after it is downloaded in the desktop mode.
  | `Issue #5871 <https://github.com/pgadmin-org/pgadmin4/issues/5871>`_ -  Add support for restoring plain SQL database dumps.
  | `Issue #8034 <https://github.com/pgadmin-org/pgadmin4/issues/8034>`_ -  Added support for creating Directory nodes in EPAS.

Housekeeping
************


Bug fixes
*********

  | `Issue #8437 <https://github.com/pgadmin-org/pgadmin4/issues/8437>`_ -  Fixed an issue where the PSQL terminal displays keyname for non alphanumeric keys.
  | `Issue #8479 <https://github.com/pgadmin-org/pgadmin4/issues/8479>`_ -  Fixed an issue where the Schema Diff was not displaying the difference query when a table had a UNIQUE NULLS NOT DISTINCT constraint.