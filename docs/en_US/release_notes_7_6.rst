***********
Version 7.6
***********

Release date: 2023-08-24

This release contains a number of bug fixes and new features since the release of pgAdmin 4 v7.5.

Supported Database Servers
**************************
**PostgreSQL**: 11, 12, 13, 14 and 15

**EDB Advanced Server**: 11, 12, 13, 14 and 15

Bundled PostgreSQL Utilities
****************************
**psql**, **pg_dump**, **pg_dumpall**, **pg_restore**: 15.3


New features
************

  | `Issue #6376 <https://github.com/pgadmin-org/pgadmin4/issues/6376>`_ -  Added unlogged option while creating a sequence.
  | `Issue #6381 <https://github.com/pgadmin-org/pgadmin4/issues/6381>`_ -  Added support for SYSTEM, CONCURRENTLY and TABLESPACE options in REINDEX.
  | `Issue #6397 <https://github.com/pgadmin-org/pgadmin4/issues/6397>`_ -  Added new/missing options to the VACUUM command.
  | `Issue #6415 <https://github.com/pgadmin-org/pgadmin4/issues/6415>`_ -  Added SKIP_LOCKED and BUFFER_USAGE_LIMIT option to Analyze command.

Housekeeping
************


Bug fixes
*********

  | `Issue #6500 <https://github.com/pgadmin-org/pgadmin4/issues/6500>`_ -  Fix the issue where query tool window turns blank if the user tries to generate a graph on the result.
