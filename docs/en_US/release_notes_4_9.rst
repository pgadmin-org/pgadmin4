***********
Version 4.9
***********

Release date: 2019-06-27

This release contains a number of bug fixes and new features since the release of pgAdmin4 4.8.

New features
************

| `Issue #3174 <https://redmine.postgresql.org/issues/3174>`_ - Visually distinguish simple tables from tables that are inherited and from which other tables are inherited.

Housekeeping
************

| `Issue #4202 <https://redmine.postgresql.org/issues/4202>`_ - Add a framework for testing reversed engineered SQL and CRUD API endpoints.

Bug fixes
*********

| `Issue #3994 <https://redmine.postgresql.org/issues/3994>`_ - Fix issue where the dependencies tab for inherited tables/foreign keys shows partial text.
| `Issue #4036 <https://redmine.postgresql.org/issues/4036>`_ - Allow editing of data where a primary key column includes a % sign in the value.
| `Issue #4171 <https://redmine.postgresql.org/issues/4171>`_ - Fix issue where reverse engineered SQL was failing for foreign tables, if it had "=" in the options.
| `Issue #4195 <https://redmine.postgresql.org/issues/4195>`_ - Fix keyboard navigation in "inner" tabsets such as the Query Tool and Debugger.
| `Issue #4228 <https://redmine.postgresql.org/issues/4228>`_ - Ensure the correct label is used in panel headers when viewing filtered rows.
| `Issue #4253 <https://redmine.postgresql.org/issues/4253>`_ - Fix issue where new column should be created with Default value.
| `Issue #4283 <https://redmine.postgresql.org/issues/4283>`_ - Initial support for PostgreSQL 12.
| `Issue #4288 <https://redmine.postgresql.org/issues/4288>`_ - Initial support for PostgreSQL 12.
| `Issue #4290 <https://redmine.postgresql.org/issues/4290>`_ - Initial support for PostgreSQL 12.
| `Issue #4255 <https://redmine.postgresql.org/issues/4255>`_ - Prevent the geometry viewer grabbing key presses when not in focus under Firefox, IE and Edge.
| `Issue #4306 <https://redmine.postgresql.org/issues/4306>`_ - Prevent the "Please login to access this page" message displaying multiple times.
| `Issue #4310 <https://redmine.postgresql.org/issues/4310>`_ - Ensure that the Return key can be used to submit the Master Password dialogue.
| `Issue #4317 <https://redmine.postgresql.org/issues/4317>`_ - Ensure that browser auto-fill doesn't cause Help pages to be opened unexpectedly.
| `Issue #4320 <https://redmine.postgresql.org/issues/4320>`_ - Fix issue where SSH tunnel connection using password is failing, it's regression of Master Password.
| `Issue #4329 <https://redmine.postgresql.org/issues/4329>`_ - Fix an initialisation error when two functions with parameters are debugged in parallel.
| `Issue #4343 <https://redmine.postgresql.org/issues/4343>`_ - Fix issue where property dialog of column should open properly for EPAS v12.
| `Issue #4345 <https://redmine.postgresql.org/issues/4345>`_ - Capitalize the word 'export' used in Import/Export module.
| `Issue #4349 <https://redmine.postgresql.org/issues/4349>`_ - Ensure strings are properly encoded in the Query History.
| `Issue #4350 <https://redmine.postgresql.org/issues/4350>`_ - Ensure we include the CSRF token when uploading files.
| `Issue #4357 <https://redmine.postgresql.org/issues/4357>`_ - Fix connection restoration issue when pgAdmin server is restarted and the page is refreshed.
| `Issue #4360 <https://redmine.postgresql.org/issues/4360>`_ - Ensure the debugger control buttons are only enabled once initialisation is complete.
| `Issue #4362 <https://redmine.postgresql.org/issues/4362>`_ - Remove additional "SETOF" included when generating CREATE scripts for trigger functions.
| `Issue #4365 <https://redmine.postgresql.org/issues/4365>`_ - Fix help links for backup globals and backup server.
| `Issue #4367 <https://redmine.postgresql.org/issues/4367>`_ - Fix an XSS issue seen in View/Edit data mode if a column name includes HTML.
| `Issue #4378 <https://redmine.postgresql.org/issues/4378>`_ - Ensure Python escaping matched JS escaping and fix a minor XSS issue in the Query Tool that required superuser access to trigger.
| `Issue #4380 <https://redmine.postgresql.org/issues/4380>`_ - Ensure that both columns and partitions can be edited at the same time in the table dialog.
| `Issue #4386 <https://redmine.postgresql.org/issues/4386>`_ - Fix an XSS issue when username contains XSS vulnerable text.