************
Version 9.10
************

Release date: 2025-11-13

This release contains a number of bug fixes and new features since the release of pgAdmin 4 v9.9.

Supported Database Servers
**************************
**PostgreSQL**: 13, 14, 15, 16, 17 and 18

**EDB Advanced Server**: 13, 14, 15, 16, 17 and 18

Bundled PostgreSQL Utilities
****************************
**psql**, **pg_dump**, **pg_dumpall**, **pg_restore**: 18.0


New features
************

  | `Issue #7885 <https://github.com/pgadmin-org/pgadmin4/issues/7885>`_ -  Add support for displaying detailed Citus query plans instead of 'Custom Scan' placeholder.

Housekeeping
************

  | `Issue #8676 <https://github.com/pgadmin-org/pgadmin4/issues/8676>`_ -  Migrate pgAdmin UI to use React 19.

Bug fixes
*********

  | `Issue #8504 <https://github.com/pgadmin-org/pgadmin4/issues/8504>`_ -  Fixed an issue where data output column resize is not sticking in Safari.