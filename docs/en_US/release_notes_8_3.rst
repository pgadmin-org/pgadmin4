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

  | `Issue #4419 <https://github.com/pgadmin-org/pgadmin4/issues/4419>`_ -  Allow drag-n-drop columns collection tree node as comma separated columns.
  | `Issue #6380 <https://github.com/pgadmin-org/pgadmin4/issues/6380>`_ -  Added support to rename columns in Views.
  | `Issue #6392 <https://github.com/pgadmin-org/pgadmin4/issues/6392>`_ -  Added BYPASSRLS|NOBYPASSRLS option while creating a Role.
  | `Issue #6450 <https://github.com/pgadmin-org/pgadmin4/issues/6450>`_ -  Added support for column storage syntax while creating table.
  | `Issue #6557 <https://github.com/pgadmin-org/pgadmin4/issues/6557>`_ -  Use COOKIE_DEFAULT_PATH or SCRIPT_NAME in session cookie path.
  | `Issue #6792 <https://github.com/pgadmin-org/pgadmin4/issues/6792>`_ -  Added configurable parameter to enable support for PasswordExecCommand in server mode.

Housekeeping
************


Bug fixes
*********

  | `Issue #7053 <https://github.com/pgadmin-org/pgadmin4/issues/7053>`_ -  Add support for selecting a schema in the backup database dialog with no tables, mviews, views or foreign tables.
  | `Issue #7055 <https://github.com/pgadmin-org/pgadmin4/issues/7055>`_ -  Fixed a UI border issue on the dependencies tab for columns with icon.
  | `Issue #7073 <https://github.com/pgadmin-org/pgadmin4/issues/7073>`_ -  Fixed an issue where multiple errors were showing if user does not have connect privileges.
  | `Issue #7085 <https://github.com/pgadmin-org/pgadmin4/issues/7085>`_ -  Fixed an issue where group membership information was displayed incorrectly.
  | `Issue #7113 <https://github.com/pgadmin-org/pgadmin4/issues/7113>`_ -  Ensure that the correct SQL is generated when changing the column data type to "char".