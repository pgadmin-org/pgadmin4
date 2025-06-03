***********
Version 9.5
***********

Release date: 2025-06-26

This release contains a number of bug fixes and new features since the release of pgAdmin 4 v9.4.

Supported Database Servers
**************************
**PostgreSQL**: 13, 14, 15, 16 and 17

**EDB Advanced Server**: 13, 14, 15, 16 and 17

Bundled PostgreSQL Utilities
****************************
**psql**, **pg_dump**, **pg_dumpall**, **pg_restore**: 17.2


New features
************


Housekeeping
************


Bug fixes
*********

  | `Issue #6118 <https://github.com/pgadmin-org/pgadmin4/issues/6118>`_ -  Improved PL/pgSQL code folding and support nested blocks.
  | `Issue #7466 <https://github.com/pgadmin-org/pgadmin4/issues/7466>`_ -  Fixed an issue where utilities such as pg_dump and pg_restore failed to log error messages when required dependency files were missing.
  | `Issue #8032 <https://github.com/pgadmin-org/pgadmin4/issues/8032>`_ -  Fixed an issue where the Schema Diff Tool incorrectly reported differences due to variations in the order of the privileges.
  | `Issue #8691 <https://github.com/pgadmin-org/pgadmin4/issues/8691>`_ -  Fixed an issue in the query tool where using multiple cursors to copy text resulted in only the first line being copied.
