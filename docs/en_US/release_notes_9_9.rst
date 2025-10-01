***********
Version 9.9
***********

Release date: 2025-10-16

This release contains a number of bug fixes and new features since the release of pgAdmin 4 v9.8.

Supported Database Servers
**************************
**PostgreSQL**: 13, 14, 15, 16, 17 and 18

**EDB Advanced Server**: 13, 14, 15, 16 and 17

Bundled PostgreSQL Utilities
****************************
**psql**, **pg_dump**, **pg_dumpall**, **pg_restore**: 17.5


New features
************

  | `Issue #6385 <https://github.com/pgadmin-org/pgadmin4/issues/6385>`_ -  Add support of DEPENDS/NO DEPENDS ON EXTENSION for ALTER FUNCTION.
  | `Issue #6394 <https://github.com/pgadmin-org/pgadmin4/issues/6394>`_ -  Added "MULTIRANGE_TYPE_NAME" option while creating a Range Type.
  | `Issue #6395 <https://github.com/pgadmin-org/pgadmin4/issues/6395>`_ -  Added "SUBSCRIPT" option while creating a External Type.
  | `Issue #6996 <https://github.com/pgadmin-org/pgadmin4/issues/6996>`_ -  Added option to skip the password dialog when using an identity file.
  | `Issue #8932 <https://github.com/pgadmin-org/pgadmin4/issues/8932>`_ -  Added 'failover' and 'two_phase' parameter support in CREATE/ALTER SUBSCRIPTION for PostgreSQL v17+.

Housekeeping
************


Bug fixes
*********

  | `Issue #9098 <https://github.com/pgadmin-org/pgadmin4/issues/9098>`_ -  Fixed an issue where the query tool displayed 'default' instead of 'null' for null text data in the data output.
  | `Issue #9125 <https://github.com/pgadmin-org/pgadmin4/issues/9125>`_ -  Fixed an issue where the pgAdmin configuration database wasn't being created on a fresh install when an external database was used for the configuration.
  | `Issue #9157 <https://github.com/pgadmin-org/pgadmin4/issues/9157>`_ -  Fixed an issue where shortcuts are not working as expected on multiple keyboard layouts.
  | `Issue #9158 <https://github.com/pgadmin-org/pgadmin4/issues/9158>`_ -  Fixed an issue where saving the newly changed preferences was not reflecting on the preferences tab.
