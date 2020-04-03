************
Version 4.21
************

Release date: 2020-04-30

This release contains a number of bug fixes and new features since the release of pgAdmin4 4.20.

New features
************

| `Issue #5184 <https://redmine.postgresql.org/issues/5184>`_ -  Added support for parameter toast_tuple_target and parallel_workers of the table.
| `Issue #5264 <https://redmine.postgresql.org/issues/5264>`_ -  Added support of Packages, Sequences and Synonyms to the Schema Diff.

Housekeeping
************


Bug fixes
*********

| `Issue #3645 <https://redmine.postgresql.org/issues/3645>`_ -  Ensure that the start and end date should be deleted when clear the selection for pgAgent Job.
| `Issue #5180 <https://redmine.postgresql.org/issues/5180>`_ -  Fixed an issue where the autovacuum_enabled parameter is added automatically in the RE-SQL when the table has been created using the WITH clause.
| `Issue #5268 <https://redmine.postgresql.org/issues/5268>`_ -  Fixed generated SQL when any token in FTS Configuration or any option in FTS Dictionary is changed.
| `Issue #5314 <https://redmine.postgresql.org/issues/5314>`_ -  Ensure that switch cell is in sync with switch control for accessibility.
| `Issue #5351 <https://redmine.postgresql.org/issues/5351>`_ -  Fixed compilation warnings while building pgAdmin.