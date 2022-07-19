************
Version 6.12
************

Release date: 2022-07-28

This release contains a number of bug fixes and new features since the release of pgAdmin 4 v6.11.

New features
************

  | `Issue #4488 <https://redmine.postgresql.org/issues/4488>`_ -  Added option to trigger autocomplete on key press in the query tool.
  | `Issue #4607 <https://redmine.postgresql.org/issues/4607>`_ -  Allow users to delete files/folders from the storage manager.
  | `Issue #7389 <https://redmine.postgresql.org/issues/7389>`_ -  Allow users to search within the file/storage manager.
  | `Issue #7486 <https://redmine.postgresql.org/issues/7486>`_ -  Added support for visualizing the graphs using Stacked Line, Bar, and Stacked Bar charts in the query tool.
  | `Issue #7487 <https://redmine.postgresql.org/issues/7487>`_ -  Added support for visualise the graph using a Pie chart in the query tool.

Housekeeping
************

  | `Issue #7313 <https://redmine.postgresql.org/issues/7313>`_ -  Port the file/storage manager to React.
  | `Issue #7341 <https://redmine.postgresql.org/issues/7341>`_ -  Port change password dialog to React.
  | `Issue #7342 <https://redmine.postgresql.org/issues/7342>`_ -  Port Master Password dialog to React.
  | `Issue #7492 <https://redmine.postgresql.org/issues/7492>`_ -  Removing dynamic module loading and replacing it with static loading.
  | `Issue #7546 <https://redmine.postgresql.org/issues/7546>`_ -  Port named restore point dialog to React.

Bug fixes
*********

  | `Issue #7428 <https://redmine.postgresql.org/issues/7428>`_ -  Preserve the settings set by the user in the import/export data dialog.
  | `Issue #7471 <https://redmine.postgresql.org/issues/7471>`_ -  Ensure that the splash screen can be moved.
  | `Issue #7508 <https://redmine.postgresql.org/issues/7508>`_ -  Fixed an issue where comments on indexes are not displayed.
  | `Issue #7512 <https://redmine.postgresql.org/issues/7512>`_ -  Ensure that notices should not disappear from the messages tab.
  | `Issue #7517 <https://redmine.postgresql.org/issues/7517>`_ -  Enable the start debugging button once execution is completed.
  | `Issue #7518 <https://redmine.postgresql.org/issues/7518>`_ -  Ensure that dashboard graph API is not called after the panel has been closed.
  | `Issue #7519 <https://redmine.postgresql.org/issues/7519>`_ -  Ensure that geometry should be shown for all the selected cells.
  | `Issue #7520 <https://redmine.postgresql.org/issues/7520>`_ -  Fixed the JSON editor issue of hiding the first record.
  | `Issue #7522 <https://redmine.postgresql.org/issues/7522>`_ -  Added support for Azure PostgreSQL deployment in server mode.
  | `Issue #7523 <https://redmine.postgresql.org/issues/7523>`_ -  Fixed typo error for Statistics on the table header.
  | `Issue #7524 <https://redmine.postgresql.org/issues/7524>`_ -  Fixed an issue where new folders cannot be created in the save dialog.
