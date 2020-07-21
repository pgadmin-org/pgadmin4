************
Version 4.24
************

Release date: 2020-07-23

This release contains a number of bug fixes and new features since the release of pgAdmin4 4.23.

New features
************

| `Issue #5235 <https://redmine.postgresql.org/issues/5235>`_ -  Support configuration files that are external to the application installation.
| `Issue #5484 <https://redmine.postgresql.org/issues/5484>`_ -  Added support for LDAP authentication with different DN by setting the dedicated user for the LDAP connection.
| `Issue #5583 <https://redmine.postgresql.org/issues/5583>`_ -  Added support for schema level restriction.
| `Issue #5601 <https://redmine.postgresql.org/issues/5601>`_ -  Added RLS Policy support in Schema Diff.
| `Issue #5622 <https://redmine.postgresql.org/issues/5622>`_ -  Added support for permissive/restricted policy type while creating RLS Policy.
| `Issue #5650 <https://redmine.postgresql.org/issues/5650>`_ -  Added support for LDAP anonymous binding.
| `Issue #5653 <https://redmine.postgresql.org/issues/5653>`_ -  Added High Contrast theme support.

Housekeeping
************

| `Issue #5323 <https://redmine.postgresql.org/issues/5323>`_ -  Improve code coverage and API test cases for Foreign Data Wrapper.
| `Issue #5326 <https://redmine.postgresql.org/issues/5326>`_ -  Improve code coverage and API test cases for Domain and Domain Constraints.
| `Issue #5329 <https://redmine.postgresql.org/issues/5329>`_ -  Improve code coverage and API test cases for FTS Configuration, FTS Parser, FTS Dictionaries, and FTS Template.

Bug fixes
*********

| `Issue #3814 <https://redmine.postgresql.org/issues/3814>`_ -  Fixed issue of error message not getting displayed when filename is empty for backup, restore, and import/export.
| `Issue #3851 <https://redmine.postgresql.org/issues/3851>`_ -  Add proper indentation to the code while generating functions, procedures, and trigger functions.
| `Issue #4235 <https://redmine.postgresql.org/issues/4235>`_ -  Fixed tab indent issue on a selection of lines is deleting the content when 'use spaces == true' in the preferences.
| `Issue #5137 <https://redmine.postgresql.org/issues/5137>`_ -  Fixed save button enable issue when focusing in and out of numeric input field.
| `Issue #5287 <https://redmine.postgresql.org/issues/5287>`_ -  Fixed dark theme-related CSS and modify the color codes.
| `Issue #5414 <https://redmine.postgresql.org/issues/5414>`_ -  Use QStandardPaths::AppLocalDataLocation in the runtime to determine where to store runtime logs.
| `Issue #5463 <https://redmine.postgresql.org/issues/5463>`_ -  Fixed an issue where CSV download quotes numeric columns.
| `Issue #5470 <https://redmine.postgresql.org/issues/5470>`_ -  Fixed backgrid row hover issue where on hover background color is set for edit and delete cell only.
| `Issue #5530 <https://redmine.postgresql.org/issues/5530>`_ -  Ensure that the referenced table should be displayed on foreign key constraints.
| `Issue #5554 <https://redmine.postgresql.org/issues/5554>`_ -  Replace the runtime themes with ones that don't have sizing issues.
| `Issue #5569 <https://redmine.postgresql.org/issues/5569>`_ -  Fixed reverse engineered SQL for partitions when storage parameters are specified.
| `Issue #5577 <https://redmine.postgresql.org/issues/5577>`_ -  Include LICENSE and DEPENDENCIES [inventory] files in official packages.
| `Issue #5621 <https://redmine.postgresql.org/issues/5621>`_ -  Remove extra brackets from reverse engineering SQL of RLS Policy.
| `Issue #5629 <https://redmine.postgresql.org/issues/5629>`_ -  Fixed an issue where the user is able to edit properties when some of the collection nodes are selected.
| `Issue #5630 <https://redmine.postgresql.org/issues/5630>`_ -  Fixed an issue where installation of pgadmin4 not working on 32-bit Windows.
| `Issue #5631 <https://redmine.postgresql.org/issues/5631>`_ -  Fixed 'cant execute empty query' issue when remove the value of 'USING' or 'WITH CHECK' option of RLS Policy.
| `Issue #5633 <https://redmine.postgresql.org/issues/5633>`_ -  Ensure that create RLS Policy menu should not be visible for catalog objects.
| `Issue #5647 <https://redmine.postgresql.org/issues/5647>`_ -  Fixed an issue where difference DDL is showing the wrong SQL when changing the policy owner.
| `Issue #5662 <https://redmine.postgresql.org/issues/5662>`_ -  Fixed accessibility issue where few dialogs are not rendering properly when we zoomed in browser window 200% and screen resolution is low.
| `Issue #5666 <https://redmine.postgresql.org/issues/5666>`_ -  Added missing dependencies/dependent and corrected some wrongly identified.
| `Issue #5673 <https://redmine.postgresql.org/issues/5673>`_ -  Fixed an issue where fetching the schema throws an error if the database is not connected in Schema Diff.
| `Issue #5675 <https://redmine.postgresql.org/issues/5675>`_ -  Fixed CSRF errors when pgAdmin opened in an iframe on safari browser.
| `Issue #5677 <https://redmine.postgresql.org/issues/5677>`_ -  Fixed text color issue in explain analyze for the Dark theme.
| `Issue #5686 <https://redmine.postgresql.org/issues/5686>`_ -  Fixed issue where the user was not able to update policy if the policy is created with space.