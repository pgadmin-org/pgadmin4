************
Version 4.30
************

Release date: 2021-01-07

This release contains a number of bug fixes and new features since the release of pgAdmin4 4.29.

New features
************


Housekeeping
************

| `Issue #6052 <https://redmine.postgresql.org/issues/6052>`_ -  Added connected pgAdmin user and connection name in the log file.
| `Issue #6079 <https://redmine.postgresql.org/issues/6079>`_ -  Updated mimetype from 'text/javascript' to 'application/javascript' as 'text/javascript' is obsolete.

Bug fixes
*********

| `Issue #5875 <https://redmine.postgresql.org/issues/5875>`_ -  Ensure that the 'template1' database should not be visible after pg_upgrade.
| `Issue #5965 <https://redmine.postgresql.org/issues/5965>`_ -  Ensure that the macro query result should be download properly.
| `Issue #5973 <https://redmine.postgresql.org/issues/5973>`_ -  Added appropriate help message and a placeholder for letting users know about the account password expiry for Login/Group Role.
| `Issue #6046 <https://redmine.postgresql.org/issues/6046>`_ -  Fixed an issue where the state of the Save File icon does not match the dirty editor indicator.
| `Issue #6047 <https://redmine.postgresql.org/issues/6047>`_ -  Fixed an issue where the dirty indicator stays active even if all changes were undone.
| `Issue #6058 <https://redmine.postgresql.org/issues/6058>`_ -  Ensure that the rename panel should be disabled when the SQL file opened in the query tool.
