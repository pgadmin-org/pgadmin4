************
Version 6.0
************

Release date: 2021-10-07

This release contains a number of bug fixes and new features since the release of pgAdmin4 5.7.

New features
************

| `Issue #4211 <https://redmine.postgresql.org/issues/4211>`_ -  Added support for OWNED BY Clause for sequences.

Housekeeping
************

| `Issue #5741 <https://redmine.postgresql.org/issues/5741>`_ -  Revisit all the CREATE and DROP DDL's to add appropriate 'IF EXISTS', 'CASCADE' and 'CREATE OR REPLACE'.
| `Issue #6588 <https://redmine.postgresql.org/issues/6588>`_ -  Port object nodes and properties dialogs to React.
| `Issue #6692 <https://redmine.postgresql.org/issues/6692>`_ -  Remove GPDB support completely.

Bug fixes
*********

| `Issue #2546 <https://redmine.postgresql.org/issues/2546>`_ -  Added support to create the Partitioned table using COLLATE and opclass.
| `Issue #3827 <https://redmine.postgresql.org/issues/3827>`_ -  Ensure that in the Query History tab, query details should be scrollable.
| `Issue #6712 <https://redmine.postgresql.org/issues/6712>`_ -  Fixed an issue where collapse and expand arrows mismatch in case of nested IF.
| `Issue #6713 <https://redmine.postgresql.org/issues/6713>`_ -  Fixed an issue where the last message is not visible in the Debugger.
| `Issue #6724 <https://redmine.postgresql.org/issues/6724>`_ -  Fixed an issue where the drop cascade button enables for Databases.
