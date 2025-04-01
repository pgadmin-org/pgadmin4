************
Version 4.15
************

Release date: 2019-11-14

This release contains a number of bug fixes and new features since the release of pgAdmin4 4.14.

New features
************

| `Issue #1974 <https://redmine.postgresql.org/issues/1974>`_ -  Added encrypted password in reverse engineered SQL for roles.
| `Issue #3741 <https://redmine.postgresql.org/issues/3741>`_ -  Added Dark(Beta) UI Theme option.
| `Issue #4006 <https://redmine.postgresql.org/issues/4006>`_ -  Support Enable Always and Enable Replica on triggers.
| `Issue #4351 <https://redmine.postgresql.org/issues/4351>`_ -  Add an option to request confirmation before cancelling/resetting changes on a Properties dialog.
| `Issue #4348 <https://redmine.postgresql.org/issues/4348>`_ -  Added support for custom theme creation and selection.

Housekeeping
************


Bug fixes
*********

| `Issue #3130 <https://redmine.postgresql.org/issues/3130>`_ -  Ensure create new object dialog should be opened when alt+shift+n key is pressed on the collection node.
| `Issue #3279 <https://redmine.postgresql.org/issues/3279>`_ -  Fixed issue where Drop and Disconnect connection menu points are too close to each other.
| `Issue #3789 <https://redmine.postgresql.org/issues/3789>`_ -  Ensure context menus never get hidden below the menu bar.
| `Issue #3859 <https://redmine.postgresql.org/issues/3859>`_ -  Rename the context menu from 'Drop Server' to 'Remove Server'.
| `Issue #3913 <https://redmine.postgresql.org/issues/3913>`_ -  Ensure the correct "running at" agent is shown when a pgAgent job is executing.
| `Issue #3915 <https://redmine.postgresql.org/issues/3915>`_ -  Fix an issue in the Query Tool where shortcut keys could be ignored following a query error.
| `Issue #3999 <https://redmine.postgresql.org/issues/3999>`_ -  Fix the toggle case shortcut key combination.
| `Issue #4173 <https://redmine.postgresql.org/issues/4173>`_ -  Fix an issue where a black arrow-kind image is displaying at the background of browser tree images.
| `Issue #4191 <https://redmine.postgresql.org/issues/4191>`_ -  Ensure comments are shown in reverse engineered SQL for table partitions.
| `Issue #4242 <https://redmine.postgresql.org/issues/4242>`_ -  Handle NULL values appropriately when sorting backgrid tables.
| `Issue #4341 <https://redmine.postgresql.org/issues/4341>`_ -  Give appropriate error messages when the user tries to use an blank master password.
| `Issue #4451 <https://redmine.postgresql.org/issues/4451>`_ -  Remove arbitrary (and incorrect) requirement that composite types must have at least two members.
| `Issue #4459 <https://redmine.postgresql.org/issues/4459>`_ -  Don't quote bigints when copying them from the Query Tool results grid.
| `Issue #4482 <https://redmine.postgresql.org/issues/4482>`_ -  Ensure compression level is passed to pg_dump when backing up in directory format.
| `Issue #4483 <https://redmine.postgresql.org/issues/4483>`_ -  Ensure the number of jobs can be specified when backing up in directory format.
| `Issue #4564 <https://redmine.postgresql.org/issues/4564>`_ -  Ensure Javascript errors during Query Tool execution are reported as such and not as Ajax errors.
| `Issue #4610 <https://redmine.postgresql.org/issues/4610>`_ -  Suppress Enter key presses in Alertify dialogues when the come from Select2 controls to allow item selection with Enter.
| `Issue #4647 <https://redmine.postgresql.org/issues/4647>`_ -  Ensure that units are respected when sorting by file size in the File dialog.
| `Issue #4730 <https://redmine.postgresql.org/issues/4730>`_ -  Ensure all messages are retained in the Query Tool from long running queries.
| `Issue #4734 <https://redmine.postgresql.org/issues/4734>`_ -  Updated documentation for the delete row button that only strikeout the row instead of deleting it.
| `Issue #4779 <https://redmine.postgresql.org/issues/4779>`_ -  Updated documentation for the query tool toolbar buttons.
| `Issue #4835 <https://redmine.postgresql.org/issues/4835>`_ -  Fixed an issue where psql of v12 throwing "symbol not found" error while running Maintenance and Import/Export.
| `Issue #4845 <https://redmine.postgresql.org/issues/4845>`_ -  Fixed potential error in the properties dialog for the Code tab.
| `Issue #4850 <https://redmine.postgresql.org/issues/4850>`_ -  Fixed an issue where Datetimepicker control opens when clicking on the label.
| `Issue #4895 <https://redmine.postgresql.org/issues/4895>`_ -  Fixed potential issue in reset function for nested objects.
| `Issue #4896 <https://redmine.postgresql.org/issues/4896>`_ -  Fixed an issue where escape key not working to close the open/save file dialog.
| `Issue #4906 <https://redmine.postgresql.org/issues/4906>`_ -  Fixed an issue where keyboard shortcut for context menu is not working when using Firefox on CentOS7.
| `Issue #4924 <https://redmine.postgresql.org/issues/4924>`_ -  Fixed docker container exit issue occurs due to change in Gunicorn's latest version.