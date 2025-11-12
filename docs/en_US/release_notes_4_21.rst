************
Version 4.21
************

Release date: 2020-04-30

This release contains a number of bug fixes and new features since the release of pgAdmin4 4.20.

New features
************

| `Issue #2172 <https://redmine.postgresql.org/issues/2172>`_ -  Added search object functionality.
| `Issue #2186 <https://redmine.postgresql.org/issues/2186>`_ -  Added LDAP authentication support.
| `Issue #4636 <https://redmine.postgresql.org/issues/4636>`_ -  Added job step and job schedule disable icons to identify it quickly within the browser tree.
| `Issue #5181 <https://redmine.postgresql.org/issues/5181>`_ -  Added support for parameter toast_tuple_target and parallel_workers of the table.
| `Issue #5263 <https://redmine.postgresql.org/issues/5263>`_ -  Added support of Foreign Tables to the Schema Diff.
| `Issue #5264 <https://redmine.postgresql.org/issues/5264>`_ -  Added support of Packages, Sequences and Synonyms to the Schema Diff.
| `Issue #5348 <https://redmine.postgresql.org/issues/5348>`_ -  Documentation of LDAP authentication support.
| `Issue #5353 <https://redmine.postgresql.org/issues/5353>`_ -  Added an option to prevent a browser tab being opened at startup.
| `Issue #5399 <https://redmine.postgresql.org/issues/5399>`_ -  Warn the user if an unsupported, deprecated or unknown browser is detected.

Housekeeping
************

| `Issue #4620 <https://redmine.postgresql.org/issues/4620>`_ -  Add Reverse Engineered and Modified SQL tests for procedures.
| `Issue #4623 <https://redmine.postgresql.org/issues/4623>`_ -  Add Reverse Engineered and Modified SQL tests for pgAgent jobs.

Bug fixes
*********

| `Issue #1257 <https://redmine.postgresql.org/issues/1257>`_ -  Ensure all object types have a "System XXX?" property.
| `Issue #2813 <https://redmine.postgresql.org/issues/2813>`_ -  Ensure that the password prompt should not be visible if the database server is in trust authentication mode.
| `Issue #3495 <https://redmine.postgresql.org/issues/3495>`_ -  Fixed an issue where the query tool unable to load the file which contains the BOM marker.
| `Issue #3523 <https://redmine.postgresql.org/issues/3523>`_ -  Fixed an issue where right-clicking a browser object does not apply to the object on which right-click was fired.
| `Issue #3645 <https://redmine.postgresql.org/issues/3645>`_ -  Ensure that the start and end date should be deleted when clear the selection for pgAgent Job.
| `Issue #3900 <https://redmine.postgresql.org/issues/3900>`_ -  Added multiple drop/delete functionality for the table constraints.
| `Issue #3947 <https://redmine.postgresql.org/issues/3947>`_ -  Fixed copy-paste row issues in View/Edit Data.
| `Issue #3972 <https://redmine.postgresql.org/issues/3972>`_ -  Modified keyboard shortcuts in Query Tool for OSX native support.
| `Issue #3988 <https://redmine.postgresql.org/issues/3988>`_ -  Fixed cursor disappeared issue in the query editor for some of the characters when zoomed out.
| `Issue #4180 <https://redmine.postgresql.org/issues/4180>`_ -  Fixed mouse click issue where it does not select an object in Browser unless the pointer is over the object.
| `Issue #4206 <https://redmine.postgresql.org/issues/4206>`_ -  Ensure that the grant wizard should be closed on pressing the ESC key.
| `Issue #4292 <https://redmine.postgresql.org/issues/4292>`_ -  Added dark mode support for the configuration dialog on Windows/macOS runtime.
| `Issue #4440 <https://redmine.postgresql.org/issues/4440>`_ -  Ensure the DROP statements in reverse engineered SQL are properly quoted for all objects.
| `Issue #4445 <https://redmine.postgresql.org/issues/4445>`_ -  Ensure all object names in the title line of the reverse-engineered SQL are not quoted.
| `Issue #4504 <https://redmine.postgresql.org/issues/4504>`_ -  Fixed an issue where like options should be disabled if the relation is not selected while creating a table.
| `Issue #4512 <https://redmine.postgresql.org/issues/4512>`_ -  Fixed calendar opening issue on the exception tab inside the schedules tab of pgAgent.
| `Issue #4545 <https://redmine.postgresql.org/issues/4545>`_ -  Fixed an issue wherein grant wizard the last object is not selectable.
| `Issue #4573 <https://redmine.postgresql.org/issues/4573>`_ -  Ensure that if the delimiter is set other than comma then download the file as '.txt' file.
| `Issue #4684 <https://redmine.postgresql.org/issues/4684>`_ -  Fixed encoding issue while saving data in encoded charset other than 'utf-8'.
| `Issue #4709 <https://redmine.postgresql.org/issues/4709>`_ -  Added schema-qualified dictionary names in FTS configuration to avoid confusion of duplicate names.
| `Issue #4856 <https://redmine.postgresql.org/issues/4856>`_ -  Enable the save button by default when a query tool is opened with CREATE or other scripts.
| `Issue #4858 <https://redmine.postgresql.org/issues/4858>`_ -  Fixed python exception error when user tries to download the CSV and there is a connection issue.
| `Issue #4864 <https://redmine.postgresql.org/issues/4864>`_ -  Make the configuration window in runtime to auto-resize.
| `Issue #4873 <https://redmine.postgresql.org/issues/4873>`_ -  Fixed an issue when changing the comments of the procedure with arguments gives error in case of overloading.
| `Issue #4946 <https://redmine.postgresql.org/issues/4946>`_ -  Fixed an issue when the user creates a temporary table with 'on commit drop as' clause.
| `Issue #4957 <https://redmine.postgresql.org/issues/4957>`_ -  Ensure that Constraint Trigger, Deferrable, Deferred option should be disabled when the user selects EDB-SPL function for the trigger.
| `Issue #4969 <https://redmine.postgresql.org/issues/4969>`_ -  Fixed an issue where changing the values of columns with JSONB or JSON types to NULL.
| `Issue #5007 <https://redmine.postgresql.org/issues/5007>`_ -  Ensure index dropdown should have existing indexes while creating unique constraints.
| `Issue #5043 <https://redmine.postgresql.org/issues/5043>`_ -  Fixed an issue where columns names should be visible in the order of their creation in the browser tree.
| `Issue #5053 <https://redmine.postgresql.org/issues/5053>`_ -  Fixed an issue where changing the columns in the existing view throws an error.
| `Issue #5157 <https://redmine.postgresql.org/issues/5157>`_ -  Ensure that default sort order should be using the primary key in View/Edit data.
| `Issue #5180 <https://redmine.postgresql.org/issues/5180>`_ -  Fixed an issue where the autovacuum_enabled parameter is added automatically in the RE-SQL when the table has been created using the WITH clause.
| `Issue #5210 <https://redmine.postgresql.org/issues/5210>`_ -  Ensure that text larger than underlying field size should not be truncated automatically.
| `Issue #5213 <https://redmine.postgresql.org/issues/5213>`_ -  Fixed an issue when the user performs refresh on a large size materialized view.
| `Issue #5227 <https://redmine.postgresql.org/issues/5227>`_ -  Fixed an issue where user cannot be added if many users are already exists.
| `Issue #5268 <https://redmine.postgresql.org/issues/5268>`_ -  Fixed generated SQL when any token in FTS Configuration or any option in FTS Dictionary is changed.
| `Issue #5270 <https://redmine.postgresql.org/issues/5270>`_ -  Ensure that OID should be shown in properties for Synonyms.
| `Issue #5275 <https://redmine.postgresql.org/issues/5275>`_ -  Fixed tab key navigation issue for parameters in table dialog.
| `Issue #5302 <https://redmine.postgresql.org/issues/5302>`_ -  Fixed an issue where difference SQL is not seen in the schema diff tool for Types.
| `Issue #5314 <https://redmine.postgresql.org/issues/5314>`_ -  Ensure that switch cell is in sync with switch control for accessibility.
| `Issue #5315 <https://redmine.postgresql.org/issues/5315>`_ -  Fixed an issue where schema diff showing changes in the identical domain constraints.
| `Issue #5350 <https://redmine.postgresql.org/issues/5350>`_ -  Fixed an issue where schema diff marks an identical table as different.
| `Issue #5351 <https://redmine.postgresql.org/issues/5351>`_ -  Fixed compilation warnings while building pgAdmin.
| `Issue #5352 <https://redmine.postgresql.org/issues/5352>`_ -  Fixed the rightmost and bottom tooltip crop issues in the explain query plan.
| `Issue #5356 <https://redmine.postgresql.org/issues/5356>`_ -  Fixed modified SQL issue while adding an exception in pgAgent job schedule.
| `Issue #5361 <https://redmine.postgresql.org/issues/5361>`_ -  Fixes an issue where pgAdmin4 GUI does not display properly in IE 11.
| `Issue #5362 <https://redmine.postgresql.org/issues/5362>`_ -  Fixed an issue where the identical packages and sequences visible as different in the schema diff tool.
| `Issue #5366 <https://redmine.postgresql.org/issues/5366>`_ -  Added alert message to Reset Layout if any of the panels from Query Tool failed to load.
| `Issue #5371 <https://redmine.postgresql.org/issues/5371>`_ -  Fixed tab key navigation for some dialogs.
| `Issue #5375 <https://redmine.postgresql.org/issues/5375>`_ -  Fixed an issue where the Mode cell of argument grid does not appear completely in the Functions dialog.
| `Issue #5383 <https://redmine.postgresql.org/issues/5383>`_ -  Fixed syntax error while refreshing the existing synonyms.
| `Issue #5387 <https://redmine.postgresql.org/issues/5387>`_ -  Fixed an issue where the mode is not shown in the properties dialog of functions/procedures if all the arguments are "IN" arguments.
| `Issue #5396 <https://redmine.postgresql.org/issues/5396>`_ -  Fixed an issue where the search object module unable to locate the object in the browser tree.
| `Issue #5400 <https://redmine.postgresql.org/issues/5400>`_ -  Fixed internal server error when the database server is logged in with non-super user.
| `Issue #5401 <https://redmine.postgresql.org/issues/5401>`_ -  Fixed search object issue when the object name contains special characters.
| `Issue #5402 <https://redmine.postgresql.org/issues/5402>`_ -  Fixed an issue where the checkbox is not visible on Configuration dialog in runtime for the dark theme.
| `Issue #5409 <https://redmine.postgresql.org/issues/5409>`_ -  Fixed validation issue in Synonyms node.
| `Issue #5410 <https://redmine.postgresql.org/issues/5410>`_ -  Fixed an issue while removing the package body showing wrong modified SQL.
| `Issue #5415 <https://redmine.postgresql.org/issues/5415>`_ -  Ensure that the query tool context menu should work on the collection nodes.
| `Issue #5419 <https://redmine.postgresql.org/issues/5419>`_ -  Ensure that the user should not be able to change the authentication source.
| `Issue #5420 <https://redmine.postgresql.org/issues/5420>`_ -  Ensure error should be handled properly when LDAP user is created with the same name.
| `Issue #5430 <https://redmine.postgresql.org/issues/5430>`_ -  Added title to the login page.
| `Issue #5432 <https://redmine.postgresql.org/issues/5432>`_ -  Fixed an issue where an internal user is not created if the authentication source is set to internal and ldap.
| `Issue #5439 <https://redmine.postgresql.org/issues/5439>`_ -  Fixed an issue where the user is not able to create a server if login with an LDAP account.
| `Issue #5441 <https://redmine.postgresql.org/issues/5441>`_ -  Fixed an issue where the search object not able to locate pg_toast_* tables in the pg_toast schema.
| `Issue #5447 <https://redmine.postgresql.org/issues/5447>`_ -  Fixed failed to fetch utility error when click on refresh(any option) materialized view.