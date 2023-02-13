************
Version 6.21
************

Release date: 2023-03-09

This release contains a number of bug fixes and new features since the release of pgAdmin 4 v6.20.

Supported Database Servers
**************************
**PostgreSQL**: 10, 11, 12, 13, 14 and 15

**EDB Advanced Server**: 10, 11, 12, 13, 14 and 15

Bundled PostgreSQL Utilities
****************************
**psql**, **pg_dump**, **pg_dumpall**, **pg_restore**: 15.1


New features
************

  | `Issue #5832 <https://github.com/pgadmin-org/pgadmin4/issues/5832>`_ -  Allow changing cardinality notation in ERD to use Chen notation.
  | `Issue #5842 <https://github.com/pgadmin-org/pgadmin4/issues/5842>`_ -  Add additional logging for successful logins and user creation.

Housekeeping
************

  | `Issue #5701 <https://github.com/pgadmin-org/pgadmin4/issues/5701>`_ -  Remove Bootstrap and jQuery usage.

Bug fixes
*********

  | `Issue #5685 <https://github.com/pgadmin-org/pgadmin4/issues/5685>`_ -  Ensure that Grant column permission to a view is visible in the SQL tab.
  | `Issue #5758 <https://github.com/pgadmin-org/pgadmin4/issues/5758>`_ -  Fixed an issue where lock layout menu was not in sync with preferences.
  | `Issue #5764 <https://github.com/pgadmin-org/pgadmin4/issues/5764>`_ -  Fix an issue where the maintenance dialog for Materialized View gives an error.
  | `Issue #5847 <https://github.com/pgadmin-org/pgadmin4/issues/5847>`_ -  Fixed an issue where pgAdmin failed to connect when the Postgres password included special characters.
