************
Version 4.21
************

Release date: 2020-04-30

This release contains a number of bug fixes and new features since the release of pgAdmin4 4.20.

New features
************

| `Issue #2172 <https://redmine.postgresql.org/issues/2172>`_ -  Added search object functionality.
| `Issue #2186 <https://redmine.postgresql.org/issues/2186>`_ -  Added LDAP authentication support.
| `Issue #5181 <https://redmine.postgresql.org/issues/5181>`_ -  Added support for parameter toast_tuple_target and parallel_workers of the table.
| `Issue #5263 <https://redmine.postgresql.org/issues/5263>`_ -  Added support of Foreign Tables to the Schema Diff.
| `Issue #5264 <https://redmine.postgresql.org/issues/5264>`_ -  Added support of Packages, Sequences and Synonyms to the Schema Diff.
| `Issue #5353 <https://redmine.postgresql.org/issues/5353>`_ -  Added an option to prevent a browser tab being opened at startup.
| `Issue #5399 <https://redmine.postgresql.org/issues/5399>`_ -  Warn the user if an unsupported, deprecated or unknown browser is detected.

Housekeeping
************

| `Issue #4620 <https://redmine.postgresql.org/issues/4620>`_ -  Add Reverse Engineered and Modified SQL tests for procedures.

Bug fixes
*********

| `Issue #2813 <https://redmine.postgresql.org/issues/2813>`_ -  Ensure that the password prompt should not be visible if the database server is in trust authentication mode.
| `Issue #3523 <https://redmine.postgresql.org/issues/3523>`_ -  Fixed an issue where right-clicking a browser object does not apply to the object on which right-click was fired.
| `Issue #3645 <https://redmine.postgresql.org/issues/3645>`_ -  Ensure that the start and end date should be deleted when clear the selection for pgAgent Job.
| `Issue #3972 <https://redmine.postgresql.org/issues/3972>`_ -  Modified keyboard shortcuts in Query Tool for OSX native support.
| `Issue #3988 <https://redmine.postgresql.org/issues/3988>`_ -  Fixed cursor disappeared issue in the query editor for some of the characters when zoomed out.
| `Issue #4206 <https://redmine.postgresql.org/issues/4206>`_ -  Ensure that the grant wizard should be closed on pressing the ESC key.
| `Issue #4292 <https://redmine.postgresql.org/issues/4292>`_ -  Added dark mode support for the configuration dialog on Windows/macOS runtime.
| `Issue #4445 <https://redmine.postgresql.org/issues/4445>`_ -  Ensure all object names in the title line of the reverse-engineered SQL are not quoted.
| `Issue #4512 <https://redmine.postgresql.org/issues/4512>`_ -  Fixed calendar opening issue on the exception tab inside the schedules tab of pgAgent.
| `Issue #4856 <https://redmine.postgresql.org/issues/4856>`_ -  Enable the save button by default when a query tool is opened with CREATE or other scripts.
| `Issue #4858 <https://redmine.postgresql.org/issues/4858>`_ -  Fixed python exception error when user tries to download the CSV and there is a connection issue.
| `Issue #4864 <https://redmine.postgresql.org/issues/4864>`_ -  Make the configuration window in runtime to auto-resize.
| `Issue #4873 <https://redmine.postgresql.org/issues/4873>`_ -  Fixed an issue when changing the comments of the procedure with arguments gives error in case of overloading.
| `Issue #4969 <https://redmine.postgresql.org/issues/4969>`_ -  Fixed an issue where changing the values of columns with JSONB or JSON types to NULL.
| `Issue #5007 <https://redmine.postgresql.org/issues/5007>`_ -  Ensure index dropdown should have existing indexes while creating unique constraints.
| `Issue #5053 <https://redmine.postgresql.org/issues/5053>`_ -  Fixed an issue where changing the columns in the existing view throws an error.
| `Issue #5180 <https://redmine.postgresql.org/issues/5180>`_ -  Fixed an issue where the autovacuum_enabled parameter is added automatically in the RE-SQL when the table has been created using the WITH clause.
| `Issue #5227 <https://redmine.postgresql.org/issues/5227>`_ -  Fixed an issue where user cannot be added if many users are already exists.
| `Issue #5268 <https://redmine.postgresql.org/issues/5268>`_ -  Fixed generated SQL when any token in FTS Configuration or any option in FTS Dictionary is changed.
| `Issue #5270 <https://redmine.postgresql.org/issues/5270>`_ -  Ensure that OID should be shown in properties for Synonyms.
| `Issue #5275 <https://redmine.postgresql.org/issues/5275>`_ -  Fixed tab key navigation issue for parameters in table dialog.
| `Issue #5302 <https://redmine.postgresql.org/issues/5302>`_ -  Fixed an issue where difference SQL is not seen in the schema diff tool for Types.
| `Issue #5314 <https://redmine.postgresql.org/issues/5314>`_ -  Ensure that switch cell is in sync with switch control for accessibility.
| `Issue #5351 <https://redmine.postgresql.org/issues/5351>`_ -  Fixed compilation warnings while building pgAdmin.
| `Issue #5361 <https://redmine.postgresql.org/issues/5361>`_ -  Fixes an issue where pgAdmin4 GUI does not display properly in IE 11.
| `Issue #5362 <https://redmine.postgresql.org/issues/5362>`_ -  Fixed an issue where the identical packages and sequences visible as different in the schema diff tool.
| `Issue #5366 <https://redmine.postgresql.org/issues/5366>`_ -  Added alert message to Reset Layout if any of the panels from Query Tool failed to load.
| `Issue #5371 <https://redmine.postgresql.org/issues/5371>`_ -  Fixed tab key navigation for some dialogs.
| `Issue #5383 <https://redmine.postgresql.org/issues/5383>`_ -  Fixed syntax error while refreshing the existing synonyms.
| `Issue #5387 <https://redmine.postgresql.org/issues/5387>`_ -  Fixed an issue where the mode is not shown in the properties dialog of functions/procedures if all the arguments are "IN" arguments.