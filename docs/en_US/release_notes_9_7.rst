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


Housekeeping
************

  | `Issue #8861 <https://github.com/pgadmin-org/pgadmin4/issues/8861>`_ -  Introduced an ‘Editor’ preferences category and migrated all editor related settings into it.

Bug fixes
*********

  | `Issue #8650 <https://github.com/pgadmin-org/pgadmin4/issues/8650>`_ -  Make Dashboard tables to be vertically resizable.
  | `Issue #8756 <https://github.com/pgadmin-org/pgadmin4/issues/8756>`_ -  Fixed an issue in Firefox where the query window would shift to the left after opening the history tab or selecting a column header in the results grid.
  | `Issue #8867 <https://github.com/pgadmin-org/pgadmin4/issues/8867>`_ -  Ensure DB restriction type is preserved while import and export server.
  | `Issue #8969 <https://github.com/pgadmin-org/pgadmin4/issues/8969>`_ -  Fixed incorrect behaviour of the option deduplicate items after creating the index.