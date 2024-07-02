************
Version 8.10
************

Release date: 2024-07-25

This release contains a number of bug fixes and new features since the release of pgAdmin 4 v8.9.

Supported Database Servers
**************************
**PostgreSQL**: 12, 13, 14, 15, and 16

**EDB Advanced Server**: 12, 13, 14, 15, and 16

Bundled PostgreSQL Utilities
****************************
**psql**, **pg_dump**, **pg_dumpall**, **pg_restore**: 16.3


New features
************


Housekeeping
************

  | `Issue #7494 <https://github.com/pgadmin-org/pgadmin4/issues/7494>`_ -  Replace pgAdmin NW.js container with Electron container.
  | `Issue #7501 <https://github.com/pgadmin-org/pgadmin4/issues/7501>`_ -  Updated to the latest version of the Notistack library.
  | `Issue #7537 <https://github.com/pgadmin-org/pgadmin4/issues/7537>`_ -  Ensure that pgAdmin 4 is compatible with PostgreSQL v17.
  | `Issue #7607 <https://github.com/pgadmin-org/pgadmin4/issues/7607>`_ -  Automatically apply virtualization in the DataGridView of SchemaView if the schema contains only one collection.
  | `Issue #7623 <https://github.com/pgadmin-org/pgadmin4/issues/7623>`_ -  Add the git commit hash details to the About dialog.

Bug fixes
*********

  | `Issue #7035 <https://github.com/pgadmin-org/pgadmin4/issues/7035>`_ -  Fixed the permission denied issue for functions of the pgstattuple extension when accessing statistics with a non-admin user.
  | `Issue #7554 <https://github.com/pgadmin-org/pgadmin4/issues/7554>`_ -  Fixed an issue where sorting the database activity table on the dashboard by any column caused the details to expand in the wrong position.
  | `Issue #7627 <https://github.com/pgadmin-org/pgadmin4/issues/7627>`_ -  Fixed an issue where users could not autofill their saved passwords in the connect server dialog in the browser.