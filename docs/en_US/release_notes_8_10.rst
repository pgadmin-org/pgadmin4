************
Version 8.10
************

Release date: 2024-07-29

This release contains a number of bug fixes and new features since the release of pgAdmin 4 v8.9.

Supported Database Servers
**************************
**PostgreSQL**: 12, 13, 14, 15, 16 and 17

**EDB Advanced Server**: 12, 13, 14, 15, and 16

Bundled PostgreSQL Utilities
****************************
**psql**, **pg_dump**, **pg_dumpall**, **pg_restore**: 16.3


New features
************

  | `Issue #3981 <https://github.com/pgadmin-org/pgadmin4/issues/3981>`_ -  Add support for Postgres Server Logs for Text, CSV and JSON format in plain and tabular formats. Upgrade React to version 18.
  | `Issue #6572 <https://github.com/pgadmin-org/pgadmin4/issues/6572>`_ -  Add a keyboard shortcut to close active tab panel.
  | `Issue #7530 <https://github.com/pgadmin-org/pgadmin4/issues/7530>`_ -  Add support for highlighting selection matches in the query editor.

Housekeeping
************

  | `Issue #7494 <https://github.com/pgadmin-org/pgadmin4/issues/7494>`_ -  Replace pgAdmin NW.js container with Electron container.
  | `Issue #7501 <https://github.com/pgadmin-org/pgadmin4/issues/7501>`_ -  Updated to the latest version of the Notistack library.
  | `Issue #7537 <https://github.com/pgadmin-org/pgadmin4/issues/7537>`_ -  Ensure that pgAdmin 4 is compatible with PostgreSQL v17.
  | `Issue #7607 <https://github.com/pgadmin-org/pgadmin4/issues/7607>`_ -  Automatically apply virtualization in the DataGridView of SchemaView if the schema contains only one collection.
  | `Issue #7623 <https://github.com/pgadmin-org/pgadmin4/issues/7623>`_ -  Add the git commit hash details to the About dialog.

Bug fixes
*********

  | `Issue #3199 <https://github.com/pgadmin-org/pgadmin4/issues/3199>`_ -  Fixed an issue where paste operation in query tool data grid should skip bytea columns and put the value as NULL instead.
  | `Issue #4165 <https://github.com/pgadmin-org/pgadmin4/issues/4165>`_ -  Fixed an issue where the taskbar icon appeared as a red square for the query tool and schema diff when opened in a new window.
  | `Issue #5345 <https://github.com/pgadmin-org/pgadmin4/issues/5345>`_ -  Fix issue with missing new added records in download file.
  | `Issue #5610 <https://github.com/pgadmin-org/pgadmin4/issues/5610>`_ -  Fixed an issue where the File Open dialog did not show files without a dot extension.
  | `Issue #6548 <https://github.com/pgadmin-org/pgadmin4/issues/6548>`_ -  Ensure pgAdmin never makes network requests to Google etc.
  | `Issue #6571 <https://github.com/pgadmin-org/pgadmin4/issues/6571>`_ -  Fixed an issue where pop-up notifications from Object Explorer wouldn't get dismissed automatically if the Query Tool was opened.
  | `Issue #7035 <https://github.com/pgadmin-org/pgadmin4/issues/7035>`_ -  Fixed the permission denied issue for functions of the pgstattuple extension when accessing statistics with a non-admin user.
  | `Issue #7219 <https://github.com/pgadmin-org/pgadmin4/issues/7219>`_ -  Ensure processes related notifiers disappears.
  | `Issue #7297 <https://github.com/pgadmin-org/pgadmin4/issues/7297>`_ -  Updated entrypoint.sh to utilize the email-validator package for email validation.
  | `Issue #7511 <https://github.com/pgadmin-org/pgadmin4/issues/7511>`_ -  Fixed an issue where users could not insert characters at the desired location, as it was added to the end of the line.
  | `Issue #7554 <https://github.com/pgadmin-org/pgadmin4/issues/7554>`_ -  Fixed an issue where sorting the database activity table on the dashboard by any column caused the details to expand in the wrong position.
  | `Issue #7618 <https://github.com/pgadmin-org/pgadmin4/issues/7618>`_ -  Fix an issue where the preferences JSON file has no effect when an external database is used.
  | `Issue #7626 <https://github.com/pgadmin-org/pgadmin4/issues/7626>`_ -  Fixed an issue where theme preview under theme options was broken in pgAdmin server mode.
  | `Issue #7627 <https://github.com/pgadmin-org/pgadmin4/issues/7627>`_ -  Fixed an issue where users could not autofill their saved passwords in the connect server dialog in the browser.
  | `Issue #7638 <https://github.com/pgadmin-org/pgadmin4/issues/7638>`_ -  Fixed an issue where Generate Script button should be disabled if no objects are selected in the schema diff result.
  | `Issue #7639 <https://github.com/pgadmin-org/pgadmin4/issues/7639>`_ -  Fixed an issue where ERD Open/Save shorcuts were not working on Windows/Linux.
  | `Issue #7660 <https://github.com/pgadmin-org/pgadmin4/issues/7660>`_ -  Add a precautionary check for the query tool connection cursor to fix the error 'NoneType' object has no attribute '_query'.
  | `Issue #7662 <https://github.com/pgadmin-org/pgadmin4/issues/7662>`_ -  Fixed an issue where boolean values in node details of graphical explain plan were not interpreted correctly.
  | `Issue #7663 <https://github.com/pgadmin-org/pgadmin4/issues/7663>`_ -  Fixed an issue where Reassign/Drop Owned dialog not opening for Role.
  | `Issue #7679 <https://github.com/pgadmin-org/pgadmin4/issues/7679>`_ -  Ensure pgadmin does not try to connect to the server if saved password is not available.
  | `Issue #7681 <https://github.com/pgadmin-org/pgadmin4/issues/7681>`_ -  Ensure that pgAdmin works when opened in an iframe.
