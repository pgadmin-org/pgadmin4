************
Version 6.13
************

Release date: 2022-08-25

This release contains a number of bug fixes and new features since the release of pgAdmin 4 v6.12.

New features
************

  | `Issue #3709 <https://redmine.postgresql.org/issues/3709>`_ -  Added support to show all background processes in separate panel.
  | `Issue #7387 <https://redmine.postgresql.org/issues/7387>`_ -  Added support to create triggers from existing trigger functions in EPAS.

Housekeeping
************

  | `Issue #7344 <https://redmine.postgresql.org/issues/7344>`_ -  Port Role Reassign dialog to React.
  | `Issue #7345 <https://redmine.postgresql.org/issues/7345>`_ -  Port User Management dialog to React.
  | `Issue #7404 <https://redmine.postgresql.org/issues/7404>`_ -  Port process watcher to React.
  | `Issue #7462 <https://redmine.postgresql.org/issues/7462>`_ -  Remove the SQL files for the unsupported versions of the database server.
  | `Issue #7567 <https://redmine.postgresql.org/issues/7567>`_ -  Port About dialog to React.
  | `Issue #7568 <https://redmine.postgresql.org/issues/7568>`_ -  Port change user password and 2FA dialog to React.
  | `Issue #7590 <https://redmine.postgresql.org/issues/7590>`_ -  Port change ownership dialog to React.
  | `Issue #7595 <https://redmine.postgresql.org/issues/7595>`_ -  Update the container base image to Alpine 3.16 (with Python 3.10.5).
  | `Issue #7602 <https://redmine.postgresql.org/issues/7602>`_ -  Fixed improper parsing of HTTP requests in Pallets Werkzeug v2.1.0 and below (CVE-2022-29361).

Bug fixes
*********

  | `Issue #7497 <https://redmine.postgresql.org/issues/7497>`_ -  Fixed an issue with the error message being displayed at the right place for Azure deployments.
  | `Issue #7527 <https://redmine.postgresql.org/issues/7527>`_ -  Fixed API test cases for Postgres 14.4.
  | `Issue #7540 <https://redmine.postgresql.org/issues/7540>`_ -  Ensure that rename panel should work on view/edit panels.
  | `Issue #7563 <https://redmine.postgresql.org/issues/7563>`_ -  Fixed an issue where autocomplete is not working after clearing the query editor.
  | `Issue #7573 <https://redmine.postgresql.org/issues/7573>`_ -  Ensure that autocomplete does not appear when navigating code using arrow keys.
  | `Issue #7586 <https://redmine.postgresql.org/issues/7586>`_ -  Fixed an issue with rendering geometry when selecting a complete column.
  | `Issue #7587 <https://redmine.postgresql.org/issues/7587>`_ -  Ensure that the children of information_schema and pg_catalog node should be displayed.
  | `Issue #7608 <https://redmine.postgresql.org/issues/7608>`_ -  Fixed an issue where the cloud deployment wizard creates the cluster with the High Availability even if that option is not selected.
  | `Issue #7614 <https://redmine.postgresql.org/issues/7614>`_ -  Fixed crypt key is missing issue when logout from the pgAdmin.
