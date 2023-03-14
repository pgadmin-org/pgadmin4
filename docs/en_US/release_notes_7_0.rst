***********
Version 7.0
***********

Release date: 2023-04-06

This release contains a number of bug fixes and new features since the release of pgAdmin 4 v6.21.

Supported Database Servers
**************************
**PostgreSQL**: 10, 11, 12, 13, 14 and 15

**EDB Advanced Server**: 10, 11, 12, 13, 14 and 15

Bundled PostgreSQL Utilities
****************************
**psql**, **pg_dump**, **pg_dumpall**, **pg_restore**: 15.1


New features
************

  | `Issue #5014 <https://github.com/pgadmin-org/pgadmin4/issues/5014>`_ -  Added support for mounting shared storage in server mode.
  | `Issue #5750 <https://github.com/pgadmin-org/pgadmin4/issues/5750>`_ -  Added capability to deploy PostgreSQL servers on Google Cloud.

Housekeeping
************

  | `Issue #5011 <https://github.com/pgadmin-org/pgadmin4/issues/5011>`_ -  Added support for psycopg3 along with psycopg2.
  | `Issue #5701 <https://github.com/pgadmin-org/pgadmin4/issues/5701>`_ -  Remove Bootstrap and jQuery usage.

Bug fixes
*********

  | `Issue #4784 <https://github.com/pgadmin-org/pgadmin4/issues/4784>`_ -  Handle errors occurring during decoding UTF-8 encoded query result data which contains ascii characters.
  | `Issue #5735 <https://github.com/pgadmin-org/pgadmin4/issues/5735>`_ -  Show appropriate error message when master password is not set instead of 'Crypt key missing'.
  | `Issue #5775 <https://github.com/pgadmin-org/pgadmin4/issues/5775>`_ -  Display the 'No menu available for this object' message if the selected tree node does not have any options.
  | `Issue #5824 <https://github.com/pgadmin-org/pgadmin4/issues/5824>`_ -  Ensure that the user's storage directory is created when the users are created, as well as for those users who have not yet been created.
  | `Issue #5833 <https://github.com/pgadmin-org/pgadmin4/issues/5833>`_ -  Fixed an issue where user MFA entry was not getting delete after deleting a user.
  | `Issue #5874 <https://github.com/pgadmin-org/pgadmin4/issues/5874>`_ -  Make "using" and "with check" fields a textarea in the RLS policy.
  | `Issue #5901 <https://github.com/pgadmin-org/pgadmin4/issues/5901>`_ -  Update SQLAlchemy, Flask, Flask-SQLAlchemy, and other packages to current versions.
  | `Issue #5904 <https://github.com/pgadmin-org/pgadmin4/issues/5904>`_ -  Fixed an issue where the count query should not be triggered when the estimated count is less than zero.
  | `Issue #5929 <https://github.com/pgadmin-org/pgadmin4/issues/5929>`_ -  Dashboard graph Y-axis width should increase with label.
  | `Issue #5943 <https://github.com/pgadmin-org/pgadmin4/issues/5943>`_ -  Use http for SVG namespace URLs which were changed to https for SonarQube fixes.
