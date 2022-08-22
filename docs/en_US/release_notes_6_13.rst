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

  | `Issue #7452 <https://redmine.postgresql.org/issues/7452>`_ -  Ensure that an error is thrown if clipboard access is not provided and change the copy rows shortcut.
  | `Issue #7497 <https://redmine.postgresql.org/issues/7497>`_ -  Fixed an issue with the error message being displayed at the right place for Azure deployments.
  | `Issue #7521 <https://redmine.postgresql.org/issues/7521>`_ -  Fixed an issue where the Query Editor loses focus when saving a query (Alt+s).
  | `Issue #7527 <https://redmine.postgresql.org/issues/7527>`_ -  Fixed API test cases for Postgres 14.4.
  | `Issue #7540 <https://redmine.postgresql.org/issues/7540>`_ -  Ensure that rename panel should work on view/edit panels.
  | `Issue #7563 <https://redmine.postgresql.org/issues/7563>`_ -  Fixed an issue where autocomplete is not working after clearing the query editor.
  | `Issue #7573 <https://redmine.postgresql.org/issues/7573>`_ -  Ensure that autocomplete does not appear when navigating code using arrow keys.
  | `Issue #7575 <https://redmine.postgresql.org/issues/7575>`_ -  Fixed an issue where Alt-Shift-Q didn't work after creating a new query.
  | `Issue #7586 <https://redmine.postgresql.org/issues/7586>`_ -  Fixed an issue with rendering geometry when selecting a complete column.
  | `Issue #7587 <https://redmine.postgresql.org/issues/7587>`_ -  Ensure that the children of information_schema and pg_catalog node should be displayed.
  | `Issue #7591 <https://redmine.postgresql.org/issues/7591>`_ -  Fixed column "none" does not exist issue, while comparing schema objects.
  | `Issue #7596 <https://redmine.postgresql.org/issues/7596>`_ -  Fixed an issue where schema diff did not pick up the change in RLS policy.
  | `Issue #7608 <https://redmine.postgresql.org/issues/7608>`_ -  Fixed an issue where the cloud deployment wizard creates the cluster with the High Availability even if that option is not selected.
  | `Issue #7611 <https://redmine.postgresql.org/issues/7611>`_ -  Ensure that schema diff maintains view ownership when view definitions are modified.
  | `Issue #7614 <https://redmine.postgresql.org/issues/7614>`_ -  Fixed crypt key is missing issue when logout from the pgAdmin.
  | `Issue #7616 <https://redmine.postgresql.org/issues/7616>`_ -  Ensure that the next button should be disabled if the password did not match for Azure deployment.
  | `Issue #7617 <https://redmine.postgresql.org/issues/7617>`_ -  Fixed an issue where Azure cloud deployment failed.
  | `Issue #7625 <https://redmine.postgresql.org/issues/7625>`_ -  Fixed Spanish translations typo.
  | `Issue #7630 <https://redmine.postgresql.org/issues/7630>`_ -  Ensure that If the trigger function definition is changed, drop and recreate the trigger in the schema diff.
