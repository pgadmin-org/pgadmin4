************
Version 9.16
************

Release date: TBD

This release contains a number of bug fixes and new features since the release of pgAdmin 4 v9.15.

Supported Database Servers
**************************
**PostgreSQL**: 13, 14, 15, 16, 17 and 18

**EDB Advanced Server**: 13, 14, 15, 16, 17 and 18

Bundled PostgreSQL Utilities
****************************
**psql**, **pg_dump**, **pg_dumpall**, **pg_restore**: 18.4


New features
************

Housekeeping
************

Bug fixes
*********

  | `Issue #6481 <https://github.com/pgadmin-org/pgadmin4/issues/6481>`_ -  Fixed an issue where an index or exclusion constraint column was not shown in the Properties panel (and reported as empty) when the column name required quoting (e.g. it contained a double quote or special characters).
