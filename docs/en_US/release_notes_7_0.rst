***********
Version 7.0
***********

Release date: 2023-04-06

This release contains a number of bug fixes and new features since the release of pgAdmin 4 v6.21.

Supported Database Servers
**************************
**PostgreSQL**: 10, 11, 12, 13, 14 and 15

**EDB Advanced Server**: 10, 11, 12, 13, 14 and 15

Bundled PostgreSQL Utilities
****************************
**psql**, **pg_dump**, **pg_dumpall**, **pg_restore**: 15.1


New features
************


Housekeeping
************

  | `Issue #5011 <https://github.com/pgadmin-org/pgadmin4/issues/5011>`_ -  Added support for psycopg3 along with psycopg2.
  | `Issue #5701 <https://github.com/pgadmin-org/pgadmin4/issues/5701>`_ -  Remove Bootstrap and jQuery usage.

Bug fixes
*********

  | `Issue #5833 <https://github.com/pgadmin-org/pgadmin4/issues/5833>`_ -  Fixed an issue where user MFA entry was not getting delete after deleting a user.
