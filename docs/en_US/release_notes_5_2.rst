************
Version 5.2
************

Release date: 2021-04-22

This release contains a number of bug fixes and new features since the release of pgAdmin4 5.1.

New features
************


Housekeeping
************

| `Issue #5319 <https://redmine.postgresql.org/issues/5319>`_ -  Improve code coverage and API test cases for Server module.

Bug fixes
*********

| `Issue #4001 <https://redmine.postgresql.org/issues/4001>`_ -  Updated docs and screenshots to cover the Notifications tab on the Query Tool.
| `Issue #5519 <https://redmine.postgresql.org/issues/5519>`_ -  Ensure that the query tool tab should be closed after server disconnection when auto-commit/auto-rollback is set to false.
| `Issue #5908 <https://redmine.postgresql.org/issues/5908>`_ -  Fixed an issue where shortcut keys are not working with manage macro.
| `Issue #6076 <https://redmine.postgresql.org/issues/6076>`_ -  Fixed an issue where correct error not thrown while importing servers and JSON file has incorrect/insufficient keys.
| `Issue #6082 <https://redmine.postgresql.org/issues/6082>`_ -  Ensure that the user should not be to change the connection when a long query is running.
| `Issue #6107 <https://redmine.postgresql.org/issues/6107>`_ -  Fixed flickering issue of the input box on check constraints.
| `Issue #6161 <https://redmine.postgresql.org/issues/6161>`_ -  Fixed an issue where the cursor shifts its focus to the wrong window for all the query tool related model dialogs.
| `Issue #6220 <https://redmine.postgresql.org/issues/6220>`_ -  Corrected the syntax for 'CREATE TRIGGER', use 'EXECUTE FUNCTION' instead of 'EXECUTE PROCEDURE' from v11 onwards.
| `Issue #6274 <https://redmine.postgresql.org/issues/6274>`_ -  Ensure that the strings in the LDAP auth module are translatable.
| `Issue #6293 <https://redmine.postgresql.org/issues/6293>`_ -  Fixed an issue where the procedure creation is failed when providing the Volatility option.
| `Issue #6306 <https://redmine.postgresql.org/issues/6306>`_ -  Fixed an issue while selecting the row which was deleted just before the selection operation.
| `Issue #6325 <https://redmine.postgresql.org/issues/6325>`_ -  Ensure that the file format for the storage manager should be 'All files' and for other dialogs, it should remember the last selected format.
| `Issue #6327 <https://redmine.postgresql.org/issues/6327>`_ -  Ensure that while comparing domains check function dependencies should be considered in schema diff.
| `Issue #6333 <https://redmine.postgresql.org/issues/6333>`_ -  Fixed sizing issue of help dialog for Query Tool and ERD Tool when open in the new browser tab.
| `Issue #6334 <https://redmine.postgresql.org/issues/6334>`_ -  Fixed SQL panel black screen issue when detaching it in runtime.
| `Issue #6338 <https://redmine.postgresql.org/issues/6338>`_ -  Added missing dependency 'xdg-utils' for the desktop packages in RPM and Debian.
| `Issue #6344 <https://redmine.postgresql.org/issues/6344>`_ -  Fixed cannot unpack non-iterable response object error when selecting any partition.
| `Issue #6356 <https://redmine.postgresql.org/issues/6356>`_ -  Mark the Apache HTTPD config file as such in the web DEB and RPM packages.
| `Issue #6367 <https://redmine.postgresql.org/issues/6367>`_ -  Fixed an issue where the Save button is enabled by default when open the table's properties dialog on PG 9.5.
| `Issue #6375 <https://redmine.postgresql.org/issues/6375>`_ -  Fixed an issue where users are unable to see data of the partitions using the View/Edit data option.
| `Issue #6376 <https://redmine.postgresql.org/issues/6376>`_ -  Fixed an issue where a connection warning should be displayed on the user clicks on explain or explain analyze and the database server is disconnected from the browser tree.
| `Issue #6379 <https://redmine.postgresql.org/issues/6379>`_ -  Fixed an issue where foreign data wrapper properties are not visible if the host option contains two host addresses.
