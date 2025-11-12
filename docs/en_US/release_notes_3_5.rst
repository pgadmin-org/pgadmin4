***********
Version 3.5
***********

Release date: 2018-11-01

This release contains a number of features and fixes reported since the release
of pgAdmin4 3.4


Features
********

| `Issue #1253 <https://redmine.postgresql.org/issues/1253>`_ - Save the treeview state periodically, and restore it automatically when reconnecting.
| `Issue #3562 <https://redmine.postgresql.org/issues/3562>`_ - Migrate from Bootstrap 3 to Bootstrap 4.


Bug fixes
*********

| `Issue #3232 <https://redmine.postgresql.org/issues/3232>`_ - Ensure that Utilities(Backup/Restore/Maintenence/Import-Export) should not be started if binary path is wrong and also added 'Stop Process' button to cancel the process.
| `Issue #3638 <https://redmine.postgresql.org/issues/3638>`_ - Fix syntax error when creating new pgAgent schedules with a start date/time and exception.
| `Issue #3674 <https://redmine.postgresql.org/issues/3674>`_ - Cleanup session files periodically.
| `Issue #3660 <https://redmine.postgresql.org/issues/3660>`_ - Rename the 'SQL Editor' section of the Preferences to 'Query Tool' as it applies to the whole tool, not just the editor.
| `Issue #3676 <https://redmine.postgresql.org/issues/3676>`_ - Fix CREATE Script functionality for EDB-Wrapped functions.
| `Issue #3700 <https://redmine.postgresql.org/issues/3700>`_ - Fix connection garbage collector.
| `Issue #3703 <https://redmine.postgresql.org/issues/3703>`_ - Purge connections from the cache on logout.
| `Issue #3722 <https://redmine.postgresql.org/issues/3722>`_ - Ensure that utility existence check should work for schema and other child objects while taking Backup/Restore.
| `Issue #3730 <https://redmine.postgresql.org/issues/3730>`_ - Fixed fatal error while launching the pgAdmin4 3.5. Update the version of the Flask to 0.12.4 for release.