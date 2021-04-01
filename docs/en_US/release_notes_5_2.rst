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

| `Issue #5519 <https://redmine.postgresql.org/issues/5519>`_ -  Ensure that the query tool tab should be closed after server disconnection when auto-commit/auto-rollback is set to false.
| `Issue #6293 <https://redmine.postgresql.org/issues/6293>`_ -  Fixed an issue where the procedure creation is failed when providing the Volatility option.
| `Issue #6344 <https://redmine.postgresql.org/issues/6344>`_ -  Fixed cannot unpack non-iterable response object error when selecting any partition.
| `Issue #6356 <https://redmine.postgresql.org/issues/6356>`_ -  Mark the Apache HTTPD config file as such in the web DEB and RPM packages.
