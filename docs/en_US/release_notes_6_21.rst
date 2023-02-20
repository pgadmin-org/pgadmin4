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

  | `Issue #5269 <https://github.com/pgadmin-org/pgadmin4/issues/5269>`_ -  Ensure that the schema diff tool should pick up the change in the column grants.
  | `Issue #5685 <https://github.com/pgadmin-org/pgadmin4/issues/5685>`_ -  Ensure that Grant column permission to a view is visible in the SQL tab.
  | `Issue #5747 <https://github.com/pgadmin-org/pgadmin4/issues/5747>`_ -  Ensure that content on the DDL comparison panel should get refreshed on selecting the object using the up and down arrow keys.
  | `Issue #5756 <https://github.com/pgadmin-org/pgadmin4/issues/5756>`_ -  Fix for query tool prompting for unsaved changes even if no changes have been made.
  | `Issue #5758 <https://github.com/pgadmin-org/pgadmin4/issues/5758>`_ -  Fixed an issue where lock layout menu was not in sync with preferences.
  | `Issue #5760 <https://github.com/pgadmin-org/pgadmin4/issues/5760>`_ -  Fixed an issue where query was not pasted to editor after trojan source warning.
  | `Issue #5764 <https://github.com/pgadmin-org/pgadmin4/issues/5764>`_ -  Fix an issue where the maintenance dialog for Materialized View gives an error.
  | `Issue #5773 <https://github.com/pgadmin-org/pgadmin4/issues/5773>`_ -  Fixed an issue where Clear Saved Password should be disabled if the password is already cleared.
  | `Issue #5790 <https://github.com/pgadmin-org/pgadmin4/issues/5790>`_ -  Fixed an issue where the user can't create trigger AFTER UPDATE OF.
  | `Issue #5822 <https://github.com/pgadmin-org/pgadmin4/issues/5822>`_ -  Do not allow to save invalid JSON in query tool JSON editor.
  | `Issue #5847 <https://github.com/pgadmin-org/pgadmin4/issues/5847>`_ -  Fixed an issue where pgAdmin failed to connect when the Postgres password included special characters.
  | `Issue #5872 <https://github.com/pgadmin-org/pgadmin4/issues/5872>`_ -  Handle MERGE operation in query tool explain introduced in PostgreSQL 15.
