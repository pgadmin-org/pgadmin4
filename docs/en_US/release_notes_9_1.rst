***********
Version 9.1
***********

Release date: 2025-03-06

This release contains a number of bug fixes and new features since the release of pgAdmin 4 v9.0.

Supported Database Servers
**************************
**PostgreSQL**: 13, 14, 15, 16 and 17

**EDB Advanced Server**: 13, 14, 15, 16 and 17

Bundled PostgreSQL Utilities
****************************
**psql**, **pg_dump**, **pg_dumpall**, **pg_restore**: 17.0


New features
************

  | `Issue #5128 <https://github.com/pgadmin-org/pgadmin4/issues/5128>`_ -  Add support for one to one relationship in the ERD tool.

Housekeeping
************


Bug fixes
*********

  | `Issue #8181 <https://github.com/pgadmin-org/pgadmin4/issues/8181>`_ -  Fixed an issue where pgAdmin does not support pg_vector column length/precision.
  | `Issue #8341 <https://github.com/pgadmin-org/pgadmin4/issues/8341>`_ -  Fixed an issue where the query tool was not treating IDENTITY columns as columns with default values when inserting new rows.
  | `Issue #8410 <https://github.com/pgadmin-org/pgadmin4/issues/8410>`_ -  Fixed Docker image entrypoint.sh email validation.