************
Version 5.3
************

Release date: 2021-05-20

This release contains a number of bug fixes and new features since the release of pgAdmin4 5.2.

New features
************

| `Issue #6158 <https://redmine.postgresql.org/issues/6158>`_ -  Added support to connect PostgreSQL servers via Kerberos authentication.

Housekeeping
************


Bug fixes
*********

| `Issue #4436 <https://redmine.postgresql.org/issues/4436>`_ -  Fixed an issue where drag and drop object is not correct in codemirror for properties dialog.
| `Issue #5555 <https://redmine.postgresql.org/issues/5555>`_ -  Fixed an issue where data is displayed in the wrong order when executing the query repeatedly.
| `Issue #6329 <https://redmine.postgresql.org/issues/6329>`_ -  Fixed an issue where the wrong SQL is showing for the child partition tables.
| `Issue #6341 <https://redmine.postgresql.org/issues/6341>`_ -  Fixed an issue where CSV download quotes the numeric columns.
| `Issue #6355 <https://redmine.postgresql.org/issues/6355>`_ -  Ensure that pgAdmin should not allow opening external files that are dragged into it.
| `Issue #6377 <https://redmine.postgresql.org/issues/6377>`_ -  Fixed an issue where schema diff does not create DROP DEFAULT statement for columns.
| `Issue #6385 <https://redmine.postgresql.org/issues/6385>`_ -  Ensure that Backup and Restore should work on shared servers.
| `Issue #6408 <https://redmine.postgresql.org/issues/6408>`_ -  Fixed ModuleNotFoundError when running setup.py from outside of the root.
| `Issue #6413 <https://redmine.postgresql.org/issues/6413>`_ -  Fixed an issue where duplicate columns are visible in the browser tree, which is owned by two sequences.
| `Issue #6416 <https://redmine.postgresql.org/issues/6416>`_ -  Added comment column in the properties panel for View and Materialized View collection node.
| `Issue #6417 <https://redmine.postgresql.org/issues/6417>`_ -  Fixed an issue where query editor is not being closed if the user clicks on the 'Don't Save' button.
