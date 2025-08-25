***********
Version 9.8
***********

Release date: 2025-09-18

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

  | `Issue #8891 <https://github.com/pgadmin-org/pgadmin4/issues/8891>`_ -  Allow user to configure security related gunicorn parameters.
  | `Issue #9093 <https://github.com/pgadmin-org/pgadmin4/issues/9093>`_ -  Change the default pgAdmin theme to System.

Housekeeping
************

  | `Issue #7448 <https://github.com/pgadmin-org/pgadmin4/issues/7448>`_ -  Remove usage of BrowserFS as it is deprecated.

Bug fixes
*********

  | `Issue #9090 <https://github.com/pgadmin-org/pgadmin4/issues/9090>`_ -  Pin Paramiko to version 3.5.1 to fix the DSSKey error introduced in the latest release.