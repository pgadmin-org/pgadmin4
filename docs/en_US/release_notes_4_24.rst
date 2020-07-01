************
Version 4.24
************

Release date: 2020-07-23

This release contains a number of bug fixes and new features since the release of pgAdmin4 4.23.

New features
************

| `Issue #5583 <https://redmine.postgresql.org/issues/5583>`_ -  Added support for schema level restriction.
| `Issue #5601 <https://redmine.postgresql.org/issues/5601>`_ -  Added RLS Policy support in Schema Diff.

Housekeeping
************

| `Issue #5326 <https://redmine.postgresql.org/issues/5326>`_ -  Improve code coverage and API test cases for Domain and Domain Constraints.

Bug fixes
*********

| `Issue #3851 <https://redmine.postgresql.org/issues/3851>`_ -  Add proper indentation to the code while generating functions, procedures, and trigger functions.
| `Issue #5621 <https://redmine.postgresql.org/issues/5621>`_ -  Remove extra brackets from reverse engineering SQL of RLS Policy.
| `Issue #5630 <https://redmine.postgresql.org/issues/5630>`_ -  Fixed an issue where installation of pgadmin4 not working on 32-bit Windows.
| `Issue #5631 <https://redmine.postgresql.org/issues/5631>`_ -  Fixed 'cant execute empty query' issue when remove the value of 'USING' or 'WITH CHECK' option of RLS Policy.