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

  | `Issue #6962 <https://redmine.postgresql.org/issues/6962>`_ -  Fixed the browser tree overlapping nodes and expansion issue.
  | `Issue #7002 <https://redmine.postgresql.org/issues/7002>`_ -  Added the ability to detect and warn users about bidirectional Unicode characters.
  | `Issue #7347 <https://redmine.postgresql.org/issues/7347>`_ -  Ensure that when Authentication buttons are disabled their text is visible in the Dark and High contrast theme.
  | `Issue #7368 <https://redmine.postgresql.org/issues/7368>`_ -  Ensure that unwanted APIs should not be getting called for BigAnimal.
  | `Issue #7372 <https://redmine.postgresql.org/issues/7372>`_ -  Tell Docker to always pull the latest base images when building containers.
  | `Issue #7373 <https://redmine.postgresql.org/issues/7373>`_ -  Fixed an issue with geometry window zoom mouse scroll not working.
  | `Issue #7374 <https://redmine.postgresql.org/issues/7374>`_ -  Fixed an issue when switching between connections in the Query Tool dropdown, the background and foreground colors should be changed.
  | `Issue #7376 <https://redmine.postgresql.org/issues/7376>`_ -  Fixed an issue where a popup for unsaved changes appears when clicking on the open file button for a blank query editor.
  | `Issue #7380 <https://redmine.postgresql.org/issues/7380>`_ -  Added support for multi-cell selection in the query tool grid.
  | `Issue #7383 <https://redmine.postgresql.org/issues/7383>`_ -  Fixed an issue where Preferences are not saved when the dialog is maximized.
  | `Issue #7388 <https://redmine.postgresql.org/issues/7388>`_ -  Fixed an issue where an error message fills the entire window if the query is long.
  | `Issue #7393 <https://redmine.postgresql.org/issues/7393>`_ -  Ensure that the editor position should not get changed once it is opened.
  | `Issue #7394 <https://redmine.postgresql.org/issues/7394>`_ -  Fixed an issue where geometry is not visible when a single cell is selected.
  | `Issue #7399 <https://redmine.postgresql.org/issues/7399>`_ -  Added missing toggle case keyboard shortcuts to the query tool.
  | `Issue #7402 <https://redmine.postgresql.org/issues/7402>`_ -  Ensure that Dashboard graphs should be refreshed on changing the node from the browser tree.
  | `Issue #7403 <https://redmine.postgresql.org/issues/7403>`_ -  Fixed an issue where comments on domain constraints were not visible when selecting a domain node.
  | `Issue #7405 <https://redmine.postgresql.org/issues/7405>`_ -  Ensure that null values are accepted for the numeric columns in react-data-grid.
  | `Issue #7408 <https://redmine.postgresql.org/issues/7408>`_ -  Fixed an issue when a table has a column with an array type with length or precision, the column type is not selected while editing the table.
