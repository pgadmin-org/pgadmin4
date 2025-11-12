************
Version 5.3
************

Release date: 2021-05-20

This release contains a number of bug fixes and new features since the release of pgAdmin4 5.2.

New features
************

| `Issue #5954 <https://redmine.postgresql.org/issues/5954>`_ -  Added support to set auto width of columns by content size in the data output window.
| `Issue #6158 <https://redmine.postgresql.org/issues/6158>`_ -  Added support to connect PostgreSQL servers via Kerberos authentication.
| `Issue #6397 <https://redmine.postgresql.org/issues/6397>`_ -  Added "IF NOT EXISTS" clause while creating tables and partition tables which is convenient while using the ERD tool.

Housekeeping
************


Bug fixes
*********

| `Issue #4436 <https://redmine.postgresql.org/issues/4436>`_ -  Fixed an issue where drag and drop object is not correct in codemirror for properties dialog.
| `Issue #5477 <https://redmine.postgresql.org/issues/5477>`_ -  Added support for cache bust webpack chunk files.
| `Issue #5555 <https://redmine.postgresql.org/issues/5555>`_ -  Fixed an issue where data is displayed in the wrong order when executing the query repeatedly.
| `Issue #5776 <https://redmine.postgresql.org/issues/5776>`_ -  Ensure that while connecting to the server using SSPI login, it should not prompt for the password.
| `Issue #6329 <https://redmine.postgresql.org/issues/6329>`_ -  Fixed an issue where the wrong SQL is showing for the child partition tables.
| `Issue #6341 <https://redmine.postgresql.org/issues/6341>`_ -  Fixed an issue where CSV download quotes the numeric columns.
| `Issue #6355 <https://redmine.postgresql.org/issues/6355>`_ -  Ensure that pgAdmin should not allow opening external files that are dragged into it.
| `Issue #6377 <https://redmine.postgresql.org/issues/6377>`_ -  Fixed an issue where schema diff does not create DROP DEFAULT statement for columns.
| `Issue #6385 <https://redmine.postgresql.org/issues/6385>`_ -  Ensure that Backup and Restore should work on shared servers.
| `Issue #6392 <https://redmine.postgresql.org/issues/6392>`_ -  Fixed an issue where the filter 'Include/Exclude By Selection' not working for null values.
| `Issue #6399 <https://redmine.postgresql.org/issues/6399>`_ -  Ensure that the user should not be able to add duplicate panels.
| `Issue #6407 <https://redmine.postgresql.org/issues/6407>`_ -  Added support for the creation of Nested Table and Varying Array Type for Advanced Server.
| `Issue #6408 <https://redmine.postgresql.org/issues/6408>`_ -  Fixed ModuleNotFoundError when running setup.py from outside of the root.
| `Issue #6409 <https://redmine.postgresql.org/issues/6409>`_ -  Fixed an issue where the current debug line is not visible in the 'Dark' theme.
| `Issue #6413 <https://redmine.postgresql.org/issues/6413>`_ -  Fixed an issue where duplicate columns are visible in the browser tree, which is owned by two sequences.
| `Issue #6414 <https://redmine.postgresql.org/issues/6414>`_ -  Fixed an issue where the Help message not displaying correctly on Login/Group role.
| `Issue #6416 <https://redmine.postgresql.org/issues/6416>`_ -  Added comment column in the properties panel for View and Materialized View collection node.
| `Issue #6417 <https://redmine.postgresql.org/issues/6417>`_ -  Fixed an issue where query editor is not being closed if the user clicks on the 'Don't Save' button.
| `Issue #6420 <https://redmine.postgresql.org/issues/6420>`_ -  Ensure that pgAdmin4 shut down completely on the Quit command.
| `Issue #6443 <https://redmine.postgresql.org/issues/6443>`_ -  Fixed an issue where file dialog showing incorrect files for the selected file types.
| `Issue #6444 <https://redmine.postgresql.org/issues/6444>`_ -  Fixed an issue where the user is not warned if Kerberos ticket expiration is less than 30 min while initiating a global backup.
| `Issue #6445 <https://redmine.postgresql.org/issues/6445>`_ -  Ensure that proper identification should be there when the server is connected using Kerberos or without Kerberos.
