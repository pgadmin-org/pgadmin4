***********
Version 3.3
***********

Release date: 2018-09-06

This release contains a number of features and fixes reported since the release of pgAdmin4 3.2


Features
********

| `Feature #3503 <https://redmine.postgresql.org/issues/3503>`_ - Added new backup/restore options for PostgreSQL 11. Added dump options for 'pg_dumpall'.
| `Feature #3553 <https://redmine.postgresql.org/issues/3553>`_ - Add a Spanish translation.

Bug fixes
*********

| `Bug #3136 <https://redmine.postgresql.org/issues/3136>`_ - Stabilise feature tests for continuous running on CI systems.
| `Bug #3313 <https://redmine.postgresql.org/issues/3313>`_ - Ensure 'select all' and 'unselect all' working properly for pgAgent schedule.
| `Bug #3325 <https://redmine.postgresql.org/issues/3325>`_ - Fix sort/filter dialog issue where it incorrectly requires ASC/DESC.
| `Bug #3347 <https://redmine.postgresql.org/issues/3347>`_ - Ensure backup should work with '--data-only' and '--schema-only' for any format.
| `Bug #3407 <https://redmine.postgresql.org/issues/3407>`_ - Fix keyboard shortcuts layout in the preferences panel.
| `Bug #3461 <https://redmine.postgresql.org/issues/3461>`_ - Ensure that refreshing a node also updates the Property list.
| `Bug #3528 <https://redmine.postgresql.org/issues/3528>`_ - Handle connection errors properly in the query tool.
| `Bug #3547 <https://redmine.postgresql.org/issues/3547>`_ - Make session implementation thread safe
| `Bug #3558 <https://redmine.postgresql.org/issues/3558>`_ - Fix sort/filter dialog editing issue.
| `Bug #3561 <https://redmine.postgresql.org/issues/3561>`_ - Ensure sort/filter dialog should display proper message after losing database connection.
| `Bug #3578 <https://redmine.postgresql.org/issues/3578>`_ - Ensure sql for Role should be visible in SQL panel for GPDB.
