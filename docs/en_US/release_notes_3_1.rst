***********
Version 3.1
***********

Release date: 2018-06-28

This release contains a number of features and fixes reported since the release of pgAdmin4 3.0


Features
********

| `Feature #1447 <https://redmine.postgresql.org/issues/1447>`_ - Add support for SSH tunneled connections
| `Feature #2686 <https://redmine.postgresql.org/issues/2686>`_ - Add an option to auto-complete keywords in upper case
| `Feature #3204 <https://redmine.postgresql.org/issues/3204>`_ - Add support for LISTEN/NOTIFY in the query tool
| `Feature #3273 <https://redmine.postgresql.org/issues/3273>`_ - Allow sorting in the file dialogue
| `Feature #3362 <https://redmine.postgresql.org/issues/3362>`_ - Function and procedure support for PG11
| `Feature #3388 <https://redmine.postgresql.org/issues/3388>`_ - Allow the connection timeout to be configured on a per-server basis

Bug fixes
*********

| `Bug #1220 <https://redmine.postgresql.org/issues/1220>`_ - Backup and Restore should not be started if database name contains "=" symbol
| `Bug #1221 <https://redmine.postgresql.org/issues/1221>`_ - Maintenance should not be started if database name contains "=" symbol
| `Bug #3179 <https://redmine.postgresql.org/issues/3179>`_ - Fix an error generating SQL for trigger functions
| `Bug #3238 <https://redmine.postgresql.org/issues/3238>`_ - Standardise the error handling for parsing of JSON response messages from the server
| `Bug #3250 <https://redmine.postgresql.org/issues/3250>`_ - Fix handling of SQL_ASCII data in the Query Tool
| `Bug #3257 <https://redmine.postgresql.org/issues/3257>`_ - Catch errors when trying to EXPLAIN an invalid query
| `Bug #3277 <https://redmine.postgresql.org/issues/3277>`_ - Ensure server cleanup on exit only happens if the server actually started up
| `Bug #3284 <https://redmine.postgresql.org/issues/3284>`_ - F5 key should work to refresh Browser tree
| `Bug #3289 <https://redmine.postgresql.org/issues/3289>`_ - Fix handling of SQL_ASCII data in the Query Tool
| `Bug #3290 <https://redmine.postgresql.org/issues/3290>`_ - Close button added to the alertify message box, which pops up in case of backend error
| `Bug #3295 <https://redmine.postgresql.org/issues/3295>`_ - Ensure the debugger gets focus when loaded so shortcut keys work as expected
| `Bug #3298 <https://redmine.postgresql.org/issues/3298>`_ - Fixed query tool keyboard issue where arrow keys were not behaving as expected for execute options dropdown
| `Bug #3303 <https://redmine.postgresql.org/issues/3303>`_ - Fix a Japanese translation error that could prevent the server starting up
| `Bug #3306 <https://redmine.postgresql.org/issues/3306>`_ - Fixed display SQL of table with index for Greenplum database
| `Bug #3307 <https://redmine.postgresql.org/issues/3307>`_ - Allow connections to servers with port numbers < 1024 which may be seen in container environments
| `Bug #3308 <https://redmine.postgresql.org/issues/3308>`_ - Fixed issue where icon for Partitioned tables was the same as Non Partitioned tables for Greenplum database
| `Bug #3310 <https://redmine.postgresql.org/issues/3310>`_ - Fixed layout of the alertify error message in the query tool
| `Bug #3324 <https://redmine.postgresql.org/issues/3324>`_ - Fix the template loader to work reliably under Windows (fixing external tables under Greenplum)
| `Bug #3333 <https://redmine.postgresql.org/issues/3333>`_ - Ensure the runtime core application is setup before trying to access any settings
| `Bug #3342 <https://redmine.postgresql.org/issues/3342>`_ - Set SESSION_COOKIE_SAMESITE='Lax' per Flask recommendation to prevents sending cookies with CSRF-prone requests from external sites, such as submitting a form
| `Bug #3353 <https://redmine.postgresql.org/issues/3353>`_ - Handle errors properly if they occur when renaming a database
| `Bug #3356 <https://redmine.postgresql.org/issues/3356>`_ - Include the schema name on RE-SQL for packages
| `Bug #3374 <https://redmine.postgresql.org/issues/3374>`_ - Fix autocomplete
| `Bug #3392 <https://redmine.postgresql.org/issues/3392>`_ - Fix IPv6 support in the container build
| `Bug #3409 <https://redmine.postgresql.org/issues/3409>`_ - Avoid an exception on GreenPlum when retrieving RE-SQL on a table
| `Bug #3411 <https://redmine.postgresql.org/issues/3411>`_ - Fix a French translation error that could prevent the server starting up
| `Bug #3431 <https://redmine.postgresql.org/issues/3431>`_ - Fix the RE-SQL generation for GreenPlum external tables