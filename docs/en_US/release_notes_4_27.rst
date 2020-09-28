************
Version 4.27
************

Release date: 2020-10-15

This release contains a number of bug fixes and new features since the release of pgAdmin4 4.26.

New features
************

| `Issue #1402 <https://redmine.postgresql.org/issues/1402>`_ -  Added Macro support.
| `Issue #5200 <https://redmine.postgresql.org/issues/5200>`_ -  Added support to ignore the owner while comparing objects in the Schema Diff tool

Housekeeping
************

| `Issue #5330 <https://redmine.postgresql.org/issues/5330>`_ -  Improve code coverage and API test cases for Functions.

Bug fixes
*********

| `Issue #5417 <https://redmine.postgresql.org/issues/5417>`_ -  Fixed and improve API test cases for the schema diff tool.
| `Issue #5739 <https://redmine.postgresql.org/issues/5739>`_ -  Ensure that the import/export feature should work with SSH Tunnel.
| `Issue #5802 <https://redmine.postgresql.org/issues/5802>`_ -  Remove maximum length on the password field in the server dialog.
| `Issue #5807 <https://redmine.postgresql.org/issues/5807>`_ -  Fixed an issue where a column is renamed and then removed, then the drop SQL query takes the wrong column name.
| `Issue #5826 <https://redmine.postgresql.org/issues/5826>`_ -  Fixed an issue where schema diff is showing identical table as different due to default vacuum settings.
| `Issue #5830 <https://redmine.postgresql.org/issues/5830>`_ -  Fixed reverse engineering SQL where parenthesis is not properly arranged for View/MView definition.
| `Issue #5839 <https://redmine.postgresql.org/issues/5839>`_ -  Ensure that multiple extensions can be dropped from the properties tab.
| `Issue #5841 <https://redmine.postgresql.org/issues/5841>`_ -  Fixed an issue where the server is not able to connect using the service.
| `Issue #5843 <https://redmine.postgresql.org/issues/5843>`_ -  Fixed an issue where the 'PARALLEL UNSAFE' option is missing from reverse engineering SQL of function/procedure.
| `Issue #5845 <https://redmine.postgresql.org/issues/5845>`_ -  Fixed an issue where the query tool is not fetching more than 1000 rows for the table does not have any primary key.
| `Issue #5861 <https://redmine.postgresql.org/issues/5861>`_ -  Ensure that the 'Remove Server' option should be visible in the context menu.