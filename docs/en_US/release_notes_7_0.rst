***********
Version 7.0
***********

Release date: 2023-04-13

This release contains a number of bug fixes and new features since the release of pgAdmin 4 v6.21.

Supported Database Servers
**************************
**PostgreSQL**: 11, 12, 13, 14 and 15

**EDB Advanced Server**: 11, 12, 13, 14 and 15

Bundled PostgreSQL Utilities
****************************
**psql**, **pg_dump**, **pg_dumpall**, **pg_restore**: 15.2


New features
************

  | `Issue #3298 <https://github.com/pgadmin-org/pgadmin4/issues/3298>`_ -  Auto expand row edit form when a new row is added for Primary Key, Foreign Key, Unique Constraint and Exclusion Constraint.
  | `Issue #5014 <https://github.com/pgadmin-org/pgadmin4/issues/5014>`_ -  Added support for mounting shared storage in server mode.
  | `Issue #5022 <https://github.com/pgadmin-org/pgadmin4/issues/5022>`_ -  Add a note on top of keyboard shortcuts preferences to show the Accesskey of the browser.
  | `Issue #5750 <https://github.com/pgadmin-org/pgadmin4/issues/5750>`_ -  Added capability to deploy PostgreSQL servers on Google Cloud.
  | `Issue #5805 <https://github.com/pgadmin-org/pgadmin4/issues/5805>`_ -  Added support of BigAnimal v3 API.
  | `Issue #5854 <https://github.com/pgadmin-org/pgadmin4/issues/5854>`_ -  On pressing Ctrl+C on a tree object, copy the fully qualified name to clipboard.
  | `Issue #5855 <https://github.com/pgadmin-org/pgadmin4/issues/5855>`_ -  Added option to create unique constraint with nulls not distinct.

Housekeeping
************

  | `Issue #4734 <https://github.com/pgadmin-org/pgadmin4/issues/4734>`_ -  Rename the "Properties..." context menu option of the objects to "Edit Object..." and the "Browser" tree to "Object Explorer".
  | `Issue #5011 <https://github.com/pgadmin-org/pgadmin4/issues/5011>`_ -  Upgrade from psycopg2 to psycopg3.
  | `Issue #5701 <https://github.com/pgadmin-org/pgadmin4/issues/5701>`_ -  Remove Bootstrap and jQuery usage.
  | `Issue #5830 <https://github.com/pgadmin-org/pgadmin4/issues/5830>`_ -  Add .ts and .tsx files under linter and fix linter issues.
  | `Issue #5901 <https://github.com/pgadmin-org/pgadmin4/issues/5901>`_ -  Update SQLAlchemy, Flask, Flask-SQLAlchemy, and other packages to current versions.

Bug fixes
*********

  | `Issue #4423 <https://github.com/pgadmin-org/pgadmin4/issues/4423>`_ -  Fixed an issue where list of tables is not displayed in a SQL_ASCII database.
  | `Issue #4784 <https://github.com/pgadmin-org/pgadmin4/issues/4784>`_ -  Handle errors occurring during decoding UTF-8 encoded query result data which contains ascii characters.
  | `Issue #4884 <https://github.com/pgadmin-org/pgadmin4/issues/4884>`_ -  Fixed an issue where it is not possible to import csv data to tables having columns with german umlauts in their name.
  | `Issue #4891 <https://github.com/pgadmin-org/pgadmin4/issues/4891>`_ -  Fixed 'rawunicodeescape' codec can't decode issue in a SQL_ASCII database.
  | `Issue #5504 <https://github.com/pgadmin-org/pgadmin4/issues/5504>`_ -  Fixed an issue where incorrect view of text[] fields in query and table results when use other then UTF8 (win1251) codepage and symbols.
  | `Issue #5735 <https://github.com/pgadmin-org/pgadmin4/issues/5735>`_ -  Show appropriate error message when master password is not set instead of 'Crypt key missing'.
  | `Issue #5775 <https://github.com/pgadmin-org/pgadmin4/issues/5775>`_ -  Display the 'No menu available for this object' message if the selected tree node does not have any options.
  | `Issue #5824 <https://github.com/pgadmin-org/pgadmin4/issues/5824>`_ -  Ensure that the user's storage directory is created when the users are created, as well as for those users whose directories have not yet been created.
  | `Issue #5833 <https://github.com/pgadmin-org/pgadmin4/issues/5833>`_ -  Fixed an issue where user MFA entry was not getting delete after deleting a user.
  | `Issue #5834 <https://github.com/pgadmin-org/pgadmin4/issues/5834>`_ -  Fixed issue where pgAgent jobs were not getting dropped from properties tab.
  | `Issue #5874 <https://github.com/pgadmin-org/pgadmin4/issues/5874>`_ -  Make "using" and "with check" fields a textarea in the RLS policy.
  | `Issue #5894 <https://github.com/pgadmin-org/pgadmin4/issues/5894>`_ -  Use fetch instead of axios to close connections in SQLEditor, ERD, Schema Diff and Debugger to ensure it completes.
  | `Issue #5904 <https://github.com/pgadmin-org/pgadmin4/issues/5904>`_ -  Fixed an issue where the count query should not be triggered when the estimated count is less than zero.
  | `Issue #5907 <https://github.com/pgadmin-org/pgadmin4/issues/5907>`_ -  Validate user inputs provided in configuration files before starting pgadmin server.
  | `Issue #5916 <https://github.com/pgadmin-org/pgadmin4/issues/5916>`_ -  Fix an issue in search objects where objects were unable to locate occasionally.
  | `Issue #5919 <https://github.com/pgadmin-org/pgadmin4/issues/5919>`_ -  While restoring the database connections due to lost server connection, ensure that the databases which were previously connected are only reconnected.
  | `Issue #5921 <https://github.com/pgadmin-org/pgadmin4/issues/5921>`_ -  Ensure that when pasting rows the rows are added right below the selected rows for copying.
  | `Issue #5929 <https://github.com/pgadmin-org/pgadmin4/issues/5929>`_ -  Dashboard graph Y-axis width should increase with label.
  | `Issue #5934 <https://github.com/pgadmin-org/pgadmin4/issues/5934>`_ -  Ensure that default values are set only for insert statement if user does not provide any values, in case of updating existing values to blank it should be set to null.
  | `Issue #5941 <https://github.com/pgadmin-org/pgadmin4/issues/5941>`_ -  Fixed an issue where migration on external database is not working.
  | `Issue #5943 <https://github.com/pgadmin-org/pgadmin4/issues/5943>`_ -  Use http for SVG namespace URLs which were changed to https for SonarQube fixes.
  | `Issue #5952 <https://github.com/pgadmin-org/pgadmin4/issues/5952>`_ -  Ensure that the schema diff tool should not allow comparison between Postgres Server and EDB Postgres Advanced Server.
  | `Issue #5953 <https://github.com/pgadmin-org/pgadmin4/issues/5953>`_ -  Fixed error while executing continue in debugging session after some time of debug execution.
  | `Issue #5955 <https://github.com/pgadmin-org/pgadmin4/issues/5955>`_ -  Fix an issue where query tool is stuck when running query after discarding changed data.
  | `Issue #5958 <https://github.com/pgadmin-org/pgadmin4/issues/5958>`_ -  Fix an issue where new dashboard graphs are partially following theme colors.
  | `Issue #5959 <https://github.com/pgadmin-org/pgadmin4/issues/5959>`_ -  Fix an issue where Backup, Restore, and Maintenance not working if connection timeout is set in the server dialog.
  | `Issue #6018 <https://github.com/pgadmin-org/pgadmin4/issues/6018>`_ -  Change the foreground color of the code mirror text for Dark Theme.
  | `Issue #6093 <https://github.com/pgadmin-org/pgadmin4/issues/6093>`_ -  Fix the dependents SQL of Roles which is throwing a type casting error on PostgreSQL 15.
  | `Issue #6100 <https://github.com/pgadmin-org/pgadmin4/issues/6100>`_ -  Fixed the LDAP authentication issue for the simultaneous login attempts.(CVE-2023-1907)
  | `Issue #6109 <https://github.com/pgadmin-org/pgadmin4/issues/6109>`_ -  Fixed asyncio random task error messages in Query tool.
  | `Issue #6122 <https://github.com/pgadmin-org/pgadmin4/issues/6122>`_ -  Fixed CSV export from Query Tool results does not include all columns for multiple CTEs.
