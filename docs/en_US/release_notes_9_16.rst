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

  | `Issue #9798 <https://github.com/pgadmin-org/pgadmin4/issues/9798>`_ -  Fixed an issue where editing or creating a database with a non-default LC_COLLATE/LC_CTYPE (e.g. LC_COLLATE=C) failed with "more than one row returned by a subquery", locking the collation/ctype inputs.
