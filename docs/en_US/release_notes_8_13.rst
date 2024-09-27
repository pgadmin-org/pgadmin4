************
Version 8.13
************

Release date: 2024-10-17

This release contains a number of bug fixes and new features since the release of pgAdmin 4 v8.12.

Supported Database Servers
**************************
**PostgreSQL**: 12, 13, 14, 15, 16 and 17

**EDB Advanced Server**: 12, 13, 14, 15, and 16

Bundled PostgreSQL Utilities
****************************
**psql**, **pg_dump**, **pg_dumpall**, **pg_restore**: 16.4


New features
************

  | `Issue #7393 <https://github.com/pgadmin-org/pgadmin4/issues/7393>`_ -  Added support for auto-detecting and setting the End-of-line character (LF/CRLF) in the query tool editor.

Housekeeping
************


Bug fixes
*********

  | `Issue #5307 <https://github.com/pgadmin-org/pgadmin4/issues/5307>`_ -  Fixed an issue to allow the Enter key to save data in the result grid text editor.
  | `Issue #7837 <https://github.com/pgadmin-org/pgadmin4/issues/7837>`_ -  Fixed an issue where role properties were not loading.
  | `Issue #7919 <https://github.com/pgadmin-org/pgadmin4/issues/7919>`_ -  Fixed an issue where the dock layout was not saved upon closing a tab.
  | `Issue #7920 <https://github.com/pgadmin-org/pgadmin4/issues/7920>`_ -  Fixed an issue where the copy shortcut CTRL +C was not working in the Query Tool data grid.
  | `Issue #7965 <https://github.com/pgadmin-org/pgadmin4/issues/7965>`_ -  Allow OAuth2 params OAUTH2_NAME, OAUTH2_DISPLAY_NAME, OAUTH2_ICON, OAUTH2_BUTTON_COLOR to be optional.
