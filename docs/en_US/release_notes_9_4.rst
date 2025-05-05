***********
Version 9.4
***********

Release date: 2025-05-29

This release contains a number of bug fixes and new features since the release of pgAdmin 4 v9.3.

Supported Database Servers
**************************
**PostgreSQL**: 13, 14, 15, 16 and 17

**EDB Advanced Server**: 13, 14, 15, 16 and 17

Bundled PostgreSQL Utilities
****************************
**psql**, **pg_dump**, **pg_dumpall**, **pg_restore**: 17.2


New features
************

  | `Issue #8583 <https://github.com/pgadmin-org/pgadmin4/issues/8583>`_ -  Add all missing options to the Import/Export Data functionality, and update the syntax of the COPY command to align with the latest standards.
  | `Issue #8681 <https://github.com/pgadmin-org/pgadmin4/issues/8681>`_ -  Add support for exporting table data based on a custom query.

Housekeeping
************


Bug fixes
*********

  | `Issue #6564 <https://github.com/pgadmin-org/pgadmin4/issues/6564>`_ -  Fix the issue where an error is displayed when a table is dropped while a query is running.
  | `Issue #8607 <https://github.com/pgadmin-org/pgadmin4/issues/8607>`_ -  Fixed an issue where the query tool returns "cannot unpack non-iterable Response object" when running any query with a database name change.