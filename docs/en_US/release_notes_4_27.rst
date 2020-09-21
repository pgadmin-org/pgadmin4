************
Version 4.27
************

Release date: 2020-10-15

This release contains a number of bug fixes and new features since the release of pgAdmin4 4.26.

New features
************


Housekeeping
************


Bug fixes
*********

| `Issue #5417 <https://redmine.postgresql.org/issues/5417>`_ -  Fixed and improve API test cases for the schema diff tool.
| `Issue #5802 <https://redmine.postgresql.org/issues/5802>`_ -  Remove maximum length on the password field in the server dialog.
| `Issue #5807 <https://redmine.postgresql.org/issues/5807>`_ -  Fixed an issue where a column is renamed and then removed, then the drop SQL query takes the wrong column name.
| `Issue #5830 <https://redmine.postgresql.org/issues/5830>`_ -  Fixed reverse engineering SQL where parenthesis is not properly arranged for View/MView definition.
| `Issue #5839 <https://redmine.postgresql.org/issues/5839>`_ -  Ensure that multiple extensions can be dropped from the properties tab.