************
Version 5.7
************

Release date: 2021-09-09

This release contains a number of bug fixes and new features since the release of pgAdmin4 5.6.

New features
************

| `Issue #2538 <https://redmine.postgresql.org/issues/2538>`_ -  Added support for the truncate table with restart identity.
| `Issue #4264 <https://redmine.postgresql.org/issues/4264>`_ -  Make code folding case insensitive in the code mirror.
| `Issue #4629 <https://redmine.postgresql.org/issues/4629>`_ -  Added database and server information on the Maintenance process watcher dialog.
| `Issue #6495 <https://redmine.postgresql.org/issues/6495>`_ -  Allow the referenced table to be the same as the local table in one to many relationship for ERD Tool.
| `Issue #6625 <https://redmine.postgresql.org/issues/6625>`_ -  Make closing tabs to be smarter by focusing on the appropriate tab when the user closed a tab.
| `Issue #6691 <https://redmine.postgresql.org/issues/6691>`_ -  Set PSQLRC and PSQL_HISTORY env vars to apt. user storage path in the server mode.

Housekeeping
************


Bug fixes
*********

| `Issue #4567 <https://redmine.postgresql.org/issues/4567>`_ -  Fixed an issue where privileges were revoked using SQL query on objects like tables that do not correctly show in SQL tab.
| `Issue #4815 <https://redmine.postgresql.org/issues/4815>`_ -  Fixed an issue where the user can not paste the updated table header in safari 12 and 13 browsers.
| `Issue #5849 <https://redmine.postgresql.org/issues/5849>`_ -  Ensure that trigger function SQL should have 'create or replace function' instead of 'create function' only.
| `Issue #6419 <https://redmine.postgresql.org/issues/6419>`_ -  Fixed blank screen issue on windows and also made changes to use NWjs manifest for remembering window size.
| `Issue #6531 <https://redmine.postgresql.org/issues/6531>`_ -  Fixed the export image issue where relation lines are over the nodes.
| `Issue #6544 <https://redmine.postgresql.org/issues/6544>`_ -  Fixed width limitation issue in PSQL tool window.
| `Issue #6564 <https://redmine.postgresql.org/issues/6564>`_ -  Fixed an issue where columns with sequences get altered unnecessarily with a schema diff tool.
| `Issue #6570 <https://redmine.postgresql.org/issues/6570>`_ -  Ensure that the lock panel should not be blocked for larger records.
| `Issue #6572 <https://redmine.postgresql.org/issues/6572>`_ -  Partially fixes the data output panel display issue.
| `Issue #6620 <https://redmine.postgresql.org/issues/6620>`_ -  Fixed an issue where whitespace in function bodies was not applied while generating the script using Schema Diff.
| `Issue #6627 <https://redmine.postgresql.org/issues/6627>`_ -  Introduced OAUTH2_SCOPE variable for the Oauth2 scope configuration.
| `Issue #6641 <https://redmine.postgresql.org/issues/6641>`_ -  Enables pgAdmin to retrieve user permissions in case of nested roles which helps to terminate the session for AWS RDS.
| `Issue #6663 <https://redmine.postgresql.org/issues/6663>`_ -  Fixed no attribute '_asdict' error when connecting the database server.
| `Issue #6668 <https://redmine.postgresql.org/issues/6668>`_ -  Fixed errors related to HTML tags shown in the error message for JSON editor.
| `Issue #6671 <https://redmine.postgresql.org/issues/6671>`_ -  Fixed UnboundLocalError where local variable 'user_id' referenced before assignment.
| `Issue #6682 <https://redmine.postgresql.org/issues/6682>`_ -  Renamed 'Auto rollback?' to 'Auto rollback on error?'.
| `Issue #6684 <https://redmine.postgresql.org/issues/6684>`_ -  Fixed the JSON editor issue of hiding the first record.
| `Issue #6685 <https://redmine.postgresql.org/issues/6685>`_ -  Ensure that deleting a database should not automatically connect to the next database.
| `Issue #6704 <https://redmine.postgresql.org/issues/6704>`_ -  Ensure that pgAdmin should not fail at login due to a special character in the hostname.
| `Issue #6710 <https://redmine.postgresql.org/issues/6710>`_ -  Fixed an issue where multiple query tool tabs getting closed for the single close event.
