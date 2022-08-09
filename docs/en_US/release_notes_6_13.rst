************
Version 6.13
************

Release date: 2022-08-25

This release contains a number of bug fixes and new features since the release of pgAdmin 4 v6.12.

New features
************

  | `Issue #7387 <https://redmine.postgresql.org/issues/7387>`_ -  Added support to create triggers from existing trigger functions in EPAS.

Housekeeping
************

  | `Issue #7344 <https://redmine.postgresql.org/issues/7344>`_ -  Port Role Reassign dialog to React.
  | `Issue #7462 <https://redmine.postgresql.org/issues/7462>`_ -  Remove the SQL files for the unsupported versions of the database server.
  | `Issue #7567 <https://redmine.postgresql.org/issues/7567>`_ -  Port About dialog to React.
  | `Issue #7590 <https://redmine.postgresql.org/issues/7590>`_ -  Port change ownership dialog to React.
  | `Issue #7595 <https://redmine.postgresql.org/issues/7595>`_ -  Update the container base image to Alpine 3.16 (with Python 3.10.5).

Bug fixes
*********

  | `Issue #7497 <https://redmine.postgresql.org/issues/7497>`_ -  Fixed an issue with the error message being displayed at the right place for Azure deployments.
  | `Issue #7527 <https://redmine.postgresql.org/issues/7527>`_ -  Fixed API test cases for Postgres 14.4.
  | `Issue #7563 <https://redmine.postgresql.org/issues/7563>`_ -  Fixed an issue where autocomplete is not working after clearing the query editor.
  | `Issue #7573 <https://redmine.postgresql.org/issues/7573>`_ -  Ensure that autocomplete does not appear when navigating code using arrow keys.
  | `Issue #7586 <https://redmine.postgresql.org/issues/7586>`_ -  Fixed an issue with rendering geometry when selecting a complete column.
