***********
Version 3.2
***********

Release date: 2018-??-??

This release contains a number of features and fixes reported since the release of pgAdmin4 3.1


Features
********

| `Feature #2214 <https://redmine.postgresql.org/issues/2214>`_ - Add support for SCRAM password changes (requires psycopg2 >= 2.8).
| `Feature #3074 <https://redmine.postgresql.org/issues/3074>`_ - Add support for reset saved password.
| `Feature #3397 <https://redmine.postgresql.org/issues/3397>`_ - Add support for Trigger and JIT stats in the graphical query plan viewer.
| `Feature #3412 <https://redmine.postgresql.org/issues/3412>`_ - Add support for primary key, foreign key, unique key, indexes and triggers on partitioned tables for PG/EPAS 11.
| `Feature #3506 <https://redmine.postgresql.org/issues/3506>`_ - Allow the user to specify a fixed port number in the runtime to aid cookie whitelisting etc.
| `Feature #3510 <https://redmine.postgresql.org/issues/3510>`_ - Add a menu option to the runtime to copy the appserver URL to the clipboard.


Bug fixes
*********

| `Bug #3185 <https://redmine.postgresql.org/issues/3185>`_ - Fix the upgrade check on macOS.
| `Bug #3191 <https://redmine.postgresql.org/issues/3191>`_ - Fix a number of debugger execution issues.
| `Bug #3294 <https://redmine.postgresql.org/issues/3294>`_ - Infrastructure (and changes to the Query Tool, Dashboards and Debugger) for realtime preference handling.
| `Bug #3309 <https://redmine.postgresql.org/issues/3309>`_ - Fix Directory format support for backups.
| `Bug #3316 <https://redmine.postgresql.org/issues/3316>`_ - Support running on systems without a system tray.
| `Bug #3319 <https://redmine.postgresql.org/issues/3319>`_ - Cleanup and fix handling of Query Tool Cancel button status.
| `Bug #3363 <https://redmine.postgresql.org/issues/3363>`_ - Fix restoring of restore options for sections.
| `Bug #3371 <https://redmine.postgresql.org/issues/3371>`_ - Don't create a session when the /misc/ping test endpoint is called.
| `Bug #3446 <https://redmine.postgresql.org/issues/3446>`_ - Various procedure/function related fixes for EPAS/PG 11.
| `Bug #3448 <https://redmine.postgresql.org/issues/3448>`_ - Exclude system columns in Import/Export.
| `Bug #3457 <https://redmine.postgresql.org/issues/3457>`_ - Fix debugging of procedures in EPAS packages.
| `Bug #3468 <https://redmine.postgresql.org/issues/3468>`_ - Support SSH tunneling with keys that don't have a passphrase.
| `Bug #3471 <https://redmine.postgresql.org/issues/3471>`_ - Ensure the SSH tunnel port number is honoured.