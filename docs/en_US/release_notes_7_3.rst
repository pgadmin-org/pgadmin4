***********
Version 7.3
***********

Release date: 2023-06-06

This release contains a number of bug fixes and new features since the release of pgAdmin 4 v7.2.

Supported Database Servers
**************************
**PostgreSQL**: 11, 12, 13, 14 and 15

**EDB Advanced Server**: 11, 12, 13, 14 and 15

Bundled PostgreSQL Utilities
****************************
**psql**, **pg_dump**, **pg_dumpall**, **pg_restore**: 15.3


New features
************


Housekeeping
************


Bug fixes
*********

  | `Issue #6136 <https://github.com/pgadmin-org/pgadmin4/issues/6136>`_ -  Fix an issue where editing a database object de-selects it on the browser tree.
  | `Issue #6341 <https://github.com/pgadmin-org/pgadmin4/issues/6341>`_ -  Ensure that SSH Tunnel should work properly after upgrading to 7.2 from 7.1
  | `Issue #6342 <https://github.com/pgadmin-org/pgadmin4/issues/6342>`_ -  Fixed an issue where pgadmin is unable to take the defined role.
  | `Issue #6345 <https://github.com/pgadmin-org/pgadmin4/issues/6345>`_ -  Fixed an issue where Foreign Key with 3 or more columns are shown in the wrong order in SQL and Properties.
  | `Issue #6353 <https://github.com/pgadmin-org/pgadmin4/issues/6353>`_ -  Ensure that the master password dialog should not be visible if the parameter MASTER_PASSWORD_REQUIRED is set to False.
