***********
Version 8.9
***********

Release date: 2024-06-27

This release contains a number of bug fixes and new features since the release of pgAdmin 4 v8.8.

Supported Database Servers
**************************
**PostgreSQL**: 12, 13, 14, 15, and 16

**EDB Advanced Server**: 12, 13, 14, 15, and 16

Bundled PostgreSQL Utilities
****************************
**psql**, **pg_dump**, **pg_dumpall**, **pg_restore**: 16.3


New features
************

  | `Issue #5932 <https://github.com/pgadmin-org/pgadmin4/issues/5932>`_ -  Provide option to set theme based on OS theme preference.

Housekeeping
************

  | `Issue #7363 <https://github.com/pgadmin-org/pgadmin4/issues/7363>`_ -  Remove the usage of MUI makeStyles as it doesn't support React 18.

Bug fixes
*********

  | `Issue #6357 <https://github.com/pgadmin-org/pgadmin4/issues/6357>`_ -  Disable the query tool editor input if any SQL is being loaded to prevent users from typing.
  | `Issue #7241 <https://github.com/pgadmin-org/pgadmin4/issues/7241>`_ -  Fixed an issue where resizable data editors in query tool should not be allowed to resize beyond the app window bounds.
  | `Issue #7295 <https://github.com/pgadmin-org/pgadmin4/issues/7295>`_ -  Fixed new line indentation in query editor and add a user preference to disable it.
  | `Issue #7306 <https://github.com/pgadmin-org/pgadmin4/issues/7306>`_ -  Ensure that a user can connect to a server using SSL certificates and identity files from a shared storage.
  | `Issue #7316 <https://github.com/pgadmin-org/pgadmin4/issues/7316>`_ -  Fixed an issue where object explorer toolbar button not showing shortcut in the tooltip.
  | `Issue #7414 <https://github.com/pgadmin-org/pgadmin4/issues/7414>`_ -  Add support for comments on RLS policy object.
  | `Issue #7476 <https://github.com/pgadmin-org/pgadmin4/issues/7476>`_ -  Fixed an issue where changing a column name should reflect in all the constraints in table object dialog and ERD table dialog.
  | `Issue #7481 <https://github.com/pgadmin-org/pgadmin4/issues/7481>`_ -  Fixed an issue where dark theme shows white background when all tabs are closed.
  | `Issue #7516 <https://github.com/pgadmin-org/pgadmin4/issues/7516>`_ -  Ensure preferences can be loaded using preferences.json.
  | `Issue #7523 <https://github.com/pgadmin-org/pgadmin4/issues/7523>`_ -  Fixed an issue where the schema diff incorrectly marked tables as different due to schema-qualified trigger functions in the trigger definitions.
  | `Issue #7528 <https://github.com/pgadmin-org/pgadmin4/issues/7528>`_ -  Fixed an issue where backslash breaks syntax highlighting.
  | `Issue #7536 <https://github.com/pgadmin-org/pgadmin4/issues/7536>`_ -  Search Objects dialog should focus on search input on open.
  | `Issue #7542 <https://github.com/pgadmin-org/pgadmin4/issues/7542>`_ -  Fixed incorrect sorting of size in statistics tab.
  | `Issue #7555 <https://github.com/pgadmin-org/pgadmin4/issues/7555>`_ -  Fixed an issue where query tool shortcuts for find/replace are not working.
  | `Issue #7556 <https://github.com/pgadmin-org/pgadmin4/issues/7556>`_ -  Fixed migration failure while using external database.
  | `Issue #7593 <https://github.com/pgadmin-org/pgadmin4/issues/7593>`_ -  Fixed an issue where query tool auto-complete stops working after connection change.
  | `Issue #7605 <https://github.com/pgadmin-org/pgadmin4/issues/7605>`_ -  Fix the permissions issue in the pgAdmin installation directory on Debian and RHEL-8 platforms (CVE-2024-6238).
  | `Issue #7616 <https://github.com/pgadmin-org/pgadmin4/issues/7616>`_ -  Fixed an issue where delete button in Users data was enabled for incorrect rows.