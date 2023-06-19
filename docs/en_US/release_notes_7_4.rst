***********
Version 7.4
***********

Release date: 2023-06-29

This release contains a number of bug fixes and new features since the release of pgAdmin 4 v7.3.

Supported Database Servers
**************************
**PostgreSQL**: 11, 12, 13, 14 and 15

**EDB Advanced Server**: 11, 12, 13, 14 and 15

Bundled PostgreSQL Utilities
****************************
**psql**, **pg_dump**, **pg_dumpall**, **pg_restore**: 15.3


New features
************

  | `Issue #6367 <https://github.com/pgadmin-org/pgadmin4/issues/6367>`_ -  Added support to drop databases using the 'WITH (FORCE)' option.
  | `Issue #6368 <https://github.com/pgadmin-org/pgadmin4/issues/6368>`_ -  Add "[ NULLS [ NOT ] DISTINCT ]" option while creating an Index.
  

Housekeeping
************


Bug fixes
*********

  | `Issue #6065 <https://github.com/pgadmin-org/pgadmin4/issues/6065>`_ -  Ensure that query tool shortcuts are working properly.
  | `Issue #6258 <https://github.com/pgadmin-org/pgadmin4/issues/6258>`_ -  Password Exec properties not included in import/export servers.
  | `Issue #6266 <https://github.com/pgadmin-org/pgadmin4/issues/6266>`_ -  The object browser (the tree control tab) disappeared.
  | `Issue #6291 <https://github.com/pgadmin-org/pgadmin4/issues/6291>`_ -  If connection is lost but data need to be loaded on demand, then loading indicator will not disappear.
  | `Issue #6340 <https://github.com/pgadmin-org/pgadmin4/issues/6340>`_ -  Unable to connect through Pgbouncer after upgrading from 6.21 to 7.1
  | `Issue #6363 <https://github.com/pgadmin-org/pgadmin4/issues/6363>`_ -  Fixed an issue where preview images for themes were not loading.
  | `Issue #6431 <https://github.com/pgadmin-org/pgadmin4/issues/6431>`_ -  PSQL not working if the database name have quotes and double quotes.
  
