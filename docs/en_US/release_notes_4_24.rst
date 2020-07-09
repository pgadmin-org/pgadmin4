************
Version 4.24
************

Release date: 2020-07-23

This release contains a number of bug fixes and new features since the release of pgAdmin4 4.23.

New features
************

| `Issue #5484 <https://redmine.postgresql.org/issues/5484>`_ -  Added support for LDAP authentication with different DN by setting the dedicated user for the LDAP connection.
| `Issue #5583 <https://redmine.postgresql.org/issues/5583>`_ -  Added support for schema level restriction.
| `Issue #5601 <https://redmine.postgresql.org/issues/5601>`_ -  Added RLS Policy support in Schema Diff.
| `Issue #5622 <https://redmine.postgresql.org/issues/5622>`_ -  Added support for permissive/restricted policy type while creating RLS Policy.

Housekeeping
************

| `Issue #5326 <https://redmine.postgresql.org/issues/5326>`_ -  Improve code coverage and API test cases for Domain and Domain Constraints.

Bug fixes
*********

| `Issue #3814 <https://redmine.postgresql.org/issues/3814>`_ -  Fixed issue of error message not getting displayed when filename is empty for backup, restore, and import/export.
| `Issue #3851 <https://redmine.postgresql.org/issues/3851>`_ -  Add proper indentation to the code while generating functions, procedures, and trigger functions.
| `Issue #4235 <https://redmine.postgresql.org/issues/4235>`_ -  Fixed tab indent issue on a selection of lines is deleting the content when 'use spaces == true' in the preferences.
| `Issue #5287 <https://redmine.postgresql.org/issues/5287>`_ -  Fixed dark theme-related CSS and modify the color codes.
| `Issue #5470 <https://redmine.postgresql.org/issues/5470>`_ -  Fixed backgrid row hover issue where on hover background color is set for edit and delete cell only.
| `Issue #5530 <https://redmine.postgresql.org/issues/5530>`_ -  Ensure that the referenced table should be displayed on foreign key constraints.
| `Issue #5621 <https://redmine.postgresql.org/issues/5621>`_ -  Remove extra brackets from reverse engineering SQL of RLS Policy.
| `Issue #5629 <https://redmine.postgresql.org/issues/5629>`_ -  Fixed an issue where the user is able to edit properties when some of the collection nodes are selected.
| `Issue #5630 <https://redmine.postgresql.org/issues/5630>`_ -  Fixed an issue where installation of pgadmin4 not working on 32-bit Windows.
| `Issue #5631 <https://redmine.postgresql.org/issues/5631>`_ -  Fixed 'cant execute empty query' issue when remove the value of 'USING' or 'WITH CHECK' option of RLS Policy.
| `Issue #5633 <https://redmine.postgresql.org/issues/5633>`_ -  Ensure that create RLS Policy menu should not be visible for catalog objects.