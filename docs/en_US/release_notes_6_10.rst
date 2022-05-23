************
Version 6.10
************

Release date: 2022-06-02

This release contains a number of bug fixes and new features since the release of pgAdmin 4 v6.9.

New features
************

  | `Issue #7364 <https://redmine.postgresql.org/issues/7364>`_ -  Added the ability to resize columns on dashboard tables.

Housekeeping
************

  | `Issue #7283 <https://redmine.postgresql.org/issues/7283>`_ -  PG 15 compatibility issues fixed.
  | `Issue #7337 <https://redmine.postgresql.org/issues/7337>`_ -  Port connect server password dialog to React.

Bug fixes
*********

  | `Issue #7002 <https://redmine.postgresql.org/issues/7002>`_ -  Added the ability to detect and warn users about bidirectional Unicode characters.
  | `Issue #7372 <https://redmine.postgresql.org/issues/7372>`_ -  Tell Docker to always pull the latest base images when building containers.
  | `Issue #7373 <https://redmine.postgresql.org/issues/7373>`_ -  Fixed an issue with geometry window zoom mouse scroll not working.
  | `Issue #7376 <https://redmine.postgresql.org/issues/7376>`_ -  Fixed an issue where a popup for unsaved changes appears when clicking on the open file button for a blank query editor.
  | `Issue #7383 <https://redmine.postgresql.org/issues/7383>`_ -  Fixed an issue where Preferences are not saved when the dialog is maximized.
  | `Issue #7388 <https://redmine.postgresql.org/issues/7388>`_ -  Fixed an issue where an error message fills the entire window if the query is long.
  | `Issue #7393 <https://redmine.postgresql.org/issues/7393>`_ -  Ensure that the editor position should not get changed once it is opened.
  | `Issue #7402 <https://redmine.postgresql.org/issues/7402>`_ -  Ensure that Dashboard graphs should be refreshed on changing the node from the browser tree.
