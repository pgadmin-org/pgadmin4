***********
Version 3.3
***********

Release date: 2018-09-06

This release contains a number of features and fixes reported since the release
of pgAdmin4 3.2


Features
********

| `Feature #1407 <https://redmine.postgresql.org/issues/1407>`_ - Add a geometry viewer that can render PostGIS data on a blank canvas or various map sources.
| `Feature #3503 <https://redmine.postgresql.org/issues/3503>`_ - Added new backup/restore options for PostgreSQL 11. Added dump options for 'pg_dumpall'.
| `Feature #3553 <https://redmine.postgresql.org/issues/3553>`_ - Add a Spanish translation.

Bug fixes
*********

| `Bug #3136 <https://redmine.postgresql.org/issues/3136>`_ - Stabilise feature tests for continuous running on CI systems.
| `Bug #3191 <https://redmine.postgresql.org/issues/3191>`_ - Fixed debugger execution issues.
| `Bug #3313 <https://redmine.postgresql.org/issues/3313>`_ - Ensure 'select all' and 'unselect all' working properly for pgAgent schedule.
| `Bug #3325 <https://redmine.postgresql.org/issues/3325>`_ - Fix sort/filter dialog issue where it incorrectly requires ASC/DESC.
| `Bug #3347 <https://redmine.postgresql.org/issues/3347>`_ - Ensure backup should work with '--data-only' and '--schema-only' for any format.
| `Bug #3407 <https://redmine.postgresql.org/issues/3407>`_ - Fix keyboard shortcuts layout in the preferences panel.
| `Bug #3420 <https://redmine.postgresql.org/issues/3420>`_ - Merge pgcli code with version 1.10.3, which is used for auto complete feature.
| `Bug #3461 <https://redmine.postgresql.org/issues/3461>`_ - Ensure that refreshing a node also updates the Property list.
| `Bug #3525 <https://redmine.postgresql.org/issues/3525>`_ - Ensure that refresh button on dashboard should refresh the table.
| `Bug #3528 <https://redmine.postgresql.org/issues/3528>`_ - Handle connection errors properly in the Query Tool.
| `Bug #3547 <https://redmine.postgresql.org/issues/3547>`_ - Make session implementation thread safe
| `Bug #3548 <https://redmine.postgresql.org/issues/3548>`_ - Ensure external table node should be visible only for GPDB.
| `Bug #3554 <https://redmine.postgresql.org/issues/3554>`_ - Fix auto scrolling issue in debugger on step in and step out.
| `Bug #3558 <https://redmine.postgresql.org/issues/3558>`_ - Fix sort/filter dialog editing issue.
| `Bug #3561 <https://redmine.postgresql.org/issues/3561>`_ - Ensure sort/filter dialog should display proper message after losing database connection.
| `Bug #3578 <https://redmine.postgresql.org/issues/3578>`_ - Ensure sql for Role should be visible in SQL panel for GPDB.
| `Bug #3579 <https://redmine.postgresql.org/issues/3579>`_ - When building the Windows installer, copy system Python packages before installing dependencies to ensure we don't end up with older versions than intended.
| `Bug #3604 <https://redmine.postgresql.org/issues/3604>`_ - Correct the documentation of View/Edit data.
