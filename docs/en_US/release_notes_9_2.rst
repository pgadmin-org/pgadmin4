***********
Version 9.2
***********

Release date: 2025-04-03

This release contains a number of bug fixes and new features since the release of pgAdmin 4 v9.1.

Supported Database Servers
**************************
**PostgreSQL**: 13, 14, 15, 16 and 17

**EDB Advanced Server**: 13, 14, 15, 16 and 17

Bundled PostgreSQL Utilities
****************************
**psql**, **pg_dump**, **pg_dumpall**, **pg_restore**: 17.2


New features
************

  | `Issue #4194 <https://github.com/pgadmin-org/pgadmin4/issues/4194>`_ -  Added support to automatically open a file after it is downloaded in the desktop mode.
  | `Issue #5871 <https://github.com/pgadmin-org/pgadmin4/issues/5871>`_ -  Add support for restoring plain SQL database dumps.
  | `Issue #8034 <https://github.com/pgadmin-org/pgadmin4/issues/8034>`_ -  Added support for creating Directory nodes in EPAS.
  | `Issue #8449 <https://github.com/pgadmin-org/pgadmin4/issues/8449>`_ -  Change icon buttons to show tooltip even when disabled.
  | `Issue #8540 <https://github.com/pgadmin-org/pgadmin4/issues/8540>`_ -  Add an option to load/replace the servers.json file on each container startup.

Housekeeping
************


Bug fixes
*********

  | `Issue #8006 <https://github.com/pgadmin-org/pgadmin4/issues/8006>`_ -  Removed the pre-install script from the Red Hat build function as it was causing a No such file or directory warning during the update.
  | `Issue #8355 <https://github.com/pgadmin-org/pgadmin4/issues/8355>`_ -  Change session files garbage collection strategy.
  | `Issue #8437 <https://github.com/pgadmin-org/pgadmin4/issues/8437>`_ -  Fixed an issue where the PSQL terminal displays keyname for non alphanumeric keys.
  | `Issue #8462 <https://github.com/pgadmin-org/pgadmin4/issues/8462>`_ -  Fixed an issue where geometries in the geometry viewer will render partially when the container was resized.
  | `Issue #8473 <https://github.com/pgadmin-org/pgadmin4/issues/8473>`_ -  Change the stop/terminate icon at all the places for better UX.
  | `Issue #8479 <https://github.com/pgadmin-org/pgadmin4/issues/8479>`_ -  Fixed an issue where the Schema Diff was not displaying the difference query when a table had a UNIQUE NULLS NOT DISTINCT constraint.