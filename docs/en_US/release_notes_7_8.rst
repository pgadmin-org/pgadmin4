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
  | `Issue #6229 <https://github.com/pgadmin-org/pgadmin4/issues/6229>`_ -  Allow setting custom username for shared servers, with default as username of server being shared.
  | `Issue #6373 <https://github.com/pgadmin-org/pgadmin4/issues/6373>`_ -  Add 'GENERATED ALWAYS AS..' option while creating column constraints for Foreign Table.
  | `Issue #6797 <https://github.com/pgadmin-org/pgadmin4/issues/6797>`_ -  GUI representation of the system's activity using the 'system_stats' extension.
  | `Issue #6802 <https://github.com/pgadmin-org/pgadmin4/issues/6802>`_ -  Added 'load_balance_hosts' connection string parameter for PG 16 and above.

Housekeeping
************

  | `Issue #6782 <https://github.com/pgadmin-org/pgadmin4/issues/6782>`_ -  Use PG16 as the default PostgreSQL version.

Bug fixes
*********

  | `Issue #4995 <https://github.com/pgadmin-org/pgadmin4/issues/4995>`_ -  Fixed an issue in ERD tool where the downloaded images have a few links cut.
  | `Issue #5749 <https://github.com/pgadmin-org/pgadmin4/issues/5749>`_ -  Fixed an issue where user was not able to assign new/old columns as primary key once column with primary key is deleted.
  | `Issue #6285 <https://github.com/pgadmin-org/pgadmin4/issues/6285>`_ -  Add support for setting prepare threshold in server connection.
  | `Issue #6482 <https://github.com/pgadmin-org/pgadmin4/issues/6482>`_ -  Fixed an issue where the wrong message "Current database has been moved or renamed" is displayed when debugging any function.
  | `Issue #6538 <https://github.com/pgadmin-org/pgadmin4/issues/6538>`_ -  Fixed an issue where Processes tab displays wrong server name in some scenario.
  | `Issue #6579 <https://github.com/pgadmin-org/pgadmin4/issues/6579>`_ -  Fix an issue where global/native keyboard shortcuts are not working when any cell of data output grid has focus.
  | `Issue #6666 <https://github.com/pgadmin-org/pgadmin4/issues/6666>`_ -  Fixed query history slowness issue by storing query only for those having certain threshold max length.
  | `Issue #6674 <https://github.com/pgadmin-org/pgadmin4/issues/6674>`_ -  Fix an issue where foreign table column name becomes "none" if the user changes any column data type.
  | `Issue #6718 <https://github.com/pgadmin-org/pgadmin4/issues/6718>`_ -  Pin the cryptography version to fix PyO3 modules initialisation error.
  | `Issue #6790 <https://github.com/pgadmin-org/pgadmin4/issues/6790>`_ -  Ensure that the backup works properly for PG 16 on the latest docker image.
  | `Issue #6799 <https://github.com/pgadmin-org/pgadmin4/issues/6799>`_ -  Fixed an issue where the user is unable to select objects on the backup dialog due to tree flickering.
  | `Issue #6836 <https://github.com/pgadmin-org/pgadmin4/issues/6836>`_ -  Fixed an issue where non-super PostgreSQL users are not able to terminate their own connections from dashboard.
  | `Issue #6851 <https://github.com/pgadmin-org/pgadmin4/issues/6851>`_ -  Fix an issue where scale in columns is not allowed to have value as 0 or below.
  | `Issue #6858 <https://github.com/pgadmin-org/pgadmin4/issues/6858>`_ -  Fix an issue in graphical explain plan where query tool crashes when the plan has parallel workers details and sort node is clicked for details.
  | `Issue #6865 <https://github.com/pgadmin-org/pgadmin4/issues/6865>`_ -  Fix an issue where user login is not working if username/email contains single quote in server mode.
