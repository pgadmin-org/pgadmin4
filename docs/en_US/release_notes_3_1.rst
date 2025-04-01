***********
Version 3.1
***********

Release date: 2018-06-28

This release contains a number of features and fixes reported since the release
of pgAdmin4 3.0


Features
********

| `Issue #1447 <https://redmine.postgresql.org/issues/1447>`_ - Add support for SSH tunneled connections
| `Issue #2686 <https://redmine.postgresql.org/issues/2686>`_ - Add an option to auto-complete keywords in upper case
| `Issue #3204 <https://redmine.postgresql.org/issues/3204>`_ - Add support for LISTEN/NOTIFY in the Query Tool
| `Issue #3273 <https://redmine.postgresql.org/issues/3273>`_ - Allow sorting in the file dialogue
| `Issue #3362 <https://redmine.postgresql.org/issues/3362>`_ - Function and procedure support for PG11
| `Issue #3388 <https://redmine.postgresql.org/issues/3388>`_ - Allow the connection timeout to be configured on a per-server basis

Bug fixes
*********

| `Issue #1220 <https://redmine.postgresql.org/issues/1220>`_ - Backup and Restore should not be started if database name contains "=" symbol
| `Issue #1221 <https://redmine.postgresql.org/issues/1221>`_ - Maintenance should not be started if database name contains "=" symbol
| `Issue #3179 <https://redmine.postgresql.org/issues/3179>`_ - Fix an error generating SQL for trigger functions
| `Issue #3238 <https://redmine.postgresql.org/issues/3238>`_ - Standardise the error handling for parsing of JSON response messages from the server
| `Issue #3250 <https://redmine.postgresql.org/issues/3250>`_ - Fix handling of SQL_ASCII data in the Query Tool
| `Issue #3257 <https://redmine.postgresql.org/issues/3257>`_ - Catch errors when trying to EXPLAIN an invalid query
| `Issue #3277 <https://redmine.postgresql.org/issues/3277>`_ - Ensure server cleanup on exit only happens if the server actually started up
| `Issue #3284 <https://redmine.postgresql.org/issues/3284>`_ - F5 key should work to refresh Browser tree
| `Issue #3289 <https://redmine.postgresql.org/issues/3289>`_ - Fix handling of SQL_ASCII data in the Query Tool
| `Issue #3290 <https://redmine.postgresql.org/issues/3290>`_ - Close button added to the alertify message box, which pops up in case of backend error
| `Issue #3295 <https://redmine.postgresql.org/issues/3295>`_ - Ensure the debugger gets focus when loaded so shortcut keys work as expected
| `Issue #3298 <https://redmine.postgresql.org/issues/3298>`_ - Fixed Query Tool keyboard issue where arrow keys were not behaving as expected for execute options dropdown
| `Issue #3303 <https://redmine.postgresql.org/issues/3303>`_ - Fix a Japanese translation error that could prevent the server starting up
| `Issue #3306 <https://redmine.postgresql.org/issues/3306>`_ - Fixed display SQL of table with index for Greenplum database
| `Issue #3307 <https://redmine.postgresql.org/issues/3307>`_ - Allow connections to servers with port numbers < 1024 which may be seen in container environments
| `Issue #3308 <https://redmine.postgresql.org/issues/3308>`_ - Fixed issue where icon for Partitioned tables was the same as Non Partitioned tables for Greenplum database
| `Issue #3310 <https://redmine.postgresql.org/issues/3310>`_ - Fixed layout of the alertify error message in the Query Tool
| `Issue #3324 <https://redmine.postgresql.org/issues/3324>`_ - Fix the template loader to work reliably under Windows (fixing external tables under Greenplum)
| `Issue #3333 <https://redmine.postgresql.org/issues/3333>`_ - Ensure the runtime core application is setup before trying to access any settings
| `Issue #3342 <https://redmine.postgresql.org/issues/3342>`_ - Set SESSION_COOKIE_SAMESITE='Lax' per Flask recommendation to prevents sending cookies with CSRF-prone requests from external sites, such as submitting a form
| `Issue #3353 <https://redmine.postgresql.org/issues/3353>`_ - Handle errors properly if they occur when renaming a database
| `Issue #3356 <https://redmine.postgresql.org/issues/3356>`_ - Include the schema name on RE-SQL for packages
| `Issue #3374 <https://redmine.postgresql.org/issues/3374>`_ - Fix autocomplete
| `Issue #3392 <https://redmine.postgresql.org/issues/3392>`_ - Fix IPv6 support in the container build
| `Issue #3409 <https://redmine.postgresql.org/issues/3409>`_ - Avoid an exception on GreenPlum when retrieving RE-SQL on a table
| `Issue #3411 <https://redmine.postgresql.org/issues/3411>`_ - Fix a French translation error that could prevent the server starting up
| `Issue #3431 <https://redmine.postgresql.org/issues/3431>`_ - Fix the RE-SQL generation for GreenPlum external tables