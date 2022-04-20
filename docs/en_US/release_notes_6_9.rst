************
Version 6.9
************

Release date: 2022-05-05

This release contains a number of bug fixes and new features since the release of pgAdmin4 6.8.

New features
************

  | `Issue #3253 <https://redmine.postgresql.org/issues/3253>`_ -  Added status bar to the Query Tool.
  | `Issue #3989 <https://redmine.postgresql.org/issues/3989>`_ -  Ensure that row numbers should be visible in view when scrolling horizontally.
  | `Issue #6830 <https://redmine.postgresql.org/issues/6830>`_ -  Relocate GIS Viewer Button to the Left Side of the Results Table.
  | `Issue #7012 <https://redmine.postgresql.org/issues/7012>`_ -  Disable the master password requirement when using alternative authentication sources.

Housekeeping
************

  | `Issue #6131 <https://redmine.postgresql.org/issues/6131>`_ -  Port query tool to React.
  | `Issue #6746 <https://redmine.postgresql.org/issues/6746>`_ -  Improve the Kerberos Documentation.
  | `Issue #7255 <https://redmine.postgresql.org/issues/7255>`_ -  Ensure the database and schema restriction controls are not shown as a drop-down.

Bug fixes
*********

  | `Issue #6725 <https://redmine.postgresql.org/issues/6725>`_ -  Fixed an issue where the Query tool opens on minimum size if the user opens multiple query tool Window quickly.
  | `Issue #6958 <https://redmine.postgresql.org/issues/6958>`_ -  Only set permissions on the storage directory upon creation.
  | `Issue #7026 <https://redmine.postgresql.org/issues/7026>`_ -  Fixed an issue where the Browser panel is not completely viewable.
  | `Issue #7168 <https://redmine.postgresql.org/issues/7168>`_ -  Improvement to the Geometry Viewer popup to change the size of the result tables when column names are quite long.
  | `Issue #7187 <https://redmine.postgresql.org/issues/7187>`_ -  Fixed an issue where the downloaded ERD diagram was 0 bytes.
  | `Issue #7188 <https://redmine.postgresql.org/issues/7188>`_ -  Fixed an issue where the connection bar is not visible.
  | `Issue #7231 <https://redmine.postgresql.org/issues/7231>`_ -  Don't strip binaries when packaging them in the server RPM as this might break cpython modules.
  | `Issue #7252 <https://redmine.postgresql.org/issues/7252>`_ -  Ensure that Columns should always be visible in the import/export dialog.
  | `Issue #7260 <https://redmine.postgresql.org/issues/7260>`_ -  Fixed an issue where an Empty message popup after running a query.
  | `Issue #7262 <https://redmine.postgresql.org/issues/7262>`_ -  Ensure that Autocomplete should work after changing the connection.
  | `Issue #7294 <https://redmine.postgresql.org/issues/7294>`_ -  Fixed an issue where the copy and paste row does not work if the first column contains no data.
  | `Issue #7296 <https://redmine.postgresql.org/issues/7296>`_ -  Ensure that after deleting multiple objects from the properties panel, the browser tree should be refreshed.
  | `Issue #7299 <https://redmine.postgresql.org/issues/7299>`_ -  Fixed sorting issue in the statistics panel.
  | `Issue #7308 <https://redmine.postgresql.org/issues/7308>`_ -  Ensure that sorting should be preserved on refresh for Server Activity.
