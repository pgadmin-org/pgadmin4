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

  | `Issue #8318 <https://github.com/pgadmin-org/pgadmin4/issues/8318>`_ -  Fixed an error ("i.default.find(...) is undefined") that prevented deleting a table or relationship link in the ERD tool when a foreign key referenced a column that had been renamed.
