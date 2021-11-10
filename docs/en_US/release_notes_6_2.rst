************
Version 6.2
************

Release date: 2021-11-18

This release contains a number of bug fixes and new features since the release of pgAdmin4 6.1.

New features
************

| `Issue #3834 <https://redmine.postgresql.org/issues/3834>`_ -  Added support of Aggregate and Operator node in view-only mode.

Housekeeping
************


Bug fixes
*********

| `Issue #5427 <https://redmine.postgresql.org/issues/5427>`_ -  Fixed pgAdmin freezing issue by providing the error message for the operation that can't perform due to lock on the particular table.
| `Issue #6780 <https://redmine.postgresql.org/issues/6780>`_ -  Ensure that columns should be merged if the newly added column is present in the parent table.
| `Issue #6809 <https://redmine.postgresql.org/issues/6809>`_ -  Fixed an issue where pgAdmin is not opening properly.
| `Issue #6859 <https://redmine.postgresql.org/issues/6859>`_ -  Fixed an issue where properties panel is not updated when any object is added from the browser tree.
| `Issue #6905 <https://redmine.postgresql.org/issues/6905>`_ -  Fixed an issue where database nodes are not getting loaded behind a reverse proxy with SSL.
| `Issue #6939 <https://redmine.postgresql.org/issues/6939>`_ -  Fixed an issue where older server group name displayed in the confirmation pop-up when the user removes server group.
| `Issue #6940 <https://redmine.postgresql.org/issues/6940>`_ -  Fixed an issue where user details are not shown when the non-admin user tries to connect to the shared server.
| `Issue #6949 <https://redmine.postgresql.org/issues/6949>`_ -  Ensure that dialog should be opened when clicking on Reassign/Drop owned menu.
| `Issue #6954 <https://redmine.postgresql.org/issues/6954>`_ -  Ensure that changing themes should work on Windows when system high contrast mode is enabled.
| `Issue #6976 <https://redmine.postgresql.org/issues/6976>`_ -  Fixed an issue where textarea should be allowed to resize and have more than 255 chars.
