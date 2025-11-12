************
Version 4.29
************

Release date: 2020-12-10

This release contains a number of bug fixes and new features since the release of pgAdmin4 4.28.

New features
************


Housekeeping
************

| `Issue #5328 <https://redmine.postgresql.org/issues/5328>`_ -  Improve code coverage and API test cases for Foreign Tables.
| `Issue #5337 <https://redmine.postgresql.org/issues/5337>`_ -  Improve code coverage and API test cases for Views and Materialized Views.
| `Issue #5343 <https://redmine.postgresql.org/issues/5343>`_ -  Improve code coverage and API test cases for Debugger.
| `Issue #6062 <https://redmine.postgresql.org/issues/6062>`_ -  Ensure that code coverage should cover class and function declarations.

Bug fixes
*********

| `Issue #5886 <https://redmine.postgresql.org/issues/5886>`_ -  Fixed false error is shown while adding a new foreign key from the table dialog when a foreign key already exists with Auto FK Index set to true.
| `Issue #5943 <https://redmine.postgresql.org/issues/5943>`_ -  Ensure that folder rename should work properly in Storage Manager.
| `Issue #5974 <https://redmine.postgresql.org/issues/5974>`_ -  Fixed an issue where the debugger's custom tab title not applied when opened in the new browser tab.
| `Issue #5978 <https://redmine.postgresql.org/issues/5978>`_ -  Fixed an issue where dynamic tab title has not applied the first time for debugger panel.
| `Issue #5982 <https://redmine.postgresql.org/issues/5982>`_ -  Fixed documentation issue where JSON is not valid.
| `Issue #5983 <https://redmine.postgresql.org/issues/5983>`_ -  Added the appropriate server icon based on the server type in the new connection dialog.
| `Issue #5985 <https://redmine.postgresql.org/issues/5985>`_ -  Fixed an issue where the process watcher dialog throws an error for the database server which is already removed.
| `Issue #5991 <https://redmine.postgresql.org/issues/5991>`_ -  Ensure that dirty indicator (*) should not be visible when renaming the tabs.
| `Issue #5992 <https://redmine.postgresql.org/issues/5992>`_ -  Fixed an issue where escape character is shown when the server/database name has some special characters.
| `Issue #5998 <https://redmine.postgresql.org/issues/5998>`_ -  Fixed an issue where schema diff doesn't show the result of compare if source schema has tables with RLS.
| `Issue #6003 <https://redmine.postgresql.org/issues/6003>`_ -  Fixed an issue where an illegal argument is showing for trigger SQL when a trigger is created for View.
| `Issue #6022 <https://redmine.postgresql.org/issues/6022>`_ -  Fixed an issue where shared servers import is failing.
| `Issue #6072 <https://redmine.postgresql.org/issues/6072>`_ -  Fixed DLL load failed while importing bcrypt.
