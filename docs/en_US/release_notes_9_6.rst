***********
Version 9.6
***********

Release date: 2025-07-24

This release contains a number of bug fixes and new features since the release of pgAdmin 4 v9.5.

Supported Database Servers
**************************
**PostgreSQL**: 13, 14, 15, 16 and 17

**EDB Advanced Server**: 13, 14, 15, 16 and 17

Bundled PostgreSQL Utilities
****************************
**psql**, **pg_dump**, **pg_dumpall**, **pg_restore**: 17.2


New features
************

  | `Issue #5797 <https://github.com/pgadmin-org/pgadmin4/issues/5797>`_ -  Implemented a server-side cursor to enhance performance when retrieving large datasets.

Housekeeping
************

  | `Issue #8828 <https://github.com/pgadmin-org/pgadmin4/issues/8828>`_ -  Ensure that pgAdmin 4 is compatible with PG/EPAS v18.

Bug fixes
*********

  | `Issue #8914 <https://github.com/pgadmin-org/pgadmin4/issues/8914>`_ -  Update zstd library link to 1.5.7 in Dockerfile.