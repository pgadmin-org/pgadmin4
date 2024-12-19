***********
Version 9.0
***********

Release date: 2025-02-06

This release contains a number of bug fixes and new features since the release of pgAdmin 4 v8.14.

Supported Database Servers
**************************
**PostgreSQL**: 13, 14, 15, 16 and 17

**EDB Advanced Server**: 13, 14, 15, 16 and 17

Bundled PostgreSQL Utilities
****************************
**psql**, **pg_dump**, **pg_dumpall**, **pg_restore**: 17.0


New features
************

  | `Issue #6513 <https://github.com/pgadmin-org/pgadmin4/issues/6513>`_ -  Change button labels and color in delete confirmation dialog for all objects to improve UX.
  | `Issue #7708 <https://github.com/pgadmin-org/pgadmin4/issues/7708>`_ -  Enhanced pgAdmin 4 with support for Workspace layouts.

Housekeeping
************


Bug fixes
*********

  | `Issue #6968 <https://github.com/pgadmin-org/pgadmin4/issues/6968>`_ -  Fixed an issue where option key was not registering in PSQL tool.
  | `Issue #8072 <https://github.com/pgadmin-org/pgadmin4/issues/8072>`_ -  Fixed an issue where Schema Diff not produce difference script for Index definition with where condition.
  | `Issue #8142 <https://github.com/pgadmin-org/pgadmin4/issues/8142>`_ -  Correct the documentation for the MFA configuration.
  | `Issue #8208 <https://github.com/pgadmin-org/pgadmin4/issues/8208>`_ -  Allow deleting the entry while creating/adding new label to enumeration type.
  | `Issue #8209 <https://github.com/pgadmin-org/pgadmin4/issues/8209>`_ -  Fixed an issue where properties dialog throwing an error for Materialized View.