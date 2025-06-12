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

  | `Issue #1926 <https://github.com/pgadmin-org/pgadmin4/issues/1926>`_ -  Add a new permission to allow disabling "Change Password" feature for a pgAdmin role.
  | `Issue #1947 <https://github.com/pgadmin-org/pgadmin4/issues/1947>`_ -  Added role-based restrictions for editing server connections.
  | `Issue #2864 <https://github.com/pgadmin-org/pgadmin4/issues/2864>`_ -  Add a search box to enable searching within the preferences tab.
  | `Issue #3319 <https://github.com/pgadmin-org/pgadmin4/issues/3319>`_ -  Added support to preserve the workspace, query windows, and pgAdmin state during an abrupt shutdown or restart.
  | `Issue #6743 <https://github.com/pgadmin-org/pgadmin4/issues/6743>`_ -  Open preferences in a new tab instead of a dialog for better user experience.
  | `Issue #8665 <https://github.com/pgadmin-org/pgadmin4/issues/8665>`_ -  Supports JSON logging for gunicorn process within Docker.

Housekeeping
************


Bug fixes
*********

  | `Issue #6118 <https://github.com/pgadmin-org/pgadmin4/issues/6118>`_ -  Improved PL/pgSQL code folding and support nested blocks.
  | `Issue #7466 <https://github.com/pgadmin-org/pgadmin4/issues/7466>`_ -  Fixed an issue where utilities such as pg_dump and pg_restore failed to log error messages when required dependency files were missing.
  | `Issue #8032 <https://github.com/pgadmin-org/pgadmin4/issues/8032>`_ -  Fixed an issue where the Schema Diff Tool incorrectly reported differences due to variations in the order of the privileges.
  | `Issue #8691 <https://github.com/pgadmin-org/pgadmin4/issues/8691>`_ -  Fixed an issue in the query tool where using multiple cursors to copy text resulted in only the first line being copied.
  | `Issue #8808 <https://github.com/pgadmin-org/pgadmin4/issues/8808>`_ -  Fixed an issue where data export using a query opened the wrong dialog type.
  | `Issue #8809 <https://github.com/pgadmin-org/pgadmin4/issues/8809>`_ -  Fixed an issue where data export using a query failed when the query contained a newline character.
  | `Issue #8834 <https://github.com/pgadmin-org/pgadmin4/issues/8834>`_ -  Fixed an issue where the Columns node was not visible under Catalog Objects.