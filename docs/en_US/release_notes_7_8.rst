***********
Version 7.8
***********

Release date: 2023-10-19

This release contains a number of bug fixes and new features since the release of pgAdmin 4 v7.7.

Supported Database Servers
**************************
**PostgreSQL**: 12, 13, 14, 15, and 16

**EDB Advanced Server**: 12, 13, 14 and 15

Bundled PostgreSQL Utilities
****************************
**psql**, **pg_dump**, **pg_dumpall**, **pg_restore**: 16.0


New features
************

  | `Issue #640 <https://github.com/pgadmin-org/pgadmin4/issues/640>`_ -    Add support for foreign table's new functionality for PG 11 and above.
  | `Issue #6373 <https://github.com/pgadmin-org/pgadmin4/issues/6373>`_ -  Add 'GENERATED ALWAYS AS..' option while creating column constraints for Foreign Table.
  | `Issue #6797 <https://github.com/pgadmin-org/pgadmin4/issues/6797>`_ -  GUI representation of the system's activity using the 'system_stats' extension.
  | `Issue #6802 <https://github.com/pgadmin-org/pgadmin4/issues/6802>`_ -  Added 'load_balance_hosts' connection string parameter for PG 16 and above.

Housekeeping
************

  | `Issue #6782 <https://github.com/pgadmin-org/pgadmin4/issues/6782>`_ -  Use PG16 as the default PostgreSQL version.

Bug fixes
*********

  | `Issue #4995 <https://github.com/pgadmin-org/pgadmin4/issues/4995>`_ -  Fixed an issue in ERD tool where the downloaded images have a few links cut.
  | `Issue #6482 <https://github.com/pgadmin-org/pgadmin4/issues/6482>`_ -  Fixed an issue where the wrong message "Current database has been moved or renamed" is displayed when debugging any function.
  | `Issue #6674 <https://github.com/pgadmin-org/pgadmin4/issues/6674>`_ -  Fix an issue where foreign table column name becomes "none" if the user changes any column data type.
  | `Issue #6718 <https://github.com/pgadmin-org/pgadmin4/issues/6718>`_ -  Pin the cryptography version to fix PyO3 modules initialisation error.
  | `Issue #6790 <https://github.com/pgadmin-org/pgadmin4/issues/6790>`_ -  Ensure that the backup works properly for PG 16 on the latest docker image.
  | `Issue #6799 <https://github.com/pgadmin-org/pgadmin4/issues/6799>`_ -  Fixed an issue where the user is unable to select objects on the backup dialog due to tree flickering.
