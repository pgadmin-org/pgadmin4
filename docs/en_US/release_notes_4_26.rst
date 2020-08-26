************
Version 4.26
************

Release date: 2020-09-17

This release contains a number of bug fixes and new features since the release of pgAdmin4 4.25.

New features
************

| `Issue #2042 <https://redmine.postgresql.org/issues/2042>`_ -  Added SQL Formatter support in Query Tool.
| `Issue #5772 <https://redmine.postgresql.org/issues/5772>`_ -  Warn the user when connecting to a server that is older than pgAdmin supports.

Housekeeping
************

| `Issue #5332 <https://redmine.postgresql.org/issues/5332>`_ -  Improve code coverage and API test cases for Columns and Constraints (Index, Foreign Key, Check, Exclusion).
| `Issue #5344 <https://redmine.postgresql.org/issues/5344>`_ -  Improve code coverage and API test cases for Grant Wizard.

Bug fixes
*********

| `Issue #5722 <https://redmine.postgresql.org/issues/5722>`_ -  Ensure that the user should be able to drop the database even if it is connected.
| `Issue #5748 <https://redmine.postgresql.org/issues/5748>`_ -  Fixed incorrect reverse engineering SQL for Foreign key when creating a table.
| `Issue #5751 <https://redmine.postgresql.org/issues/5751>`_ -  Enable the 'Configure' and 'View log' menu option when the server taking longer than usual time to start.
| `Issue #5754 <https://redmine.postgresql.org/issues/5754>`_ -  Fixed an issue where schema diff is not working when providing the options to Foreign Data Wrapper, Foreign Server, and User Mapping.
| `Issue #5766 <https://redmine.postgresql.org/issues/5766>`_ -  Fixed string indices must be integers issue for PostgreSQL < 9.3.