***********
Version 9.8
***********

Release date: 2025-09-04

This release contains a number of bug fixes and new features since the release of pgAdmin 4 v9.7.

Supported Database Servers
**************************
**PostgreSQL**: 13, 14, 15, 16 and 17

**EDB Advanced Server**: 13, 14, 15, 16 and 17

Bundled PostgreSQL Utilities
****************************
**psql**, **pg_dump**, **pg_dumpall**, **pg_restore**: 17.2


New features
************

  | `Issue #6396 <https://github.com/pgadmin-org/pgadmin4/issues/6396>`_ -  Add menu items for truncating foreign tables.
  | `Issue #7928 <https://github.com/pgadmin-org/pgadmin4/issues/7928>`_ -  Added Debian Trixie as a supported platform for pgAdmin.
  | `Issue #8891 <https://github.com/pgadmin-org/pgadmin4/issues/8891>`_ -  Allow user to configure security related gunicorn parameters.
  | `Issue #9093 <https://github.com/pgadmin-org/pgadmin4/issues/9093>`_ -  Change the default pgAdmin theme to System.

Housekeeping
************

  | `Issue #7448 <https://github.com/pgadmin-org/pgadmin4/issues/7448>`_ -  Remove usage of BrowserFS as it is deprecated.

Bug fixes
*********

  | `Issue #9090 <https://github.com/pgadmin-org/pgadmin4/issues/9090>`_ -  Pin Paramiko to version 3.5.1 to fix the DSSKey error introduced in the latest release.
  | `Issue #9095 <https://github.com/pgadmin-org/pgadmin4/issues/9095>`_ -  Fixed an issue where pgAdmin config migration was failing while upgrading to v9.7.
  | `Issue #9114 <https://github.com/pgadmin-org/pgadmin4/issues/9114>`_ -  Fixed Cross-Origin Opener Policy (COOP) vulnerability in the OAuth 2.0 authentication flow (CVE-2025-9636).
  | `Issue #9116 <https://github.com/pgadmin-org/pgadmin4/issues/9116>`_ -  Fixed an issue where editor shortcuts fail when using Option key combinations on macOS, due to macOS treating Option+Key as a different key input.