************
Version 5.7
************

Release date: 2021-09-09

This release contains a number of bug fixes and new features since the release of pgAdmin4 5.6.

New features
************

| `Issue #4264 <https://redmine.postgresql.org/issues/4264>`_ -  Make code folding case insensitive in the code mirror.
| `Issue #4629 <https://redmine.postgresql.org/issues/4629>`_ -  Added database and server information on the Maintenance process watcher dialog.
| `Issue #6495 <https://redmine.postgresql.org/issues/6495>`_ -  Allow the referenced table to be the same as the local table in one to many relationship for ERD Tool.
| `Issue #6691 <https://redmine.postgresql.org/issues/6691>`_ -  Set PSQLRC and PSQL_HISTORY env vars to apt. user storage path in the server mode.

Housekeeping
************


Bug fixes
*********

| `Issue #5849 <https://redmine.postgresql.org/issues/5849>`_ -  Ensure that trigger function SQL should have 'create or replace function' instead of 'create function' only.
| `Issue #6531 <https://redmine.postgresql.org/issues/6531>`_ -  Fixed the export image issue where relation lines are over the nodes.
| `Issue #6544 <https://redmine.postgresql.org/issues/6544>`_ -  Fixed width limitation issue in PSQL tool window.
| `Issue #6564 <https://redmine.postgresql.org/issues/6564>`_ -  Fixed an issue where columns with sequences get altered unnecessarily with a schema diff tool.
| `Issue #6572 <https://redmine.postgresql.org/issues/6572>`_ -  Partially fixes the data output panel display issue.
| `Issue #6641 <https://redmine.postgresql.org/issues/6641>`_ -  Enables pgAdmin to retrieve user permissions in case of nested roles which helps to terminate the session for AWS RDS.
| `Issue #6663 <https://redmine.postgresql.org/issues/6663>`_ -  Fixed no attribute '_asdict' error when connecting the database server.
| `Issue #6671 <https://redmine.postgresql.org/issues/6671>`_ -  Fixed UnboundLocalError where local variable 'user_id' referenced before assignment.
| `Issue #6682 <https://redmine.postgresql.org/issues/6682>`_ -  Renamed 'Auto rollback?' to 'Auto rollback on error?'.
| `Issue #6684 <https://redmine.postgresql.org/issues/6684>`_ -  Fixed the JSON editor issue of hiding the first record.
