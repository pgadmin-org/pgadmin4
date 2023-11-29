***********
Version 8.1
***********

Release date: 2023-12-14

This release contains a number of bug fixes and new features since the release of pgAdmin 4 v8.0.

Supported Database Servers
**************************
**PostgreSQL**: 12, 13, 14, 15, and 16

**EDB Advanced Server**: 12, 13, 14, 15, and 16

Bundled PostgreSQL Utilities
****************************
**psql**, **pg_dump**, **pg_dumpall**, **pg_restore**: 16.0


New features
************

  | `Issue #4580 <https://github.com/pgadmin-org/pgadmin4/issues/4580>`_ -  Add support for generating ERD for a schema.
  | `Issue #6854 <https://github.com/pgadmin-org/pgadmin4/issues/6854>`_ -  Add support for creating a function with custom return type.

Housekeeping
************


Bug fixes
*********

  | `Issue #6803 <https://github.com/pgadmin-org/pgadmin4/issues/6803>`_ -  Fixed an issue where reading process logs throws an error when DATA_DIR is moved to a networked drive.
  | `Issue #6887 <https://github.com/pgadmin-org/pgadmin4/issues/6887>`_ -  Fixed an issue where syntax error was not highlighting in query tool.
  | `Issue #6921 <https://github.com/pgadmin-org/pgadmin4/issues/6921>`_ -  Fixed an issue where on entering full screen, the option label is not changed to 'Exit Full Screen' in desktop mode.
  | `Issue #6950 <https://github.com/pgadmin-org/pgadmin4/issues/6950>`_ -  Ensure that the Authentication Source in the drop-down of the UserManagement dialog aligns with the entries specified for AUTHENTICATION_SOURCES in the configuration file.
  | `Issue #6958 <https://github.com/pgadmin-org/pgadmin4/issues/6958>`_ -  Reverse engineer serial columns when generating ERD for database/table.
  | `Issue #6964 <https://github.com/pgadmin-org/pgadmin4/issues/6964>`_ -  Fixed an issue where the Schema was not visible in the dropdown for table properties or when creating a new table.
  | `Issue #6984 <https://github.com/pgadmin-org/pgadmin4/issues/6984>`_ -  Fixed an issue where the Vacuum option INDEX_CLEANUP have an incorrect value ('AUTO') for database versions < 14.
  | `Issue #6989 <https://github.com/pgadmin-org/pgadmin4/issues/6989>`_ -  Fixed an issue where the pgAdmin page went blank when clicking the delete button in the User Management dialog.
  | `Issue #7000 <https://github.com/pgadmin-org/pgadmin4/issues/7000>`_ -  Ensure that correct timezone is set for Docker deployments.
