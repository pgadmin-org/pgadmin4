***********
Version 3.1
***********

Release date: 2018-??-??

This release contains a number of features and fixes reported since the release of pgAdmin4 3.0


Features
********

| `Bug #1447 <https://redmine.postgresql.org/issues/1447>`_ - Add support for SSH tunneled connections

Bug fixes
*********

| `Bug #1220 <https://redmine.postgresql.org/issues/1220>`_ - Backup and Restore should not be started if database name contains "=" symbol
| `Bug #1221 <https://redmine.postgresql.org/issues/1221>`_ - Maintenance should not be started if database name contains "=" symbol
| `Bug #3179 <https://redmine.postgresql.org/issues/3179>`_ - Fix an error generating SQL for trigger functions
| `Bug #3257 <https://redmine.postgresql.org/issues/3257>`_ - Catch errors when trying to EXPLAIN an invalid query
| `Bug #3284 <https://redmine.postgresql.org/issues/3284>`_ - F5 key should work to refresh Browser tree
| `Bug #3290 <https://redmine.postgresql.org/issues/3290>`_ - Close button added to the alertify message box, which pops up in case of backend error
| `Bug #3295 <https://redmine.postgresql.org/issues/3295>`_ - Ensure the debugger gets focus when loaded so shortcut keys work as expected
| `Bug #3298 <https://redmine.postgresql.org/issues/3298>`_ - Fixed query tool keyboard issue where arrow keys were not behaving as expected for execute options dropdown
| `Bug #3306 <https://redmine.postgresql.org/issues/3306>`_ - Fixed display SQL of table with index for Greenplum database
| `Bug #3308 <https://redmine.postgresql.org/issues/3308>`_ - Fixed issue where icon for Partitioned tables was the same as Non Partitioned tables for Greenplum database
| `Bug #3310 <https://redmine.postgresql.org/issues/3310>`_ - Fixed layout of the alertify error message in the query tool
| `Bug #3238 <https://redmine.postgresql.org/issues/3238>`_ - Standardise the error handling for parsing of JSON response messages from the server
| `Bug #3324 <https://redmine.postgresql.org/issues/3324>`_ - Fix the template loader to work reliably under Windows (fixing external tables under Greenplum)
| `Bug #3333 <https://redmine.postgresql.org/issues/3333>`_ - Ensure the runtime core application is setup before trying to access any settings
| `Bug #3342 <https://redmine.postgresql.org/issues/3342>`_ - Set SESSION_COOKIE_SAMESITE='Lax' per Flask recommendation to prevents sending cookies with CSRF-prone requests from external sites, such as submitting a form