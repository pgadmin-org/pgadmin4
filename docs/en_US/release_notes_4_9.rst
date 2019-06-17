***********
Version 4.9
***********

Release date: 2019-06-27

This release contains a number of bug fixes and new features since the release of pgAdmin4 4.8.

New features
************

| `Feature #3174 <https://redmine.postgresql.org/issues/3174>`_ - Visually distinguish simple tables from tables that are inherited and from which other tables are inherited.

Bug fixes
*********

| `Bug #3994 <https://redmine.postgresql.org/issues/3994>`_ - Fix issue where the dependencies tab for inherited tables/foreign keys shows partial text.
| `Bug #4171 <https://redmine.postgresql.org/issues/4171>`_ - Fix issue where reverse engineered SQL was failing for foreign tables, if it had "=" in the options.
| `Bug #4195 <https://redmine.postgresql.org/issues/4195>`_ - Fix keyboard navigation in "inner" tabsets such as the Query Tool and Debugger.
| `Bug #4228 <https://redmine.postgresql.org/issues/4228>`_ - Ensure the correct label is used in panel headers when viewing filtered rows.
| `Bug #4253 <https://redmine.postgresql.org/issues/4253>`_ - Fix issue where new column should be created with Default value.
| `Bug #4283 <https://redmine.postgresql.org/issues/4283>`_ - Initial support for PostgreSQL 12.
| `Bug #4288 <https://redmine.postgresql.org/issues/4288>`_ - Initial support for PostgreSQL 12.
| `Bug #4290 <https://redmine.postgresql.org/issues/4290>`_ - Initial support for PostgreSQL 12.
| `Bug #4255 <https://redmine.postgresql.org/issues/4255>`_ - Prevent the geometry viewer grabbing key presses when not in focus under Firefox, IE and Edge.
| `Bug #4310 <https://redmine.postgresql.org/issues/4310>`_ - Ensure that the Return key can be used to submit the Master Password dialogue.
| `Bug #4317 <https://redmine.postgresql.org/issues/4317>`_ - Ensure that browser auto-fill doesn't cause Help pages to be opened unexpectedly.
| `Bug #4320 <https://redmine.postgresql.org/issues/4320>`_ - Fix issue where SSH tunnel connection using password is failing, it's regression of Master Password.
| `Bug #4329 <https://redmine.postgresql.org/issues/4329>`_ - Fix an initialisation error when two functions with parameters are debugged in parallel.
| `Bug #4343 <https://redmine.postgresql.org/issues/4343>`_ - Fix issue where property dialog of column should open properly for EPAS v12.
| `Bug #4349 <https://redmine.postgresql.org/issues/4349>`_ - Ensure strings are properly encoded in the Query History.
| `Bug #4350 <https://redmine.postgresql.org/issues/4350>`_ - Ensure we include the CSRF token when uploading files.
| `Bug #4357 <https://redmine.postgresql.org/issues/4357>`_ - Fix connection restoration issue when pgAdmin server is restarted and the page is refreshed.
| `Bug #4365 <https://redmine.postgresql.org/issues/4365>`_ - Fix help links for backup globals and backup server.
