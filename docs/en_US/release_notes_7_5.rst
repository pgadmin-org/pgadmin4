***********
Version 7.5
***********

Release date: 2023-07-27

This release contains a number of bug fixes and new features since the release of pgAdmin 4 v7.4.

Supported Database Servers
**************************
**PostgreSQL**: 11, 12, 13, 14 and 15

**EDB Advanced Server**: 11, 12, 13, 14 and 15

Bundled PostgreSQL Utilities
****************************
**psql**, **pg_dump**, **pg_dumpall**, **pg_restore**: 15.3


New features
************

  | `Issue #6369 <https://github.com/pgadmin-org/pgadmin4/issues/6369>`_ -  Added support to detach partitions using concurrently and finalize.

Housekeeping
************

  | `Issue #6295 <https://github.com/pgadmin-org/pgadmin4/issues/6295>`_ -  Remove Bootstrap and jQuery from authentication pages and rewrite them in ReactJS.
  | `Issue #6423 <https://github.com/pgadmin-org/pgadmin4/issues/6423>`_ -  Clarify the LICENSE file to indicate the it is the PostgreSQL Licence.

Bug fixes
*********

  | `Issue #6165 <https://github.com/pgadmin-org/pgadmin4/issues/6165>`_ -  Fixed an issue where Import Export not working when using pgpassfile.
  | `Issue #6364 <https://github.com/pgadmin-org/pgadmin4/issues/6364>`_ -  Fixed Query Tool/ PSQL tool tab title not getting updated on database rename.
  | `Issue #6515 <https://github.com/pgadmin-org/pgadmin4/issues/6515>`_ -  Fixed an issue where the query tool is unable to execute a query on Postgres 10 and below versions.
