***********
Version 9.7
***********

Release date: 2025-08-21

This release contains a number of bug fixes and new features since the release of pgAdmin 4 v9.6.

Supported Database Servers
**************************
**PostgreSQL**: 13, 14, 15, 16 and 17

**EDB Advanced Server**: 13, 14, 15, 16 and 17

Bundled PostgreSQL Utilities
****************************
**psql**, **pg_dump**, **pg_dumpall**, **pg_restore**: 17.2


New features
************

  | `Issue #5766 <https://github.com/pgadmin-org/pgadmin4/issues/5766>`_ -  Add support for automatic updates in the pgAdmin 4 Desktop application on macOS.
  | `Issue #6456 <https://github.com/pgadmin-org/pgadmin4/issues/6456>`_ -  Added GENERIC_PLAN, MEMORY, SERIALIZE option to EXPLAIN/EXPLAIN ANALYZE command.
  | `Issue #8917 <https://github.com/pgadmin-org/pgadmin4/issues/8917>`_ -  Add support for server tag-based filtering in the Object Explorer.

Housekeeping
************

  | `Issue #6384 <https://github.com/pgadmin-org/pgadmin4/issues/6384>`_ -  Replace keyword PROCEDURE with FUNCTION while creating trigger and event trigger.
  | `Issue #8861 <https://github.com/pgadmin-org/pgadmin4/issues/8861>`_ -  Introduced an ‘Editor’ preferences category and migrated all editor related settings into it.

Bug fixes
*********

  | `Issue #8149 <https://github.com/pgadmin-org/pgadmin4/issues/8149>`_ -  Fixed an issue where pgAdmin failed to update the server connection status when the server was disconnected in the background and a refresh was performed on that server.
  | `Issue #8650 <https://github.com/pgadmin-org/pgadmin4/issues/8650>`_ -  Make Dashboard tables to be vertically resizable.
  | `Issue #8756 <https://github.com/pgadmin-org/pgadmin4/issues/8756>`_ -  Fixed an issue in Firefox where the query window would shift to the left after opening the history tab or selecting a column header in the results grid.
  | `Issue #8867 <https://github.com/pgadmin-org/pgadmin4/issues/8867>`_ -  Ensure DB restriction type is preserved while import and export server.
  | `Issue #8969 <https://github.com/pgadmin-org/pgadmin4/issues/8969>`_ -  Fixed incorrect behaviour of the option deduplicate items after creating the index.
  | `Issue #8971 <https://github.com/pgadmin-org/pgadmin4/issues/8971>`_ -  Added PKEY index in the index statistics summary.
  | `Issue #9007 <https://github.com/pgadmin-org/pgadmin4/issues/9007>`_ -  Ensure the scratch pad in the Query Tool is not restored after it is closed.
  | `Issue #9008 <https://github.com/pgadmin-org/pgadmin4/issues/9008>`_ -  Update the documentation for parameters that require file paths.