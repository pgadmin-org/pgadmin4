************
Version 4.28
************

Release date: 2020-11-12

This release contains a number of bug fixes and new features since the release of pgAdmin4 4.27.

New features
************

| `Issue #3318 <https://redmine.postgresql.org/issues/3318>`_ -  Added support to download utility files at the client-side.
| `Issue #4230 <https://redmine.postgresql.org/issues/4230>`_ -  Added support to rename query tool and debugger tabs title.
| `Issue #4231 <https://redmine.postgresql.org/issues/4231>`_ -  Added support for dynamic tab size.
| `Issue #4232 <https://redmine.postgresql.org/issues/4232>`_ -  Added tab title placeholder for Query Tool, View/Edit Data, and Debugger.
| `Issue #5891 <https://redmine.postgresql.org/issues/5891>`_ -  Added support to compare schemas and databases in schema diff.

Housekeeping
************

| `Issue #5938 <https://redmine.postgresql.org/issues/5938>`_ -  Documentation of Storage Manager.

Bug fixes
*********

| `Issue #4639 <https://redmine.postgresql.org/issues/4639>`_ -  Ensure that some fields should be disabled for the trigger in edit mode.
| `Issue #5736 <https://redmine.postgresql.org/issues/5736>`_ -  Fixed an issue where the validation error message is shown twice.
| `Issue #5760 <https://redmine.postgresql.org/issues/5760>`_ -  Ensure that non-superuser should be able to debug the function.
| `Issue #5842 <https://redmine.postgresql.org/issues/5842>`_ -  Ensure that query history should be listed by date/time in descending order.
| `Issue #5858 <https://redmine.postgresql.org/issues/5858>`_ -  Ensure that search object functionality works with case insensitive string.
| `Issue #5895 <https://redmine.postgresql.org/issues/5895>`_ -  Fixed an issue where the suffix for Toast table size is not visible in the Statistics tab.
| `Issue #5911 <https://redmine.postgresql.org/issues/5911>`_ -  Ensure that macros should be run on the older version of Safari and Chrome.
| `Issue #5914 <https://redmine.postgresql.org/issues/5914>`_ -  Fixed an issue where a mismatch in the value of 'Estimated row' for functions.
| `Issue #5919 <https://redmine.postgresql.org/issues/5919>`_ -  Added security related enhancements.
| `Issue #5923 <https://redmine.postgresql.org/issues/5923>`_ -  Fixed an issue where non-closeable tabs are getting closed.
| `Issue #5950 <https://redmine.postgresql.org/issues/5950>`_ -  Fixed an issue where a long file name is not visible on the process watcher dialog.
| `Issue #5953 <https://redmine.postgresql.org/issues/5953>`_ -  Fixed an issue where connection to the server is on wait state if a different user is provided.
| `Issue #5959 <https://redmine.postgresql.org/issues/5959>`_ -  Ensure that Grant Wizard should include foreign tables.
