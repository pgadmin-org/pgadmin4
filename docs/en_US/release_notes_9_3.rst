***********
Version 9.3
***********

Release date: 2025-04-30

This release contains a number of bug fixes and new features since the release of pgAdmin 4 v9.2.

Supported Database Servers
**************************
**PostgreSQL**: 13, 14, 15, 16 and 17

**EDB Advanced Server**: 13, 14, 15, 16 and 17

Bundled PostgreSQL Utilities
****************************
**psql**, **pg_dump**, **pg_dumpall**, **pg_restore**: 17.2


New features
************

  | `Issue #2767 <https://github.com/pgadmin-org/pgadmin4/issues/2767>`_ -  Added ability to use SQL in the "DB Restriction" field.
  | `Issue #8629 <https://github.com/pgadmin-org/pgadmin4/issues/8629>`_ -  Added support for font ligatures.

Housekeeping
************


Bug fixes
*********

  | `Issue #8443 <https://github.com/pgadmin-org/pgadmin4/issues/8443>`_ -  Fixed an issue where the debugger hangs when stepping into nested function/procedure.
  | `Issue #8556 <https://github.com/pgadmin-org/pgadmin4/issues/8556>`_ -  Ensure that graph data is updated even when the Dashboard tab is inactive.