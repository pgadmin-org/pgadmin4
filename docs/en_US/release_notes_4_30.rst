************
Version 4.30
************

Release date: 2021-01-28

This release contains a number of bug fixes and new features since the release of pgAdmin4 4.29.

New features
************


Housekeeping
************

| `Issue #5338 <https://redmine.postgresql.org/issues/5338>`_ -  Improve code coverage and API test cases for pgAgent.
| `Issue #6052 <https://redmine.postgresql.org/issues/6052>`_ -  Added connected pgAdmin user and connection name in the log file.
| `Issue #6079 <https://redmine.postgresql.org/issues/6079>`_ -  Updated mimetype from 'text/javascript' to 'application/javascript' as 'text/javascript' is obsolete.

Bug fixes
*********

| `Issue #4892 <https://redmine.postgresql.org/issues/4892>`_ -  Fixed an issue where pressing the back button will show another instance of the main page inside of the Query Tool tab.
| `Issue #5282 <https://redmine.postgresql.org/issues/5282>`_ -  Added 'Count Rows' option to the partition sub tables.
| `Issue #5571 <https://redmine.postgresql.org/issues/5571>`_ -  Added support for expression in exclusion constraints.
| `Issue #5875 <https://redmine.postgresql.org/issues/5875>`_ -  Ensure that the 'template1' database should not be visible after pg_upgrade.
| `Issue #5965 <https://redmine.postgresql.org/issues/5965>`_ -  Ensure that the macro query result should be download properly.
| `Issue #5973 <https://redmine.postgresql.org/issues/5973>`_ -  Added appropriate help message and a placeholder for letting users know about the account password expiry for Login/Group Role.
| `Issue #5997 <https://redmine.postgresql.org/issues/5997>`_ -  Updated Flask-BabelEx to the latest.
| `Issue #6046 <https://redmine.postgresql.org/issues/6046>`_ -  Fixed an issue where the state of the Save File icon does not match the dirty editor indicator.
| `Issue #6047 <https://redmine.postgresql.org/issues/6047>`_ -  Fixed an issue where the dirty indicator stays active even if all changes were undone.
| `Issue #6058 <https://redmine.postgresql.org/issues/6058>`_ -  Ensure that the rename panel should be disabled when the SQL file opened in the query tool.
| `Issue #6061 <https://redmine.postgresql.org/issues/6061>`_ -  Fixed extra parentheses issue around joins for Views.
| `Issue #6065 <https://redmine.postgresql.org/issues/6065>`_ -  Fixed accessibility issues in schema diff module.
| `Issue #6069 <https://redmine.postgresql.org/issues/6069>`_ -  Fixed an issue on refreshing files in Query Tool.
| `Issue #6077 <https://redmine.postgresql.org/issues/6077>`_ -  Fixed accessibility issues in various dialogs.
| `Issue #6084 <https://redmine.postgresql.org/issues/6084>`_ -  Fixed TypeError exception in schema diff when selected any identical object.
| `Issue #6096 <https://redmine.postgresql.org/issues/6096>`_ -  Updated deployment documentation, refer correctly to uWSGI where Gunicorn had been referenced.
| `Issue #6121 <https://redmine.postgresql.org/issues/6121>`_ -  Fixed an issue where the database list in the new connection window is not visible.
| `Issue #6128 <https://redmine.postgresql.org/issues/6128>`_ -  Fixed an issue where sequences are not created.
| `Issue #6140 <https://redmine.postgresql.org/issues/6140>`_ -  Ensure that verbose logs should be visible for Utility(Backup, Maintenance) jobs.
