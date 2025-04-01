************
Version 4.26
************

Release date: 2020-09-17

This release contains a number of bug fixes and new features since the release of pgAdmin4 4.25.

New features
************

| `Issue #2042 <https://redmine.postgresql.org/issues/2042>`_ -  Added SQL Formatter support in Query Tool.
| `Issue #4059 <https://redmine.postgresql.org/issues/4059>`_ -  Added a new button to the query tool toolbar to open a new query tool window.
| `Issue #4979 <https://redmine.postgresql.org/issues/4979>`_ -  Added shared server support for admin users.
| `Issue #5772 <https://redmine.postgresql.org/issues/5772>`_ -  Warn the user when connecting to a server that is older than pgAdmin supports.

Housekeeping
************

| `Issue #5332 <https://redmine.postgresql.org/issues/5332>`_ -  Improve code coverage and API test cases for Columns and Constraints (Index, Foreign Key, Check, Exclusion).
| `Issue #5344 <https://redmine.postgresql.org/issues/5344>`_ -  Improve code coverage and API test cases for Grant Wizard.
| `Issue #5774 <https://redmine.postgresql.org/issues/5774>`_ -  Improve code coverage and API test cases for Tables.
| `Issue #5792 <https://redmine.postgresql.org/issues/5792>`_ -  Added documentation for shared server support.

Bug fixes
*********

| `Issue #4216 <https://redmine.postgresql.org/issues/4216>`_ -  Ensure that schema names starting with 'pg' should be visible in browser tree when standard_conforming_strings is set to off.
| `Issue #5426 <https://redmine.postgresql.org/issues/5426>`_ -  Adjusted the height of jobstep code block to use maximum space.
| `Issue #5652 <https://redmine.postgresql.org/issues/5652>`_ -  Modified the 'Commit' and 'Rollback' query tool button icons.
| `Issue #5722 <https://redmine.postgresql.org/issues/5722>`_ -  Ensure that the user should be able to drop the database even if it is connected.
| `Issue #5732 <https://redmine.postgresql.org/issues/5732>`_ -  Fixed some accessibility issues.
| `Issue #5734 <https://redmine.postgresql.org/issues/5734>`_ -  Update the description of GIN and GiST indexes in the documentation.
| `Issue #5746 <https://redmine.postgresql.org/issues/5746>`_ -  Fixed an issue where --load-server does not allow loading connections that use pg_services.
| `Issue #5748 <https://redmine.postgresql.org/issues/5748>`_ -  Fixed incorrect reverse engineering SQL for Foreign key when creating a table.
| `Issue #5751 <https://redmine.postgresql.org/issues/5751>`_ -  Enable the 'Configure' and 'View log' menu option when the server taking longer than usual time to start.
| `Issue #5754 <https://redmine.postgresql.org/issues/5754>`_ -  Fixed an issue where schema diff is not working when providing the options to Foreign Data Wrapper, Foreign Server, and User Mapping.
| `Issue #5764 <https://redmine.postgresql.org/issues/5764>`_ -  Fixed SQL for Row Level Security which is incorrectly generated.
| `Issue #5765 <https://redmine.postgresql.org/issues/5765>`_ -  Fixed an issue in the query tool when columns are having the same name as javascript object internal functions.
| `Issue #5766 <https://redmine.postgresql.org/issues/5766>`_ -  Fixed string indices must be integers issue for PostgreSQL < 9.3.
| `Issue #5773 <https://redmine.postgresql.org/issues/5773>`_ -  Fixed an issue where the application ignores the fixed port configuration value.
| `Issue #5775 <https://redmine.postgresql.org/issues/5775>`_ -  Ensure that 'setup-web.sh' should work in Debian 10.
| `Issue #5779 <https://redmine.postgresql.org/issues/5779>`_ -  Remove illegal argument from trigger function in trigger DDL statement.
| `Issue #5794 <https://redmine.postgresql.org/issues/5794>`_ -  Fixed excessive CPU usage by stopping the indefinite growth of the graph dataset.
| `Issue #5815 <https://redmine.postgresql.org/issues/5815>`_ -  Fixed an issue where clicking on the 'Generate script' button shows a forever spinner due to pop up blocker.
| `Issue #5816 <https://redmine.postgresql.org/issues/5816>`_ -  Ensure that the 'CREATE SCHEMA' statement should be present in the generated script if the schema is not present in the target database.
| `Issue #5820 <https://redmine.postgresql.org/issues/5820>`_ -  Fixed an issue while refreshing Resource Group.
| `Issue #5833 <https://redmine.postgresql.org/issues/5833>`_ -  Fixed an issue where custom sequences are not visible when show system objects are set to false.
| `Issue #5834 <https://redmine.postgresql.org/issues/5834>`_ -  Ensure that the 'Remove Server Group' option is available in the context menu.