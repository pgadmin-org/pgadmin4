************
Version 6.2
************

Release date: 2021-11-18

This release contains a number of bug fixes and new features since the release of pgAdmin4 6.1.

New features
************

| `Issue #3834 <https://redmine.postgresql.org/issues/3834>`_ -  Added support of Aggregate and Operator node in view-only mode.
| `Issue #6953 <https://redmine.postgresql.org/issues/6953>`_ -  Ensure that users should be able to modify the REMOTE_USER environment variable as per their environment by introducing the new config parameter WEBSERVER_REMOTE_USER.

Housekeeping
************


Bug fixes
*********

| `Issue #5427 <https://redmine.postgresql.org/issues/5427>`_ -  Fixed pgAdmin freezing issue by providing the error message for the operation that can't perform due to lock on the particular table.
| `Issue #6780 <https://redmine.postgresql.org/issues/6780>`_ -  Ensure that columns should be merged if the newly added column is present in the parent table.
| `Issue #6809 <https://redmine.postgresql.org/issues/6809>`_ -  Fixed an issue where pgAdmin is not opening properly.
| `Issue #6832 <https://redmine.postgresql.org/issues/6832>`_ -  Ensure that internal authentication when combined with other authentication providers, the order of internal source should not matter while picking up the provider.
| `Issue #6845 <https://redmine.postgresql.org/issues/6845>`_ -  Ensure that inherit table icon should be visible properly in the tree view.
| `Issue #6859 <https://redmine.postgresql.org/issues/6859>`_ -  Fixed an issue where properties panel is not updated when any object is added from the browser tree.
| `Issue #6896 <https://redmine.postgresql.org/issues/6896>`_ -  Ensure that the user should be able to navigate browser tree objects using arrow keys from keyboard.
| `Issue #6905 <https://redmine.postgresql.org/issues/6905>`_ -  Fixed an issue where database nodes are not getting loaded behind a reverse proxy with SSL.
| `Issue #6925 <https://redmine.postgresql.org/issues/6925>`_ -  Fixed SQL syntax error if select "Custom auto-vacuum" option and not set Autovacuum option to Yes or No.
| `Issue #6939 <https://redmine.postgresql.org/issues/6939>`_ -  Fixed an issue where older server group name displayed in the confirmation pop-up when the user removes server group.
| `Issue #6944 <https://redmine.postgresql.org/issues/6944>`_ -  Fixed an issue where JSON editor preview colours have inappropriate contrast in dark mode.
| `Issue #6945 <https://redmine.postgresql.org/issues/6945>`_ -  Fixed JSON Editor scrolling issue in code mode.
| `Issue #6940 <https://redmine.postgresql.org/issues/6940>`_ -  Fixed an issue where user details are not shown when the non-admin user tries to connect to the shared server.
| `Issue #6949 <https://redmine.postgresql.org/issues/6949>`_ -  Ensure that dialog should be opened when clicking on Reassign/Drop owned menu.
| `Issue #6954 <https://redmine.postgresql.org/issues/6954>`_ -  Ensure that changing themes should work on Windows when system high contrast mode is enabled.
| `Issue #6972 <https://redmine.postgresql.org/issues/6972>`_ -  Ensure that the Binary path for PG14 should be visible in the preferences.
| `Issue #6974 <https://redmine.postgresql.org/issues/6974>`_ -  Added operators and aggregates in search objects.
| `Issue #6976 <https://redmine.postgresql.org/issues/6976>`_ -  Fixed an issue where textarea should be allowed to resize and have more than 255 chars.
| `Issue #6981 <https://redmine.postgresql.org/issues/6981>`_ -  Fixed an issue where SQL for index shows the same column multiple times.
| `Issue #6988 <https://redmine.postgresql.org/issues/6988>`_ -  Reset the layout if pgAdmin4 detects the layout is in an inconsistent state.
