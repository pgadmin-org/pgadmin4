************
Version 4.15
************

Release date: 2019-11-14

This release contains a number of bug fixes and new features since the release of pgAdmin4 4.14.

New features
************

| `Issue #1974 <https://redmine.postgresql.org/issues/1974>`_ -  Added encrypted password in reverse engineered SQL for roles.

Housekeeping
************


Bug fixes
*********

| `Issue #3789 <https://redmine.postgresql.org/issues/3789>`_ -  Ensure context menus never get hidden below the menu bar.
| `Issue #3913 <https://redmine.postgresql.org/issues/3913>`_ -  Ensure the correct "running at" agent is shown when a pgAgent job is executing.
| `Issue #3915 <https://redmine.postgresql.org/issues/3915>`_ -  Fix an issue in the Query Tool where shortcut keys could be ignored following a query error.
| `Issue #4341 <https://redmine.postgresql.org/issues/4341>`_ -  Give appropriate error messages when the user tries to use an blank master password.
| `Issue #4459 <https://redmine.postgresql.org/issues/4459>`_ -  Don't quote bigints when copying them from the Query Tool results grid.
| `Issue #4482 <https://redmine.postgresql.org/issues/4482>`_ -  Ensure compression level is passed to pg_dump when backing up in directory format.
| `Issue #4483 <https://redmine.postgresql.org/issues/4483>`_ -  Ensure the number of jobs can be specified when backing up in directory format.
| `Issue #4730 <https://redmine.postgresql.org/issues/4730>`_ -  Ensure all messages are retained in the Query Tool from long running queries.
| `Issue #4845 <https://redmine.postgresql.org/issues/4845>`_ -  Fixed potential error in the properties dialog for the Code tab.
| `Issue #4850 <https://redmine.postgresql.org/issues/4850>`_ -  Fixed an issue where Datetimepicker control opens when clicking on the label.