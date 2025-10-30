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

  | `Issue #6698 <https://github.com/pgadmin-org/pgadmin4/issues/6698>`_ -  Add support for setting image download resolution in the ERD tool.
  | `Issue #7885 <https://github.com/pgadmin-org/pgadmin4/issues/7885>`_ -  Add support for displaying detailed Citus query plans instead of 'Custom Scan' placeholder.
  | `Issue #8912 <https://github.com/pgadmin-org/pgadmin4/issues/8912>`_ -  Add support for formatting .pgerd ERD project file.

Housekeeping
************

  | `Issue #8676 <https://github.com/pgadmin-org/pgadmin4/issues/8676>`_ -  Migrate pgAdmin UI to use React 19.

Bug fixes
*********

  | `Issue #8504 <https://github.com/pgadmin-org/pgadmin4/issues/8504>`_ -  Fixed an issue where data output column resize is not sticking in Safari.
  | `Issue #9117 <https://github.com/pgadmin-org/pgadmin4/issues/9117>`_ -  Fixed an issue where Schema Diff does not ignore Tablespace for indexes.
  | `Issue #9304 <https://github.com/pgadmin-org/pgadmin4/issues/9304>`_ -  Fixed an issue that prevented assigning multiple users to an RLS policy.