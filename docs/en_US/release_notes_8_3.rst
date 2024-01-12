***********
Version 8.3
***********

Release date: 2024-02-08

This release contains a number of bug fixes and new features since the release of pgAdmin 4 v8.2.

Supported Database Servers
**************************
**PostgreSQL**: 12, 13, 14, 15, and 16

**EDB Advanced Server**: 12, 13, 14, 15, and 16

Bundled PostgreSQL Utilities
****************************
**psql**, **pg_dump**, **pg_dumpall**, **pg_restore**: 16.0


New features
************

  | `Issue #6392 <https://github.com/pgadmin-org/pgadmin4/issues/6392>`_ -  Added BYPASSRLS|NOBYPASSRLS option while creating a Role.
  | `Issue #6792 <https://github.com/pgadmin-org/pgadmin4/issues/6792>`_ -  Added configurable parameter to enable support for PasswordExecCommand in server mode.

Housekeeping
************


Bug fixes
*********

  | `Issue #7053 <https://github.com/pgadmin-org/pgadmin4/issues/7053>`_ -  Add support for selecting a schema in the backup database dialog with no tables, mviews, views or foreign tables.
  | `Issue #7055 <https://github.com/pgadmin-org/pgadmin4/issues/7055>`_ -  Fixed a UI border issue on the dependencies tab for columns with icon.
  | `Issue #7073 <https://github.com/pgadmin-org/pgadmin4/issues/7073>`_ -  Fixed an issue where multiple errors were showing if user does not have connect privileges.
  | `Issue #7085 <https://github.com/pgadmin-org/pgadmin4/issues/7085>`_ -  Fixed an issue where group membership information was displayed incorrectly.