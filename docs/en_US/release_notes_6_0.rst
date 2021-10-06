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
| `Issue #6129 <https://redmine.postgresql.org/issues/6129>`_ -  Port browser tree to React.
| `Issue #6588 <https://redmine.postgresql.org/issues/6588>`_ -  Port object nodes and properties dialogs to React.
| `Issue #6687 <https://redmine.postgresql.org/issues/6687>`_ -  Port Grant Wizard to react.
| `Issue #6692 <https://redmine.postgresql.org/issues/6692>`_ -  Remove GPDB support completely.

Bug fixes
*********

| `Issue #2097 <https://redmine.postgresql.org/issues/2097>`_ -  Fixed an issue where grant wizard is unresponsive if the database size is huge.
| `Issue #2546 <https://redmine.postgresql.org/issues/2546>`_ -  Added support to create the Partitioned table using COLLATE and opclass.
| `Issue #3827 <https://redmine.postgresql.org/issues/3827>`_ -  Ensure that in the Query History tab, query details should be scrollable.
| `Issue #6712 <https://redmine.postgresql.org/issues/6712>`_ -  Fixed an issue where collapse and expand arrows mismatch in case of nested IF.
| `Issue #6713 <https://redmine.postgresql.org/issues/6713>`_ -  Fixed an issue where the last message is not visible in the Debugger.
| `Issue #6723 <https://redmine.postgresql.org/issues/6723>`_ -  Updated query error row selection color as per dark theme style guide.
| `Issue #6724 <https://redmine.postgresql.org/issues/6724>`_ -  Fixed an issue where the drop cascade button enables for Databases.
| `Issue #6736 <https://redmine.postgresql.org/issues/6736>`_ -  Fixed an issue where Refresh view options are not working for materialized view.
| `Issue #6755 <https://redmine.postgresql.org/issues/6755>`_ -  Fixed keyerror issue in schema diff for 'attnum' and 'edit_types' parameter.
| `Issue #6759 <https://redmine.postgresql.org/issues/6759>`_ -  Ensure that RLS names should not be editable in the collection node of properties tab.
| `Issue #6798 <https://redmine.postgresql.org/issues/6798>`_ -  Fixed an issue where Execute button of the query tool gets disabled once we change anything in the data grid.
| `Issue #6834 <https://redmine.postgresql.org/issues/6834>`_ -  Ensure that SQL help should work for EPAS servers.
