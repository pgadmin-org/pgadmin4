************
Version 8.14
************

Release date: 2024-12-12

This release contains a number of bug fixes and new features since the release of pgAdmin 4 v8.13.

Supported Database Servers
**************************
**PostgreSQL**: 12, 13, 14, 15, 16 and 17

**EDB Advanced Server**: 12, 13, 14, 15, and 16

Bundled PostgreSQL Utilities
****************************
**psql**, **pg_dump**, **pg_dumpall**, **pg_restore**: 17.0


New features
************

  | `Issue #3317 <https://github.com/pgadmin-org/pgadmin4/issues/3317>`_ -  Allow setting NULL ordering for columns in view/edit data filter dialog.
  | `Issue #3751 <https://github.com/pgadmin-org/pgadmin4/issues/3751>`_ -  Show auto-complete column names in filtered rows dialog of table and filter options of view/edit data tool.
  | `Issue #5786 <https://github.com/pgadmin-org/pgadmin4/issues/5786>`_ -  Allow the use of a pgpass file in the pgAdmin container via Docker secrets.
  | `Issue #6592 <https://github.com/pgadmin-org/pgadmin4/issues/6592>`_ -  Fixed multiple issues and improved ERD auto-layout.
  | `Issue #8095 <https://github.com/pgadmin-org/pgadmin4/issues/8095>`_ -  Added support for a builtin locale provider in the Database dialog.

Housekeeping
************


Bug fixes
*********

  | `Issue #5099 <https://github.com/pgadmin-org/pgadmin4/issues/5099>`_ -  Fixed an issue where Ctrl/Cmd + A was not selecting all data in query tool data grid.
  | `Issue #7384 <https://github.com/pgadmin-org/pgadmin4/issues/7384>`_ -  Fixed an issue where querying a foreign table gives the error 'ForeignTableCommand' object has no attribute 'auto_commit'.
  | `Issue #7486 <https://github.com/pgadmin-org/pgadmin4/issues/7486>`_ -  Fixed an issue where indent with space was not aligning to next tab position.
  | `Issue #7865 <https://github.com/pgadmin-org/pgadmin4/issues/7865>`_ -  Fixed an issue related to the query tool update connection after the server disconnected from the object explorer.
  | `Issue #8010 <https://github.com/pgadmin-org/pgadmin4/issues/8010>`_ -  Fixed an issue where query tool should show results and messages only from the last executed query.
  | `Issue #8028 <https://github.com/pgadmin-org/pgadmin4/issues/8028>`_ -  Fixed an issue where query tool throws syntax error if a newly added row is untouched and saved.
  | `Issue #8065 <https://github.com/pgadmin-org/pgadmin4/issues/8065>`_ -  Ensure the crypt key is retrieved correctly on backend server restart.
  | `Issue #8098 <https://github.com/pgadmin-org/pgadmin4/issues/8098>`_ -  Fixed an issue in schema diff where an error message popup was showing some garbage without any info.
  | `Issue #8127 <https://github.com/pgadmin-org/pgadmin4/issues/8127>`_ -  Fixed an issue where query tool should not prompt for unsaved changes when there are no changes.
  | `Issue #8134 <https://github.com/pgadmin-org/pgadmin4/issues/8134>`_ -  Add a user preference to enable/disable alternating row background colors in the data output of query tool.
  | `Issue #8158 <https://github.com/pgadmin-org/pgadmin4/issues/8158>`_ -  Fixed an issue where auto-width of wide columns in data output is incorrectly calculated.
