***********
Version 7.7
***********

Release date: 2023-09-21

This release contains a number of bug fixes and new features since the release of pgAdmin 4 v7.6.

Supported Database Servers
**************************
**PostgreSQL**: 11, 12, 13, 14 and 15

**EDB Advanced Server**: 11, 12, 13, 14 and 15

Bundled PostgreSQL Utilities
****************************
**psql**, **pg_dump**, **pg_dumpall**, **pg_restore**: 15.3


New features
************

  | `Issue #4805 <https://github.com/pgadmin-org/pgadmin4/issues/4805>`_ -  Added all the new options of the 'WITH' clause in the subscription dialog.
  | `Issue #6378 <https://github.com/pgadmin-org/pgadmin4/issues/6378>`_ -  Added USING method while creating the table.
  | `Issue #6383 <https://github.com/pgadmin-org/pgadmin4/issues/6383>`_ -  Added Strategy, Locale Provider, ICU Locale, ICU Rules, and OID options while creating a database.
  | `Issue #6400 <https://github.com/pgadmin-org/pgadmin4/issues/6400>`_ -  Added USING method while creating the materialized view.
  | `Issue #6736 <https://github.com/pgadmin-org/pgadmin4/issues/6736>`_ -  Add support for additional ID token claim checks for OAuth 2 authentication.

Housekeeping
************

  | `Issue #2411 <https://github.com/pgadmin-org/pgadmin4/issues/2411>`_ -  Added the 'data type' column in the properties tab of the Columns collection node.

Bug fixes
*********

  | `Issue #6704 <https://github.com/pgadmin-org/pgadmin4/issues/6704>`_ -  Ensure user is redirected to login page after failed login.
  | `Issue #6712 <https://github.com/pgadmin-org/pgadmin4/issues/6712>`_ -  Ensure that Materialized view size fields in "Statistics" should be human-readable.
